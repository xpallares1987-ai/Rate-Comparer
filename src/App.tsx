/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, startTransition } from "react";
import { Ship, Trash2, Database, Languages, Activity, Info, FileSpreadsheet, Anchor, MapPin, Minimize, Coins } from "lucide-react";

import { ActiveFilters, FreightRate, LanguageCode } from "./types";
import { LOCALES } from "./locale";
import { FreightDB } from "./services/db";
import { eventBus } from "./services/eventBus";
import { filterRates } from "./services/rateFilter";

import DropZone from "./components/DropZone";
import FilterBar from "./components/FilterBar";
import ComparisonTable from "./components/ComparisonTable";
import RateChart from "./components/RateChart";
import ConsoleLogs from "./components/ConsoleLogs";
import UnitTestRunner from "./components/UnitTestRunner";

export default function App() {
  const [lang, setLang] = useState<LanguageCode>(() => {
    const cached = localStorage.getItem("freight_locale");
    if (cached === "es" || cached === "en" || cached === "de") {
      return cached as LanguageCode;
    }
    return "en";
  });

  const t = LOCALES[lang];

  const [allRates, setAllRates] = useState<FreightRate[]>([]);
  const [filters, setFilters] = useState<ActiveFilters>({
    mes: "all",
    pol: "all",
    pod: "all",
    carrier: "all",
    sheetSource: "all",
    carrierSearch: "",
  });

  const [filteredRates, setFilteredRates] = useState<FreightRate[]>([]);
  const [dbLength, setDbLength] = useState<number>(0);

  const loadRatesFromDatabase = async () => {
    try {
      const records = await FreightDB.getAllRates();
      setAllRates(records);
      setDbLength(records.length);
      applyCurrentFilters(records, filters);
      console.log(`%c[App] Loaded ${records.length} rate structures from local IndexedDB cache.`, "color: #6366f1; font-weight: bold;");
    } catch (err) {
      console.error("[App] IndexedDB extraction error:", err);
    }
  };

  const applyCurrentFilters = (dataset: FreightRate[], activeFilters: ActiveFilters) => {
    const result = filterRates(dataset, activeFilters);
    setFilteredRates(result);
  };

  useEffect(() => {
    FreightDB.init().then(() => {
      loadRatesFromDatabase();
    });

    const offDataLoaded = eventBus.on("data_loaded", () => {
      loadRatesFromDatabase();
    });

    const offDbCleared = eventBus.on("db_cleared", () => {
      setAllRates([]);
      setFilteredRates([]);
      setDbLength(0);
      setFilters({
        mes: "all",
        pol: "all",
        pod: "all",
        carrier: "all",
        sheetSource: "all",
        carrierSearch: "",
      });
    });

    return () => {
      offDataLoaded();
      offDbCleared();
    };
  }, []);

  useEffect(() => {
    applyCurrentFilters(allRates, filters);
  }, [filters, allRates]);

  const handleLangSelect = (code: LanguageCode) => {
    startTransition(() => {
      setLang(code);
      localStorage.setItem("freight_locale", code);
      console.log(`%c[Locale] App localization updated to: ${code.toUpperCase()}`, "color: #10b981; font-weight: bold;");
    });
  };

  const handleWipeDatabase = async () => {
    if (window.confirm("Are you sure you want to clear your local rate cache? This will purge all stored entries.")) {
      await FreightDB.clearAll();
    }
  };

  const handleResetFilters = () => {
    setFilters({
      mes: "all",
      pol: "all",
      pod: "all",
      carrier: "all",
      sheetSource: "all",
      carrierSearch: "",
    });
  };

  // Compute stat card metrics
  const formatCur = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const cheapestRate = filteredRates.length > 0 
    ? filteredRates.reduce((min, curr) => curr.total < min.total ? curr : min, filteredRates[0]) 
    : null;

  const averageFreightValue = filteredRates.length > 0 
    ? filteredRates.reduce((sum, curr) => sum + curr.total, 0) / filteredRates.length 
    : 0;

  return (
    <div id="application-container" className="h-full lg:h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-slate-100 text-slate-800">
      
      {/* 280px LEFT SIDEBAR - Styled with Deep Slate (#0f172a) */}
      <aside className="w-full lg:w-[285px] xl:w-[310px] bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-700 flex flex-col justify-between shrink-0 text-white overflow-y-auto custom-console-scrollbar select-none">
        
        {/* Sidebar Header & Brand Styling */}
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded shadow-md shadow-indigo-500/10">
              <Ship className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-wider text-white">
                FREIGHT<span className="text-indigo-400">SYNC</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                Rate Analytics Client
              </p>
            </div>
          </div>

          {/* DATO.xlsx Drop Zone */}
          <DropZone t={t} />

          {/* Lane selector Filters */}
          <FilterBar
            t={t}
            allRates={allRates}
            filters={filters}
            onFilterChange={setFilters}
            onReset={handleResetFilters}
          />
        </div>

        {/* Sidebar Footer branding */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400 tracking-wider uppercase font-semibold">
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3 text-indigo-400" />
            Cache: IndexDB Active
          </span>
          <span className="text-indigo-400 font-bold">
            v1.4.2
          </span>
        </div>
      </aside>

      {/* RIGHT WORKSPACE AREA - Styled with clean light gray (#f1f5f9) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-100">
        
        {/* Main Content Workspace Toolbar Header */}
        <header className="h-[60px] bg-white border-b border-slate-200 display flex items-center justify-between px-6 shrink-0 z-10 shadow-xs select-none">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Local Dashboard
            </span>
            <div className="h-4 w-px bg-slate-200"></div>
            
            {/* Horizontal inline localization buttons */}
            <div className="flex bg-slate-50 p-0.5 rounded border border-slate-150">
              <button
                onClick={() => handleLangSelect("en")}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                  lang === "en" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => handleLangSelect("es")}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                  lang === "es" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                ES
              </button>
              <button
                onClick={() => handleLangSelect("de")}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${
                  lang === "de" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                DE
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-medium hidden sm:flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-semibold rounded">
              PWA Mode
            </span>
            <span>UTC {new Date().toISOString().substring(11,16)}</span>
          </div>
        </header>

        {/* Scrollable Workspace Panels */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Bento-style Metric indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Cheapest Card */}
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">
                  {t.metricCheapest}
                </p>
                <p className="text-2xl font-bold tracking-tight text-indigo-600">
                  {cheapestRate ? formatCur(cheapestRate.total) : "$0.00"}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-500 truncate font-semibold">
                {cheapestRate ? (
                  <span className="flex items-center gap-1 text-emerald-600 uppercase font-bold text-[9px]">
                    <Anchor className="h-3 w-3 inline" />
                    {cheapestRate.carrier} | {cheapestRate.pol} → {cheapestRate.pod}
                  </span>
                ) : (
                  "Import logistics files to query"
                )}
              </div>
            </div>

            {/* Average Freight pricing */}
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">
                  {t.metricAvgTotal}
                </p>
                <p className="text-2xl font-bold tracking-tight text-slate-800">
                  {formatCur(averageFreightValue)}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-500">
                Based on <strong className="text-slate-700">{filteredRates.length}</strong> carrier tariffs found
              </div>
            </div>

            {/* Database details and Last Import status */}
            <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">
                    System Cache Inventory
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-slate-800">
                    {dbLength} records
                  </p>
                </div>
                {dbLength > 0 && (
                  <button
                    onClick={handleWipeDatabase}
                    title="Purge rate registers completely"
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-500 flex justify-between">
                <span>DATOS, MESES ANTERIORES, Buscador</span>
                <span className="font-bold text-emerald-600 uppercase tracking-widest text-[9px]">ONLINE PWA ready</span>
              </div>
            </div>

          </div>

          {/* Interactive Charts & Pricing Matrix designtime */}
          {dbLength > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              
              {/* Graphic container (1/3 weight) */}
              <div className="xl:col-span-1">
                <RateChart
                  t={t}
                  filteredRates={filteredRates}
                  allRates={allRates}
                  onCarrierSelect={(carrier) => setFilters((prev) => ({ ...prev, carrier }))}
                />
              </div>

              {/* Dynamic Rates Matrix table (2/3 weight) */}
              <div className="xl:col-span-2 min-h-0">
                <ComparisonTable t={t} filteredRates={filteredRates} allRates={allRates} />
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-250 p-16 text-center shadow-xs flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <div className="max-w-md">
                <h3 className="font-bold text-slate-800 text-sm">Awaiting Freight Rate Import</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Please drag your local <strong className="text-slate-700">DATO.xlsx</strong> spreadsheet into the rate loader, or click <strong className="text-indigo-600 font-semibold cursor-pointer" onClick={() => eventBus.emit("system_log", {id: "demo-triggered", timestamp: new Date(), level: "info", message: "Demo requested by interactive link"})}>"Load Demo Rates"</strong> on the left sidebar to test.
                </p>
              </div>
            </div>
          )}

          {/* Integrated client-side unit test runner */}
          <UnitTestRunner />

          {/* Console logger system console integration at the base */}
          <ConsoleLogs t={t} />

        </div>

        {/* Footer info-bar */}
        <footer className="bg-slate-900 text-slate-450 border-t border-slate-800 px-6 py-3 shrink-0 flex items-center justify-between text-[9px] font-semibold tracking-wider uppercase select-none">
          <span>FreightSync Local Rate Navigator</span>
          <div className="flex gap-4">
            <span>Client parser: SheetJS</span>
            <span>Storage: IndexedDB Standard</span>
          </div>
        </footer>

      </div>

    </div>
  );
}
