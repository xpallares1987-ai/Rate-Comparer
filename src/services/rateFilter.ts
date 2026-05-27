/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FreightRate, ActiveFilters } from "../types";

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
  if (activeFilters.pol && activeFilters.pol !== "all") {
    result = result.filter((r) => r.pol.trim().toUpperCase() === activeFilters.pol.trim().toUpperCase());
  }
  if (activeFilters.pod && activeFilters.pod !== "all") {
    result = result.filter((r) => r.pod.trim().toUpperCase() === activeFilters.pod.trim().toUpperCase());
  }
  if (activeFilters.carrier && activeFilters.carrier !== "all") {
    result = result.filter((r) => r.carrier === activeFilters.carrier);
  }
  if (activeFilters.carrierSearch) {
    const searchLower = activeFilters.carrierSearch.trim().toLowerCase();
    result = result.filter((r) => r.carrier.toLowerCase().includes(searchLower));
  }

  return result;
}
