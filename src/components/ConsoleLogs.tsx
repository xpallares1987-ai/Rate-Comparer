/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Terminal, Trash2, ChevronDown, ChevronUp, TerminalSquare } from "lucide-react";
import { eventBus } from "../services/eventBus";
import { AppLog, TranslationSet } from "../types";

interface ConsoleLogsProps {
  t: TranslationSet;
}

export default function ConsoleLogs({ t }: ConsoleLogsProps) {
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isVerbose, setIsVerbose] = useState(() => {
    return localStorage.getItem("console_verbose") === "true";
  });

  const sampleMessages = [
    {
      message: "Seasonal container rate threshold check complete.",
      details: "POL: Barcelona -> POD: New York. Variance detected: +1.2% versus previous rolling period metrics."
    },
    {
      message: "Verified carrier compliance metrics for active pricing lanes.",
      details: "Assessed Ocean Express and Global Logistics compliance ratings: 99.8% tracking index."
    },
    {
      message: "Carrier lane optimization registry recalculated.",
      details: "Optimized 4 carrier routing profiles in IndexedDB cache to reduce routing overhead."
    },
    {
      message: "Cascaded lane selector parameters refreshed.",
      details: "Active matching: 5 ports checked. Local cache pinged in 2.1ms with zero lookup misses."
    }
  ];

  const sampleErrors = [
    {
      message: "MALFORMED DATASHEET: 'oceanFreight' is not a valid currency float on row 19.",
      details: "Found string 'TBD' on column 'Ocean Freight' under Carrier 'Pacific Link'."
    },
    {
      message: "CACHE WARNING: IndexedDB standard allocation buffer quota nearing threshold limit.",
      details: "Calculated 872 KB used out of 50 MB permitted browser persistent storage allocation."
    },
    {
      message: "CORRELATION EXCEPTION: Route code 'CNSHA -> SGPIN' possesses unrecognized transit zones.",
      details: "Please verify that the sheet matches expected DATOS structures."
    }
  ];

  useEffect(() => {
    // Read cached initial events or subscribe
    const handleLogAdded = (newLog: AppLog) => {
      setLogs((old) => {
        if (old.some((log) => log.id === newLog.id)) {
          return old;
        }
        return [newLog, ...old].slice(0, 50); // Keep a solid window of 50 logs max
      });
    };

    const unsubscribe = eventBus.on("system_log", handleLogAdded);

    // Seed initial console welcoming log
    handleLogAdded({
      id: "seeded-001",
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Diagnostics Monitor initialized. Ready to record XLS imports and db transactions.",
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleClear = () => {
    setLogs([]);
    console.clear();
    console.log("%c[FreightDB] Console reports cleared by operator.", "color: #ff9900; font-weight: bold;");
  };

  const handleTriggerSampleEvent = () => {
    const idx = Math.floor(Math.random() * sampleMessages.length);
    const item = sampleMessages[idx];
    eventBus.emit("system_log", {
      id: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      level: "info",
      message: item.message,
      details: isVerbose ? `${item.details} [VERB_INFO: Log sequence #${logs.length + 1}]` : item.details
    });
  };

  const handleSimulateError = () => {
    const idx = Math.floor(Math.random() * sampleErrors.length);
    const item = sampleErrors[idx];
    eventBus.emit("system_log", {
      id: `error-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      level: idx === 1 ? "warn" : "error",
      message: item.message,
      details: isVerbose ? `${item.details} [VERB_ERR: Exception captured on frame stack]` : item.details
    });
  };

  const handleToggleVerbose = () => {
    setIsVerbose((prev) => {
      const next = !prev;
      localStorage.setItem("console_verbose", String(next));
      eventBus.emit("system_log", {
        id: `verbose-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: next ? "success" : "warn",
        message: next ? "DEBUG: Verbose telemetry streams enabled." : "DEBUG: Verbose telemetry streams disabled.",
        details: next 
          ? "Enhanced diagnostic logs will record background latency, cascading lane selectors state changes, and individual database writes."
          : "Background tracking levels set to basic events."
      });
      return next;
    });
  };

  return (
    <div id="technical-console-logger" className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg font-mono">
      {/* Header bar that can be clicked to toggle drawer */}
      <div
        id="console-header-bar"
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-950 px-5 cursor-pointer hover:bg-slate-900/60 transition-colors gap-3 select-none"
      >
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
          <Terminal className="h-4 w-4 text-cyan-400" />
          <span>{t.consoleTitle}</span>
          <span className="bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded-full font-semibold">
            {logs.length} events
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-2.5" onClick={(e) => e.stopPropagation()}>
          <button
            id="btn-trigger-event"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTriggerSampleEvent();
            }}
            className="px-2 py-1 text-[9px] font-sans font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/40 rounded transition duration-150 active:scale-95 cursor-pointer"
          >
            Trigger Sample Event
          </button>

          <button
            id="btn-simulate-error"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSimulateError();
            }}
            className="px-2 py-1 text-[9px] font-sans font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/40 rounded transition duration-150 active:scale-95 cursor-pointer"
          >
            Simulate Error
          </button>

          <button
            id="btn-toggle-verbose"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleVerbose();
            }}
            className={`px-2 py-1 text-[9px] font-sans font-semibold border rounded transition duration-150 flex items-center gap-1 active:scale-95 cursor-pointer ${
              isVerbose
                ? "text-emerald-300 bg-emerald-950/40 border-emerald-800/40"
                : "text-slate-450 bg-slate-900/40 border-slate-750"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isVerbose ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}></span>
            Verbose logging: {isVerbose ? "ON" : "OFF"}
          </button>

          <div className="h-4 w-px bg-slate-800 hidden md:block"></div>

          {isOpen && (
            <button
              id="btn-clear-console"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 text-[10px] text-slate-400 hover:text-white flex items-center gap-1.5 font-sans bg-slate-850 hover:bg-slate-800 border border-slate-750 transition rounded-md px-2 cursor-pointer"
              title={t.consoleClear}
            >
              <Trash2 className="h-3 w-3" />
              <span>{t.consoleClear}</span>
            </button>
          )}

          <div 
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-850 rounded transition"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div id="console-output-container" className="p-4 max-h-[190px] overflow-y-auto space-y-2 text-[11px] bg-slate-950/80 border-t border-slate-900 leading-normal">
          {logs.length === 0 ? (
            <p className="text-slate-500 italic text-center py-6">{t.consoleWarnNoData}</p>
          ) : (
            logs.map((log) => {
              let tagColor = "text-blue-400 bg-blue-500/10";
              let msgColor = "text-slate-300";

              if (log.level === "success") {
                tagColor = "text-emerald-400 bg-emerald-500/10";
              } else if (log.level === "warn") {
                tagColor = "text-amber-400 bg-amber-500/10";
              } else if (log.level === "error") {
                tagColor = "text-rose-400 bg-rose-500/10";
                msgColor = "text-rose-200";
              }

              return (
                <div key={log.id} className="flex items-start gap-2 border-b border-slate-900 pb-1.5 last:border-b-0 last:pb-0">
                  <span className="text-slate-550 shrink-0 select-none font-sans text-[10px]">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  
                  <span className={`px-1.5 py-0.25 rounded font-sans text-[9px] uppercase font-bold shrink-0 inline-block tracking-wider ${tagColor}`}>
                    {log.level}
                  </span>

                  <span className={`${msgColor} break-all flex-1`}>
                    {log.message}
                    {log.details && (
                      <span className="block text-[10px] text-slate-500 bg-slate-900/40 px-1.5 py-0.5 rounded mt-1 overflow-x-auto select-all max-w-full">
                        {log.details}
                      </span>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
