/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FreightRate, ActiveFilters } from "../types";

/**
 * Normalizes a rate's period (month/year) and expiration date into a standard JS Date object.
 */
export function getRateDate(rate: FreightRate): Date {
  let year = 2026;
  let monthIndex = 4; // default to May

  if (rate.validUntil) {
    const parts = String(rate.validUntil).split("/");
    if (parts.length === 3) {
      const parsedYear = parseInt(parts[2], 10);
      if (!isNaN(parsedYear) && parsedYear > 2000) {
        year = parsedYear;
      }
    }
  }

  const m = String(rate.mes).trim().toUpperCase();
  if (m.includes("ENE") || m.includes("JAN")) monthIndex = 0;
  else if (m.includes("FEB")) monthIndex = 1;
  else if (m.includes("MAR")) monthIndex = 2;
  else if (m.includes("ABR") || m.includes("APR")) monthIndex = 3;
  else if (m.includes("MAY")) monthIndex = 4;
  else if (m.includes("JUN")) monthIndex = 5;
  else if (m.includes("JUL")) monthIndex = 6;
  else if (m.includes("AGO") || m.includes("AUG")) monthIndex = 7;
  else if (m.includes("SEP")) monthIndex = 8;
  else if (m.includes("OCT")) monthIndex = 9;
  else if (m.includes("NOV")) monthIndex = 10;
  else if (m.includes("DIC") || m.includes("DEC")) monthIndex = 11;

  // Represent as middle of the month
  return new Date(year, monthIndex, 15);
}

/**
 * Pure function to filter rates based on user selected criteria
 */
export function filterRates(dataset: FreightRate[], activeFilters: ActiveFilters): FreightRate[] {
  let result = [...dataset];

  if (activeFilters.sheetSource && activeFilters.sheetSource !== "all") {
    result = result.filter((r) => r.sheetSource === activeFilters.sheetSource);
  }
  if (activeFilters.mes && activeFilters.mes !== "all") {
    result = result.filter((r) => r.mes === activeFilters.mes);
  }
  
  // MULTI-SELECT FOR POL
  if (activeFilters.pol && activeFilters.pol.length > 0 && !activeFilters.pol.includes("all")) {
    const polsUpper = activeFilters.pol.map(p => p.trim().toUpperCase());
    result = result.filter((r) => polsUpper.includes(r.pol.trim().toUpperCase()));
  }

  // MULTI-SELECT FOR POD
  if (activeFilters.pod && activeFilters.pod.length > 0 && !activeFilters.pod.includes("all")) {
    const podsUpper = activeFilters.pod.map(p => p.trim().toUpperCase());
    result = result.filter((r) => podsUpper.includes(r.pod.trim().toUpperCase()));
  }

  // MULTI-SELECT FOR CARRIER
  if (activeFilters.carrier && activeFilters.carrier.length > 0 && !activeFilters.carrier.includes("all")) {
    result = result.filter((r) => activeFilters.carrier.includes(r.carrier));
  }

  if (activeFilters.carrierSearch) {
    const searchLower = activeFilters.carrierSearch.trim().toLowerCase();
    result = result.filter((r) => r.carrier.toLowerCase().includes(searchLower));
  }

  // DATE RANGE FILTERING
  if (activeFilters.startDate) {
    const start = new Date(activeFilters.startDate);
    // set to elements beginning of day
    start.setHours(0, 0, 0, 0);
    result = result.filter((r) => getRateDate(r) >= start);
  }
  if (activeFilters.endDate) {
    const end = new Date(activeFilters.endDate);
    // set to elements end of day
    end.setHours(23, 59, 59, 999);
    result = result.filter((r) => getRateDate(r) <= end);
  }

  return result;
}
