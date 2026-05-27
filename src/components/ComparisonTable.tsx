/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  ArrowUpDown, Award, DollarSign, Split, TrendingDown, TrendingUp, Minus, 
  HelpCircle, Layers, CreditCard, Download, FileSpreadsheet, Scale, 
  ShieldAlert, AlertCircle, ThumbsUp, CheckCircle 
} from "lucide-react";
import { FreightRate, TranslationSet } from "../types";
import * as XLSX from "xlsx";

interface ComparisonTableProps {
  t: TranslationSet;
  filteredRates: FreightRate[];
  allRates?: FreightRate[];
}

type SortKey = "carrier" | "oceanFreight" | "gastosFob" | "gastosDestino" | "total";

function parseMonthYear(mesStr: string): { monthIndex: number; year: number } | null {
  if (!mesStr) return null;
  const cleaned = mesStr.trim().toLowerCase();
  
  // Try pattern matching like "05/2026" or "2026-05" or "05-2026"
  const m1 = cleaned.match(/^(\d{1,2})[\/\- ](\d{4})$/);
  if (m1) {
    return { monthIndex: parseInt(m1[1], 10) - 1, year: parseInt(m1[2], 10) };
  }
  const m2 = cleaned.match(/^(\d{4})[\/\- ](\d{1,2})$/);
  if (m2) {
    return { monthIndex: parseInt(m2[2], 10) - 1, year: parseInt(m2[1], 10) };
  }

  // English month terms names map
  const monthNamesEN: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
  };
  
  // Spanish month terms names map
  const monthNamesES: Record<string, number> = {
    enero: 0, ene: 0, febrero: 1, feb: 1, marzo: 2, mar: 2, abril: 3, abr: 3, mayo: 4, may: 4, junio: 5, jun: 5, julio: 6, jul: 6, agosto: 7, ago: 7, septiembre: 8, sep: 8, sept: 8, octubre: 9, oct: 9, noviembre: 10, nov: 10, diciembre: 11, dic: 11
  };

  // German month terms names map
  const monthNamesDE: Record<string, number> = {
    januar: 0, jan: 0, februar: 1, feb: 1, märz: 2, mrz: 2, april: 3, apr: 3, mai: 4, juni: 5, jun: 5, juli: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, oktober: 9, okt: 9, november: 10, nov: 10, dezember: 11, dez: 11
  };

  const allMonths = { ...monthNamesEN, ...monthNamesES, ...monthNamesDE };

  // Loop through and look for month keys
  let foundMonth: number | null = null;
  let foundYear: number | null = null;

  for (const [name, index] of Object.entries(allMonths)) {
    if (cleaned.includes(name)) {
      foundMonth = index;
      break;
    }
  }

  // Look for any 4 digit sequence
  const yearMatch = cleaned.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    foundYear = parseInt(yearMatch[1], 10);
  }

  if (foundMonth !== null) {
    return {
      monthIndex: foundMonth,
      year: foundYear || new Date().getFullYear() // fallback to current year
    };
  }

  return null;
}

const getPreviousMonthRate = (currentRate: FreightRate, allRates: FreightRate[]): FreightRate | null => {
  const currentParsed = parseMonthYear(currentRate.mes);
  if (!currentParsed) return null;
  const currentAbsMonth = currentParsed.year * 12 + currentParsed.monthIndex;

  // Find all rates for the same provider/carrier on the same trading lane
  const siblingRates = allRates.filter(
    (r) =>
      r.carrier.toLowerCase().trim() === currentRate.carrier.toLowerCase().trim() &&
      r.pol.toLowerCase().trim() === currentRate.pol.toLowerCase().trim() &&
      r.pod.toLowerCase().trim() === currentRate.pod.toLowerCase().trim()
  );

  let bestPrevRate: FreightRate | null = null;
  let bestMonthDiff = Infinity;

  siblingRates.forEach((r) => {
    const rParsed = parseMonthYear(r.mes);
    if (!rParsed) return;
    const rAbsMonth = rParsed.year * 12 + rParsed.monthIndex;

    const diff = currentAbsMonth - rAbsMonth;
    // We want the most recent month before currentAbsMonth (diff > 0)
    if (diff > 0 && diff < bestMonthDiff) {
      bestMonthDiff = diff;
      bestPrevRate = r;
    }
  });

  return bestPrevRate;
};

