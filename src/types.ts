/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FreightRate {
  id?: number;
  sheetSource: string; // 'DATOS', 'MESES ANTERIORES', 'Buscador'
  mes: string;
  pol: string;
  pod: string;
  carrier: string;
  total: number;
  gastosFob: number;
  oceanFreight: number;
  gastosDestino: number;
  baf?: number;
  thc?: number;
  lss?: number;
  otrosRecargos?: number;
  // New fields from datos.js
  contrato?: string | number;
  nac?: string;
  diasLibresOrigen?: string | number;
  diasLibresDestino?: string | number;
  validUntil?: string | number;
  conceptos?: Record<string, any>;
  oceanFreightDivisa?: string;
}

export interface ActiveFilters {
  mes: string;
  pol: string[];
  pod: string[];
  carrier: string[];
  sheetSource: string;
  carrierSearch?: string;
  startDate?: string;
  endDate?: string;
}

export interface AppLog {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warn" | "error";
  message: string;
  details?: string;
}

export type LanguageCode = "en" | "es" | "de";

export interface TranslationSet {
  title: string;
  subtitle: string;
  dragActiveText: string;
  dragInactiveText: string;
  orSelectFile: string;
  loadingData: string;
  dbStatus: string;
  dbEmpty: string;
  dbRecords: string;
  clearDb: string;
  uploadSuccess: string;
  uploadError: string;
  invalidExcel: string;
  allMeses: string;
  allPols: string;
  allPods: string;
  allCarriers: string;
  allSheets: string;
  labelPOL: string;
  labelPOD: string;
  labelCarrier: string;
  labelMes: string;
  labelSheet: string;
  colCarrier: string;
  colOceanFreight: string;
  colGastosFob: string;
  colGastosDestino: string;
  colSurcharges: string;
  colTotal: string;
  bestRate: string;
  cheapestSurcharge: string;
  chartTitle: string;
  chartTotal: string;
  chartOcean: string;
  consoleTitle: string;
  consoleClear: string;
  consoleWarnNoData: string;
  searchBtn: string;
  resetBtn: string;
  noRatesFound: string;
  sheetLabel: string;
  metricAvgTotal: string;
  metricCheapest: string;
  metricCheapestCarrier: string;
  metricComparison: string;
  carrierComparisonTitle: string;
  surchargesBreakdown: string;
  carrierCount: string;
  fobLabel: string;
  destLabel: string;
  oceanLabel: string;
  totalFreightLabel: string;
}
