/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  AlertTriangle, Sliders, CheckCircle, Download, HelpCircle, ArrowRight,
  Plus, Play, Info, Search, RefreshCw, XCircle, ChevronRight, CheckSquare, Square,
  Settings, ChevronDown, ChevronUp
} from "lucide-react";
import { FreightRate, LanguageCode } from "../types";
import { eventBus } from "../services/eventBus";

interface OutlierPanelProps {
  lang: LanguageCode;
  allRates: FreightRate[];
  filteredRates: FreightRate[];
}

interface LocalizedText {
  headerTitle: string;
  headerSub: string;
  methodLabel: string;
  percentMethod: string;
  zScoreMethod: string;
  scopeLabel: string;
  scopeAll: string;
  scopeFiltered: string;
  thresholdLabel: string;
  minLaneRatesLabel: string;
  statsTitle: string;
  statTotalAnomalies: string;
  statMaxDelta: string;
  statRiskLane: string;
  activeLanes: string;
  listTitle: string;
  tableColRate: string;
  tableColAvg: string;
  tableColDev: string;
  tableColActions: string;
  verifyTooltip: string;
  noOutliers: string;
  sandboxTitle: string;
  sandboxSub: string;
  sandboxBtn: string;
  visualizerDesc: string;
  visualizerTitle: string;
  settingsModalTitle: string;
  settingsBtnText: string;
  settingsSaveText: string;
  settingsRestoreDefaults: string;
  settingsSavedSuccess: string;
  settingsRestoreSuccess: string;
  defaultZScoreLabel: string;
  defaultPercentLabel: string;
}

const CONSOLE_TEXT: Record<LanguageCode, LocalizedText> = {
  en: {
    headerTitle: "DATA ENTRY AUDIT & OUTLIER DETECTOR",
    headerSub: "Detect and flag carrier rates that deviate significantly from trade lane averages to isolate typos or billing errors.",
    methodLabel: "Detection Method",
    percentMethod: "Percentage Above Average",
    zScoreMethod: "Statistical Standard Deviation (Z-Score)",
    scopeLabel: "Analysis Scope",
    scopeAll: "All Active Tariffs",
    scopeFiltered: "Currently Filtered Rates",
    thresholdLabel: "Sensitivity Threshold",
    minLaneRatesLabel: "Min Lane Tariffs to Analyze",
    statsTitle: "Audit Assessment Stats",
    statTotalAnomalies: "Anomalies Flagged",
    statMaxDelta: "Max Lane Deviation",
    statRiskLane: "Highest Variance Lane",
    activeLanes: "Active Trade Lanes Analyzed",
    listTitle: "High-Risk Cost Anomalies Detected",
    tableColRate: "Tariff Total",
    tableColAvg: "Lane Avg",
    tableColDev: "Deviation",
    tableColActions: "Audit State",
    verifyTooltip: "Mark as Manually Verified",
    noOutliers: "Outstanding! No billing errors or suspicious rate spikes were identified under current settings.",
    sandboxTitle: "Error Simulation Sandbox",
    sandboxSub: "Inoculate a typo (e.g., $18,000 for a $1,800 route) to verify that the auditing engine flags it instantly.",
    sandboxBtn: "Inject Audit Typo",
    visualizerDesc: "Select an anomaly card below to visualise the rate distribution dispersion on that specific trade lane.",
    visualizerTitle: "Lane Pricing Dispersion Visualizer",
    settingsModalTitle: "OUTLIER ENGINE CALIBRATION",
    settingsBtnText: "Engine Presets",
    settingsSaveText: "Save & Apply Preferences",
    settingsRestoreDefaults: "Restore Factory Defaults",
    settingsSavedSuccess: "Analytical parameters saved successfully in browser local storage!",
    settingsRestoreSuccess: "Calibrations restored to engineering defaults.",
    defaultZScoreLabel: "Default Standard Deviation (Z-Score)",
    defaultPercentLabel: "Default Percentage Above Average",
  },
  es: {
    headerTitle: "AUDITORÍA DE DATOS Y DETECTOR DE ERRORES",
    headerSub: "Detecte y marque fletes que se desvían de forma extrema del promedio de su ruta para aislar erratas de digitación.",
    methodLabel: "Método de Detección",
    percentMethod: "Porcentaje sobre el Promedio",
    zScoreMethod: "Desviación Estándar Estadística (Z-Score)",
    scopeLabel: "Ámbito de Análisis",
    scopeAll: "Todas las Tarifas",
    scopeFiltered: "Tarifas con Filtro Activo",
    thresholdLabel: "Sensibilidad de Alerta",
    minLaneRatesLabel: "Mín. Tarifas por Puerto",
    statsTitle: "Estadísticas de la Auditoría",
    statTotalAnomalies: "Alertas Activas",
    statMaxDelta: "Desviación Máxima",
    statRiskLane: "Ruta de Mayor Varianza",
    activeLanes: "Rutas Portuarias Analizadas",
    listTitle: "Anomalías de Coste de Alto Riesgo Detectadas",
    tableColRate: "Tarifa",
    tableColAvg: "Promedio",
    tableColDev: "Desviación",
    tableColActions: "Auditoría",
    verifyTooltip: "Marcar como Verificado Manualmente",
    noOutliers: "¡Excelente! No se identificaron errores de digitación ni tarifas sospechosas bajo los parámetros actuales.",
    sandboxTitle: "Simulador de Errores de Entrada de Datos",
    sandboxSub: "Inyecte un error de digitación (ej: $18,000 para flete de $1,800) para verificar la respuesta del motor de alarmas.",
    sandboxBtn: "Inyectar Errata de Prueba",
    visualizerDesc: "Seleccione una tarjeta de anomalía para visualizar la dispersión gráfica de tarifas en esa ruta.",
    visualizerTitle: "Visualizador de Dispersión en la Ruta",
    settingsModalTitle: "CALIBRACIÓN DEL MOTOR DE ALERTAS",
    settingsBtnText: "Ajustes del Motor",
    settingsSaveText: "Guardar y Aplicar Preferencias",
    settingsRestoreDefaults: "Restaurar Valores de Fábrica",
    settingsSavedSuccess: "¡Parámetros de auditoría guardados con éxito en el almacenamiento local!",
    settingsRestoreSuccess: "Ajustes restaurados a los valores predeterminados.",
    defaultZScoreLabel: "Desviación Estándar Predeterminada (Z-Score)",
    defaultPercentLabel: "Porcentaje sobre el Promedio Predeterminado",
  },
  de: {
    headerTitle: "DATENERFASSUNGS-AUDIT & AUSREISSER-DETEKTOR",
    headerSub: "Erkennen und markieren Sie Frachtraten, die stark vom Strecken-Durchschnitt abweichen, um Tippfehler zu isolieren.",
    methodLabel: "Erkennungsmethode",
    percentMethod: "Prozentual über Durchschnitt",
    zScoreMethod: "Statistische Standardabweichung (Z-Score)",
    scopeLabel: "Analyse-Bereich",
    scopeAll: "Alle registrierten Tarife",
    scopeFiltered: "Derzeit gefilterte Raten",
    thresholdLabel: "Empfindlichkeitsschwelle",
    minLaneRatesLabel: "Mindestanzahl an Raten pro Route",
    statsTitle: "Prüfungsstatistik",
    statTotalAnomalies: "Erkannte Anomalien",
    statMaxDelta: "Maximale Abweichung",
    statRiskLane: "Pfad mit höchster Varianz",
    activeLanes: "Analysierte Frachtrouten",
    listTitle: "Erkannte Hochrisiko-Kostenanomalien",
    tableColRate: "Tarif",
    tableColAvg: "Route-Schnitt",
    tableColDev: "Abweichung",
    tableColActions: "Prüstatus",
    verifyTooltip: "Als manuell verifiziert markieren",
    noOutliers: "Hervorragend! Unter den aktuellen Einstellungen wurden keine Tippfehler oder verdächtigen Preisspitzen gefunden.",
    sandboxTitle: "Tippfehler-Simulations-Sandbox",
    sandboxSub: "Injezieren Sie eine extreme Preisübertreibung (z.B. 18.000 $ statt 1.800 $), um den Alarm zu testen.",
    sandboxBtn: "Simulierten Tippfehler einfügen",
    visualizerDesc: "Wählen Sie eine Anomaliekarte aus, um die Preisverteilung auf dieser spezifischen Route anzuzeigen.",
    visualizerTitle: "Visualisierung der Preisstreuung der Route",
    settingsModalTitle: "KALIBRIERUNG DER AUSREISSER-ENGINE",
    settingsBtnText: "Standard-Voreinstellungen",
    settingsSaveText: "Einstellungen speichern & anwenden",
    settingsRestoreDefaults: "Werkseinstellungen wiederherstellen",
    settingsSavedSuccess: "Analyseparameter erfolgreich im Browser-Speicher gespeichert!",
    settingsRestoreSuccess: "Einstellungen auf Standardwerte zurückgesetzt.",
    defaultZScoreLabel: "Standard-Standardabweichung (Z-Score)",
    defaultPercentLabel: "Standard-Prozentsatz über Durchschnitt",
  }
};

