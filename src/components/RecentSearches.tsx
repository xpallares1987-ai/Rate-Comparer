/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { History, Anchor, MapPin, Ship, Layers, Calendar, Trash2, ArrowRight } from "lucide-react";
import { ActiveFilters, TranslationSet } from "../types";

export interface RecentSearchItem {
  id: string;
  filters: ActiveFilters;
  timestamp: string;
}

interface RecentSearchesProps {
  t: TranslationSet;
  currentFilters: ActiveFilters;
  onSelectSearch: (filters: ActiveFilters) => void;
}

function areFiltersEqual(f1: ActiveFilters, f2: ActiveFilters): boolean {
  if (!f1 || !f2) return false;

  const normPol1 = Array.isArray(f1.pol) ? f1.pol : typeof f1.pol === "string" ? [f1.pol] : [];
  const normPol2 = Array.isArray(f2.pol) ? f2.pol : typeof f2.pol === "string" ? [f2.pol] : [];

  const normPod1 = Array.isArray(f1.pod) ? f1.pod : typeof f1.pod === "string" ? [f1.pod] : [];
  const normPod2 = Array.isArray(f2.pod) ? f2.pod : typeof f2.pod === "string" ? [f2.pod] : [];

  const normCarrier1 = Array.isArray(f1.carrier) ? f1.carrier : typeof f1.carrier === "string" ? [f1.carrier] : [];
  const normCarrier2 = Array.isArray(f2.carrier) ? f2.carrier : typeof f2.carrier === "string" ? [f2.carrier] : [];

  return (
    f1.mes === f2.mes &&
    f1.sheetSource === f2.sheetSource &&
    f1.startDate === f2.startDate &&
    f1.endDate === f2.endDate &&
    JSON.stringify([...normPol1].sort()) === JSON.stringify([...normPol2].sort()) &&
    JSON.stringify([...normPod1].sort()) === JSON.stringify([...normPod2].sort()) &&
    JSON.stringify([...normCarrier1].sort()) === JSON.stringify([...normCarrier2].sort())
  );
}

function isDefaultFilter(f: ActiveFilters): boolean {
  if (!f) return true;
  const pol = Array.isArray(f.pol) ? f.pol : typeof f.pol === "string" ? [f.pol] : [];
  const pod = Array.isArray(f.pod) ? f.pod : typeof f.pod === "string" ? [f.pod] : [];
  const carrier = Array.isArray(f.carrier) ? f.carrier : typeof f.carrier === "string" ? [f.carrier] : [];

  const isPolAll = pol.length === 0 || (pol.length === 1 && pol[0] === "all");
  const isPodAll = pod.length === 0 || (pod.length === 1 && pod[0] === "all");
  const isCarrierAll = carrier.length === 0 || (carrier.length === 1 && carrier[0] === "all");
  const isMesAll = !f.mes || f.mes === "all";
  const isSheetAll = !f.sheetSource || f.sheetSource === "all";
  const isStartDateEmpty = !f.startDate;
  const isEndDateEmpty = !f.endDate;
  
  return isPolAll && isPodAll && isCarrierAll && isMesAll && isSheetAll && isStartDateEmpty && isEndDateEmpty;
}

