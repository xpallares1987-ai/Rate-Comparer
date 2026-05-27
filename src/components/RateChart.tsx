/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { BarChart, Info, ArrowLeft, TrendingUp, Calendar, DollarSign, ArrowRight, Layers, Anchor, Compass, Globe, TrendingDown, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FreightRate, TranslationSet } from "../types";

// Register all required modules in ChartJS to prevent runtime setup omissions
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Normalizes a port text reference and resolves its default GPS coordinate
 */
export function getPortCoordinates(portStr: string): [number, number] {
  const norm = portStr.toUpperCase().trim();
  
  if (norm.includes("BARCELONA") || norm.includes("BCN")) return [41.38, 2.17];
  if (norm.includes("VALENCIA") || norm.includes("VLC")) return [39.46, -0.37];
  if (norm.includes("SHANGHAI") || norm.includes("SHA")) return [31.23, 121.47];
  if (norm.includes("NEW YORK") || norm.includes("NYC") || norm.includes("NEWYORK")) return [40.71, -74.00];
  if (norm.includes("NINGBO") || norm.includes("NGB")) return [29.86, 121.54];
  if (norm.includes("SHENZHEN") || norm.includes("SZX")) return [22.54, 114.05];
  if (norm.includes("QINGDAO") || norm.includes("TAO")) return [36.06, 120.38];
  if (norm.includes("ROTTERDAM") || norm.includes("RTM")) return [51.92, 4.47];
  if (norm.includes("HAMBURG") || norm.includes("HAM")) return [53.55, 9.99];
  if (norm.includes("LOS ANGELES") || norm.includes("LAX") || norm.includes("OAKLAND") || norm.includes("OAK")) return [34.05, -118.24];
  if (norm.includes("SINGAPORE") || norm.includes("SGP")) return [1.35, 103.81];
  if (norm.includes("BUSAN") || norm.includes("PUS")) return [35.18, 129.07];
  if (norm.includes("HONG KONG") || norm.includes("HKG") || norm.includes("HONGKONG")) return [22.31, 114.16];
  if (norm.includes("TOKYO") || norm.includes("TYO") || norm.includes("JPTYO")) return [35.67, 139.65];
  if (norm.includes("LONDON") || norm.includes("LON") || norm.includes("GBLON")) return [51.50, -0.12];
  if (norm.includes("MIAMI") || norm.includes("MIA")) return [25.76, -80.19];
  if (norm.includes("HOUSTON") || norm.includes("HOU")) return [29.76, -95.36];
  if (norm.includes("SEATTLE") || norm.includes("SEA")) return [47.60, -122.33];
  if (norm.includes("SANTOS") || norm.includes("SSZ")) return [-23.96, -46.33];
  if (norm.includes("PIRAEUS") || norm.includes("PIR")) return [37.94, 23.63];
  if (norm.includes("GENOA") || norm.includes("GOA")) return [44.41, 8.92];
  if (norm.includes("ANTWERP") || norm.includes("ANR")) return [51.22, 4.40];
  if (norm.includes("FELIXSTOWE") || norm.includes("FXT")) return [51.96, 1.35];
  if (norm.includes("ALGECIRAS") || norm.includes("ALG")) return [36.13, -5.45];
  if (norm.includes("PORT SAID") || norm.includes("PSD")) return [31.26, 32.30];
  if (norm.includes("DUBAI") || norm.includes("DXB") || norm.includes("JEBEL")) return [25.01, 55.06];

  // Hash fallback to make any unseen port rendering robust and predictable
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map deterministic lat between [10, 55] and lng between [-100, 110]
  const lat = 10 + Math.abs((hash * 13) % 45);
  const lng = -90 + (Math.abs((hash * 29) % 200) - 100);
  return [lat, lng];
}

interface RoutesMapProps {
  filteredRates: FreightRate[];
  t: TranslationSet;
}

/**
 * Interactive shipping routes visual layer that plots routes geographically
 */
