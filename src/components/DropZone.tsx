/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, FileCode, CheckCircle2, AlertTriangle, PlayCircle } from "lucide-react";
import { FreightDB } from "../services/db";
import { eventBus } from "../services/eventBus";
import { FreightRate, TranslationSet } from "../types";
import { parseRawSheetRows } from "../services/rateParser";

interface DropZoneProps {
  t: TranslationSet;
}

export default function DropZone({ t }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    details?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  const clickInput = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls") &&
      !file.name.endsWith(".xlsb") &&
      !file.name.endsWith(".xlsm")
    ) {
      setFeedback({
        type: "error",
        message: t.invalidExcel,
        details: "Expected file named 'DATO.xlsx' or matching Excel formats.",
      });
      return;
    }

    setLoading(true);
    setFeedback(null);
    const startParseTime = performance.now();

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          const sheetsToRead = ["DATOS", "MESES ANTERIORES", "Buscador"];
          const parsedRates: FreightRate[] = [];

          let readAnySheet = false;

          for (const sheetName of workbook.SheetNames) {
            const matchedName = sheetsToRead.find(
              (s) => s.toLowerCase() === sheetName.toLowerCase()
            );

            if (!matchedName) {
              continue;
            }

            readAnySheet = true;
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });

            if (rawRows.length === 0) continue;

            const sheetRates = parseRawSheetRows(rawRows, matchedName);
            parsedRates.push(...sheetRates);
          }

          if (!readAnySheet || parsedRates.length === 0) {
            throw new Error("No matching spreadsheet records (sheets 'DATOS', 'MESES ANTERIORES' or 'Buscador' with corresponding columns) could be found.");
          }

          await FreightDB.saveRates(parsedRates);

          const timeTaken = (performance.now() - startParseTime).toFixed(0);
          setFeedback({
            type: "success",
            message: `${t.uploadSuccess} (${parsedRates.length} records parsed in ${timeTaken}ms)`,
          });

          eventBus.emit("data_loaded");

        } catch (err: any) {
          console.error("[DropZone] Excel parsing error:", err);
          setFeedback({
            type: "error",
            message: t.uploadError,
            details: err.message || "Spreadsheet columns could not be correlated properly.",
          });
        } finally {
          setLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (e: any) {
      console.error("[DropZone] File read crashed:", e);
      setFeedback({
        type: "error",
        message: t.uploadError,
        details: e.message || "File IO Error",
      });
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setFeedback(null);
    const startParseTime = performance.now();

    try {
      const mockRates: FreightRate[] = [];
      const pols = ["ESBCN (BARCELONA)", "CNSHA (SHANGHAI)", "USLAX (LOS ANGELES)", "DEHAM (HAMBURG)"];
      const pods = ["USNYC (NEW YORK)", "ESVLC (VALENCIA)", "SGPIN (SINGAPORE)", "NLRTM (ROTTERDAM)"];
      const carriers = ["Ocean Express", "Global Logistics", "Pacific Link", "Transatlantic Gmbh", "Apex Shipping Line"];
      
      const months = ["May 2026", "June 2026", "July 2026"];
      const sheets = ["DATOS", "MESES ANTERIORES", "Buscador"];

      sheets.forEach((sheet) => {
        months.forEach((m) => {
          pols.forEach((pol, pIdx) => {
            const pod = pods[pIdx % pods.length];
            carriers.forEach((carrier, cIdx) => {
              const carrierBase = 1050 + (cIdx * 140);
              const ocean = Math.max(850, carrierBase + Math.floor(Math.sin(pIdx + cIdx) * 160));
              const fob = 220 + (cIdx * 35);
              const dest = 240 + (pIdx * 45) + (cIdx * 10);
              
              const baf = 45 + (cIdx * 12);
              const thc = 115 + (pIdx * 8);
              const lss = 35;
              const otros = 30;

              const total = ocean + fob + dest + baf + thc + lss + otros;

              mockRates.push({
                sheetSource: sheet,
                mes: m,
                pol,
                pod,
                carrier,
                total,
                gastosFob: fob,
                oceanFreight: ocean,
                gastosDestino: dest,
                baf,
                thc,
                lss,
                otrosRecargos: otros
              });
            });
          });
        });
      });

      await FreightDB.clearAll();
      await FreightDB.saveRates(mockRates);

      const timeTaken = (performance.now() - startParseTime).toFixed(0);
      setFeedback({
        type: "success",
        message: `Sample data loaded! (${mockRates.length} rows stored)`,
      });

      eventBus.emit("data_loaded");
    } catch (err: any) {
      console.error("[DropZone] Loading Demo failed:", err);
      setFeedback({
        type: "error",
        message: "Failed to assemble demo rates.",
        details: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="file-uploader-section" className="bg-slate-800 rounded-xl border border-slate-700/80 p-4 shadow-md text-white">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Rate Source Manager
        </span>

        <button
          id="btn-load-sample"
          type="button"
          onClick={handleLoadSample}
          disabled={loading}
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-md transition duration-200"
        >
          <PlayCircle className="h-3 w-3" />
          Load Demo Rates
        </button>
      </div>

      <div
        id="drag-drop-area"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={clickInput}
        className={`w-full min-h-[95px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-indigo-400 bg-slate-750 scale-[0.98]"
            : "border-slate-650 bg-slate-900 hover:border-slate-500 hover:bg-slate-850"
        }`}
      >
        <input
          id="xlsx-file-input"
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsb,.xlsm"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="bg-slate-800 p-2 rounded-full mb-1 text-slate-350">
          <Upload className="h-4 w-4" />
        </div>

        <p className="text-xs font-semibold text-slate-200">
          Drag & Drop DATO.xlsx here
        </p>
        <p className="text-[9px] text-slate-450 mt-0.5">
          or click to select file locally
        </p>
      </div>

      {loading && (
        <div id="loader-indicator" className="w-full flex items-center justify-center p-2.5 mt-2 bg-slate-900 rounded-lg text-[10px] text-slate-350 gap-2 border border-slate-750">
          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          {t.loadingData}
        </div>
      )}

      {feedback && (
        <div
          id="uploader-feedback-container"
          className={`mt-2 p-3 rounded-lg border flex items-start gap-2 animate-fade-in text-[10px] ${
            feedback.type === "success"
              ? "bg-slate-900 border-emerald-900/55 text-emerald-300"
              : "bg-slate-900 border-amber-900/55 text-amber-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-0.5 min-w-0">
            <p className="font-semibold truncate">{feedback.message}</p>
            {feedback.details && <p className="text-slate-450 font-mono text-[9px] truncate">{feedback.details}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
