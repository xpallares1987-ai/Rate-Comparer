/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseRawSheetRows, getHeaderKey } from "./rateParser";
import { filterRates } from "./rateFilter";
import { FreightRate, ActiveFilters } from "../types";

export interface TestAssertion {
  id: string;
  assertion: string;
  passed: boolean;
  message: string;
}

export interface TestCaseResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  assertions: TestAssertion[];
  durationMs: number;
}

/**
 * Micro assert tool for custom testing
 */
class Assert {
  private assertions: TestAssertion[] = [];

  constructor(private testName: string) {}

  public equal<T>(actual: T, expected: T, message: string) {
    const passed = actual === expected;
    this.assertions.push({
      id: Math.random().toString(36).substring(2, 9),
      assertion: `Assert.equal: ${message}`,
      passed,
      message: passed 
        ? `PASSED: Found expected value "${expected}"` 
        : `FAILED: Expected "${expected}", but got "${actual}"`
    });
  }

  public deepEqual(actual: any, expected: any, message: string) {
    const actStr = JSON.stringify(actual);
    const expStr = JSON.stringify(expected);
    const passed = actStr === expStr;
    this.assertions.push({
      id: Math.random().toString(36).substring(2, 9),
      assertion: `Assert.deepEqual: ${message}`,
      passed,
      message: passed 
        ? `PASSED: Structure matches expected JSON` 
        : `FAILED: Structure mismatch.\nGot: ${actStr}\nExpected: ${expStr}`
    });
  }

  public isTrue(actual: boolean, message: string) {
    this.equal(actual, true, message);
  }

  public greaterThan(actual: number, threshold: number, message: string) {
    const passed = actual > threshold;
    this.assertions.push({
      id: Math.random().toString(36).substring(2, 9),
      assertion: `Assert.greaterThan: ${message}`,
      passed,
      message: passed 
        ? `PASSED: ${actual} is greater than ${threshold}` 
        : `FAILED: ${actual} is not greater than ${threshold}`
    });
  }

  public getAssertions(): TestAssertion[] {
    return this.assertions;
  }
}

/**
 * Runs the FreightSync custom Unit Test suite programmatically
 */