export function RoutesMap({ filteredRates, t }: RoutesMapProps) {
  const [hoveredRoute, setHoveredRoute] = useState<any | null>(null);
  const [hoveredPort, setHoveredPort] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Group filtered rates under unique POL-POD combination
  const routes = React.useMemo(() => {
    const groups: Record<string, {
      routeKey: string;
      pol: string;
      pod: string;
      coordsPOL: [number, number];
      coordsPOD: [number, number];
      rates: FreightRate[];
      avgTotal: number;
      avgOcean: number;
      minTotal: number;
      maxTotal: number;
      carriers: string[];
    }> = {};

    filteredRates.forEach((rate) => {
      const key = `${rate.pol.trim()}➔${rate.pod.trim()}`;
      if (!groups[key]) {
        groups[key] = {
          routeKey: key,
          pol: rate.pol,
          pod: rate.pod,
          coordsPOL: getPortCoordinates(rate.pol),
          coordsPOD: getPortCoordinates(rate.pod),
          rates: [],
          avgTotal: 0,
          avgOcean: 0,
          minTotal: rate.total,
          maxTotal: rate.total,
          carriers: [],
        };
      }
      const g = groups[key];
      g.rates.push(rate);
      if (!g.carriers.includes(rate.carrier)) {
        g.carriers.push(rate.carrier);
      }
      if (rate.total < g.minTotal) g.minTotal = rate.total;
      if (rate.total > g.maxTotal) g.maxTotal = rate.total;
    });

    Object.values(groups).forEach((g) => {
      const totalSum = g.rates.reduce((sum, r) => sum + r.total, 0);
      const oceanSum = g.rates.reduce((sum, r) => sum + r.oceanFreight, 0);
      g.avgTotal = Math.round((totalSum / g.rates.length) * 100) / 100;
      g.avgOcean = Math.round((oceanSum / g.rates.length) * 100) / 100;
    });

    return Object.values(groups);
  }, [filteredRates]);

  // Extract all active unique ports
  const activePorts = React.useMemo(() => {
    const ports: Record<string, { name: string; isPOL: boolean; isPOD: boolean; coords: [number, number] }> = {};
    routes.forEach(r => {
      if (!ports[r.pol]) {
        ports[r.pol] = { name: r.pol, isPOL: true, isPOD: false, coords: r.coordsPOL };
      }
      if (!ports[r.pod]) {
        ports[r.pod] = { name: r.pod, isPOL: false, isPOD: true, coords: r.coordsPOD };
      } else {
        ports[r.pod].isPOD = true;
      }
    });
    return Object.values(ports);
  }, [routes]);

  // Pricing range calculation for classification
  const prices = filteredRates.map(r => r.total);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 4000;
  const range = maxPrice - minPrice;

  const getTierAndColor = (price: number) => {
    if (range === 0) return { tier: "Optimized", color: "#10b981" }; // Emerald
    const ratio = (price - minPrice) / range;
    if (ratio < 0.33) return { tier: "Low Cost", color: "#10b981" }; // Emerald
    if (ratio < 0.67) return { tier: "Moderate", color: "#f59e0b" }; // Amber
    return { tier: "High Cost", color: "#f43f5e" }; // Rose
  };

  // Convert GPS coordinate to flat canvas width 800, height 280
  const mapWidth = 800;
  const mapHeight = 280;

  const getX = (lng: number) => {
    const margin = 70;
    return margin + ((lng + 180) / 360) * (mapWidth - 2 * margin);
  };

  const getY = (lat: number) => {
    const minLat = -35;
    const maxLat = 72;
    const margin = 35;
    const usableHeight = mapHeight - 2 * margin;
    const val = (lat - minLat) / (maxLat - minLat);
    return margin + usableHeight - val * usableHeight;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const formatCost = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-800 text-white select-none group"
      id="routes-map-viewer-container"
    >
      {/* Dynamic Keyframes insertion via inline style tag for absolute compatibility */}
      <style>{`
        @keyframes dashflow {
          to {
            stroke-dashoffset: -20;
          }
        }
        .route-path-flow {
          animation: dashflow 1s linear infinite;
        }
        @keyframes rotate-compass {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .animate-compass-spin {
          transform-origin: center;
          animation: rotate-compass 120s linear infinite;
        }
      `}</style>

      {/* Grid Coordinates, Map Compass, and Metadata Header */}
      <div className="absolute top-2.5 left-3 select-none flex items-center gap-1.5 opacity-60 pointer-events-none">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[8px] font-mono tracking-widest text-slate-400">
          SHIPPING LANE TELEMETRY v2.1 // REAL-TIME COST ANALYSIS
        </span>
      </div>

      <div className="absolute top-2.5 right-3 select-none pointer-events-none opacity-60">
        <span className="text-[8px] font-mono text-indigo-400">
          ACTIVE LANES: {routes.length} // PORTS: {activePorts.length}
        </span>
      </div>

      {/* Compass rose element inside the map canvas grid context */}
      <div className="absolute bottom-4 left-4 h-12 w-12 border border-slate-800/80 rounded-full flex items-center justify-center pointer-events-none select-none">
        <div className="absolute h-9 w-9 border border-dashed border-slate-800/40 rounded-full animate-compass-spin" />
        <Compass className="h-5 w-5 text-slate-800/80 transform rotate-12" />
      </div>

      <div className="absolute bottom-2.5 right-3 select-none pointer-events-none text-right opacity-30">
        <span className="text-[7.5px] font-mono text-slate-500 block">STANDARD MERCATOR LAT/LNG COORDINATES</span>
        <span className="text-[7.5px] font-mono text-slate-500 block">WGS84 PROJECTION SYSTEM ERROR +/- 0.04%</span>
      </div>

      {/* Main Vector SVG Layer */}
      <svg className="w-full h-full" viewBox="0 0 800 280">
        {/* Draw subtle Lat/Lng background grid */}
        {/* Parallel lines */}
        {[60, 30, 0, -30].map((lat) => {
          const y = getY(lat);
          return (
            <g key={`lat-${lat}`} className="opacity-15">
              <line
                x1="40"
                y1={y}
                x2="760"
                y2={y}
                stroke="#475569"
                strokeWidth="0.5"
                strokeDasharray="2 3"
              />
              <text
                x="15"
                y={y + 3}
                fill="#94a3b8"
                className="text-[7px] font-mono"
              >
                {lat === 0 ? "EQ" : `${Math.abs(lat)}°${lat > 0 ? "N" : "S"}`}
              </text>
            </g>
          );
        })}

        {/* Meridian lines */}
        {[-120, -60, 0, 60, 120].map((lng) => {
          const x = getX(lng);
          return (
            <g key={`lng-${lng}`} className="opacity-15">
              <line
                x1={x}
                y1="25"
                x2={x}
                y2="255"
                stroke="#475569"
                strokeWidth="0.5"
                strokeDasharray="2 3"
              />
              <text
                x={x}
                y="272"
                fill="#94a3b8"
                className="text-[7px] font-mono text-center"
                textAnchor="middle"
              >
                {lng === 0 ? "0°" : `${Math.abs(lng)}°${lng > 0 ? "E" : "W"}`}
              </text>
            </g>
          );
        })}

        {/* Draw Route Paths first (underneath ports) */}
        {routes.map((r) => {
          const x1 = getX(r.coordsPOL[1]);
          const y1 = getY(r.coordsPOL[0]);
          const x2 = getX(r.coordsPOD[1]);
          const y2 = getY(r.coordsPOD[0]);

          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          // Curve upwards proportional to routing length distance
          const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
          const controlY = my - Math.min(dist * 0.22, 60);
          const pathD = `M ${x1} ${y1} Q ${mx} ${controlY} ${x2} ${y2}`;

          const pricingColor = getTierAndColor(r.avgTotal).color;
          const isHovered = hoveredRoute?.routeKey === r.routeKey;

          return (
            <g key={r.routeKey}>
              {/* Invisible super thick touch target to make hovering intuitive and delightful */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth="12"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredRoute(r)}
                onMouseLeave={() => setHoveredRoute(null)}
              />

              {/* Ambient thick glow path */}
              <path
                d={pathD}
                fill="none"
                stroke={pricingColor}
                strokeWidth={isHovered ? 4.5 : 2}
                opacity={isHovered ? 0.45 : 0.16}
                className="transition-all duration-200 pointer-events-none"
              />

              {/* Precise thin core route vector path */}
              <path
                d={pathD}
                fill="none"
                stroke={pricingColor}
                strokeWidth={isHovered ? 2.2 : 1.2}
                opacity={isHovered ? 0.95 : 0.55}
                className="transition-all duration-200 pointer-events-none"
              />

              {/* Animated shipping flow dashes flying along the lane */}
              <path
                d={pathD}
                fill="none"
                stroke={pricingColor}
                strokeWidth={isHovered ? 2.5 : 1.4}
                strokeDasharray="4 8"
                className="route-path-flow pointer-events-none transition-all duration-200"
                opacity={isHovered ? 1.0 : 0.75}
              />
            </g>
          );
        })}

        {/* Draw Port Terminal Nodes (top layer) */}
        {activePorts.map((p) => {
          const px = getX(p.coords[1]);
          const py = getY(p.coords[0]);
          const isHovered = hoveredPort === p.name || hoveredRoute?.pol === p.name || hoveredRoute?.pod === p.name;
          const portAbbrev = p.name.split(" ")[0] || p.name;

          return (
            <g
              key={p.name}
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredPort(p.name)}
              onMouseLeave={() => setHoveredPort(null)}
            >
              {/* Soft touch target outer background */}
              <circle
                cx={px}
                cy={py}
                r="10"
                fill="transparent"
              />

              {/* Outer glowing pulsing halo */}
              <circle
                cx={px}
                cy={py}
                r={isHovered ? 8.5 : 5.5}
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.2"
                className="transition-all duration-200"
                opacity={isHovered ? 0.8 : 0.3}
              />

              {/* Node solid black Core outline */}
              <circle
                cx={px}
                cy={py}
                r={isHovered ? 4.5 : 3}
                fill="#0f172a"
                stroke="#818cf8"
                strokeWidth="1.5"
                className="transition-all duration-150"
              />

              {/* Floating micro code text label box */}
              <g transform={`translate(${px}, ${py - 10})`} className="pointer-events-none select-none">
                {/* Background tag wrapper */}
                <rect
                  x="-18"
                  y="-6"
                  width="36"
                  height="11"
                  rx="3"
                  fill="#020617"
                  stroke={isHovered ? "#818cf8" : "#334155"}
                  strokeWidth="0.8"
                  opacity={isHovered ? 0.95 : 0.65}
                  className="transition-all duration-150"
                />
                <text
                  textAnchor="middle"
                  y="2"
                  fill={isHovered ? "#e0e7ff" : "#cbd5e1"}
                  className="text-[7px] font-mono font-bold"
                >
                  {portAbbrev.length > 5 ? portAbbrev.slice(0, 5) : portAbbrev}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* RENDER DYNAMIC Rich Floating Tooltip overlay and custom state summaries */}
      {hoveredRoute && (
        <div
          className="absolute bg-slate-950/95 border border-slate-800 rounded-lg p-3 pointer-events-none shadow-xl text-xs backdrop-blur-xs select-none max-w-[260px] leading-relaxed transition-opacity duration-150 shadow-slate-950/90"
          style={{
            left: `${Math.min(tooltipPos.x + 12, mapWidth - 280)}px`,
            top: `${Math.min(tooltipPos.y + 12, mapHeight - 160)}px`,
            zIndex: 100,
          }}
        >
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5 mb-1.5 font-bold">
            <Globe className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="text-[10px] tracking-wide text-indigo-300 font-bold truncate font-sans">POL ➔ POD Route Details</span>
          </div>

          <div className="space-y-1 select-none text-[10px] text-slate-300">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-400">Loading POL:</span>
              <span className="text-white font-bold truncate">{hoveredRoute.pol}</span>
            </div>
            <div className="flex items-center gap-1 pb-1 border-b border-slate-900">
              <span className="font-semibold text-slate-400">Discharge POD:</span>
              <span className="text-white font-bold truncate">{hoveredRoute.pod}</span>
            </div>

            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="font-semibold text-slate-400 text-[10px]">Integrated Avg:</span>
              <span
                className="font-extrabold"
                style={{ color: getTierAndColor(hoveredRoute.avgTotal).color }}
              >
                {formatCost(hoveredRoute.avgTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>Ocean Base:</span>
              <span>{formatCost(hoveredRoute.avgOcean)}</span>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>Port Local fees:</span>
              <span>{formatCost(hoveredRoute.avgTotal - hoveredRoute.avgOcean)}</span>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>Spread Range:</span>
              <span>{formatCost(hoveredRoute.minTotal)} – {formatCost(hoveredRoute.maxTotal)}</span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 mt-1 select-none">
              <span className="text-[8.5px] font-bold text-slate-400 block mb-0.5 font-sans">CARRIERS ({hoveredRoute.carriers.length}):</span>
              <div className="flex flex-wrap gap-1">
                {hoveredRoute.carriers.map((c: string) => (
                  <span
                    key={c}
                    className="px-1.5 py-0.2 bg-slate-900 border border-slate-850 text-slate-300 text-[7px] font-mono font-bold rounded"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Render tooltip card specifically on hovering port labels */}
      {hoveredPort && (
        <div
          className="absolute bg-slate-950/95 border border-slate-800 rounded-lg p-2.5 pointer-events-none shadow-xl text-xs backdrop-blur-xs select-none max-w-[200px] leading-relaxed transition-opacity duration-150 shadow-slate-950/90"
          style={{
            left: `${Math.min(tooltipPos.x + 12, mapWidth - 220)}px`,
            top: `${Math.min(tooltipPos.y + 12, mapHeight - 110)}px`,
            zIndex: 100,
          }}
        >
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1 mb-1 font-bold">
            <Anchor className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="text-[10px] text-indigo-300 font-bold truncate font-sans">{hoveredPort}</span>
          </div>
          <div className="space-y-1 select-none text-[9.5px] text-slate-400">
            <div className="flex items-center justify-between">
              <span>Lanes connection:</span>
              <span className="text-white font-bold">
                {routes.filter(r => r.pol === hoveredPort || r.pod === hoveredPort).length} lanes
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>GPS Coordinates:</span>
              <span className="text-indigo-400 font-semibold font-mono">
                {getPortCoordinates(hoveredPort)[0].toFixed(2)}°, {getPortCoordinates(hoveredPort)[1].toFixed(2)}°
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface RateChartProps {
  t: TranslationSet;
  filteredRates: FreightRate[];
  onCarrierSelect?: (carrierName: string) => void;
  allRates?: FreightRate[];
}

export default function RateChart({ t, filteredRates, onCarrierSelect, allRates }: RateChartProps) {
  const [chartMode, setChartMode] = useState<"grouped" | "stacked">("grouped");
  const [showHistoryLines, setShowHistoryLines] = useState(false);
  const [showDensityHeatmap, setShowDensityHeatmap] = useState(false);
  const [drilldownCarrier, setDrilldownCarrier] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"chart" | "map">("chart");
  const chartRef = useRef<any>(null);

  // Extract unique carriers with their respective rates for comparison
  // If multiple records exist for the same carrier name inside the filtered set, representing various dates, we group or display them.
  // Grouping by carrier and showing their average/minimum represents high precision statistics!
  const carrierRatesMap: Record<
    string,
    {
      total: number;
      ocean: number;
      fob: number;
      destino: number;
      baf: number;
      thc: number;
      lss: number;
      otros: number;
      count: number;
    }
  > = {};

  filteredRates.forEach((rate) => {
    if (!carrierRatesMap[rate.carrier]) {
      carrierRatesMap[rate.carrier] = {
        total: 0,
        ocean: 0,
        fob: 0,
        destino: 0,
        baf: 0,
        thc: 0,
        lss: 0,
        otros: 0,
        count: 0,
      };
    }
    carrierRatesMap[rate.carrier].total += rate.total;
    carrierRatesMap[rate.carrier].ocean += rate.oceanFreight;
    carrierRatesMap[rate.carrier].fob += rate.gastosFob;
    carrierRatesMap[rate.carrier].destino += rate.gastosDestino;
    carrierRatesMap[rate.carrier].baf += rate.baf || 0;
    carrierRatesMap[rate.carrier].thc += rate.thc || 0;
    carrierRatesMap[rate.carrier].lss += rate.lss || 0;
    carrierRatesMap[rate.carrier].otros += rate.otrosRecargos || 0;
    carrierRatesMap[rate.carrier].count += 1;
  });

  const carriersList = Object.keys(carrierRatesMap);

  // Find historical rates for the selected drill-down carrier
  const carrierHistory = filteredRates.filter(
    (rate) => rate.carrier === drilldownCarrier
  );

  const monthOrder: Record<string, number> = {
    enero: 1, jan: 1, january: 1,
    febrero: 2, feb: 2, february: 2,
    marzo: 3, mar: 3, march: 3,
    abril: 4, apr: 4, april: 4,
    mayo: 5, may: 5,
    junio: 6, jun: 6, june: 6,
    julio: 7, jul: 7, july: 7,
    agosto: 8, aug: 8, august: 8,
    septiembre: 9, sep: 9, september: 9,
    octubre: 10, oct: 10, october: 10,
    noviembre: 11, nov: 11, november: 11,
    diciembre: 12, dec: 12, december: 12,
  };

  const sortedHistory = [...carrierHistory].sort((a, b) => {
    const orderA = monthOrder[a.mes.toLowerCase()] || 99;
    const orderB = monthOrder[b.mes.toLowerCase()] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.id || 0) - (b.id || 0);
  });

  // Find significant point-to-point tariff changes (>15%) on identical shipping lanes (matching POL and POD)
  const significantChanges = React.useMemo(() => {
    const changes: Array<{
      currentIndex: number;
      prevIndex: number;
      pctChange: number;
      type: "spike" | "drop";
      route: string;
      fromPrice: number;
      toPrice: number;
      mesFrom: string;
      mesTo: string;
      sheetSource: string;
    }> = [];

    sortedHistory.forEach((rate, idx) => {
      let prevRate: FreightRate | null = null;
      let prevIdx = -1;
      // Search for the most immediate predecessor that matches the exact same route
      for (let i = idx - 1; i >= 0; i--) {
        if (sortedHistory[i].pol === rate.pol && sortedHistory[i].pod === rate.pod) {
          prevRate = sortedHistory[i];
          prevIdx = i;
          break;
        }
      }

      if (prevRate && prevRate.total > 0) {
        const diff = rate.total - prevRate.total;
        const pct = (diff / prevRate.total) * 100;
        if (Math.abs(pct) >= 15) {
          changes.push({
            currentIndex: idx,
            prevIndex: prevIdx,
            pctChange: pct,
            type: pct > 0 ? "spike" : "drop",
            route: `${rate.pol} ➔ ${rate.pod}`,
            fromPrice: prevRate.total,
            toPrice: rate.total,
            mesFrom: prevRate.mes,
            mesTo: rate.mes,
            sheetSource: rate.sheetSource,
          });
        }
      }
    });

    return changes;
  }, [sortedHistory]);

  const timelineAnnotationsPlugin = React.useMemo(() => ({
    id: "timelineAnnotations",
    afterDatasetsDraw(chart: any) {
      if (sortedHistory.length === 0 || significantChanges.length === 0) return;

      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales || !scales.x || !scales.y) return;

      ctx.save();

      significantChanges.forEach((change) => {
        const dIdx = change.currentIndex;
        // Total Cost represents dataset index 1
        const meta = chart.getDatasetMeta(1);
        if (!meta || !meta.data || !meta.data[dIdx]) return;

        const point = meta.data[dIdx];
        const px = point.x;
        const py = point.y;

        const isSpike = change.type === "spike";
        const color = isSpike ? "rgb(239, 68, 68)" : "rgb(16, 185, 129)";

        // Dotted vertical indicator alignment lines
        ctx.strokeStyle = isSpike ? "rgba(239, 68, 68, 0.45)" : "rgba(16, 185, 129, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, chartArea.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Small indicator ring enclosing dataset node
        ctx.strokeStyle = isSpike ? "rgba(239, 68, 68, 0.75)" : "rgba(16, 185, 129, 0.75)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 7.5, 0, 2 * Math.PI);
        ctx.stroke();

        // Banner text callout overlay
        const labelY = py - 18;
        const tagText = `${isSpike ? "▲" : "▼"} ${Math.abs(change.pctChange).toFixed(0)}%`;
        ctx.font = "bold 9px 'JetBrains Mono', Courier, monospace";
        const textWidth = ctx.measureText(tagText).width;
        const pillW = textWidth + 8;
        const pillH = 13;
        const prx = px - pillW / 2;
        const pry = labelY - pillH / 2;

        ctx.fillStyle = isSpike ? "#fef2f2" : "#ecfdf5";
        ctx.strokeStyle = isSpike ? "rgba(240, 128, 128, 0.6)" : "rgba(52, 211, 153, 0.6)";
        ctx.lineWidth = 1;

        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(prx, pry, pillW, pillH, 3);
        } else {
          ctx.rect(prx, pry, pillW, pillH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSpike ? "#dc2626" : "#059669";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tagText, px, labelY + 1);
      });

      ctx.restore();
    }
  }), [sortedHistory, significantChanges]);

  // Calculations for drilldown carrier timeline
  const totalCarrierHistory = sortedHistory.length;
  const avgTotalTimeline = totalCarrierHistory > 0 
    ? sortedHistory.reduce((sum, r) => sum + r.total, 0) / totalCarrierHistory 
    : 0;
  const avgOceanTimeline = totalCarrierHistory > 0 
    ? sortedHistory.reduce((sum, r) => sum + r.oceanFreight, 0) / totalCarrierHistory 
    : 0;
  const minPriceTimeline = totalCarrierHistory > 0 
    ? Math.min(...sortedHistory.map(r => r.total)) 
    : 0;
  const maxPriceTimeline = totalCarrierHistory > 0 
    ? Math.max(...sortedHistory.map(r => r.total)) 
    : 0;
  const avgSurchargeShare = avgTotalTimeline > 0 
    ? ((avgTotalTimeline - avgOceanTimeline) / avgTotalTimeline) * 100 
    : 0;

  const timelineData = {
    labels: sortedHistory.map((rate) => `${rate.mes} (${rate.pol}➔${rate.pod})`),
    datasets: [
      {
        label: t.chartOcean || "Ocean Freight",
        data: sortedHistory.map((rate) => rate.oceanFreight),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        borderWidth: 2,
        tension: 0.35,
        pointBackgroundColor: "rgb(59, 130, 246)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
      },
      {
        label: t.chartTotal || "Total Cost",
        data: sortedHistory.map((rate) => rate.total),
        borderColor: "rgb(139, 92, 246)",
        backgroundColor: "rgba(139, 92, 246, 0.08)",
        borderWidth: 2.5,
        tension: 0.35,
        pointBackgroundColor: "rgb(139, 92, 246)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: true,
      },
    ],
  };

  const timelineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)", // Slate 900
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          family: "Inter, sans-serif",
          size: 11,
          weight: "bold",
        },
        bodyFont: {
          family: "Inter, sans-serif",
          size: 11,
        },
        callbacks: {
          title: (context) => {
            if (!context || context.length === 0) return "";
            const sample = sortedHistory[context[0].dataIndex];
            if (!sample) return "";
            return `Route: ${sample.pol} ➔ ${sample.pod}`;
          },
          label: (context) => {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(context.parsed.y);
            }
            return label;
          },
          afterBody: (items) => {
            if (!items || items.length === 0) return [];
            const idx = items[0].dataIndex;
            const item = sortedHistory[idx];
            if (!item) return [];

            const total = item.total;
            const ocean = item.oceanFreight;
            const fob = item.gastosFob;
            const dest = item.gastosDestino;
            const baf = item.baf || 0;
            const thc = item.thc || 0;
            const lss = item.lss || 0;
            const otros = item.otrosRecargos || 0;
            const surcharges = baf + thc + lss + otros;

            const formatVal = (val: number) => {
              return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(val);
            };

            const formatPct = (val: number) => {
              if (total === 0) return "0.0%";
              return `${((val / total) * 100).toFixed(1)}%`;
            };

            const lines = [
              "",
              `COST STRUCTURE BREAKDOWN:`,
              `  • Ocean Freight: ${formatVal(ocean)}  (${formatPct(ocean)})`,
              `  • FOB Charges: ${formatVal(fob)}  (${formatPct(fob)})`,
              `  • Dest. Charges: ${formatVal(dest)}  (${formatPct(dest)})`,
              `  • Surcharges: ${formatVal(surcharges)}  (${formatPct(surcharges)})`,
            ];

            if (surcharges > 0) {
              lines.push(`      ➔ BAF (Fuel): ${formatVal(baf)}`);
              lines.push(`      ➔ THC (Handling): ${formatVal(thc)}`);
              lines.push(`      ➔ LSS (Low Sulfur): ${formatVal(lss)}`);
              lines.push(`      ➔ Others: ${formatVal(otros)}`);
            }

            lines.push(``);
            lines.push(`  • Source: ${item.sheetSource}`);
            lines.push(`  • Month: ${item.mes}`);

            return lines;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          font: {
            family: "Inter, sans-serif",
            size: 10,
          },
          callback: (value) => `$${value}`,
        },
        grid: {
          color: "rgba(241, 245, 249, 0.8)",
        },
      },
      x: {
        ticks: {
          font: {
            family: "Inter, sans-serif",
            size: 9,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  // Add a double-click handler on the chart canvas to drill-down to carrier-specific details
  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!chartRef.current) return;
    const chartInstance = chartRef.current;
    const elements = chartInstance.getElementsAtEventForMode(
      event.nativeEvent,
      "nearest",
      { intersect: true },
      true
    );
    if (elements && elements.length > 0) {
      const itemIdx = elements[0].index;
      const clickedCarrier = carriersList[itemIdx];
      if (clickedCarrier) {
        setDrilldownCarrier(clickedCarrier);
      }
    }
  };
  const totalCosts = carriersList.map((c) => 
    Math.round((carrierRatesMap[c].total / carrierRatesMap[c].count) * 100) / 100
  );
  const oceanCosts = carriersList.map((c) => 
    Math.round((carrierRatesMap[c].ocean / carrierRatesMap[c].count) * 100) / 100
  );
  const otherCosts = carriersList.map((c) => 
    Math.max(0, Math.round(((carrierRatesMap[c].total - carrierRatesMap[c].ocean) / carrierRatesMap[c].count) * 100) / 100)
  );

  // Calculation of historical lines from previous months
  const ratesToUse = (allRates && allRates.length > 0) ? allRates : filteredRates;
  const uniqueMonths = Array.from(new Set(ratesToUse.map(r => r.mes)))
    .sort((a, b) => {
      const orderA = monthOrder[a.toLowerCase()] || 99;
      const orderB = monthOrder[b.toLowerCase()] || 99;
      return orderA - orderB;
    });

  const linePalette = [
    "rgba(16, 185, 129, 0.95)",  // Emerald (Green)
    "rgba(245, 158, 11, 0.95)",  // Amber (Orange)
    "rgba(239, 68, 68, 0.95)",   // Rose/Red
    "rgba(14, 165, 233, 0.95)",  // Sky Blue
    "rgba(236, 72, 153, 0.95)",  // Pink
    "rgba(115, 115, 115, 0.95)"  // Alternate Gray
  ];

  const monthlyCarrierAverages = uniqueMonths.map(month => {
    const carrierAveragesForMonth: Record<string, number | null> = {};
    carriersList.forEach(carrier => {
      const matchingRates = ratesToUse.filter(r => r.carrier === carrier && r.mes === month);
      if (matchingRates.length > 0) {
        const avgTotal = matchingRates.reduce((sum, r) => sum + r.total, 0) / matchingRates.length;
        carrierAveragesForMonth[carrier] = Math.round(avgTotal * 100) / 100;
      } else {
        carrierAveragesForMonth[carrier] = null;
      }
    });
    return {
      month,
      averages: carrierAveragesForMonth
    };
  });

  const historicalLineDatasets = showHistoryLines ? monthlyCarrierAverages.map((ma, idx) => {
    const color = linePalette[idx % linePalette.length];
    return {
      type: "line" as const,
      label: `${ma.month} Trend`,
      data: carriersList.map(c => ma.averages[c]),
      borderColor: color,
      backgroundColor: color.replace("0.95", "0.05"),
      borderWidth: 2.2,
      pointStyle: "circle",
      pointBackgroundColor: color,
      pointBorderColor: "#fff",
      pointBorderWidth: 1.5,
      pointRadius: 4.5,
      pointHoverRadius: 6.5,
      tension: 0.35,
      fill: false,
    };
  }) : [];

  // Bin rates to show price density across ocean lanes
  const ratesCount = filteredRates.length;
  const ratesTotals = filteredRates.map(r => r.total);
  const maxTotalVal = ratesCount > 0 ? Math.max(...ratesTotals) : 2500;

  const numBins = 10;
  const binSize = maxTotalVal / numBins;
  const binCounts = Array(numBins).fill(0);

  if (ratesCount > 0) {
    filteredRates.forEach(r => {
      const idx = Math.min(Math.floor(r.total / binSize), numBins - 1);
      if (idx >= 0 && idx < numBins) {
        binCounts[idx]++;
      }
    });
  }
  const maxBinCount = Math.max(...binCounts, 1);

  const densityHeatmapPlugin = {
    id: "densityHeatmap",
    beforeDatasetsDraw(chart: any) {
      if (!showDensityHeatmap || filteredRates.length === 0) return;

      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales || !scales.y) return;

      ctx.save();
      for (let i = 0; i < numBins; i++) {
        const count = binCounts[i];
        if (count === 0) continue;

        const binMin = i * binSize;
        const binMax = (i + 1) * binSize;

        const yStart = scales.y.getPixelForValue(binMax);
        const yEnd = scales.y.getPixelForValue(binMin);
        const rectHeight = Math.abs(yEnd - yStart);

        // Styling density colors representation:
        // Index < 4: Optimized ($0 to $1000ish depending on max)
        // Index 4 to 6: Moderate
        // Index >= 7: High-cost pricing density
        let rgbColor = "16, 185, 129"; // Emerald (Green)
        if (i >= 4 && i < 7) {
          rgbColor = "251, 191, 36"; // Amber (Orange)
        } else if (i >= 7) {
          rgbColor = "239, 68, 68"; // Rose (Red)
        }

        const densityRatio = count / maxBinCount;
        // Subtle background transparency values to let bars pop clearly
        const alpha = 0.015 + densityRatio * 0.095;

        // Draw the soft heatband rectangle
        ctx.fillStyle = `rgba(${rgbColor}, ${alpha})`;
        ctx.fillRect(chartArea.left, yStart, chartArea.width, rectHeight);

        // Optionally draw a text indicator for dense clusters
        if (densityRatio > 0.35 && rectHeight > 14) {
          ctx.fillStyle = `rgba(${rgbColor}, 0.7)`;
          ctx.font = "bold 9px 'JetBrains Mono', Courier, monospace";
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(
            `${count} quotes`,
            chartArea.right - 10,
            yStart + rectHeight / 2
          );
        }
      }
      ctx.restore();
    }
  };

  const chartData: any = {
    labels: carriersList,
    datasets: [
      {
        label: t.chartOcean,
        data: oceanCosts,
        backgroundColor: "rgba(59, 130, 246, 0.75)", // Base Ocean Slate Blue
        borderColor: "rgba(59, 130, 246, 0.9)",
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: "rgba(96, 165, 250, 1.0)", // Brighter pulsing color highlight (Blue 400)
        hoverBorderColor: "rgb(59, 130, 246)", // Deeper base contrast border
        hoverBorderWidth: 3.5, // Tactile visual pop scale-up border
        hoverBorderRadius: 8, // Rounded expansion flare
      },
      {
        label: chartMode === "grouped" ? t.chartTotal : (t.surchargesBreakdown || "Surcharges"),
        data: chartMode === "grouped" ? totalCosts : otherCosts,
        backgroundColor: "rgba(139, 92, 246, 0.8)", // Base Total Purple Indigo
        borderColor: "rgba(139, 92, 246, 0.9)",
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: "rgba(167, 139, 250, 1.0)", // Brighter pulsing color highlight (Purple 400)
        hoverBorderColor: "rgb(139, 92, 246)", // Deeper base contrast border
        hoverBorderWidth: 3.5, // Tactile visual pop scale-up border
        hoverBorderRadius: 8, // Rounded expansion flare
      },
      ...historicalLineDatasets
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    hover: {
      mode: "index",
      intersect: true,
    },
    animations: {
      // Define a smooth micro-animation engine structure to model physical pulsing
      colors: {
        properties: ["backgroundColor", "borderColor"],
        type: "color",
        duration: 250,
        easing: "easeOutQuad",
      },
      borderWidth: {
        properties: ["borderWidth"],
        type: "number",
        duration: 350,
        easing: "easeOutBack", // Springy elastic flare pulse on expansion
      },
      borderRadius: {
        properties: ["borderRadius"],
        type: "number",
        duration: 350,
        easing: "easeOutBack", // Springy curve
      }
    },
    // Customize interactive transitions with high-fidelity spring animations
    transitions: {
      active: {
        animation: {
          duration: 350,
          easing: "easeOutBack", // Springy elastic easing creates a high-fidelity scale-up feel
        }
      }
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const itemIdx = elements[0].index;
        const clickedCarrier = carriersList[itemIdx];
        if (clickedCarrier && onCarrierSelect) {
          onCarrierSelect(clickedCarrier);
        }
      }
    },
    onHover: (event, chartElement) => {
      if (event.native && event.native.target) {
        const target = event.native.target as HTMLElement;
        target.style.cursor = chartElement.length ? "pointer" : "default";
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)", // Slate 900
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          family: "Inter, sans-serif",
          size: 12,
          weight: "bold",
        },
        bodyFont: {
          family: "Inter, sans-serif",
          size: 11,
        },
        footerFont: {
          family: "Inter, sans-serif",
          size: 10,
          weight: "normal",
        },
        callbacks: {
          title: (context) => {
            if (!context || context.length === 0) return "";
            return `Carrier: ${context[0].label}`;
          },
          label: (context) => {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(context.parsed.y);
            }
            return label;
          },
          afterBody: (items) => {
            if (!items || items.length === 0) return [];
            const carrierName = items[0].label;
            const data = carrierRatesMap[carrierName];
            if (!data) return [];

            const count = data.count;
            const avgTotal = data.total / count;
            const avgOcean = data.ocean / count;
            const avgFob = data.fob / count;
            const avgDest = data.destino / count;
            const avgBaf = data.baf / count;
            const avgThc = data.thc / count;
            const avgLss = data.lss / count;
            const avgOtros = data.otros / count;
            const avgSurcharges = avgBaf + avgThc + avgLss + avgOtros;

            const formatVal = (val: number) => {
              return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(val);
            };

            const formatPct = (val: number) => {
              if (avgTotal === 0) return "0.0%";
              return `${((val / avgTotal) * 100).toFixed(1)}%`;
            };

            const lines = [
              "",
              `AVERAGE COST STRUCTURE BREAKDOWN:`,
              `  • ${t.oceanLabel || "Ocean Freight"}: ${formatVal(avgOcean)}  (${formatPct(avgOcean)})`,
              `  • ${t.fobLabel || "FOB Charges"}: ${formatVal(avgFob)}  (${formatPct(avgFob)})`,
              `  • ${t.destLabel || "Dest. Charges"}: ${formatVal(avgDest)}  (${formatPct(avgDest)})`,
              `  • ${t.surchargesBreakdown || "Surcharges"}: ${formatVal(avgSurcharges)}  (${formatPct(avgSurcharges)})`,
            ];

            if (avgSurcharges > 0) {
              lines.push(`      ➔ BAF (Fuel): ${formatVal(avgBaf)}`);
              lines.push(`      ➔ THC (Handling): ${formatVal(avgThc)}`);
              lines.push(`      ➔ LSS (Low Sulfur): ${formatVal(avgLss)}`);
              lines.push(`      ➔ Others: ${formatVal(avgOtros)}`);
            }

            lines.push(``);
            lines.push(`  • ${t.chartTotal || "Total Cost"}: ${formatVal(avgTotal)}  (100.0%)`);
            lines.push(`  [Based on ${count} carrier quote${count > 1 ? "s" : ""}]`);

            return lines;
          },
        },
      },
    },
    scales: {
      y: {
        stacked: chartMode === "stacked",
        beginAtZero: true,
        ticks: {
          font: {
            family: "Inter, sans-serif",
            size: 10,
          },
          callback: (value) => `$${value}`,
        },
        grid: {
          color: "rgba(241, 245, 249, 0.8)", // slate-100
        },
      },
      x: {
        stacked: chartMode === "stacked",
        ticks: {
          font: {
            family: "Inter, sans-serif",
            size: 10,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div id="logistics-pricing-chart-card" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm overflow-hidden">
      <AnimatePresence mode="wait">
        {!drilldownCarrier ? (
          <motion.div
            key="comparison-chart-view"
            initial={{ opacity: 0, scale: 0.99, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -8 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                  <BarChart className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {t.chartTitle}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-slate-400">
                      Visual analytics comparing ocean freight alongside total integrated charges.
                    </p>
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[9px] text-indigo-500 font-medium">Double-click a bar to drill down</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Mode Switcher & Trend Overlay Toggle Button */}
              <div className="flex items-center gap-2">
                {/* View Selection (Chart vs Routes Map) */}
                <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200/60 shadow-xs mr-1">
                  <button
                    id="view-mode-chart-btn"
                    onClick={() => setActiveView("chart")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                      activeView === "chart"
                        ? "bg-white text-slate-800 shadow-xs ring-1 ring-slate-200/40"
                        : "text-slate-500 hover:text-slate-750"
                    }`}
                    title="Switch to Bar Chart Analytics View"
                  >
                    <BarChart className="h-3 w-3" />
                    <span>Bar Chart</span>
                  </button>
                  <button
                    id="view-mode-map-btn"
                    onClick={() => setActiveView("map")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                      activeView === "map"
                        ? "bg-white text-slate-800 shadow-xs ring-1 ring-slate-200/40"
                        : "text-slate-500 hover:text-slate-750"
                    }`}
                    title="Switch to Interactive Shipping Routes Map"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>Routes Map</span>
                  </button>
                </div>

                {activeView === "chart" && (
                  <>
                    {/* Pricing Density Heatmap Toggle Button */}
                    <button
                      id="chart-heatmap-toggle-btn"
                      onClick={() => setShowDensityHeatmap(!showDensityHeatmap)}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                        showDensityHeatmap
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xs"
                          : "bg-white border-slate-200/80 text-slate-500 hover:text-slate-800 hover:border-slate-350"
                      }`}
                      title="Toggle background heatmap segments reflecting tariff quote density across lanes."
                    >
                      <Layers className="h-3 w-3" />
                      <span>Density Heatmap</span>
                    </button>

                    {/* Historical Rate Trend Overlay Button */}
                    <button
                      id="chart-history-toggle-btn"
                      onClick={() => setShowHistoryLines(!showHistoryLines)}
                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                        showHistoryLines
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-xs"
                          : "bg-white border-slate-200/80 text-slate-500 hover:text-slate-800 hover:border-slate-350"
                      }`}
                      title="Toggle monthly historical trend lines overlay to observe tariff volatility trends."
                    >
                      <TrendingUp className="h-3 w-3" />
                      <span>Overlay Trends</span>
                    </button>

                    <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200/60 shadow-xs">
                      <button
                        id="chart-mode-grouped-btn"
                        onClick={() => setChartMode("grouped")}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer ${
                          chartMode === "grouped"
                            ? "bg-white text-slate-800 shadow-xs ring-1 ring-slate-200/40"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Grouped
                      </button>
                      <button
                        id="chart-mode-stacked-btn"
                        onClick={() => setChartMode("stacked")}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer ${
                          chartMode === "stacked"
                            ? "bg-white text-slate-800 shadow-xs ring-1 ring-slate-200/40"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Stacked
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="h-[280px] w-full relative" onDoubleClick={handleDoubleClick}>
              {filteredRates.length > 0 ? (
                activeView === "chart" ? (
                  <Bar ref={chartRef} data={chartData} options={options} plugins={[densityHeatmapPlugin]} />
                ) : (
                  <RoutesMap filteredRates={filteredRates} t={t} />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-xs text-slate-400 italic">
                  No data available to plot charts.
                </div>
              )}
            </div>

            {/* Custom Premium Color Legend Display */}
            {filteredRates.length > 0 && (
              <div id="chart-custom-legend" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 pt-3.5 border-t border-slate-100">
                {activeView === "chart" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500 border border-blue-600/10 shadow-xs" />
                      <span className="text-[11px] text-slate-600 font-medium">{t.chartOcean || "Ocean Freight"}</span>
                      <span className="text-[10px] text-slate-400">({t.oceanLabel || "Base Freight"})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-violet-500 border border-violet-600/10 shadow-xs" />
                      <span className="text-[11px] text-slate-600 font-medium">
                        {chartMode === "grouped" ? (t.chartTotal || "Total Cost") : (t.surchargesBreakdown || "Surcharges")}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {chartMode === "grouped" ? "(Ocean + All fees)" : "(Local fees & surcharges)"}
                      </span>
                    </div>
                    {showHistoryLines && monthlyCarrierAverages.map((ma, idx) => {
                      const color = linePalette[idx % linePalette.length];
                      return (
                        <div key={ma.month} className="flex items-center gap-2 animate-fade-in">
                          <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-[11px] text-slate-600 font-semibold">{ma.month} Trend</span>
                        </div>
                      );
                    })}
                    {showDensityHeatmap && (
                      <>
                        <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-4 animate-fade-in">
                          <span className="h-2.5 w-2.5 rounded bg-emerald-500/60 border border-emerald-600/10 shadow-3xs" />
                          <span className="text-[11px] text-slate-600 font-medium">Optimized Cost Region</span>
                        </div>
                        <div className="flex items-center gap-2 animate-fade-in">
                          <span className="h-2.5 w-2.5 rounded bg-amber-500/60 border border-amber-600/10 shadow-3xs" />
                          <span className="text-[11px] text-slate-600 font-medium">Moderate Cost Band</span>
                        </div>
                        <div className="flex items-center gap-2 animate-fade-in">
                          <span className="h-2.5 w-2.5 rounded bg-rose-500/60 border border-rose-600/10 shadow-3xs" />
                          <span className="text-[11px] text-slate-600 font-medium">High-Cost Exposure</span>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded bg-[#10b981] border border-[#10b981]/15 shadow-3xs" />
                      <span className="text-[11px] text-slate-600 font-semibold">Optimized Lanes (Lower 33%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded bg-[#f59e0b] border border-[#f59e0b]/15 shadow-3xs" />
                      <span className="text-[11px] text-slate-600 font-semibold">Moderate Cost Band (33% – 67%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded bg-[#f43f5e] border border-[#f43f5e]/15 shadow-3xs" />
                      <span className="text-[11px] text-slate-600 font-bold">High Cost Exposure (Upper 33%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 text-[10px] text-slate-500">
                      <span className="h-0.5 w-4 bg-indigo-500/80 rounded block border-dashed animate-pulse" />
                      <span className="font-mono text-[9px] text-slate-400">Dashed Arc Flows Towards POD</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="carrier-drilldown-view"
            initial={{ opacity: 0, scale: 0.99, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -8 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="flex flex-col h-full"
          >
            {/* Header with drill-down info and close action */}
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDrilldownCarrier(null)}
                  className="p-1.5 hover:bg-slate-50 border border-slate-200/60 shadow-xs text-slate-600 rounded-lg flex items-center gap-1.5 text-[10px] font-bold cursor-pointer transition-all duration-150"
                  title="Return to Carrier Comparison Chart"
                  id="drilldown-back-btn"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">
                      Carrier Profile: <span className="text-purple-600 font-extrabold">{drilldownCarrier}</span>
                    </h3>
                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-semibold rounded-md border border-purple-100">
                      Drill-down active
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Analyzing rate history, monthly tariff trends, and surcharge share across {sortedHistory.length} matching quotes.
                  </p>
                </div>
              </div>

              <div id="drilldown-indicators" className="flex items-center gap-5 pr-1 text-[10px]">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-slate-500">Ocean Freight</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  <span className="text-slate-500">Total tariff</span>
                </div>
              </div>
            </div>

            {/* Timeline Line Chart */}
            <div className="h-[200px] w-full relative mb-4">
              {sortedHistory.length > 0 ? (
                <Line data={timelineData} options={timelineOptions} plugins={[timelineAnnotationsPlugin]} />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-xs text-slate-400 italic">
                  No historical timeline data found for this carrier.
                </div>
              )}
            </div>

            {/* Graphical Volatility & Rate Change Callout Annotations Panel */}
            <div className="mb-4 bg-slate-50 border border-slate-200/60 rounded-xl p-3" id="timeline-volatility-callouts">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1">
                    Lane Volatility Callouts (&gt; 15% delta)
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">
                  {significantChanges.length} alert{significantChanges.length !== 1 ? "s" : ""} detected
                </span>
              </div>

              {significantChanges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[145px] overflow-y-auto pr-1">
                  {significantChanges.map((change, cIdx) => {
                    const isSpike = change.type === "spike";
                    return (
                      <div
                        key={cIdx}
                        className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all duration-150 ${
                          isSpike
                            ? "bg-rose-50/25 border-rose-100 hover:bg-rose-50/40 hover:border-rose-200"
                            : "bg-emerald-50/20 border-emerald-100 hover:bg-emerald-50/30 hover:border-emerald-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-slate-800">
                              {change.route}
                            </span>
                            <p className="text-[10px] text-slate-500 leading-normal">
                              Tariff adjusted from{" "}
                              <span className="font-semibold text-slate-600">
                                ${Math.round(change.fromPrice).toLocaleString()}
                              </span>{" "}
                              ({change.mesFrom}) to{" "}
                              <span className="font-extrabold text-slate-855">
                                ${Math.round(change.toPrice).toLocaleString()}
                              </span>{" "}
                              ({change.mesTo}).
                            </p>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold font-mono flex items-center gap-0.5 shrink-0 ${
                              isSpike
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isSpike ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                            {Math.abs(change.pctChange).toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-100/60 flex items-center justify-between text-[8px] text-slate-400">
                          <span className="font-semibold tracking-wider uppercase text-[7.5px] text-slate-500">
                            {isSpike ? "⚠️ Volatility Spike Flag" : "✅ Cost Drop Optimization"}
                          </span>
                          <span className="font-mono text-[7.5px]">{change.sheetSource}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-center bg-white">
                  <AlertTriangle className="h-4 w-4 text-slate-300 mb-1" />
                  <span className="text-[10px] text-slate-500 font-medium text-center">No lane rate fluctuations exceeding 15% observed.</span>
                  <p className="text-[8.5px] text-slate-400 mt-0.5 text-center">Rates for matching port pairs remain in a stable corridor.</p>
                </div>
              )}
            </div>

            {/* Statistics Bento Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4" id="drilldown-metric-grid">
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Quotes</span>
                  <div className="p-1 bg-blue-50 text-blue-600 rounded-lg">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="text-base font-bold text-slate-800">{totalCarrierHistory} quotes</p>
                <span className="text-[9px] text-slate-400 mt-0.5 block">Record occurrences count</span>
              </div>

              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Average Price</span>
                  <div className="p-1 bg-purple-50 text-purple-600 rounded-lg">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="text-base font-bold text-slate-800">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(avgTotalTimeline)}
                </p>
                <div className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span>Ocean Base avg</span>
                  <span className="font-semibold text-slate-600">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(avgOceanTimeline)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Historical Range</span>
                  <div className="p-1 bg-emerald-50 text-emerald-600 rounded-lg">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="text-[13px] font-bold text-slate-800 truncate">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(minPriceTimeline)} – {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(maxPriceTimeline)}
                </p>
                <span className="text-[9px] text-emerald-600 font-semibold mt-0.5 block">Fluctuation span of costs</span>
              </div>

              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Surcharge Share</span>
                  <div className="p-1 bg-amber-50 text-amber-600 rounded-lg">
                    <Info className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="text-base font-bold text-slate-800">{avgSurchargeShare.toFixed(1)}%</p>
                <span className="text-[9px] text-slate-400 mt-0.5 block">Port local surcharges weight</span>
              </div>
            </div>

            {/* Interactive Scrollable Details List */}
            <div className="flex flex-col border border-slate-100 rounded-xl overflow-hidden bg-white shadow-3xs">
              <div className="bg-slate-50/70 px-4 py-2 flex items-center justify-between border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Chronological Tariffs Breakdown</span>
                <span className="text-[9px] text-slate-400">Scroll to view all records in details</span>
              </div>
              <div className="max-h-[120px] overflow-y-auto divide-y divide-slate-100/60 pr-1 select-none" id="drilldown-historical-list">
                {sortedHistory.map((rate, rIdx) => {
                  const rateSurcharges = (rate.baf || 0) + (rate.thc || 0) + (rate.lss || 0) + (rate.otrosRecargos || 0);
                  return (
                    <div key={rate.id || rIdx} className="px-4 py-2.5 hover:bg-slate-50/40 flex items-center justify-between text-xs transition-colors duration-100">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700 min-w-[70px] bg-slate-50 border border-slate-200/50 px-1.5 py-0.5 rounded text-center text-[10px]">
                          {rate.mes}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 font-medium">{rate.pol}</span>
                          <ArrowRight className="h-3 w-3 text-slate-300" />
                          <span className="text-slate-800 font-medium">{rate.pod}</span>
                          <span className="text-[9px] text-slate-400 font-mono ml-2">[{rate.sheetSource}]</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Ocean base</span>
                          <span className="font-medium text-slate-600">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(rate.oceanFreight)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Surcharges</span>
                          <span className="font-medium text-slate-600">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(rateSurcharges)}
                          </span>
                        </div>
                        <div className="text-right border-l border-slate-100 pl-4 font-mono">
                          <span className="text-[10px] text-slate-500 font-bold block">Total price</span>
                          <span className="font-extrabold text-purple-600">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(rate.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