export default function ComparisonTable({ t, filteredRates, allRates }: ComparisonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  
  // Carrier simulation comparison states
  const [carrierA, setCarrierA] = useState<string>("");
  const [carrierB, setCarrierB] = useState<string>("");

  const uniqueCarriersList = Array.from(new Set(filteredRates.map(r => r.carrier))).sort();

  // Initial comparison selection synchronization
  useEffect(() => {
    if (uniqueCarriersList.length > 0) {
      if (!carrierA || !uniqueCarriersList.includes(carrierA)) {
        setCarrierA(uniqueCarriersList[0]);
      }
      if (!carrierB || !uniqueCarriersList.includes(carrierB)) {
        setCarrierB(uniqueCarriersList[1] || uniqueCarriersList[0]);
      }
    }
  }, [filteredRates, uniqueCarriersList, carrierA, carrierB]);

  // Sorting Handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // Find the absolute cheapest rate to highlight it
  const cheapestRate = filteredRates.reduce((min, current) => {
    return current.total < min.total ? current : min;
  }, filteredRates[0]);

  // Sort the actual rates
  const sortedRates = [...filteredRates].sort((a, b) => {
    let valA: any = a[sortKey];
    let valB: any = b[sortKey];

    if (typeof valA === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return sortAsc ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
    }
  });

  // Numeric Formatter Helper
  const formatCur = (v: number | undefined) => {
    if (v === undefined) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(v);
  };

  // Excel / CSV Export Handlers
  const handleExportExcel = () => {
    const excelRows = sortedRates.map((rate) => ({
      "Carrier / Lines (Naviera)": rate.carrier,
      "POL (Loading Port)": rate.pol,
      "POD (Discharge Port)": rate.pod,
      "Month / Period": rate.mes,
      "Basic Ocean Freight (USD)": rate.oceanFreight,
      "FOB Local Charges (USD)": rate.gastosFob,
      "Destination Charges (USD)": rate.gastosDestino,
      "BAF (Fuel Fee)": rate.baf || 0,
      "THC (Terminal Surcharge)": rate.thc || 0,
      "LSS (Low Sulfur Surcharge)": rate.lss || 0,
      "Others Surcharges": rate.otrosRecargos || 0,
      "Total Costs (USD)": rate.total,
      "Original Sheet Source": rate.sheetSource,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Carrier Analysis Matrix");
    
    // Fit column widths elegantly
    const max_width = excelRows.reduce((w, r) => Math.max(w, String(r["Carrier / Lines (Naviera)"]).length), 15);
    worksheet["!cols"] = [
      { wch: max_width }, 
      { wch: 8 }, 
      { wch: 8 }, 
      { wch: 15 }, 
      { wch: 22 }, 
      { wch: 22 }, 
      { wch: 22 }, 
      { wch: 12 }, 
      { wch: 12 }, 
      { wch: 12 }, 
      { wch: 12 }, 
      { wch: 18 }, 
      { wch: 20 }
    ];

    XLSX.writeFile(workbook, "FreightSync_Ocean_Rates_Comparative.xlsx");
  };

  const handleExportCSV = () => {
    const headers = ["Carrier", "POL", "POD", "Month", "Ocean Freight", "FOB Charges", "Destination Charges", "BAF", "THC", "LSS", "Others", "Total", "Source"];
    const rows = sortedRates.map(r => [
      r.carrier,
      r.pol,
      r.pod,
      r.mes,
      r.oceanFreight,
      r.gastosFob,
      r.gastosDestino,
      r.baf || 0,
      r.thc || 0,
      r.lss || 0,
      r.otrosRecargos || 0,
      r.total,
      r.sheetSource
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FreightSync_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compare Simulation Calculator
  const getCarrierSummary = (cName: string) => {
    const cRates = filteredRates.filter(r => r.carrier === cName);
    if (cRates.length === 0) return null;
    
    const count = cRates.length;
    const total = cRates.reduce((acc, r) => acc + r.total, 0) / count;
    const ocean = cRates.reduce((acc, r) => acc + r.oceanFreight, 0) / count;
    const fob = cRates.reduce((acc, r) => acc + r.gastosFob, 0) / count;
    const dest = cRates.reduce((acc, r) => acc + r.gastosDestino, 0) / count;
    const baf = cRates.reduce((acc, r) => acc + (r.baf || 0), 0) / count;
    const thc = cRates.reduce((acc, r) => acc + (r.thc || 0), 0) / count;
    const lss = cRates.reduce((acc, r) => acc + (r.lss || 0), 0) / count;
    const other = cRates.reduce((acc, r) => acc + (r.otrosRecargos || 0), 0) / count;
    
    return { count, total, ocean, fob, dest, baf, thc, lss, other };
  };

  const summaryA = getCarrierSummary(carrierA);
  const summaryB = getCarrierSummary(carrierB);

  // Analyze active lane metrics for Data Health diagnostics alerts
  const generateLaneInsights = () => {
    const insights: { level: "info" | "success" | "warn"; text: string; subtext: string }[] = [];
    if (filteredRates.length === 0) return insights;

    // 1. Dispersion check
    const totals = filteredRates.map(r => r.total);
    const maxTotal = Math.max(...totals);
    const minTotal = Math.min(...totals);
    const spread = maxTotal - minTotal;
    
    if (spread > 0) {
      const spreadPct = ((spread / minTotal) * 100).toFixed(0);
      insights.push({
        level: "info",
        text: `Rate arbitrage margin of ${formatCur(spread)} (${spreadPct}% lane variance)`,
        subtext: `Choosing the layout optimization leader instead of high quote carrier offers direct cost savings.`
      });
    }

    // 2. Local charges vs Ocean Freight check
    filteredRates.forEach(rate => {
      const scaleSurcharges = (rate.baf || 0) + (rate.thc || 0) + (rate.lss || 0) + (rate.otrosRecargos || 0);
      const localsTotal = rate.gastosFob + rate.gastosDestino + scaleSurcharges;
      if (localsTotal > rate.oceanFreight && rate.oceanFreight > 0) {
        insights.push({
          level: "warn",
          text: `High supplementary fees detected for ${rate.carrier}`,
          subtext: `FOB, destination and surcharge elements compose ${((localsTotal / rate.oceanFreight) * 100).toFixed(0)}% of basic ocean freight. Verify and negotiate fixed local tariffs.`
        });
      }
    });

    // 3. Completeness check
    const missingBAFList = filteredRates.filter(r => !r.baf).map(r => r.carrier);
    const uniqueMissingBAF = Array.from(new Set(missingBAFList));
    if (uniqueMissingBAF.length > 0) {
      insights.push({
        level: "warn",
        text: `Incomplete Surcharge break-out for: ${uniqueMissingBAF.slice(0, 2).join(", ")}${uniqueMissingBAF.length > 2 ? "..." : ""}`,
        subtext: `One or more sheet records lacks standard fuel adjustment (BAF) components. Surcharge visualization defaults to total aggregations.`
      });
    }

    if (insights.length === 0) {
      insights.push({
        level: "success",
        text: "Clean tariff health check",
        subtext: "Pricing distributions amongst all carriers remain robustly aligned with baseline expectations."
      });
    }

    return insights;
  };

  const laneInsights = generateLaneInsights();

  // Calculate Metrics for Bento top grid
  const ratesCount = filteredRates.length;
  const totalSum = filteredRates.reduce((acc, r) => acc + r.total, 0);
  const avgTotal = ratesCount > 0 ? totalSum / ratesCount : 0;

  const totalOceanSum = filteredRates.reduce((acc, r) => acc + r.oceanFreight, 0);
  const totalLocalSum = filteredRates.reduce((acc, r) => acc + r.gastosFob + r.gastosDestino, 0);
  const oceanPercentage = totalSum > 0 ? (totalOceanSum / totalSum) * 100 : 0;
  const localPercentage = totalSum > 0 ? (totalLocalSum / totalSum) * 100 : 0;

  if (filteredRates.length === 0) {
    return (
      <div id="no-carrier-rates-warning" className="bg-slate-50 border border-slate-100 rounded-2xl p-12 text-center text-slate-500">
        <DollarSign className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">{t.noRatesFound}</p>
        <p className="text-xs text-slate-400 mt-1">Try relaxing some active lane filters to compare available carriers.</p>
      </div>
    );
  }

  return (
    <div id="comparison-analysis-panel" className="space-y-6">
      {/* Dynamic Summary Bento-style widgets */}
      <div id="analytical-bento-grid" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{t.metricAvgTotal}</p>
            <p className="text-lg font-bold text-slate-800">{formatCur(avgTotal)}</p>
            <p className="text-[10px] text-slate-500">{ratesCount} carriers in rate assessment</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{t.metricCheapest}</p>
            <p className="text-lg font-bold text-emerald-600">{formatCur(cheapestRate.total)}</p>
            <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{cheapestRate.carrier}</p>
          </div>
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-50 text-[9px] text-emerald-700 font-bold rounded">
            -{( ((avgTotal - cheapestRate.total) / (avgTotal || 1)) * 100).toFixed(0)}% avg
          </div>
        </div>

        <div className="bg-white rounded-xl border border-purple-100 p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{t.metricCheapestCarrier}</p>
            <p className="text-base font-bold text-slate-800 truncate max-w-[145px]">{cheapestRate.carrier}</p>
            <p className="text-[10px] text-slate-500">Most competitive pricing lane</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <Split className="h-3.5 w-3.5 text-slate-400" />
              <span>{t.metricComparison}</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-blue-600 h-full"
              style={{ width: `${oceanPercentage}%` }}
              title={`Ocean Freight: ${oceanPercentage.toFixed(1)}%`}
            />
            <div
              className="bg-purple-400 h-full"
              style={{ width: `${localPercentage}%` }}
              title={`Local Charges (FOB + Destination): ${localPercentage.toFixed(1)}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] mt-2 text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
              Fret: {oceanPercentage.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
              Local: {localPercentage.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Grid Comparison Sheet */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/30">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              {t.carrierComparisonTitle}
            </h3>
            <p className="text-[10px] text-slate-405 mt-0.5">
              Refined tariff layout. Click headers to toggle price sort sequences.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
              title="Download fully structured XLSX dataset"
            >
              <Download className="h-3 w-3" />
              <span>EXPORT EXCEL (XLSX)</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-indigo-750 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition cursor-pointer"
              title="Export rate table layout as CSV data file"
            >
              <FileSpreadsheet className="h-3 w-3" />
              <span>EXPORT CSV</span>
            </button>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium">
              USD rates
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table id="comp-matrix-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th
                  onClick={() => handleSort("carrier")}
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    {t.colCarrier}
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("oceanFreight")}
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {t.colOceanFreight}
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("gastosFob")}
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {t.colGastosFob}
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("gastosDestino")}
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {t.colGastosDestino}
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-4 text-right hidden lg:table-cell">
                  <span>{t.surchargesBreakdown}</span>
                </th>
                <th
                  onClick={() => handleSort("total")}
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {t.colTotal}
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRates.map((rate, rIdx) => {
                const isCheapestOnScreen = cheapestRate && rate.id === cheapestRate.id;

                const prevRate = allRates ? getPreviousMonthRate(rate, allRates) : null;
                let trendElement = null;

                if (prevRate) {
                  const diff = rate.total - prevRate.total;
                  const pct = prevRate.total > 0 ? ((diff / prevRate.total) * 100).toFixed(1) : "0.0";
                  const isUp = diff > 0;
                  const isDown = diff < 0;

                  if (isUp) {
                    trendElement = (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 tracking-tight"
                        title={`Rate increased from ${formatCur(prevRate.total)} in ${prevRate.mes} (+${pct}%)`}
                      >
                        <TrendingUp className="h-3 w-3 shrink-0" />
                        +{pct}%
                      </span>
                    );
                  } else if (isDown) {
                    trendElement = (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 tracking-tight"
                        title={`Rate decreased from ${formatCur(prevRate.total)} in ${prevRate.mes} (${pct}%)`}
                      >
                        <TrendingDown className="h-3 w-3 shrink-0" />
                        {pct}%
                      </span>
                    );
                  } else {
                    trendElement = (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400 tracking-tight"
                        title={`Rate unchanged from ${prevRate.mes} (${formatCur(prevRate.total)})`}
                      >
                        <Minus className="h-2.5 w-2.5 shrink-0" />
                        0.0%
                      </span>
                    );
                  }
                }

                return (
                  <tr
                    key={rate.id || rIdx}
                    className={`hover:bg-slate-50/50 transition-colors text-xs text-slate-700 ${
                      isCheapestOnScreen ? "bg-emerald-50/20" : ""
                    }`}
                  >
                    {/* Carrier Info */}
                    <td className="p-4 font-semibold text-slate-800">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span>{rate.carrier}</span>
                          {isCheapestOnScreen && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                              <Award className="h-2.5 w-2.5" />
                              {t.bestRate}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono tracking-tight flex items-center gap-1">
                          <Layers className="h-2.5 w-2.5" />
                          {t.sheetLabel}: {rate.sheetSource} | {rate.mes}
                        </span>
                      </div>
                    </td>

                    {/* Ocean Freight / Seefracht */}
                    <td className="p-4 text-right font-medium text-slate-800">
                      {formatCur(rate.oceanFreight)}
                    </td>

                    {/* FOB Charges */}
                    <td className="p-4 text-right text-slate-600">
                      {formatCur(rate.gastosFob)}
                    </td>

                    {/* Destination Local Charges */}
                    <td className="p-4 text-right text-slate-600">
                      {formatCur(rate.gastosDestino)}
                    </td>

                    {/* Optional Surcharge Components breakdown */}
                    <td className="p-4 text-right text-slate-500 hidden lg:table-cell text-[10px] font-mono">
                      <div className="flex justify-end gap-2.5 text-[10px]">
                        {rate.baf !== undefined && rate.baf > 0 && (
                          <span title="Bunker Adjustment Factor">BAF: <strong className="text-slate-600">{formatCur(rate.baf)}</strong></span>
                        )}
                        {rate.thc !== undefined && rate.thc > 0 && (
                          <span title="Terminal Handling Charge">THC: <strong className="text-slate-600">{formatCur(rate.thc)}</strong></span>
                        )}
                        {rate.lss !== undefined && rate.lss > 0 && (
                          <span title="Low Sulfur Surcharge">LSS: <strong className="text-slate-600">{formatCur(rate.lss)}</strong></span>
                        )}
                      </div>
                    </td>

                    {/* Total Overall Carrier Rate */}
                    <td className="p-4 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`font-mono font-bold text-sm ${isCheapestOnScreen ? "text-emerald-600" : "text-slate-900"}`}>
                          {formatCur(rate.total)}
                        </span>
                        {trendElement}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Dual Carrier Simulator Showcase */}
      {uniqueCarriersList.length >= 2 && summaryA && summaryB && (
        <div id="carrier-arena-showdown" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-200 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-950 text-indigo-400 border border-indigo-800/60 rounded-xl">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Carrier Versus Carrier Simulation Arena
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Simulate contract spreads and fee weights directly across custom forwarders.
              </p>
            </div>
          </div>

          {/* Selection Droppers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-1">
              <label htmlFor="arena-carrier-a" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                🔴 Carrier Selection Alpha
              </label>
              <select
                id="arena-carrier-a"
                value={carrierA}
                onChange={(e) => setCarrierA(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-indigo-500"
              >
                {uniqueCarriersList.map(c => (
                  <option key={`a-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="arena-carrier-b" className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                🔵 Carrier Selection Beta
              </label>
              <select
                id="arena-carrier-b"
                value={carrierB}
                onChange={(e) => setCarrierB(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-indigo-200 outline-none cursor-pointer focus:border-indigo-500"
              >
                {uniqueCarriersList.map(c => (
                  <option key={`b-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Scorecard Alpha */}
            <div className="bg-slate-950/60 p-4 border border-slate-800/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate max-w-[150px]">{carrierA}</span>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                  {summaryA.count} quotes
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Avg Total Freight</span>
                <span className="text-xl font-mono font-extrabold text-white">
                  {formatCur(summaryA.total)}
                </span>
              </div>
              <div className="border-t border-slate-850 pt-2 space-y-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Ocean Fret:</span>
                  <span className="font-mono">{formatCur(summaryA.ocean)}</span>
                </div>
                <div className="flex justify-between">
                  <span>FOB+Dest Locals:</span>
                  <span className="font-mono">{formatCur(summaryA.fob + summaryA.dest)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Surcharges (BAF/Others):</span>
                  <span className="font-mono">{formatCur(summaryA.baf + summaryA.thc + summaryA.lss + summaryA.other)}</span>
                </div>
              </div>
            </div>

            {/* Scorecard Showdown Result */}
            <div className="bg-gradient-to-br from-indigo-950/80 to-slate-950 p-5 border border-indigo-900/60 rounded-xl text-center flex flex-col justify-center items-center space-y-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                Financial Arbitrage Spread
              </span>

              {summaryA.total === summaryB.total ? (
                <div>
                  <p className="text-lg font-bold text-slate-300">Absolute Parity</p>
                  <p className="text-[11px] text-slate-450 mt-1">Both providers present exact matching tariff pricing indices.</p>
                </div>
              ) : (
                (() => {
                  const savesA = summaryA.total < summaryB.total;
                  const advantage = savesA ? summaryB.total - summaryA.total : summaryA.total - summaryB.total;
                  const pct = (advantage / (savesA ? summaryB.total : summaryA.total) * 100).toFixed(1);
                  return (
                    <div className="space-y-2">
                      <p className="text-3xl font-mono font-black text-emerald-400">
                        {formatCur(advantage)}
                      </p>
                      <p className="text-xs text-white">
                        <strong className="font-bold text-indigo-300">{savesA ? carrierA : carrierB}</strong> is{" "}
                        <span className="text-emerald-400 font-bold">{pct}% cheaper</span> on average.
                      </p>
                      <p className="text-[9px] text-slate-400 px-3">
                        Over an annual volume of 50 containers, this represents an estimated savings margin of{" "}
                        <strong className="text-emerald-400 font-mono">{formatCur(advantage * 50)}</strong>.
                      </p>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Scorecard Beta */}
            <div className="bg-slate-950/60 p-4 border border-slate-800/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate max-w-[150px]">{carrierB}</span>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                  {summaryB.count} quotes
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-medium">Avg Total Freight</span>
                <span className="text-xl font-mono font-extrabold text-white">
                  {formatCur(summaryB.total)}
                </span>
              </div>
              <div className="border-t border-slate-850 pt-2 space-y-1 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Ocean Fret:</span>
                  <span className="font-mono">{formatCur(summaryB.ocean)}</span>
                </div>
                <div className="flex justify-between">
                  <span>FOB+Dest Locals:</span>
                  <span className="font-mono">{formatCur(summaryB.fob + summaryB.dest)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Surcharges (BAF/Others):</span>
                  <span className="font-mono">{formatCur(summaryB.baf + summaryB.thc + summaryB.lss + summaryB.other)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Health & Compliancy Checks card */}
      <div id="logistics-lane-audit-panel" className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
            <AlertCircle className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Logistics Lane Sanity Audit
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Automated heuristics evaluating tariff structures and surcharge variances inside IndexedDB.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {laneInsights.map((check, idx) => (
            <div 
              key={`check-${idx}`} 
              className={`p-3.5 rounded-xl border flex gap-3 text-xs ${
                check.level === "success" 
                  ? "bg-emerald-50/40 border-emerald-100 text-slate-700"
                  : check.level === "warn"
                  ? "bg-amber-50/40 border-amber-100 text-slate-705"
                  : "bg-blue-50/30 border-blue-150 text-slate-700"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {check.level === "success" ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                ) : check.level === "warn" ? (
                  <ShieldAlert className="h-4 w-4 text-amber-650" />
                ) : (
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800 leading-tight">
                  {check.text}
                </p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  {check.subtext}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
