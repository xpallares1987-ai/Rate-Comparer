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
 * Normalizes strings to Proper Case (Nombre Propio) with acronym guards.
 */
export function toProperCase(str: string): string {
  if (!str) return "";
  const trimmed = str.trim();
  if (!trimmed) return "";
  
  const upperTrimmed = trimmed.toUpperCase();
  if (upperTrimmed === "MSC") return "MSC";
  if (upperTrimmed === "COSCO") return "COSCO";
  if (upperTrimmed === "EUR") return "EUR";
  if (upperTrimmed === "USD") return "USD";
  if (upperTrimmed === "VGM") return "VGM";
  if (upperTrimmed === "THC") return "THC";
  if (upperTrimmed === "BAF") return "BAF";
  if (upperTrimmed === "LSS") return "LSS";
  
  return trimmed
    .toLowerCase()
    .replace(/(^[a-zÀ-ÿ]|[\s\-()\/&,+]\s*[a-zÀ-ÿ])/g, (match) => match.toUpperCase());
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

    const cleanPol = polVal.toUpperCase().trim().replace(/\s+/g, "");
    let polsToCreate: string[] = [];
    if (cleanPol === "BARCELONA/VALENCIA" || cleanPol === "VALENCIA/BARCELONA") {
      polsToCreate = ["Barcelona", "Valencia"];
    } else {
      polsToCreate = [polVal];
    }

    const cleanPod = podVal.toUpperCase().trim().replace(/\s+/g, "");
    let podsToCreate: string[] = [];
    if (cleanPod.includes("ALGER(ARGEL)&SKIKDA&ANNABA") || cleanPod.includes("ALGER(ARGEL)&SKIDKA&ANNABA") || 
        (cleanPod.includes("ALGER") && cleanPod.includes("SKIKDA") && cleanPod.includes("ANNABA"))) {
      podsToCreate = ["Alger (Argel)", "Skikda", "Annaba"];
    } else {
      podsToCreate = [podVal];
    }

    polsToCreate.forEach((pName) => {
      podsToCreate.forEach((dName) => {
        parsedRates.push({
          sheetSource: sheetName,
          mes: toProperCase(mesVal) || "N/A",
          pol: toProperCase(pName),
          pod: toProperCase(dName),
          carrier: toProperCase(carrierVal),
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
    });
  });

  return parsedRates;
}

/**
 * Parses raw datos.js JSON items into proper FreightRate entities, computing standard flat values
 */
export function parseDatosJsRows(rawRecords: any[]): FreightRate[] {
  const EUR_USD_RATE = 1.08;
  const META_KEYS = [
    'CONTRATO', 'Dias libres en Origen', 'Dias Libres en Destino', 
    'Effective Date', 'Valid Until', 'GASTOS FOB', 'SF + RECARGOS', 
    'Ocean freight', 'GASTOS EN DESTINO', 'NAC'
  ];

  const parsedRates: FreightRate[] = [];

  rawRecords.forEach((item) => {
    const oceanFreight = item.oceanFreight || 0;
    const oceanFreightDivisa = item.oceanFreightDivisa || "USD";
    const mes = item.mes || "N/A";
    const pol = item.pol || "";
    const pod = item.pod || "";
    const carrier = item.carrier || "";
    const contrato = item.contrato || "";
    const nac = item.nac || "—";
    const diasLibresOrigen = item.diasLibresOrigen !== undefined ? item.diasLibresOrigen : "—";
    const diasLibresDestino = item.diasLibresDestino !== undefined ? item.diasLibresDestino : "—";
    const validUntil = item.validUntil || "";
    const conceptos = item.conceptos || {};

    // Compute parts
    let totalUSD = oceanFreightDivisa === "EUR" ? oceanFreight * EUR_USD_RATE : oceanFreight;
    let gastosFob = 0;
    let gastosDestino = 0;
    let baf = 0;
    let thc = 0;
    let lss = 0;
    let otrosRecargos = 0;

    Object.entries(conceptos).forEach(([key, value]) => {
      if (META_KEYS.includes(key)) return;
      
      const val = typeof value === "object" ? (value as any).val : (value as number);
      const divisa = typeof value === "object" ? ((value as any).divisa || "USD") : "USD";
      const valUSD = divisa === "EUR" ? val * EUR_USD_RATE : val;

      totalUSD += valUSD;

      const lowKey = key.toLowerCase();
      if (lowKey.includes("baf")) {
        baf += valUSD;
      } else if (lowKey.includes("thco") || lowKey.includes("thc")) {
        thc += valUSD;
        gastosFob += valUSD;
      } else if (lowKey.includes("lss") || lowKey.includes("seca") || lowKey.includes("co2")) {
        lss += valUSD;
      } else if (lowKey.startsWith("doc:") || lowKey.includes("porto") || lowKey.includes("vgm") || lowKey.includes("fob")) {
        gastosFob += valUSD;
      } else if (lowKey.includes("portd") || lowKey.includes("thcd") || lowKey.includes("owd") || lowKey.includes("onct")) {
        gastosDestino += valUSD;
      } else {
        otrosRecargos += valUSD;
      }
    });

    const cleanPol = pol.toUpperCase().trim().replace(/\s+/g, "");
    let polsToCreate: string[] = [];
    if (cleanPol === "BARCELONA/VALENCIA" || cleanPol === "VALENCIA/BARCELONA") {
      polsToCreate = ["Barcelona", "Valencia"];
    } else {
      polsToCreate = [pol];
    }

    const cleanPod = pod.toUpperCase().trim().replace(/\s+/g, "");
    let podsToCreate: string[] = [];
    if (cleanPod.includes("ALGER(ARGEL)&SKIKDA&ANNABA") || cleanPod.includes("ALGER(ARGEL)&SKIDKA&ANNABA") || 
        (cleanPod.includes("ALGER") && cleanPod.includes("SKIKDA") && cleanPod.includes("ANNABA"))) {
      podsToCreate = ["Alger (Argel)", "Skikda", "Annaba"];
    } else {
      podsToCreate = [pod];
    }

    polsToCreate.forEach((pName) => {
      podsToCreate.forEach((dName) => {
        parsedRates.push({
          sheetSource: "DATOS",
          mes: toProperCase(mes),
          pol: toProperCase(pName),
          pod: toProperCase(dName),
          carrier: toProperCase(carrier),
          total: Math.round(totalUSD * 100) / 100,
          gastosFob: Math.round(gastosFob * 100) / 100,
          oceanFreight,
          oceanFreightDivisa,
          gastosDestino: Math.round(gastosDestino * 100) / 100,
          baf: Math.round(baf * 100) / 100,
          thc: Math.round(thc * 100) / 100,
          lss: Math.round(lss * 100) / 100,
          otrosRecargos: Math.round(otrosRecargos * 100) / 100,
          contrato,
          nac,
          diasLibresOrigen,
          diasLibresDestino,
          validUntil,
          conceptos,
        });
      });
    });
  });

  return parsedRates;
}
