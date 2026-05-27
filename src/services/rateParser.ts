/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FreightRate } from "../types";

/**
 * Normalizes headers and searches for matching columns based on common variants
 */
export function getHeaderKey(headers: string[], targetNames: string[]): string | null {
  for (const h of headers) {
    const cleanH = h.trim().toLowerCase().replace(/[\s_-]+/g, "");
    for (const t of targetNames) {
      const cleanT = t.toLowerCase().replace(/[\s_-]+/g, "");
      if (cleanH === cleanT || cleanH.includes(cleanT) || cleanT.includes(cleanH)) {
        return h;
      }
    }
  }
  return null;
}

/**
 * Assures currency expressions and objects are cleanly converted to numbers
 */
export function parseNum(val: any): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return val;
  const clean = String(val).replace(/[\$\s,]/g, "");
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Trims and sanitizes strings safely
 */
export function parseStr(val: any, fallback = ""): string {
  if (val === undefined || val === null || val === "") return fallback;
  return String(val).trim();
}

/**
 * Parses raw JSON structured rows generated from SheetJS into standard FreightRate entities
 */
export function parseRawSheetRows(rawRows: any[], sheetName: string): FreightRate[] {
  if (rawRows.length === 0) return [];

  const keys = Object.keys(rawRows[0]);
  
  const pMes = getHeaderKey(keys, ["mes", "month", "periodo", "fecha"]);
  const pPol = getHeaderKey(keys, ["portofloading", "pol", "origen", "loadingport"]);
  const pPod = getHeaderKey(keys, ["portofdischarge", "pod", "destino", "dischargeport"]);
  const pCarrier = getHeaderKey(keys, ["carrier", "naviera", "linea"]);
  const pTotal = getHeaderKey(keys, ["total", "totalcost", "costetotal", "sumatotal"]);
  const pFob = getHeaderKey(keys, ["gastosfob", "fob", "localesorigin", "localfob"]);
  const pOcean = getHeaderKey(keys, ["oceanfreight", "flete", "fletemaritimo", "ocean"]);
  const pDestino = getHeaderKey(keys, ["gastosendestino", "destino", "localesdestino", "destcharges"]);
  
  const pBaf = getHeaderKey(keys, ["baf", "fuel"]);
  const pThc = getHeaderKey(keys, ["thc", "handling"]);
  const pLss = getHeaderKey(keys, ["lss", "lowsulfur"]);
  const pOtros = getHeaderKey(keys, ["otros", "others", "recargos"]);

  const parsedRates: FreightRate[] = [];

  rawRows.forEach((row) => {
    const polVal = pPol ? parseStr(row[pPol]) : "";
    const podVal = pPod ? parseStr(row[pPod]) : "";
    const carrierVal = pCarrier ? parseStr(row[pCarrier]) : "";
    const mesVal = pMes ? parseStr(row[pMes]) : "";

    if (!polVal || !podVal || !carrierVal) {
      return;
    }

    const ocean = pOcean ? parseNum(row[pOcean]) : 0;
    const fob = pFob ? parseNum(row[pFob]) : 0;
    const dest = pDestino ? parseNum(row[pDestino]) : 0;
    
    const baf = pBaf ? parseNum(row[pBaf]) : 0;
    const thc = pThc ? parseNum(row[pThc]) : 0;
    const lss = pLss ? parseNum(row[pLss]) : 0;
    const otros = pOtros ? parseNum(row[pOtros]) : 0;

    const totalVal = pTotal ? parseNum(row[pTotal]) : (ocean + fob + dest + baf + thc + lss + otros);

    parsedRates.push({
      sheetSource: sheetName,
      mes: mesVal || "N/A",
      pol: polVal.toUpperCase(),
      pod: podVal.toUpperCase(),
      carrier: carrierVal,
      total: totalVal,
      gastosFob: fob,
      oceanFreight: ocean,
      gastosDestino: dest,
      baf,
      thc,
      lss,
      otrosRecargos: otros
    });
  });

  return parsedRates;
}