export function runUnitTestSuite(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // ========================================================
  // TEST UNIT 1: SheetJS Parser & Extractor Engine
  // ========================================================
  (() => {
    const startTime = performance.now();
    const assert = new Assert("SheetJS Parser Unit");

    // 1. Let's mock a chaotic raw row array resembling some of the messy layout rows read by XLSX
    const mockRawRows = [
      {
        " Month / Periodo ": "May 2026",
        "Loading Port (POL)": "ESBCN (BARCELONA)",
        "Discharge Port (POD)": "USNYC (NEW YORK)",
        "Line / Carrier": "Hapag-Lloyd",
        "oceanFreight": "$2,200.75",
        "local fob fee": "350",
        "gastos en Destino": "400.25",
        "BAF_fuel": "120",
        "THC charges": 150,
        "LSS": "  50  "
      },
      {
        " Month / Periodo ": "June 2026",
        "Loading Port (POL)": "CNSHA (SHANGHAI)",
        "Discharge Port (POD)": "ESVLC (VALENCIA)",
        "Line / Carrier": "CMA CGM",
        "oceanFreight": 4800,
        "local fob fee": "$0.00",
        "gastos en Destino": 150,
        "THC charges": 0
      }
    ];

    // Trigger parser
    const parsed = parseRawSheetRows(mockRawRows, "DATOS");

    // Assertions
    assert.equal(parsed.length, 2, "Should parse exactly 2 valid rows");
    
    // First rate details
    const rate1 = parsed[0];
    assert.equal(rate1.sheetSource, "DATOS", "Sheet source metadata must match input parameters");
    assert.equal(rate1.mes, "May 2026", "Mes mapping must normalize whitespace");
    assert.equal(rate1.pol, "ESBCN (BARCELONA)", "POL mapping must convert text to uppercase");
    assert.equal(rate1.pod, "USNYC (NEW YORK)", "POD mapping must convert text to uppercase");
    assert.equal(rate1.carrier, "Hapag-Lloyd", "Carrier string extraction must be clean");
    
    // Financial calculations and currency casting asserts
    assert.equal(rate1.oceanFreight, 2200.75, "Float parsing of currency strings with commas/dollar symbols");
    assert.equal(rate1.gastosFob, 350, "Standard conversion on integer strings");
    assert.equal(rate1.gastosDestino, 400.25, "Float parsing of destination rate values");
    assert.equal(rate1.baf, 120, "Recognizes BAF mapping");
    assert.equal(rate1.thc, 150, "Recognizes numeric THC fields");
    assert.equal(rate1.lss, 50, "Cleans up trailing strings inside numeric boxes");
    
    // Total calculation when sheet lacks simple total = ocean + fob + dest + baf + thc + lss + others
    const calculatedSum = 2200.75 + 350 + 400.25 + 120 + 150 + 50 + 0;
    assert.equal(rate1.total, calculatedSum, "Computes correct compound sum rate if total is absent");

    // Second rate details (checking defaults for missing cells)
    const rate2 = parsed[1];
    assert.equal(rate2.carrier, "CMA CGM", "Carrier matches CMA CGM");
    assert.equal(rate2.baf, 0, "Default mapping of undefined metric properties to zero");
    assert.equal(rate2.total, 4950, "Accurate aggregation with optional and missing surcharge values");

    const durationMs = performance.now() - startTime;
    const assertions = assert.getAssertions();
    results.push({
      id: "test-sheetjs-parser",
      name: "SheetJS Normalization & Aggregator",
      description: "Verifies headers mapping rules, currency string sanitize formatting, and total computations.",
      passed: assertions.every(a => a.passed),
      assertions,
      durationMs
    });
  })();

  // ========================================================
  // TEST UNIT 2: Multi-Factor Heuristic Filtering Sifter
  // ========================================================
  (() => {
    const startTime = performance.now();
    const assert = new Assert("Rate Filter Unit");

    // 1. Mock standard formatted rates dataset
    const mockDataset: FreightRate[] = [
      {
        sheetSource: "DATOS",
        mes: "May 2026",
        pol: "ESBCN (BARCELONA)",
        pod: "USNYC (NEW YORK)",
        carrier: "Ocean Express",
        total: 1550,
        gastosFob: 250,
        oceanFreight: 1000,
        gastosDestino: 300,
        baf: 0, thc: 0, lss: 0, otrosRecargos: 0
      },
      {
        sheetSource: "DATOS",
        mes: "May 2026",
        pol: "CNSHA (SHANGHAI)",
        pod: "ESVLC (VALENCIA)",
        carrier: "Ocean Express",
        total: 2800,
        gastosFob: 200,
        oceanFreight: 2400,
        gastosDestino: 200,
        baf: 0, thc: 0, lss: 0, otrosRecargos: 0
      },
      {
        sheetSource: "MESES ANTERIORES",
        mes: "June 2026",
        pol: "ESBCN (BARCELONA)",
        pod: "USNYC (NEW YORK)",
        carrier: "Global Logistics",
        total: 1650,
        gastosFob: 300,
        oceanFreight: 1050,
        gastosDestino: 300,
        baf: 0, thc: 0, lss: 0, otrosRecargos: 0
      }
    ];

    // Sub-Test 1: Filter on POL
    const filterPOLOnly: ActiveFilters = {
      sheetSource: "all",
      mes: "all",
      pol: "ESBCN (BARCELONA)",
      pod: "all",
      carrier: "all"
    };
    const resultsPOL = filterRates(mockDataset, filterPOLOnly);
    assert.equal(resultsPOL.length, 2, "Filters dataset precisely to match target POL");
    assert.isTrue(resultsPOL.every(r => r.pol === "ESBCN (BARCELONA)"), "All return results have correct POL string");

    // Sub-Test 2: Filter on POL + POD (combative combination checking)
    const filterPolPod: ActiveFilters = {
      sheetSource: "all",
      mes: "all",
      pol: "ESBCN (BARCELONA)",
      pod: "USNYC (NEW YORK)",
      carrier: "all"
    };
    const resultsPolPod = filterRates(mockDataset, filterPolPod);
    assert.equal(resultsPolPod.length, 2, "POL + POD simultaneous filter sifts precisely");

    // Sub-Test 3: Case-insensitive match check on lowercase filters
    const filterCaseInsensitive: ActiveFilters = {
      sheetSource: "all",
      mes: "all",
      pol: "esbcn (barcelona)",
      pod: "usnyc (new york)",
      carrier: "all"
    };
    const resultsCI = filterRates(mockDataset, filterCaseInsensitive);
    assert.equal(resultsCI.length, 2, "POL / POD filter mapping operates case-insensitively");

    // Sub-Test 4: Filter on POL + POD + sheetSource
    const filterSheetSource: ActiveFilters = {
      sheetSource: "MESES ANTERIORES",
      mes: "all",
      pol: "ESBCN (BARCELONA)",
      pod: "USNYC (NEW YORK)",
      carrier: "all"
    };
    const resultsSheet = filterRates(mockDataset, filterSheetSource);
    assert.equal(resultsSheet.length, 1, "Sifts perfectly by spreadsheet tab/source criteria");
    assert.equal(resultsSheet[0].carrier, "Global Logistics", "Confirms exact record retrieved through compound filters");

    // Sub-Test 5: Filter reset state ('all' mapping)
    const filterAll: ActiveFilters = {
      sheetSource: "all",
      mes: "all",
      pol: "all",
      pod: "all",
      carrier: "all"
    };
    const resultsAll = filterRates(mockDataset, filterAll);
    assert.equal(resultsAll.length, mockDataset.length, "Resets to absolute original record length when filters match 'all'");

    const durationMs = performance.now() - startTime;
    const assertions = assert.getAssertions();
    results.push({
      id: "test-rate-filters",
      name: "Compound Tariff Filtering Sifter",
      description: "Examines isolation parameters for POL and POD routes, case-insensitivity matches, source sheet bounds, and 'all' filter resets.",
      passed: assertions.every(a => a.passed),
      assertions,
      durationMs
    });
  })();

  return results;
}
