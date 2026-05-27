/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { FlaskConical, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp, Clock, ShieldCheck } from "lucide-react";
import { runUnitTestSuite, TestCaseResult } from "../services/testSuite";

export default function UnitTestRunner() {
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [expandedSuite, setExpandedSuite] = useState<string | null>("test-sheetjs-parser");

  // Run suite
  const executeTests = () => {
    setIsTesting(true);
    setTimeout(() => {
      const suiteResults = runUnitTestSuite();
      setResults(suiteResults);
      setIsTesting(false);
    }, 450); // Small delay to show satisfying loading animation feedback
  };

  useEffect(() => {
    // Run tests automatically on load
    executeTests();
  }, []);

  const totalSuites = results.length;
  const passedSuites = results.filter(r => r.passed).length;
  const isAllPassed = passedSuites === totalSuites && totalSuites > 0;
  const totalAssertionsCount = results.reduce((acc, r) => acc + r.assertions.length, 0);
  const passedAssertionsCount = results.reduce((acc, r) => acc + r.assertions.filter(a => a.passed).length, 0);

  const toggleExpand = (id: string) => {
    setExpandedSuite(prev => (prev === id ? null : id));
  };

  return (
    <div id="unit-test-compliance-runner" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Runner Header Area */}
      <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950 text-indigo-400 border border-indigo-800/50 rounded-xl relative">
            <FlaskConical className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Interactive Unit Test Suite
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Client-side verification of spreadsheet parsing accuracy and multi-route searching sifting rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-850 border border-slate-800 rounded-lg px-3 py-1.5 text-right hidden lg:block">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Assertion Score</span>
            <span className="font-mono text-xs font-extrabold text-emerald-400">
              {passedAssertionsCount} / {totalAssertionsCount} PASSED
            </span>
          </div>

          <button
            onClick={executeTests}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-indigo-100 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 border border-indigo-500 rounded-lg transition duration-200 cursor-pointer shadow-indigo-500/10 shadow-md"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? "animate-spin" : ""}`} />
            <span>{isTesting ? "RUNNING TESTS..." : "RUN LIVE TESTS"}</span>
          </button>
        </div>
      </div>

      {/* Runner Summary Bar */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Suite Status:</span>
          {isTesting ? (
            <span className="flex items-center gap-1.5 px-2 bg-indigo-50 text-indigo-700 py-0.5 rounded font-mono text-[10px] font-bold">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></span>
              EVALUATING EXPRESSIONS...
            </span>
          ) : isAllPassed ? (
            <span className="flex items-center gap-1 px-2 bg-emerald-50 text-emerald-700 py-0.5 rounded font-mono text-[10px] font-bold border border-emerald-100">
              <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
              ALL COMPLIANT (100% GREEN)
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 bg-rose-50 text-rose-700 py-0.5 rounded font-mono text-[10px] font-bold border border-rose-100">
              <XCircle className="h-3 w-3 text-rose-600 shrink-0" />
              ASSERTIONS FAILED
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" />
            Suite: {results.reduce((sum, r) => sum + r.durationMs, 0).toFixed(2)}ms
          </span>
          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-bold">
            STANDARD HARNESS
          </span>
        </div>
      </div>

      {/* Suites List */}
      <div className="divide-y divide-slate-100">
        {results.map((suite) => {
          const isExpanded = expandedSuite === suite.id;
          const passedCount = suite.assertions.filter(a => a.passed).length;
          const scorePercent = Math.round((passedCount / suite.assertions.length) * 100);

          return (
            <div key={suite.id} className="transition hover:bg-slate-50/20">
              {/* Header section toggle click */}
              <div 
                onClick={() => toggleExpand(suite.id)}
                className="p-5 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800">
                      {suite.name}
                    </span>
                    <span className={`text-[9px] font-mono leading-none px-1.5 py-0.5 rounded-full font-bold ${
                      suite.passed 
                        ? "bg-emerald-50 text-emerald-700" 
                        : "bg-rose-50 text-rose-700"
                    }`}>
                      {suite.passed ? "✔ PASS" : "✘ FAIL"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-450 leading-relaxed max-w-2xl">
                    {suite.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right font-mono hidden sm:block">
                    <div className="text-xs font-bold text-slate-800">{passedCount}/{suite.assertions.length} asserts</div>
                    <div className="text-[9px] text-slate-400 font-semibold">{scorePercent}% pass-rate</div>
                  </div>
                  <div className="p-1.5 hover:bg-slate-100 rounded text-slate-450">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expansion block for assert steps */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-0 border-t border-slate-50/50 bg-slate-50/30">
                  <div id={`assertions-detail-box-${suite.id}`} className="space-y-2 mt-3">
                    <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block">
                      Sequence Assertion Logs:
                    </span>
                    
                    <div className="space-y-1.5 font-mono text-[10px] leading-relaxed">
                      {suite.assertions.map((a, aIdx) => (
                        <div 
                          key={a.id} 
                          className={`p-2.5 rounded-lg border flex items-start gap-2.5 bg-white ${
                            a.passed 
                              ? "border-emerald-100 shadow-xs text-slate-700" 
                              : "border-rose-100 bg-rose-50/10 text-rose-800"
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {a.passed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-rose-500" />
                            )}
                          </div>
                          
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800 text-[11px] block">
                              [{aIdx + 1}] {a.assertion}
                            </span>
                            <span className={`text-[10px] block font-mono ${a.passed ? "text-slate-450" : "text-rose-650"}`}>
                              {a.message}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
