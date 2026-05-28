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

interface MultiSelectProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  icon?: React.ReactNode;
  placeholder?: string;
}

function MultiSelectChecklist({ label, options, selectedValues, onToggle, onClear, icon, placeholder }: MultiSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const isAllSelected = selectedValues.includes("all") || selectedValues.length === 0;

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
          {icon}
          {label}
        </label>
        {!isAllSelected && (
          <button
            type="button"
            onClick={onClear}
            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider bg-slate-800/80 px-1.5 py-0.5 rounded transition cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {placeholder && (
        <div className="relative mb-1">
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700/85 rounded px-2.5 py-1 text-[10px] text-white outline-none focus:border-indigo-405 placeholder:text-slate-500 transition-all duration-150"
          />
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700/80 rounded p-1.5 max-h-[110px] overflow-y-auto custom-console-scrollbar space-y-1">
        {/* Option 'Show All' */}
        <label className="flex items-center gap-2 px-1.5 py-0.5 hover:bg-slate-700/40 rounded cursor-pointer text-xs select-none text-left">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={() => onToggle("all")}
            className="rounded border-slate-600 bg-slate-750 text-indigo-600 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5 cursor-pointer"
          />
          <span className={`font-medium ${isAllSelected ? "text-indigo-400 font-extrabold" : "text-slate-400"}`}>
            (Show All)
          </span>
        </label>

        {filteredOptions.map((opt) => {
          const isChecked = selectedValues.includes(opt);
          return (
            <label
              key={opt}
              className="flex items-center gap-2 px-1.5 py-0.5 hover:bg-slate-700/40 rounded cursor-pointer text-xs select-none text-left"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(opt)}
                className="rounded border-slate-600 bg-slate-750 text-indigo-600 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5 cursor-pointer"
              />
              <span className={`transition-colors ${isChecked ? "text-white font-extrabold" : "text-slate-350"}`}>
                {opt}
              </span>
            </label>
          );
        })}
        {filteredOptions.length === 0 && (
          <p className="text-[10px] text-slate-500 italic p-1.5">No options available</p>
        )}
      </div>
    </div>
  );
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
      const matchPOD = filters.pod.includes("all") || filters.pod.includes(r.pod);
      const matchCarrier = filters.carrier.includes("all") || filters.carrier.includes(r.carrier);
      const matchMes = filters.mes === "all" || r.mes === filters.mes;
      const matchSheet = filters.sheetSource === "all" || r.sheetSource === filters.sheetSource;
      return matchPOD && matchCarrier && matchMes && matchSheet;
    });
    const uniqPols = Array.from(new Set(polsFiltered.map((r) => r.pol))).sort();
    setAvailablePols(uniqPols);

    // 2. POD options
    const podsFiltered = allRates.filter((r) => {
      const matchPOL = filters.pol.includes("all") || filters.pol.includes(r.pol);
      const matchCarrier = filters.carrier.includes("all") || filters.carrier.includes(r.carrier);
      const matchMes = filters.mes === "all" || r.mes === filters.mes;
      const matchSheet = filters.sheetSource === "all" || r.sheetSource === filters.sheetSource;
      return matchPOL && matchCarrier && matchMes && matchSheet;
    });
    const uniqPods = Array.from(new Set(podsFiltered.map((r) => r.pod))).sort();
    setAvailablePods(uniqPods);

    // 3. Carrier options
    const carriersFiltered = allRates.filter((r) => {
      const matchPOL = filters.pol.includes("all") || filters.pol.includes(r.pol);
      const matchPOD = filters.pod.includes("all") || filters.pod.includes(r.pod);
      const matchMes = filters.mes === "all" || r.mes === filters.mes;
      const matchSheet = filters.sheetSource === "all" || r.sheetSource === filters.sheetSource;
      return matchPOL && matchPOD && matchMes && matchSheet;
    });
    const uniqCarriers = Array.from(new Set(carriersFiltered.map((r) => r.carrier))).sort();
    setAvailableCarriers(uniqCarriers);

    // 4. Month options
    const mesesFiltered = allRates.filter((r) => {
      const matchPOL = filters.pol.includes("all") || filters.pol.includes(r.pol);
      const matchPOD = filters.pod.includes("all") || filters.pod.includes(r.pod);
      const matchCarrier = filters.carrier.includes("all") || filters.carrier.includes(r.carrier);
      const matchSheet = filters.sheetSource === "all" || r.sheetSource === filters.sheetSource;
      return matchPOL && matchPOD && matchCarrier && matchSheet;
    });
    const uniqMeses = Array.from(new Set(mesesFiltered.map((r) => r.mes))).sort();
    setAvailableMeses(uniqMeses);

    // 5. Sheet Source options
    const sheetsFiltered = allRates.filter((r) => {
      const matchPOL = filters.pol.includes("all") || filters.pol.includes(r.pol);
      const matchPOD = filters.pod.includes("all") || filters.pod.includes(r.pod);
      const matchCarrier = filters.carrier.includes("all") || filters.carrier.includes(r.carrier);
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

  const handleToggleOption = (key: "pol" | "pod" | "carrier", value: string) => {
    let current = [...(filters[key] || [])];

    if (value === "all") {
      onFilterChange({
        ...filters,
        [key]: ["all"]
      });
      return;
    }

    current = current.filter(item => item !== "all");

    if (current.includes(value)) {
      current = current.filter(item => item !== value);
    } else {
      current.push(value);
    }

    if (current.length === 0) {
      current = ["all"];
    }

    onFilterChange({
      ...filters,
      [key]: current
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
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-400 font-medium px-1.5 py-0.5 rounded hover:bg-slate-800 transition duration-150 cursor-pointer"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          {t.resetBtn}
        </button>
      </div>

      <div className="flex flex-col gap-3.5">
        
        {/* Multi-Select POL */}
        <MultiSelectChecklist
          label={t.labelPOL}
          options={availablePols}
          selectedValues={filters.pol}
          onToggle={(val) => handleToggleOption("pol", val)}
          onClear={() => handleToggleOption("pol", "all")}
          icon={<Anchor className="h-3.5 w-3.5 text-indigo-400" />}
        />

        {/* Multi-Select POD */}
        <MultiSelectChecklist
          label={t.labelPOD}
          options={availablePods}
          selectedValues={filters.pod}
          onToggle={(val) => handleToggleOption("pod", val)}
          onClear={() => handleToggleOption("pod", "all")}
          icon={<MapPin className="h-3.5 w-3.5 text-indigo-400" />}
        />

        {/* Multi-Select Carrier */}
        <MultiSelectChecklist
          label={t.labelCarrier}
          options={availableCarriers}
          selectedValues={filters.carrier}
          onToggle={(val) => handleToggleOption("carrier", val)}
          onClear={() => handleToggleOption("carrier", "all")}
          icon={<Landmark className="h-3.5 w-3.5 text-indigo-400" />}
          placeholder="Search carrier inline..."
        />

        {/* Month Selection */}
        <div id="filter-wrapper-mes" className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="filter-mes" className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              {t.labelMes}
            </label>
            {filters.mes !== "all" && (
              <button
                type="button"
                onClick={() => handleSelect("mes", "all")}
                className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider bg-slate-800/80 px-1.5 py-0.5 rounded transition cursor-pointer"
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
              className="w-full bg-slate-700 border border-slate-600/80 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-400 cursor-pointer appearance-none text-left"
            >
              <option value="all">{t.allMeses}</option>
              {availableMeses.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-440 text-[9px]">
              ▼
            </div>
          </div>
        </div>

        {/* Date Range Selection */}
        <div id="filter-wrapper-dates" className="space-y-1 border-t border-slate-800/80 pt-3">
          <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            Specific Date Period
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">Start Date</span>
              <input
                id="filter-start-date"
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600/80 rounded px-1.5 py-1 text-xs text-white outline-none focus:border-indigo-450 cursor-pointer text-center"
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-500 uppercase font-semibold">End Date</span>
              <input
                id="filter-end-date"
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600/80 rounded px-1.5 py-1 text-xs text-white outline-none focus:border-indigo-450 cursor-pointer text-center"
              />
            </div>
          </div>
          {(filters.startDate || filters.endDate) && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, startDate: "", endDate: "" })}
              className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider mt-1.5 block hover:underline cursor-pointer"
            >
              Clear Date Period
            </button>
          )}
        </div>

        {/* Source sheet selection */}
        <div id="filter-wrapper-sheet" className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="filter-sheet" className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              {t.labelSheet}
            </label>
            {filters.sheetSource !== "all" && (
              <button
                type="button"
                onClick={() => handleSelect("sheetSource", "all")}
                className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold uppercase tracking-wider bg-slate-800/80 px-1.5 py-0.5 rounded transition cursor-pointer"
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
              className="w-full bg-slate-700 border border-slate-600/80 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-400 cursor-pointer appearance-none text-left"
            >
              <option value="all">{t.allSheets}</option>
              {availableSheets.map((sheet) => (
                <option key={sheet} value={sheet}>
                  {sheet}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-440 text-[9px]">
              ▼
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
