/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { 
  ArrowUpDown, Award, DollarSign, Split, TrendingDown, TrendingUp, Minus, 
  HelpCircle, Layers, CreditCard, Download, FileSpreadsheet, Scale, 
  ShieldAlert, AlertCircle, ThumbsUp, CheckCircle, Coins
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
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");
  
  // Carrier comparison helper variables
  // Find the absolute cheapest rate to highlight it
  const cheapestRate = filteredRates.length > 0
    ? filteredRates.reduce((min, current) => (current.total < min.total ? current : min), filteredRates[0])
    : null;

  // Sort the actual rates
  const sortedRates = useMemo(() => {
    return [...filteredRates].sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortAsc ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      }
    });
  }, [filteredRates, sortKey, sortAsc]);

  // Carrier simulation comparison states
  const [carrierA, setCarrierA] = useState<string>("");
  const [carrierB, setCarrierB] = useState<string>("");

  const [annualVolume, setAnnualVolume] = useState<number>(() => {
    const cached = localStorage.getItem("arena_annual_volume");
    if (cached) {
      const parsed = parseInt(cached, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 50;
  });

  const handleVolumeChange = (vol: number) => {
    setAnnualVolume(vol);
    localStorage.setItem("arena_annual_volume", String(vol));
  };

  const uniqueCarriersList = Array.from(new Set(filteredRates.map(r => r.carrier))).sort();

  // Algorithmic Carrier Efficiency Grading Helper
  const carrierGrades = useMemo(() => {
    if (filteredRates.length === 0) return [];
    
    // Group rates by carrier
    const carrierGroups: Record<string, { total: number; count: number; lanes: Set<string> }> = {};
    filteredRates.forEach(r => {
      const key = r.carrier;
      const laneKey = `${r.pol}➔${r.pod}`;
      if (!carrierGroups[key]) {
        carrierGroups[key] = { total: 0, count: 0, lanes: new Set<string>() };
      }
      carrierGroups[key].total += r.total;
      carrierGroups[key].count += 1;
      carrierGroups[key].lanes.add(laneKey);
    });
    
    // Compute averages
    const averages = Object.entries(carrierGroups).map(([carrier, data]) => {
      return {
        carrier,
        avgPrice: data.total / data.count,
        laneCount: data.lanes.size,
        totalCount: data.count
      };
    });
    
    if (averages.length === 0) return [];
    
    // Sort by price
    const sortedByPrice = [...averages].sort((a, b) => a.avgPrice - b.avgPrice);
    const minAvg = sortedByPrice[0].avgPrice;
    
    return averages.map(item => {
      const ratio = item.avgPrice / (minAvg || 1);
      let grade = "A+";
      let colorClass = "text-emerald-500 bg-emerald-50/50 border-emerald-100";
      let label = "Top Optimizer";
      
      if (ratio > 1.30) {
        grade = "D";
        colorClass = "text-red-500 bg-red-50/50 border-red-105";
        label = "Premium Price Bracket";
      } else if (ratio > 1.15) {
        grade = "C";
        colorClass = "text-amber-500 bg-amber-50/50 border-amber-105";
        label = "Standard Tier Pricing";
      } else if (ratio > 1.05) {
        grade = "B";
        colorClass = "text-indigo-500 bg-indigo-50/50 border-indigo-105";
        label = "Highly Competitive Price";
      } else if (ratio > 1.01) {
        grade = "A";
        colorClass = "text-teal-500 bg-teal-50/50 border-teal-105";
        label = "Cost Leader Associate";
      }
      
      return {
        ...item,
        grade,
        colorClass,
        label,
        ratio
      };
    }).sort((a, b) => a.avgPrice - b.avgPrice);
  }, [filteredRates]);

  // Group columns by POL, POD, and Carrier
  const columnsList = useMemo(() => {
    const colMap: Record<string, { pol: string; pod: string; carrier: string; rate: FreightRate }> = {};
    sortedRates.forEach(rate => {
      const key = `${rate.pol}||${rate.carrier}||${rate.pod}`;
      colMap[key] = {
        pol: rate.pol,
        pod: rate.pod,
        carrier: rate.carrier,
        rate: rate
      };
    });
    return Object.keys(colMap).sort().map(key => colMap[key]);
  }, [sortedRates]);

  // Extract all itemized surcharges
  const displayConceptsList = useMemo(() => {
    const META_KEYS = [
      'CONTRATO', 'Dias libres en Origen', 'Dias Libres en Destino', 
      'Effective Date', 'Valid Until', 'GASTOS FOB', 'SF + RECARGOS', 
      'Ocean freight', 'GASTOS EN DESTINO', 'NAC'
    ];
    const conceptsSet = new Set<string>();
    sortedRates.forEach(rate => {
      if (rate.conceptos) {
        Object.keys(rate.conceptos).forEach(c => {
          conceptsSet.add(c);
        });
      }
    });

    if (conceptsSet.size === 0) {
      const hasFob = sortedRates.some(r => r.gastosFob > 0);
      const hasDest = sortedRates.some(r => r.gastosDestino > 0);
      const hasBaf = sortedRates.some(r => (r.baf || 0) > 0);
      const hasThc = sortedRates.some(r => (r.thc || 0) > 0);
      const hasLss = sortedRates.some(r => (r.lss || 0) > 0);
      const hasOthers = sortedRates.some(r => (r.otrosRecargos || 0) > 0);

      if (hasFob) conceptsSet.add("FOB Local Charges");
      if (hasDest) conceptsSet.add("Destination Charges");
      if (hasBaf) conceptsSet.add("BAF (Fuel Fee)");
      if (hasThc) conceptsSet.add("THC (Terminal Charge)");
      if (hasLss) conceptsSet.add("LSS (Low Sulfur)");
      if (hasOthers) conceptsSet.add("Others Surcharges");
    }

    return Array.from(conceptsSet).filter(c => !META_KEYS.includes(c)).sort();
  }, [sortedRates]);

  const getConceptValue = (rate: FreightRate, concept: string): { val: number; divisa: string } | null => {
    if (rate.conceptos && rate.conceptos[concept] !== undefined) {
      const raw = rate.conceptos[concept];
      if (typeof raw === "object") {
        return { val: raw.val || 0, divisa: raw.divisa || "USD" };
      }
      return { val: Number(raw) || 0, divisa: "USD" };
    }
    
    if (concept === "FOB Local Charges" && rate.gastosFob > 0) return { val: rate.gastosFob, divisa: "USD" };
    if (concept === "Destination Charges" && rate.gastosDestino > 0) return { val: rate.gastosDestino, divisa: "USD" };
    if (concept === "BAF (Fuel Fee)" && rate.baf && rate.baf > 0) return { val: rate.baf, divisa: "USD" };
    if (concept === "THC (Terminal Charge)" && rate.thc && rate.thc > 0) return { val: rate.thc, divisa: "USD" };
    if (concept === "LSS (Low Sulfur)" && rate.lss && rate.lss > 0) return { val: rate.lss, divisa: "USD" };
    if (concept === "Others Surcharges" && rate.otrosRecargos && rate.otrosRecargos > 0) return { val: rate.otrosRecargos, divisa: "USD" };
    
    return null;
  };

  const getDualTotalOfRate = (rate: FreightRate) => {
    const META_KEYS = [
      'CONTRATO', 'Dias libres en Origen', 'Dias Libres en Destino', 
      'Effective Date', 'Valid Until', 'GASTOS FOB', 'SF + RECARGOS', 
      'Ocean freight', 'GASTOS EN DESTINO', 'NAC'
    ];

    let sumE = 0;
    let sumU = 0;
    
    if (rate.oceanFreight) {
      if ((rate.oceanFreightDivisa || "USD") === "EUR") sumE += rate.oceanFreight;
      else sumU += rate.oceanFreight;
    }
    
    if (rate.conceptos) {
      Object.entries(rate.conceptos).forEach(([c, value]) => {
        if (META_KEYS.includes(c)) return;
        const val = typeof value === "object" ? (value as any).val : (value as number);
        const divisa = typeof value === "object" ? ((value as any).divisa || "USD") : "USD";
        if (divisa === "EUR") sumE += val;
        else sumU += val;
      });
    } else {
      sumU += rate.total;
    }
    
    return { sumE, sumU };
  };

  const formatSurchargeVal = (val: number, divisa: string) => {
    const sym = divisa === "EUR" ? "€" : "$";
    return (
      <span className="flex items-center justify-end gap-1 font-mono font-semibold text-slate-800">
        <span>{val.toFixed(2)}</span>
        <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded border select-none ${
          divisa === "EUR" 
            ? "bg-emerald-50 text-emerald-700 border-emerald-250" 
            : "bg-blue-50 text-blue-700 border-blue-250"
        }`}>
          {sym}
        </span>
      </span>
    );
  };

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
            <p className="text-[10px] text-slate-450 mt-0.5">
              Refined tariff layout. Toggle different rendering structures for side-by-side audit.
            </p>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 mt-2.5 shrink-0 max-w-fit select-none">
              <button
                id="viewmode-matrix-btn"
                onClick={() => setViewMode("matrix")}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  viewMode === "matrix"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Surcharges Matrix
              </button>
              <button
                id="viewmode-list-btn"
                onClick={() => setViewMode("list")}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Standard List
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-emerald-705 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
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
              Multi-Currency
            </span>
          </div>
        </div>

        {viewMode === "matrix" ? (
          <div className="overflow-x-auto">
            <table id="comp-matrix-pivot-table" className="w-full text-left border-collapse min-w-[800px] text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-205">
                  <th className="p-4 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-r border-slate-200 min-w-[200px]">
                    Desglose de Conceptos
                  </th>
                  {columnsList.map((col, idx) => {
                    const isBest = cheapestRate && col.rate.id === cheapestRate.id;
                    return (
                      <th
                        key={`h-${idx}`}
                        className={`p-4 text-center border-r border-slate-150 min-w-[180px] ${
                          isBest ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9.5px] font-bold text-slate-550 bg-slate-100 px-2 py-0.5 rounded border border-slate-2.5/50 inline-block">
                            {col.pol} ➔ {col.pod}
                          </span>
                          <span className="text-xs font-black text-slate-900 leading-tight">
                            {col.carrier}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {/* 1. Ocean Freight Row */}
                <tr className="bg-slate-50/30">
                  <td className="p-3 font-semibold text-slate-700 bg-slate-100/40 border-r border-slate-200 pl-4">
                    Ocean Freight
                  </td>
                  {columnsList.map((col, idx) => {
                    const val = col.rate.oceanFreight;
                    const div = col.rate.oceanFreightDivisa || "USD";
                    const isBest = cheapestRate && col.rate.id === cheapestRate.id;
                    return (
                      <td key={`of-${idx}`} className={`p-3 text-right border-r border-slate-150 ${isBest ? "bg-emerald-50/10" : ""}`}>
                        {formatSurchargeVal(val, div)}
                      </td>
                    );
                  })}
                </tr>

                {/* 2. Custom Surcharges Rows */}
                {displayConceptsList.map((concept, cIdx) => (
                  <tr key={`concept-${cIdx}`} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-600 bg-slate-50/20 border-r border-slate-200 pl-4 truncate max-w-[240px]">
                      {concept}
                    </td>
                    {columnsList.map((col, idx) => {
                      const isBest = cheapestRate && col.rate.id === cheapestRate.id;
                      const res = getConceptValue(col.rate, concept);
                      return (
                        <td key={`cval-${cIdx}-${idx}`} className={`p-3 text-right border-r border-slate-150 ${isBest ? "bg-emerald-50/10" : ""}`}>
                          {res ? formatSurchargeVal(res.val, res.divisa) : <span className="text-slate-300 font-mono pr-4">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* 3. TOTALS row */}
                <tr className="bg-amber-50/20 border-t-2 border-amber-200 font-bold text-sm">
                  <td className="p-4 font-black text-amber-900 bg-amber-50/60 border-r border-slate-200 pl-4">
                    TOTAL
                  </td>
                  {columnsList.map((col, idx) => {
                    const isBest = cheapestRate && col.rate.id === cheapestRate.id;
                    const { sumE, sumU } = getDualTotalOfRate(col.rate);
                    
                    const formattedParts = [];
                    if (sumU > 0) formattedParts.push(`$${sumU.toFixed(2)}`);
                    if (sumE > 0) formattedParts.push(`€${sumE.toFixed(2)}`);

                    return (
                      <td
                        key={`total-${idx}`}
                        className={`p-4 text-right border-r border-slate-200 ${
                          isBest 
                            ? "bg-emerald-600 text-white font-extrabold shadow-inner" 
                            : "text-amber-800 bg-amber-55/15 font-bold"
                        }`}
                      >
                        <div className="flex flex-col items-end justify-center">
                          <span>{formattedParts.length ? formattedParts.join(" + ") : "0.00"}</span>
                          {isBest && (
                            <span className="text-[9px] font-black bg-white text-emerald-800 px-1.5 py-0.5 rounded mt-1 inline-block animate-pulse">
                              ★ MÁS BARATA
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* --- METADATA --- */}
                {/* 4. Contrato Row */}
                <tr className="bg-slate-50/40 text-[11px]">
                  <td className="p-3 font-semibold text-slate-500 border-r border-slate-200 pl-4">
                    Nº Contrato
                  </td>
                  {columnsList.map((col, idx) => {
                    const isBest = cheapestRate && col.rate.id === cheapestRate.id;
                    return (
                      <td key={`contr-${idx}`} className={`p-3 text-center font-bold text-slate-700 border-r border-slate-150 ${isBest ? "bg-emerald-50/10" : ""}`}>
                        {col.rate.contrato || "—"}
                      </td>
                    );
                  })}
                </tr>

                {/* 5. NAC Row */}
                <tr className="bg-slate-50/40 text-[11px]">
                  <td className="p-3 font-semibold text-slate-500 border-r border-slate-200 pl-4">
                    NAC
                  </td>
                  {columnsList.map((col, idx) => {
                    const isBest = cheapestRate && col.rate.id === cheapestRate.id;
                    return (
                      <td key={`nac-${idx}`} className={`p-3 text-center text-slate-700 border-r border-slate-150 ${isBest ? "bg-emerald-50/10" : ""}`}>
                        {col.rate.nac || "—"}
                      </td>
                    );
                  })}
                </tr>

                {/* 6. Días Libres (POL / POD) Row */}
                <tr className="bg-slate-50/40 text-[11px]">
                  <td className="p-3 font-semibold text-slate-500 border-r border-slate-200 pl-4">
                    Días Libres (POL / POD)
                  </td>
                  {columnsList.map((col, idx) => {
                    const isBest = cheapestRate && col.rate.id === cheapestRate.id;
                    return (
                      <td key={`free-${idx}`} className={`p-3 text-center text-slate-700 border-r border-slate-150 ${isBest ? "bg-emerald-50/10" : ""}`}>
                        {col.rate.diasLibresOrigen || "—"} / {col.rate.diasLibresDestino || "—"} días
                      </td>
                    );
                  })}
                </tr>

                {/* 7. Validez Row */}
                <tr className="bg-slate-50/40 text-[11px]">
                  <td className="p-3 font-semibold text-slate-500 border-r border-slate-200 pl-4">
                    Validez Tarifa
                  </td>
                  {columnsList.map((col, idx) => {
                    const isBest = cheapestRate && col.rate.id === cheapestRate.id;
                    const valStr = col.rate.validUntil ? String(col.rate.validUntil) : null;
                    return (
                      <td key={`val-${idx}`} className={`p-3 text-center text-slate-600 font-medium italic border-r border-slate-150 ${isBest ? "bg-emerald-50/10" : ""}`}>
                        {valStr ? `Hasta ${valStr}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
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
        )}
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

          {/* Selection Droppers & Volume Simulator */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-end">
            <div className="space-y-1">
              <label htmlFor="arena-carrier-a" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                🔴 Carrier Selection Alpha
              </label>
              <select
                id="arena-carrier-a"
                value={carrierA}
                onChange={(e) => setCarrierA(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-white outline-none cursor-pointer focus:border-indigo-500 font-sans font-semibold transition animate-none"
              >
                {uniqueCarriersList.map(c => (
                  <option key={`a-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="arena-carrier-b" className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block font-sans">
                🔵 Carrier Selection Beta
              </label>
              <select
                id="arena-carrier-b"
                value={carrierB}
                onChange={(e) => setCarrierB(e.target.value)}
                className="w-full bg-slate-850 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-indigo-200 outline-none cursor-pointer focus:border-indigo-500 font-sans font-semibold transition animate-none"
              >
                {uniqueCarriersList.map(c => (
                  <option key={`b-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-emerald-400" />
                  Annual Volume (FFE)
                </span>
                <span className="font-mono text-emerald-400 font-extrabold text-xs">{annualVolume} ctrs</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="500"
                  step="5"
                  value={annualVolume}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer my-1 text-indigo-500"
                />
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={annualVolume || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    handleVolumeChange(isNaN(val) ? 1 : Math.max(1, val));
                  }}
                  className="w-14 bg-slate-950/80 border border-slate-700/60 rounded px-1.5 py-0.5 font-mono text-[11px] text-center text-indigo-300 font-bold focus:border-indigo-500 outline-none"
                />
              </div>
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
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  Financial Arbitrage Spread
                </span>
                <span className="relative group inline-flex items-center">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400 hover:text-indigo-300 cursor-help transition-colors" />
                  <span className="pointer-events-none group-hover:pointer-events-auto absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-72 bg-slate-950/98 backdrop-blur-md text-slate-200 p-3.5 rounded-lg border border-indigo-500/50 shadow-[0_12px_40px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] opacity-0 group-hover:opacity-100 transition-all duration-300 delay-200 group-hover:delay-0 z-50 font-sans normal-case text-left">
                    <span className="block text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2 border-b border-indigo-500/20 pb-1.5 flex items-center justify-between">
                      <span>Arbitrage Calculation</span>
                      <span className="text-[10px] font-mono text-slate-400 font-normal">Est. Annual</span>
                    </span>
                    <span className="block text-[10.5px] text-slate-300 leading-relaxed mb-3">
                      Annual savings is derived by multiplying the estimated volume of {annualVolume} containers by the average freight rate spread.
                    </span>
                    <span className="space-y-1.5 block text-xs">
                      <span className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 text-[10.5px]">Annual Volume:</span>
                        <span className="font-mono text-[10.5px] font-bold text-slate-200">{annualVolume} Containers (FFE)</span>
                      </span>
                      <span className="flex justify-between items-center py-1 border-b border-slate-800/60">
                        <span className="text-slate-400 text-[10.5px]">Avg. Freight Spread:</span>
                        <span className="font-mono text-[10.5px] font-bold text-indigo-300">
                          {formatCur(Math.abs(summaryA.total - summaryB.total))}
                        </span>
                      </span>
                      <span className="flex justify-between items-center pt-1.5 text-indigo-300 font-semibold">
                        <span className="text-[11px]">Annual Impact (Savings):</span>
                        <span className="font-mono text-xs font-extrabold text-emerald-400">
                          {formatCur(Math.abs(summaryA.total - summaryB.total) * annualVolume)}
                        </span>
                      </span>
                    </span>
                  </span>
                </span>
              </div>

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
                        Over an annual volume of {annualVolume} containers, this represents an estimated savings margin of{" "}
                        <strong className="text-emerald-400 font-mono">{formatCur(advantage * annualVolume)}</strong>.
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

      {/* Smart Carrier Efficiency Card */}
      {carrierGrades.length > 0 && (
        <div id="smart-carrier-grades" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Smart Carrier Efficiency Grading
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Dynamic cost efficiency grades generated across trade-lane pricing benchmarks.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {carrierGrades.map((cg, idx) => (
              <div key={idx} className="bg-slate-50/50 border border-slate-150 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black text-slate-800 truncate pr-2" title={cg.carrier}>{cg.carrier}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-tight ${cg.colorClass}`}>
                      Grade {cg.grade}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-400 uppercase font-semibold">Average Tariff</p>
                    <p className="text-xs font-mono font-bold text-slate-800">
                      {formatCur(cg.avgPrice)}
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-slate-150 pt-2.5 mt-2.5 flex items-center justify-between text-[9px] text-slate-400">
                  <span>{cg.laneCount} Lane{cg.laneCount > 1 ? "s" : ""}</span>
                  <span className="font-semibold text-slate-500">{cg.label}</span>
                </div>
              </div>
            ))}
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