export default function RecentSearches({ t, currentFilters, onSelectSearch }: RecentSearchesProps) {
  const [searches, setSearches] = useState<RecentSearchItem[]>(() => {
    try {
      const cached = localStorage.getItem("freight_recent_searches");
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return [];
      
      // Normalize legacy string fields into array of strings to prevent parsing/render exceptions
      return parsed.map((item: any) => {
        if (item && item.filters) {
          const f = item.filters;
          return {
            ...item,
            filters: {
              ...f,
              pol: Array.isArray(f.pol) ? f.pol : typeof f.pol === "string" ? [f.pol] : [],
              pod: Array.isArray(f.pod) ? f.pod : typeof f.pod === "string" ? [f.pod] : [],
              carrier: Array.isArray(f.carrier) ? f.carrier : typeof f.carrier === "string" ? [f.carrier] : [],
            }
          };
        }
        return item;
      }).filter(Boolean);
    } catch {
      return [];
    }
  });

  // Track & Debounce Filter updates
  useEffect(() => {
    if (isDefaultFilter(currentFilters)) {
      return;
    }

    const timer = setTimeout(() => {
      setSearches((prev) => {
        // Detect if equivalent filter configuration already exists in list
        const filtered = prev.filter((item) => !areFiltersEqual(item.filters, currentFilters));
        const newItem: RecentSearchItem = {
          id: Date.now().toString(),
          filters: { ...currentFilters },
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        const updated = [newItem, ...filtered].slice(0, 5);
        localStorage.setItem("freight_recent_searches", JSON.stringify(updated));
        return updated;
      });
    }, 1200); // 1.2 second debounce to steady fast interactive clicking

    return () => clearTimeout(timer);
  }, [currentFilters]);

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Clear all stored search configurations?")) {
      setSearches([]);
      localStorage.removeItem("freight_recent_searches");
    }
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSearches((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("freight_recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  // Helper inside displayer components to format filter text arrays
  const getArrayDisplay = (arr: any) => {
    const list = Array.isArray(arr) ? arr : typeof arr === "string" ? [arr] : [];
    if (list.length === 0 || list.includes("all")) return null;
    if (list.length <= 2) return list.join(", ");
    return `${list.slice(0, 2).join(", ")} (+${list.length - 2})`;
  };

  if (searches.length === 0) {
    return (
      <div id="recent-searches-empty" className="border-t border-slate-800/60 pt-4 mt-2">
        <span className="text-[10px] font-bold tracking-widest text-slate-400/80 uppercase flex items-center gap-1.5 mb-2">
          <History className="h-3 w-3 text-slate-500" />
          Recent Searches
        </span>
        <p className="text-[10px] text-slate-500 italic">No recent filters analyzed yet</p>
      </div>
    );
  }

  return (
    <div id="recent-searches-panel" className="border-t border-slate-800/80 pt-4 mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
          <History className="h-3 w-3 text-indigo-400" />
          Recent Searches
        </span>
        <button
          onClick={handleClearAll}
          className="text-[9px] text-slate-500 hover:text-red-400 font-bold uppercase tracking-wider transition cursor-pointer"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5 custom-console-scrollbar">
        {searches.map((item) => {
          const isCurrentActive = areFiltersEqual(item.filters, currentFilters);
          
          const polText = getArrayDisplay(item.filters.pol);
          const podText = getArrayDisplay(item.filters.pod);
          const carrierText = getArrayDisplay(item.filters.carrier);
          const hasDate = item.filters.startDate || item.filters.endDate;

          return (
            <div
              key={item.id}
              onClick={() => onSelectSearch(item.filters)}
              className={`w-full group text-left p-2.5 rounded-lg border text-white transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 relative ${
                isCurrentActive
                  ? "bg-indigo-950/40 border-indigo-500/40 shadow-xs"
                  : "bg-slate-950/20 border-slate-800/80 hover:bg-slate-800/35 hover:border-slate-700/60"
              }`}
            >
              {/* Card Meta details */}
              <div className="flex items-center justify-between text-[8px] font-mono select-none">
                <span className={`font-bold uppercase tracking-wider ${isCurrentActive ? "text-indigo-400" : "text-slate-500"}`}>
                  {isCurrentActive ? "Active State" : "Previous Search"}
                </span>
                <span className="text-slate-500 group-hover:block hidden duration-150">{item.timestamp}</span>
              </div>

              {/* Badges Flow Grid */}
              <div className="flex flex-wrap gap-1">
                {polText && (
                  <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[8.5px] px-1 py-0.5 rounded flex items-center gap-1 font-sans font-semibold">
                    <Anchor className="h-2.5 w-2.5 shrink-0" />
                    <span>POL: {polText}</span>
                  </span>
                )}
                {podText && (
                  <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[8.5px] px-1 py-0.5 rounded flex items-center gap-1 font-sans font-semibold">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    <span>POD: {podText}</span>
                  </span>
                )}
                {carrierText && (
                  <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/10 text-[8.5px] px-1 py-0.5 rounded flex items-center gap-1 font-sans font-semibold">
                    <Ship className="h-2.5 w-2.5 shrink-0" />
                    <span>Line: {carrierText}</span>
                  </span>
                )}
                {item.filters.mes !== "all" && (
                  <span className="bg-blue-500/10 text-blue-300 border border-blue-500/25 text-[8.5px] px-1 py-0.5 rounded flex items-center gap-1 font-sans font-semibold">
                    <Calendar className="h-2.5 w-2.5 shrink-0" />
                    <span>Month: {item.filters.mes}</span>
                  </span>
                )}
                {item.filters.sheetSource !== "all" && (
                  <span className="bg-purple-500/10 text-purple-300 border border-purple-500/25 text-[8.5px] px-1 py-0.5 rounded flex items-center gap-1 font-sans font-semibold">
                    <Layers className="h-2.5 w-2.5 shrink-0" />
                    <span>Src: {item.filters.sheetSource}</span>
                  </span>
                )}
                {hasDate && (
                  <span className="bg-slate-500/10 text-slate-300 border border-slate-500/25 text-[8px] px-1 py-0.5 rounded flex items-center gap-1 font-mono font-bold">
                    <span>📅 Period</span>
                  </span>
                )}
              </div>

              {/* Action Overlay elements */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => handleDeleteItem(e, item.id)}
                  className="p-1 text-slate-500 hover:text-red-400 bg-slate-900 rounded border border-slate-800"
                  title="Remove this search from history"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
                <button
                  className="p-1 text-indigo-400 hover:text-white bg-indigo-950/60 rounded border border-indigo-500/20"
                  title="Apply search criteria"
                >
                  <ArrowRight className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