interface AuditOutlier {
  rate: FreightRate;
  laneKey: string; // "POL||POD"
  laneAvg: number;
  deviationPercent: number;
  zScore: number;
  laneCount: number;
  allLaneTotals: number[];
  laneAvgComponents: {
    oceanFreight: number;
    gastosFob: number;
    gastosDestino: number;
    baf: number;
    thc: number;
    lss: number;
    otrosRecargos: number;
  };
}

export default function OutlierPanel({ lang, allRates, filteredRates }: OutlierPanelProps) {
  const t = CONSOLE_TEXT[lang] || CONSOLE_TEXT.en;

  // Configuration States
  const [method, setMethod] = useState<"percent" | "zscore">("percent");
  const [scope, setScope] = useState<"all" | "filtered">("all");
  const [percentThreshold, setPercentThreshold] = useState<number>(() => {
    const saved = localStorage.getItem("outlier_percent_threshold");
    return saved ? Number(saved) : 35;
  });
  const [zScoreThreshold, setZScoreThreshold] = useState<number>(() => {
    const saved = localStorage.getItem("outlier_zscore_threshold");
    return saved ? Number(saved) : 1.5;
  });
  const [minLaneCount, setMinLaneCount] = useState<number>(() => {
    const saved = localStorage.getItem("outlier_min_lane_count");
    return saved ? Number(saved) : 2;
  });
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Settings Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [bufferPercent, setBufferPercent] = useState<number>(35);
  const [bufferZScore, setBufferZScore] = useState<number>(1.5);
  const [bufferMinLaneCount, setBufferMinLaneCount] = useState<number>(2);

  // Audit verified checklist - saves ids of acknowledged records to prevent annoying noise
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(() => new Set());

  // Set of expanded row IDs for granular surcharge breakdowns
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const handleToggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Sandbox Simulated Custom Rates
  const [simulatedRates, setSimulatedRates] = useState<FreightRate[]>([]);
  const [sandboxPol, setSandboxPol] = useState<string>("ESBCN (BARCELONA)");
  const [sandboxPod, setSandboxPod] = useState<string>("USNYC (NEW YORK)");
  const [sandboxCarrier, setSandboxCarrier] = useState<string>("Simulation Carrier Co.");
  const [sandboxPrice, setSandboxPrice] = useState<number>(18500);

  // Selected outlier for dispersion visualizer
  const [selectedOutlierKey, setSelectedOutlierKey] = useState<string | null>(null);

  // Unique lanes in dataset
  const activeDataset = useMemo(() => {
    const raw = scope === "all" ? allRates : filteredRates;
    return [...raw, ...simulatedRates];
  }, [scope, allRates, filteredRates, simulatedRates]);

  // Aggregate Lanes and calculate outlier scores
  const laneAnalysis = useMemo(() => {
    // Group rates by Trade Lane: `POL ➔ POD`
    const groups: Record<string, FreightRate[]> = {};
    activeDataset.forEach(rate => {
      const key = `${rate.pol.trim()} ➔ ${rate.pod.trim()}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(rate);
    });

    const anomalies: AuditOutlier[] = [];
    let processedLanesCount = 0;
    let maxDeviation = 0;
    let highestVarianceLane = "—";
    let highestVarianceVal = 0;

    Object.entries(groups).forEach(([laneKey, ratesInLane]) => {
      if (ratesInLane.length < minLaneCount) return;
      processedLanesCount++;

      const prices = ratesInLane.map(r => r.total);
      const sum = prices.reduce((acc, p) => acc + p, 0);
      const mean = sum / ratesInLane.length;

      // Calculate component averages
      const avgOcean = ratesInLane.reduce((acc, r) => acc + (r.oceanFreight || 0), 0) / ratesInLane.length;
      const avgFob = ratesInLane.reduce((acc, r) => acc + (r.gastosFob || 0), 0) / ratesInLane.length;
      const avgDest = ratesInLane.reduce((acc, r) => acc + (r.gastosDestino || 0), 0) / ratesInLane.length;
      const avgBaf = ratesInLane.reduce((acc, r) => acc + (r.baf || 0), 0) / ratesInLane.length;
      const avgThc = ratesInLane.reduce((acc, r) => acc + (r.thc || 0), 0) / ratesInLane.length;
      const avgLss = ratesInLane.reduce((acc, r) => acc + (r.lss || 0), 0) / ratesInLane.length;
      const avgOtros = ratesInLane.reduce((acc, r) => acc + (r.otrosRecargos || 0), 0) / ratesInLane.length;

      // Calculate sample standard deviation
      let stdDev = 0;
      if (ratesInLane.length > 1) {
        const squaredDiffs = prices.map(p => Math.pow(p - mean, 2));
        const variance = squaredDiffs.reduce((acc, v) => acc + v, 0) / (ratesInLane.length - 1);
        stdDev = Math.sqrt(variance);
      }

      // Check for highest variance lane
      if (stdDev > highestVarianceVal) {
        highestVarianceVal = stdDev;
        highestVarianceLane = laneKey;
      }

      ratesInLane.forEach(rate => {
        // Compute metrics
        const pctDev = mean > 0 ? ((rate.total - mean) / mean) * 100 : 0;
        const zScore = stdDev > 0 ? (rate.total - mean) / stdDev : 0;

        // Save outlier details if flagged
        let isFlagged = false;
        if (method === "percent") {
          isFlagged = pctDev >= percentThreshold;
        } else {
          isFlagged = zScore >= zScoreThreshold && rate.total > mean;
        }

        if (isFlagged) {
          anomalies.push({
            rate,
            laneKey,
            laneAvg: Math.round(mean * 100) / 100,
            deviationPercent: Math.round(pctDev * 10) / 10,
            zScore: Math.round(zScore * 100) / 100,
            laneCount: ratesInLane.length,
            allLaneTotals: prices,
            laneAvgComponents: {
              oceanFreight: avgOcean,
              gastosFob: avgFob,
              gastosDestino: avgDest,
              baf: avgBaf,
              thc: avgThc,
              lss: avgLss,
              otrosRecargos: avgOtros
            }
          });

          if (pctDev > maxDeviation) {
            maxDeviation = pctDev;
          }
        }
      });
    });

    return {
      anomalies,
      processedLanesCount,
      maxDeviation: Math.round(maxDeviation * 10) / 10,
      highestVarianceLane
    };
  }, [activeDataset, minLaneCount, method, percentThreshold, zScoreThreshold]);

  // Handle Search inside isolated anomalies
  const filteredAnomalies = useMemo(() => {
    if (!searchTerm.trim()) return laneAnalysis.anomalies;
    const s = searchTerm.toLowerCase();
    return laneAnalysis.anomalies.filter(item => {
      return (
        item.laneKey.toLowerCase().includes(s) ||
        item.rate.carrier.toLowerCase().includes(s) ||
        (item.rate.sheetSource && item.rate.sheetSource.toLowerCase().includes(s))
      );
    });
  }, [laneAnalysis.anomalies, searchTerm]);

  // Automatically select the first outlier if none or invalid is selected
  useEffect(() => {
    if (filteredAnomalies.length > 0) {
      const exists = filteredAnomalies.some(item => getOutlierId(item) === selectedOutlierKey);
      if (!exists && !selectedOutlierKey) {
        setSelectedOutlierKey(getOutlierId(filteredAnomalies[0]));
      }
    } else {
      setSelectedOutlierKey(null);
    }
  }, [filteredAnomalies]);

  // Generate unique stable id for an outlier
  function getOutlierId(outlier: AuditOutlier): string {
    const rate = outlier.rate;
    return `${rate.id || 'sim'}-${rate.carrier}-${rate.mes}-${rate.pol}-${rate.pod}-${rate.total}`;
  }

  // Handle Manual Verification Toggle
  const handleToggleVerify = (outlier: AuditOutlier) => {
    const id = getOutlierId(outlier);
    setVerifiedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        eventBus.emit("system_log", {
          id: `unverify-${id}`,
          timestamp: new Date(),
          level: "info",
          message: `Oulier flagged again for manual tracking: ${outlier.rate.carrier} (${outlier.laneKey})`
        });
      } else {
        next.add(id);
        eventBus.emit("system_log", {
          id: `verify-${id}`,
          timestamp: new Date(),
          level: "success",
          message: `Manually verified and approved cost outlier: ${outlier.rate.carrier} charging ${outlier.rate.total} USD on ${outlier.laneKey}`
        });
      }
      return next;
    });
  };

  // Inject Test Typo Simulation
  const handleInjectSandbox = () => {
    const mockRate: FreightRate = {
      id: 9000 + simulatedRates.length,
      sheetSource: "SANDBOX_MOCK_ERROR",
      mes: "May 2026",
      pol: sandboxPol.toUpperCase(),
      pod: sandboxPod.toUpperCase(),
      carrier: sandboxCarrier,
      total: Number(sandboxPrice),
      gastosFob: Math.round(Number(sandboxPrice) * 0.1),
      oceanFreight: Math.round(Number(sandboxPrice) * 0.8),
      gastosDestino: Math.round(Number(sandboxPrice) * 0.1),
      baf: 100,
      thc: 150,
      lss: 50,
      contrato: "SIM-ERROR-99X",
      nac: "Spot"
    };

    setSimulatedRates(prev => [mockRate, ...prev]);
    eventBus.emit("system_log", {
      id: `inject-sim-${mockRate.id}`,
      timestamp: new Date(),
      level: "warn",
      message: `Injected mock outlier error of ${mockRate.total} USD on lane ${mockRate.pol} ➔ ${mockRate.pod} to verify analytical trigger.`
    });
  };

  // Clear simulated rates
  const handleClearSandbox = () => {
    setSimulatedRates([]);
    eventBus.emit("system_log", {
      id: "clear-sim-sandbox",
      timestamp: new Date(),
      level: "info",
      message: `Cleared all sandbox data-entry error simulations.`
    });
  };

  // Export audit outliers report as CSV
  const handleExportCSV = () => {
    if (laneAnalysis.anomalies.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Lane,Carrier,Total Tariff,Lane Average,Deviation Percentage,Z-Score,Data Source,Status,Contract Number,Period\n";

    laneAnalysis.anomalies.forEach(item => {
      const isVerified = verifiedIds.has(getOutlierId(item));
      const statusText = isVerified ? "VERIFIED (Approved)" : "WARNING (Potential Typo)";
      const row = [
        `"${item.laneKey}"`,
        `"${item.rate.carrier}"`,
        item.rate.total,
        item.laneAvg,
        `"${item.deviationPercent}%"`,
        item.zScore,
        `"${item.rate.sheetSource}"`,
        `"${statusText}"`,
        `"${item.rate.contrato || "None"}"`,
        `"${item.rate.mes}"`
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Freight_Data_Entry_Outliers_Audit_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    eventBus.emit("system_log", {
      id: "export-outliers-report",
      timestamp: new Date(),
      level: "success",
      message: `Exported data anomalies correction report: ${laneAnalysis.anomalies.length} outliers stored in CSV format.`
    });
  };

  // Save Settings permanently using localStorage
  const handleSaveSettings = (percent: number, zscore: number, minLane: number) => {
    localStorage.setItem("outlier_percent_threshold", String(percent));
    localStorage.setItem("outlier_zscore_threshold", String(zscore));
    localStorage.setItem("outlier_min_lane_count", String(minLane));
    
    setPercentThreshold(percent);
    setZScoreThreshold(zscore);
    setMinLaneCount(minLane);
    setIsSettingsOpen(false);
    
    eventBus.emit("system_log", {
      id: "save-outliers-settings",
      timestamp: new Date(),
      level: "success",
      message: t.settingsSavedSuccess
    });
  };

  // Restore Settings to original engineering defaults
  const handleRestoreDefaults = () => {
    localStorage.removeItem("outlier_percent_threshold");
    localStorage.removeItem("outlier_zscore_threshold");
    localStorage.removeItem("outlier_min_lane_count");
    
    setPercentThreshold(35);
    setZScoreThreshold(1.5);
    setMinLaneCount(2);

    setBufferPercent(35);
    setBufferZScore(1.5);
    setBufferMinLaneCount(2);
    setIsSettingsOpen(false);
    
    eventBus.emit("system_log", {
      id: "restore-outliers-settings",
      timestamp: new Date(),
      level: "info",
      message: t.settingsRestoreSuccess
    });
  };

  // Selected Outlier Info Helper for the dispersion graph
  const activeSelectedOutlier = useMemo(() => {
    if (!selectedOutlierKey) return null;
    return filteredAnomalies.find(item => getOutlierId(item) === selectedOutlierKey) || null;
  }, [selectedOutlierKey, filteredAnomalies]);

  // Compute other rates on the exact same lane for display comparison
  const selectedLaneRates = useMemo(() => {
    if (!activeSelectedOutlier) return [];
    const laneK = activeSelectedOutlier.laneKey;
    return activeDataset.filter(r => {
      const key = `${r.pol.trim()} ➔ ${r.pod.trim()}`;
      return key === laneK;
    }).sort((a,b) => a.total - b.total);
  }, [activeSelectedOutlier, activeDataset]);

  return (
    <div id="outlier-detector-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 shadow-xs mt-1 animate-pulse">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-wider">
              {t.headerTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
              {t.headerSub}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            id="trigger-outlier-settings-btn"
            onClick={() => {
              setBufferPercent(percentThreshold);
              setBufferZScore(zScoreThreshold);
              setBufferMinLaneCount(minLaneCount);
              setIsSettingsOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500 animate-[spin_8s_linear_infinite]" />
            <span>{t.settingsBtnText}</span>
          </button>

          {laneAnalysis.anomalies.length > 0 && (
            <button
              id="export-outliers-report-btn"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>EXPORT CSV AUDIT</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Analytical Controls & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left - Sliders Control Board */}
        <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-slate-200/60 p-4 space-y-4">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs border-b border-slate-200 pb-2 mb-1">
            <Sliders className="h-4 w-4 text-indigo-500" />
            <span>Audit Engine Configuration</span>
          </div>

          {/* Analysis Scope Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
              <span>{t.scopeLabel}</span>
              <span className="text-indigo-600 lowercase font-medium">({activeDataset.length} options)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="outlier-scope-all-btn"
                onClick={() => setScope("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  scope === "all"
                    ? "bg-white text-indigo-700 border-indigo-200 shadow-xs"
                    : "bg-slate-150/40 text-slate-600 border-transparent hover:bg-slate-100"
                }`}
              >
                {t.scopeAll}
              </button>
              <button
                id="outlier-scope-filtered-btn"
                onClick={() => setScope("filtered")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  scope === "filtered"
                    ? "bg-white text-indigo-700 border-indigo-200 shadow-xs"
                    : "bg-slate-150/40 text-slate-600 border-transparent hover:bg-slate-100"
                }`}
              >
                {t.scopeFiltered}
              </button>
            </div>
          </div>

          {/* Detector Method Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {t.methodLabel}
            </label>
            <select
              id="outlier-method-select"
              value={method}
              onChange={(e) => setMethod(e.target.value as "percent" | "zscore")}
              className="w-full text-xs font-medium rounded-lg border border-slate-250 bg-white p-2 text-slate-700 focus:outline-indigo-500 cursor-pointer"
            >
              <option value="percent">{t.percentMethod}</option>
              <option value="zscore">{t.zScoreMethod}</option>
            </select>
          </div>

          {/* Dynamic Slider controls depending on method */}
          {method === "percent" ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  {t.thresholdLabel}
                </label>
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                  +{percentThreshold}%
                </span>
              </div>
              <input
                id="outlier-percent-slider"
                type="range"
                min="10"
                max="100"
                step="5"
                value={percentThreshold}
                onChange={(e) => setPercentThreshold(Number(e.target.value))}
                className="w-full text-indigo-600 outline-none accent-indigo-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
              />
              <p className="text-[9px] text-slate-400 italic">
                Flags any tariff rate that costs &gt; {percentThreshold}% more than the average rate of other carriers in the exact same port-to-port lane.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Sensitivity Z-Score Limit
                </label>
                <span className="text-xs font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                  {zScoreThreshold} σ
                </span>
              </div>
              <input
                id="outlier-zscore-slider"
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={zScoreThreshold}
                onChange={(e) => setZScoreThreshold(Number(e.target.value))}
                className="w-full text-purple-600 outline-none accent-purple-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
              />
              <p className="text-[9px] text-slate-400 italic">
                Flags tariffs where Z-Score &gt; {zScoreThreshold} (standard deviations higher than mean cost for the specific lane). Recommended for statistical batch screening.
              </p>
            </div>
          )}

          {/* Min Lane Count */}
          <div className="space-y-1.5 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {t.minLaneRatesLabel}
              </label>
              <span className="text-xs font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md">
                {minLaneCount} tariffs minimum
              </span>
            </div>
            <input
              id="outlier-minelement-slider"
              type="range"
              min="1"
              max="5"
              step="1"
              value={minLaneCount}
              onChange={(e) => setMinLaneCount(Number(e.target.value))}
              className="w-full accent-slate-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
            />
            <p className="text-[9px] text-slate-400">
              Only runs error analysis on trade routes that have at least {minLaneCount} loaded carrier offers. Saves computing calculations on unique custom routes.
            </p>
          </div>

        </div>

        {/* Right - Audit Dashboard Bento Grid Info */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          
          <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest pl-1 mt-1">
            {t.statsTitle}
          </h3>

          <div className="grid grid-cols-2 gap-4 flex-1">
            
            {/* Box 1: Tariffs Flagged */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between transition ${
              laneAnalysis.anomalies.length > 0 
                ? "bg-rose-50/40 border-rose-200/70" 
                : "bg-emerald-50/15 border-emerald-100"
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  {t.statTotalAnomalies}
                </span>
                <span className={`text-3xl font-black block mt-2 ${
                  laneAnalysis.anomalies.length > 0 ? "text-rose-600" : "text-emerald-600"
                }`}>
                  {laneAnalysis.anomalies.length}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold mt-2">
                {verifiedIds.size} flagged rates verified by user
              </span>
            </div>

            {/* Box 2: Max Deviation */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  {t.statMaxDelta}
                </span>
                <span className="text-3xl font-black text-rose-600 mt-2 block">
                  {laneAnalysis.maxDeviation > 0 ? `+${laneAnalysis.maxDeviation}%` : "0%"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2">
                Above the standard lane mean price
              </span>
            </div>

            {/* Box 3: Highest Variance Lane */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 flex flex-col justify-between col-span-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {t.statRiskLane}
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block max-w-sm truncate">
                    {laneAnalysis.highestVarianceLane}
                  </span>
                </div>
                <div className="text-indigo-650 bg-indigo-50 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded">
                  Highest Variance
                </div>
              </div>
              <p className="text-[9px] text-slate-400 mt-2">
                This trade route displays the widest gap between loaded carrier pricing estimates.
              </p>
            </div>

          </div>

          <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-150 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
            <span>{t.activeLanes}: <strong className="text-slate-800">{laneAnalysis.processedLanesCount}</strong></span>
            <span>Unfiltered DB Count: <strong className="text-slate-800">{allRates.length}</strong></span>
          </div>

        </div>

      </div>

      {/* 3. Core Outlier List & Interactive Dispersion Visualizer Area */}
      {laneAnalysis.anomalies.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pt-2 border-t border-slate-100">
          
          {/* List of Suspicious Rates (7 Cols) */}
          <div className="xl:col-span-7 space-y-3">
            
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 select-none">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>{t.listTitle}</span>
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                  {filteredAnomalies.length}
                </span>
              </h4>
              <div className="relative flex items-center shrink-0">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 pointer-events-none" />
                <input
                  id="outlier-search"
                  type="text"
                  placeholder="Filter by Carrier / Lane..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 pr-2.5 py-1 text-[10px] font-medium placeholder-slate-400 bg-white border border-slate-200 rounded-md focus:outline-indigo-500 w-44"
                />
              </div>
            </div>

            {/* Scrollable list card container */}
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1.5 custom-console-scrollbar">
              {filteredAnomalies.map((item, idx) => {
                const isVerified = verifiedIds.has(getOutlierId(item));
                const isSelected = selectedOutlierKey === getOutlierId(item);
                const isExpanded = expandedIds.has(getOutlierId(item));
                
                return (
                  <div
                    key={`anom-${idx}`}
                    onClick={() => setSelectedOutlierKey(getOutlierId(item))}
                    className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex flex-col gap-3.5 ${
                      isSelected 
                        ? "bg-amber-50/15 border-amber-400/80 shadow-xs ring-1 ring-amber-400/30" 
                        : isVerified
                          ? "bg-slate-50/40 border-slate-150 opacity-70 hover:opacity-100"
                          : "bg-white border-slate-200/80 hover:bg-slate-50/40"
                    }`}
                  >
                    {/* Upper Summary Row block */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        
                        {/* Checkboxes flag state */}
                        <button
                          id={`verify-checkbox-${idx}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVerify(item);
                          }}
                          className={`p-1.5 rounded-lg border hover:bg-slate-50 transition shrink-0 mt-0.5 ${
                            isVerified 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-300" 
                              : "bg-white text-slate-400 border-slate-250 hover:text-rose-500"
                          }`}
                          title={t.verifyTooltip}
                        >
                          {isVerified ? (
                            <CheckCircle className="h-4 w-4 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs font-black ${isVerified ? "text-slate-500 line-through" : "text-slate-900"}`}>
                              {item.rate.carrier}
                            </span>
                            <span className="text-[8px] bg-indigo-50 text-indigo-700 font-bold border border-indigo-150 px-1 py-0.2 rounded" title="Spreadsheet source cell container">
                              {item.rate.sheetSource || "DATOS"}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-slate-550 font-semibold tracking-tight mt-0.5 flex items-center gap-1 flex-wrap">
                            <span className="text-slate-700 font-bold">{item.rate.pol}</span>
                            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0 inline" />
                            <span className="text-slate-700 font-bold">{item.rate.pod}</span>
                            <span className="text-[10px] text-slate-400 font-medium">({item.rate.mes})</span>
                          </p>

                          <div className="flex gap-2.5 mt-2 text-[10px] font-mono text-slate-450 items-center flex-wrap">
                            <span>{t.tableColAvg}: <strong className="text-slate-700 font-bold">${item.laneAvg}</strong></span>
                            <span>In Lane: <strong className="text-slate-700 font-bold">{item.laneCount} rates</strong></span>
                            
                            {/* Expand toggle button */}
                            <button
                              id={`details-toggle-${idx}`}
                              type="button"
                              onClick={(e) => handleToggleExpand(getOutlierId(item), e)}
                              className="flex items-center gap-1 text-[9.5px] font-extrabold text-indigo-600 hover:text-indigo-850 bg-indigo-50/80 hover:bg-indigo-100 px-2.5 py-0.5 rounded transition tracking-wide cursor-pointer uppercase select-none font-sans border border-indigo-150/50 block sm:inline-block"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  <span>Hide Detail</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  <span>Expand to Detail</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Cost Metrics Side */}
                      <div className="flex sm:flex-col items-end gap-1 shrink-0 w-full sm:w-auto text-right">
                        <div className="flex items-baseline gap-1 bg-slate-50/50 sm:bg-transparent px-2 sm:px-0 py-1 sm:py-0 rounded w-full sm:w-auto justify-between sm:justify-end font-mono">
                          <span className="text-[10px] text-slate-400 sm:hidden block font-sans font-bold">RATE TOTAL:</span>
                          <span className={`text-sm font-black ${isVerified ? "text-slate-500" : "text-slate-900"}`}>
                            ${item.rate.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 justify-end w-full sm:w-auto">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded tracking-tight ${
                            isVerified
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-rose-50 text-rose-700 border border-rose-150"
                          }`}>
                            +{item.deviationPercent}%
                          </span>
                          
                          {method === "zscore" && (
                            <span className="text-[10px] font-bold text-indigo-700 font-mono">
                              Z:{item.zScore}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Comparative Drilled Down Surcharges Section */}
                    {isExpanded && (
                      <div 
                        className="pt-3 border-t border-slate-150/75 space-y-3 cursor-default"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                          <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-wider">
                            Surcharges & Fees Forensic Audit
                          </span>
                          <span className="text-[9px] text-indigo-650 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded font-semibold">
                            Specific Rate vs Lane Averages
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { label: "Ocean Freight Base", rateVal: item.rate.oceanFreight || 0, avgVal: item.laneAvgComponents.oceanFreight },
                            { label: "Bunker surcharge (BAF)", rateVal: item.rate.baf || 0, avgVal: item.laneAvgComponents.baf },
                            { label: "Terminal surcharge (THC)", rateVal: item.rate.thc || 0, avgVal: item.laneAvgComponents.thc },
                            { label: "Low Sulphur Surcharge (LSS)", rateVal: item.rate.lss || 0, avgVal: item.laneAvgComponents.lss },
                            { label: "Other Recargos", rateVal: item.rate.otrosRecargos || 0, avgVal: item.laneAvgComponents.otrosRecargos },
                            { label: "Local charges Origin (FOB)", rateVal: item.rate.gastosFob || 0, avgVal: item.laneAvgComponents.gastosFob },
                            { label: "Local charges Destination", rateVal: item.rate.gastosDestino || 0, avgVal: item.laneAvgComponents.gastosDestino },
                          ].map((comp, cIdx) => {
                            const diff = comp.rateVal - comp.avgVal;
                            const pctDiff = comp.avgVal > 0 ? (diff / comp.avgVal) * 100 : 0;
                            const isHigher = diff > 0.01;
                            
                            return (
                              <div 
                                key={`comp-${cIdx}`}
                                className="bg-white p-2 border border-slate-200/85 rounded-lg flex flex-col justify-between gap-1 shadow-xs select-text"
                              >
                                <div className="flex justify-between items-center gap-1 bg-slate-50/30 px-1.5 py-0.5 rounded">
                                  <span className="font-semibold text-slate-700 text-[10px] truncate" title={comp.label}>
                                    {comp.label}
                                  </span>
                                  {isHigher ? (
                                    <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded border shrink-0 ${
                                      pctDiff >= 25 
                                        ? "bg-rose-50 text-rose-700 border-rose-150" 
                                        : "bg-amber-50 text-amber-700 border-amber-100/80"
                                    }`}>
                                      +{pctDiff.toFixed(0)}%
                                    </span>
                                  ) : diff < -0.01 ? (
                                    <span className="text-[8.5px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.2 rounded font-bold shrink-0">
                                      {pctDiff.toFixed(0)}%
                                    </span>
                                  ) : (
                                    <span className="text-[8.5px] text-slate-400 font-medium shrink-0">Equal</span>
                                  )}
                                </div>
                                
                                <div className="flex justify-between items-center font-mono text-[9.5px] px-1 mt-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400 text-[8.5px] font-sans">Rate:</span>
                                    <span className="font-bold text-slate-800">${comp.rateVal.toFixed(2)}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400 text-[8.5px] font-sans">Avg:</span>
                                    <span className="text-slate-550 font-medium">${comp.avgVal.toFixed(2)}</span>
                                  </div>
                                </div>

                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative mt-1 select-none">
                                  {(() => {
                                    const maxVal = Math.max(comp.rateVal, comp.avgVal, 1);
                                    const rateWidth = (comp.rateVal / maxVal) * 100;
                                    const avgWidth = (comp.avgVal / maxVal) * 100;
                                    return (
                                      <>
                                        <div 
                                          className="absolute left-0 top-0 h-full bg-slate-300/60" 
                                          style={{ width: `${avgWidth}%` }}
                                        />
                                        <div 
                                          className={`absolute left-0 top-0 h-full ${
                                            isHigher 
                                              ? pctDiff >= 25 
                                                ? "bg-rose-500" 
                                                : "bg-amber-500" 
                                              : "bg-indigo-600"
                                          } opacity-90`} 
                                          style={{ width: `${rateWidth}%` }}
                                        />
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>

          {/* Interactive Scatter Column Visualizer (5 Cols) */}
          <div className="xl:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h4 className="text-xs font-black text-slate-800 tracking-wider flex items-center gap-1.5">
                  <Play className="h-4.5 w-4.5 text-indigo-500 rotate-90 fill-indigo-100" />
                  {t.visualizerTitle}
                </h4>
                {activeSelectedOutlier && (
                  <span className="text-[9.5px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                    {activeSelectedOutlier.rate.mes}
                  </span>
                )}
              </div>

              {activeSelectedOutlier ? (
                <div className="pt-4 space-y-4">
                  {/* Summary text */}
                  <div className="text-[11px] text-slate-600 leading-relaxed bg-white border border-slate-150 p-3 rounded-xl shadow-xs">
                    <span className="font-bold text-slate-800 block mb-1">
                      {activeSelectedOutlier.laneKey}
                    </span>
                    The premium rate for <strong className="text-slate-900 font-bold">{activeSelectedOutlier.rate.carrier}</strong> is priced at <strong className="text-rose-600 font-bold">${activeSelectedOutlier.rate.total}</strong>. This stands <strong className="text-rose-600 font-extrabold">+{activeSelectedOutlier.deviationPercent}%</strong> above the lane average of <strong className="text-slate-900">${activeSelectedOutlier.laneAvg}</strong> from other carriers.
                  </div>

                  {/* Pricing dispersion strip */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Carrier Position Dispersion Chart
                    </label>

                    {/* SVG Graphic scatter timeline */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 relative">
                      <div className="h-10 w-full relative flex items-center">
                        {/* Horizontal Baseline */}
                        <div className="h-1 bg-slate-200 w-full rounded-full"></div>
                        
                        {/* Mean line indicator marker */}
                        {(() => {
                          const totals = selectedLaneRates.map(r => r.total);
                          const min = Math.min(...totals) * 0.85;
                          const max = Math.max(...totals) * 1.1;
                          const range = max - min;
                          const meanX = ((activeSelectedOutlier.laneAvg - min) / range) * 100;
                          
                          return (
                            <>
                              {/* Mean Vertical Anchor Line */}
                              <div 
                                className="absolute h-full border-l border-dashed border-slate-450 text-slate-500 flex flex-col items-center justify-between"
                                style={{ left: `${Math.max(5, Math.min(95, meanX))}%` }}
                              >
                                <span className="text-[8px] font-bold bg-slate-150 px-1 py-0.1 rounded -mt-2 uppercase tracking-widest leading-none select-none border">Avg</span>
                                <div className="h-5 border-l border-slate-400"></div>
                              </div>

                              {/* Carrier dots plotting */}
                              {selectedLaneRates.map((rate, rIdx) => {
                                const isCurrentFlagged = rate.total === activeSelectedOutlier.rate.total;
                                const pctX = ((rate.total - min) / range) * 100;

                                return (
                                  <div
                                    key={`dot-${rIdx}`}
                                    className={`absolute group cursor-help`}
                                    style={{ left: `${Math.max(2, Math.min(96, pctX))}%` }}
                                  >
                                    <div className={`h-4 w-4 rounded-full flex items-center justify-center -ml-2 transition-all ${
                                      isCurrentFlagged 
                                        ? "bg-rose-600 text-white font-bold text-[8px] ring-4 ring-rose-200 shadow-md animate-bounce" 
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white text-[8px]"
                                    }`}>
                                      {isCurrentFlagged ? "!" : ""}
                                    </div>
                                    
                                    {/* Tooltip on hover */}
                                    <div className="hidden group-hover:block absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9.5px] p-2 rounded-lg shadow-xl border border-slate-700 whitespace-nowrap z-50">
                                      <p className="font-extrabold">{rate.carrier}</p>
                                      <p className="font-mono text-[9px] text-slate-300">${rate.total.toFixed(2)}</p>
                                      <p className="text-[8.5px] text-indigo-300">{rate.sheetSource}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>

                      {/* Timeline legend cost values */}
                      <div className="flex justify-between text-[9px] font-mono text-slate-400 border-t border-slate-100 pt-2 mt-1 select-none">
                        <span>Low Lane Estimate: ${Math.min(...selectedLaneRates.map(r => r.total)).toFixed(0)}</span>
                        <span className="font-bold text-slate-700">Mean: ${activeSelectedOutlier.laneAvg.toFixed(0)}</span>
                        <span>High Estimate: ${Math.max(...selectedLaneRates.map(r => r.total)).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* List of elements in this lane */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block select-none">
                      Lane Carrier Cost Breakdown:
                    </label>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {selectedLaneRates.map((rate, rIdx) => {
                        const isOutlierRate = rate.total === activeSelectedOutlier.rate.total;
                        return (
                          <div
                            key={`lc-${rIdx}`}
                            className={`p-2 rounded-lg border text-xs flex justify-between items-center ${
                              isOutlierRate 
                                ? "bg-rose-50/50 border-rose-200 text-rose-900 font-bold" 
                                : "bg-white border-slate-205 text-slate-700"
                            }`}
                          >
                            <span className="truncate max-w-[185px]">{rate.carrier}</span>
                            <span className="font-mono">${rate.total.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-400">
                  {t.visualizerDesc}
                </div>
              )}

            </div>

            <div className="text-[9.5px] text-slate-400 bg-white/70 px-3 py-2 rounded-lg border border-slate-150 mt-4 leading-relaxed select-none">
              <span className="font-bold text-slate-600 uppercase tracking-widest block mb-0.5">Audit Tip:</span>
              Rates of the same POL/POD normally have less than 15% variation. If you find anomalies above 50%, ask the shipper to confirm if they mixed different container dimensions (e.g. 20ft vs 40ft HC) in the original excel cell.
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-emerald-50/30 rounded-2xl border border-emerald-100 p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div className="max-w-md">
            <h4 className="font-bold text-emerald-800 text-sm">Data Audit Verified</h4>
            <p className="text-xs text-emerald-600 mt-1">
              {t.noOutliers}
            </p>
          </div>
        </div>
      )}

      {/* 4. Simulation Playground Section */}
      <div id="sandbox-playground-row" className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
          <div>
            <h4 className="text-xs font-black text-slate-800 tracking-wider">
              {t.sandboxTitle}
            </h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {t.sandboxSub}
            </p>
          </div>
          
          {simulatedRates.length > 0 && (
            <button
              id="clear-simulation-playground-btn"
              onClick={handleClearSandbox}
              className="px-2.5 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition cursor-pointer"
            >
              Clear Simulation
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
          
          {/* POL Selector input */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-450 block">Origin (POL)</label>
            <select
              id="sandbox-pol-select"
              value={sandboxPol}
              onChange={(e) => setSandboxPol(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-250 bg-white p-2 font-medium text-slate-700"
            >
              <option value="ESBCN (BARCELONA)">ESBCN (BARCELONA)</option>
              <option value="CNSHA (SHANGHAI)">CNSHA (SHANGHAI)</option>
              <option value="USLAX (LOS ANGELES)">USLAX (LOS ANGELES)</option>
              <option value="DEHAM (HAMBURG)">DEHAM (HAMBURG)</option>
            </select>
          </div>

          {/* POD Selector input */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-450 block">Destination (POD)</label>
            <select
              id="sandbox-pod-select"
              value={sandboxPod}
              onChange={(e) => setSandboxPod(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-250 bg-white p-2 font-medium text-slate-700"
            >
              <option value="USNYC (NEW YORK)">USNYC (NEW YORK)</option>
              <option value="ESVLC (VALENCIA)">ESVLC (VALENCIA)</option>
              <option value="SGPIN (SINGAPORE)">SGPIN (SINGAPORE)</option>
              <option value="NLRTM (ROTTERDAM)">NLRTM (ROTTERDAM)</option>
            </select>
          </div>

          {/* Price input */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-450 block">Simulated Price (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
              <input
                id="sandbox-price-input"
                type="number"
                value={sandboxPrice}
                onChange={(e) => setSandboxPrice(Math.max(0, Number(e.target.value)))}
                className="w-full text-xs rounded-lg border border-slate-250 bg-white p-2 pl-6 font-mono font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Inject Button */}
          <button
            id="inject-sandbox-rate-btn"
            onClick={handleInjectSandbox}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-lg border border-indigo-700 transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-200 duration-200 cursor-pointer h-[38px]"
          >
            <Plus className="h-4 w-4" />
            <span>{t.sandboxBtn}</span>
          </button>

        </div>
      </div>

      {/* Settings Modal Overlay */}
      {isSettingsOpen && (
        <div 
          id="outlier-settings-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all duration-200"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div 
            id="outlier-settings-modal-content"
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden scale-100 transition-transform duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 bg-slate-50">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-600 animate-[spin_10s_linear_infinite]" />
                <h3 className="text-xs font-black text-slate-800 tracking-wider">
                  {t.settingsModalTitle}
                </h3>
              </div>
              <button
                id="close-outlier-settings-btn"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              
              {/* Percentage Threshold slider in bufferState */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {t.defaultPercentLabel}
                  </label>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    +{bufferPercent}%
                  </span>
                </div>
                <input
                  id="settings-percent-slider"
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={bufferPercent}
                  onChange={(e) => setBufferPercent(Number(e.target.value))}
                  className="w-full text-indigo-600 outline-none accent-indigo-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                />
                <p className="text-[9px] text-slate-400">
                  Initial standard percentage sensitivity applied when switching to the Average-deviation engine.
                </p>
              </div>

              {/* Z-Score threshold slider in bufferState */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {t.defaultZScoreLabel}
                  </label>
                  <span className="text-xs font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                    {bufferZScore} σ
                  </span>
                </div>
                <input
                  id="settings-zscore-slider"
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={bufferZScore}
                  onChange={(e) => setBufferZScore(Number(e.target.value))}
                  className="w-full text-purple-600 outline-none accent-purple-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                />
                <p className="text-[9px] text-slate-400">
                  Initial statistical standard deviation threshold for mathematical distribution filter.
                </p>
              </div>

              {/* Minimum Trade Lane count */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    {t.minLaneRatesLabel}
                  </label>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {bufferMinLaneCount}
                  </span>
                </div>
                <input
                  id="settings-minlane-slider"
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={bufferMinLaneCount}
                  onChange={(e) => setBufferMinLaneCount(Number(e.target.value))}
                  className="w-full outline-none accent-slate-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-150 bg-slate-50">
              <button
                id="restore-settings-defaults-btn"
                onClick={handleRestoreDefaults}
                className="text-[10px] uppercase font-bold text-slate-500 hover:text-rose-600 transition tracking-wider cursor-pointer"
              >
                {t.settingsRestoreDefaults}
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="cancel-settings-btn"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-250 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="save-settings-btn"
                  onClick={() => handleSaveSettings(bufferPercent, bufferZScore, bufferMinLaneCount)}
                  className="px-3.5 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg border border-indigo-700 shadow-sm transition cursor-pointer"
                >
                  {t.settingsSaveText}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
