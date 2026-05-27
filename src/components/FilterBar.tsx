/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Filter, RotateCcw, MapPin, Anchor, Landmark, Calendar, Layers } from "lucide-react";
import { ActiveFilters, FreightRate, TranslationSet } from "../types";

interface FilterBarProps {
  t: TranslationSet;
  allRates: FreightRate[];
  filters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
  onReset: () => void;
}

export default function FilterBar({ t, allRates, filters, onFilterChange, onReset }: FilterBarProps) {
  const [availablePols, setAvailablePols] = useState<string[]>([]);
  const [availablePods, setAvailablePods] = useState<string[]>([]);
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([]);
  const [availableMeses, setAvailableMeses] = useState<string[]>([]);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);

  useEffect(() => {
    if (allRates.length === 0) {
      setAvailablePols([]);
      setAvailablePods([]);
      setAvailableCarriers([]);
      setAvailableMeses([]);
      setAvailableSheets([]);
      return;
    }

    // Inter-dependent cascading selectors logic
    
    // 1. POL options
    const polsFiltered = allRates.filter((r) => {
      const matchPOD = filters.pod === "all" || r.pod === filters.pod;
      const matchCarrier = filters.carrier === "all" || r.carrier === filters.carrier;
      const matchMes = filters.mes === "all" || r.mes === filters.mes;
      const matchSheet = filters.sheetSource === "all" || r.sheetSource === filters.sheetSource;
      return matchPOD && matchCarrier && matchMes && matchSheet;
    });
    const uniqPols = Array.from(new Set(polsFiltered.map((r) => r.pol))).sort();
    setAvailablePols(uniqPols);

    // 2. POD options
    const podsFiltered = allRates.filter((r) => {
      const matchPOL = filters.pol === "all" || r.pol === filters.pol;
      const matchCarrier = filters.carrier === "all" || r.carrier === filters.carrier;
      const matchMes = filters.mes === "all" || r.mes === filters.mes;
      const matchSheet = filters.sheetSource === "all" || r.sheetSource === filters.sheetSource;
      return matchPOL && matchCarrier && matchMes && matchSheet;
    });
    const uniqPods = Array.from(new Set(podsFiltered.map((r) => r.pod))).sort();
    setAvailablePods(uniqPods);

    // 3. Carrier options
    const carriersFiltered = allRates.filter((r) => {
      const matchPOL = filters.pol === "all" || r.pol === filters.pol;
      const matchPOD = filters.pod === "all" || r.pod === filters.pod;
      const matchMes = filters.mes === "all" || r.mes === filters.mes;
      const matchSheet = filters.sheetSource === "all" || r.sheetSource === filters.sheetSource;
      return matchPOL && matchPOD && matchMes && matchSheet;
    });
    const uniqCarriers = Array.from(new Set(carriersFiltered.map((r) => r.carrier))).sort();
    
    const searchLower = (filters.carrierSearch || "").trim().toLowerCase();
    let carriersToDisplay = uniqCarriers;
    if (searchLower) {
      carriersToDisplay = uniqCarriers.filter(carrier =>
        carrier.toLowerCase().includes(searchLower)
      );
    }
    if (filters.carrier !== "all" && !carriersToDisplay.includes(filters.carrier)) {
      carriersToDisplay = [...carriersToDisplay, filters.carrier].sort();
    }
    setAvailableCarriers(carriersToDisplay);

    // 4. Month options
    const mesesFiltered = allRates.filter((r) => {
      const matchPOL = filters.pol === "all" || r.pol === filters.pol;
      const matchPOD = filters.pod === "all" || r.pod === filters.pod;
      const matchCarrier = filters.carrier === "all" || r.carrier === filters.carrier;
      const matchSheet = filters.sheetSource === "all" || r.sheetSource === filters.sheetSource;
      return matchPOL && matchPOD && matchCarrier && matchSheet;
    });
    const uniqMeses = Array.from(new Set(mesesFiltered.map((r) => r.mes))).sort();
    setAvailableMeses(uniqMeses);

    // 5. Sheet Source options
    const sheetsFiltered = allRates.filter((r) => {
      const matchPOL = filters.pol === "all" || r.pol === filters.pol;
      const matchPOD = filters.pod === "all" || r.pod === filters.pod;
      const matchCarrier = filters.carrier === "all" || r.carrier === filters.carrier;
      const matchMes = filters.mes === "all" || r.mes === filters.mes;
      return matchPOL && matchPOD && matchCarrier && matchMes;
    });
    const uniqSheets = Array.from(new Set(sheetsFiltered.map((r) => r.sheetSource))).sort();
    setAvailableSheets(uniqSheets);

  }, [allRates, filters]);

  const handleSelect = (key: keyof ActiveFilters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const handleSearchChange = (val: string) => {
    let nextCarrier = filters.carrier;
    if (nextCarrier !== "all" && val && !nextCarrier.toLowerCase().includes(val.toLowerCase())) {
      nextCarrier = "all";
    }
    onFilterChange({
      ...filters,
      carrierSearch: val,
      carrier: nextCarrier,
    });
  };

  return (
    <div id="filter-control-panel" className="space-y-4">
      
      {/* Selector Heading in Sidebar */}
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-indigo-400" />
          Lane Filter Setup
        </span>

        <button
          id="btn-reset-filters"
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-400 font-medium px-1.5 py-0.5 rounded hover:bg-slate-800 transition duration-150"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          {t.resetBtn}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {/* POL Selection */}
        <div id="filter-wrapper-pol" className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="filter-pol" className="text-[11px] uppercase tracking-wider text-slate-450 block font-medium">
              {t.labelPOL}
            </label>
            {filters.pol !== "all" && (
              <button
                type="button"
                onClick={() => handleSelect("pol", "all")}
                className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider bg-slate-800/80 px-1.5 py-0.5 rounded transition"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <select
              id="filter-pol"
              value={filters.pol}
              onChange={(e) => handleSelect("pol", e.target.value)}
              className="w-full bg-slate-700 border border-slate-600/80 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-400 cursor-pointer appearance-none"
            >
              <option value="all">{t.allPols}</option>
              {availablePols.map((pol) => (
                <option key={pol} value={pol}>
                  {pol}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-450 text-[9px]">
              ▼
            </div>
          </div>
        </div>

        {/* POD Selection */}
        <div id="filter-wrapper-pod" className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="filter-pod" className="text-[11px] uppercase tracking-wider text-slate-450 block font-medium">
              {t.labelPOD}
            </label>
            {filters.pod !== "all" && (
              <button
                type="button"
                onClick={() => handleSelect("pod", "all")}
                className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider bg-slate-800/80 px-1.5 py-0.5 rounded transition"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <select
              id="filter-pod"
              value={filters.pod}
              onChange={(e) => handleSelect("pod", e.target.value)}
              className="w-full bg-slate-700 border border-slate-600/80 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-400 cursor-pointer appearance-none"
            >
              <option value="all">{t.allPods}</option>
              {availablePods.map((pod) => (
                <option key={pod} value={pod}>
                  {pod}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-450 text-[9px]">
              ▼
            </div>
          </div>
        </div>

        {/* Month Selection */}
        <div id="filter-wrapper-mes" className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="filter-mes" className="text-[11px] uppercase tracking-wider text-slate-450 block font-medium">
              {t.labelMes}
            </label>
            {filters.mes !== "all" && (
              <button
                type="button"
                onClick={() => handleSelect("mes", "all")}
                className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider bg-slate-800/80 px-1.5 py-0.5 rounded transition"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <select
              id="filter-mes"
              value={filters.mes}
              onChange={(e) => handleSelect("mes", e.target.value)}
              className="w-full bg-slate-700 border border-slate-600/80 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-400 cursor-pointer appearance-none"
            >
              <option value="all">{t.allMeses}</option>
              {availableMeses.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-450 text-[9px]">
              ▼
            </div>
          </div>
        </div>

        {/* Carrier Selection */}
        <div id="filter-wrapper-carrier" className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="filter-carrier" className="text-[11px] uppercase tracking-wider text-slate-450 block font-medium">
              {t.labelCarrier}
            </label>
            {(filters.carrier !== "all" || filters.carrierSearch) && (
              <button
                type="button"
                onClick={() => {
                  onFilterChange({
                    ...filters,
                    carrier: "all",
                    carrierSearch: ""
                  });
                }}
                className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider bg-slate-800/80 px-1.5 py-0.5 rounded transition cursor-pointer animate-fade-in"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="relative">
            <input
              id="carrier-search-input"
              type="text"
              placeholder="Search carrier..."
              value={filters.carrierSearch || ""}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-400 placeholder:text-slate-500 transition-all duration-150"
            />
          </div>

          <div className="relative">
            <select
              id="filter-carrier"
              value={filters.carrier}
              onChange={(e) => handleSelect("carrier", e.target.value)}
              className="w-full bg-slate-700 border border-slate-600/80 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-400 cursor-pointer appearance-none"
            >
              <option value="all">{t.allCarriers}</option>
              {availableCarriers.map((carrier) => (
                <option key={carrier} value={carrier}>
                  {carrier}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-450 text-[9px]">
              ▼
            </div>
          </div>
        </div>

        {/* Source sheet selection */}
        <div id="filter-wrapper-sheet" className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="filter-sheet" className="text-[11px] uppercase tracking-wider text-slate-450 block font-medium">
              {t.labelSheet}
            </label>
            {filters.sheetSource !== "all" && (
              <button
                type="button"
                onClick={() => handleSelect("sheetSource", "all")}
                className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider bg-slate-800/80 px-1.5 py-0.5 rounded transition"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <select
              id="filter-sheet"
              value={filters.sheetSource}
              onChange={(e) => handleSelect("sheetSource", e.target.value)}
              className="w-full bg-slate-700 border border-slate-600/80 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-400 cursor-pointer appearance-none"
            >
              <option value="all">{t.allSheets}</option>
              {availableSheets.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-450 text-[9px]">
              ▼
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
