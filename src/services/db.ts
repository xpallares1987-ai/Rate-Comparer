/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FreightRate } from "../types";
import { eventBus } from "./eventBus";

const DB_NAME = "FreightRatesDatabase";
const STORE_NAME = "FreightRatesStore";
const DB_VERSION = 1;

/**
 * Log utility for the console and event bus
 */
function logSystem(level: "info" | "success" | "warn" | "error", message: string, details?: any) {
  const timestamp = new Date().toISOString();
  const styledMsg = `%c[FreightDB] [${level.toUpperCase()}] at ${timestamp}: ${message}`;
  
  let styles = "color: #3b82f6; font-weight: bold;";
  if (level === "success") styles = "color: #10b981; font-weight: bold;";
  if (level === "warn") styles = "color: #f59e0b; font-weight: bold;";
  if (level === "error") styles = "color: #ef4444; font-weight: bold;";

  if (details) {
    console.log(styledMsg, styles, details);
  } else {
    console.log(styledMsg, styles);
  }

  // Publish to Event Bus for the custom console logging panel
  eventBus.emit("system_log", {
    id: Math.random().toString(36).substring(2, 9),
    timestamp,
    level,
    message,
    details: details ? JSON.stringify(details) : undefined,
  });
}

/**
 * Custom Promise-wrapped IndexedDB API
 */
export class FreightDB {
  private static db: IDBDatabase | null = null;

  public static init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      logSystem("info", "Initializing IndexedDB Connection...");
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        logSystem("error", "IndexedDB failed to open", error);
        reject(error);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        logSystem("success", "IndexedDB connection established successfully.");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        logSystem("info", `Upgrading Database to version ${DB_VERSION}...`);
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });

          // Create indices for lightning fast relational filters
          store.createIndex("sheetSource", "sheetSource", { unique: false });
          store.createIndex("mes", "mes", { unique: false });
          store.createIndex("pol", "pol", { unique: false });
          store.createIndex("pod", "pod", { unique: false });
          store.createIndex("carrier", "carrier", { unique: false });
          store.createIndex("pol_pod", ["pol", "pod"], { unique: false });
          
          logSystem("success", "Database store and indexes configured.");
        }
      };
    });
  }

  /**
   * Save a list of freight rates to IndexedDB
   */
  public static async saveRates(rates: FreightRate[]): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      rates.forEach((rate) => {
        store.add(rate);
      });

      transaction.oncomplete = () => {
        const duration = (performance.now() - startTime).toFixed(1);
        logSystem("success", `Successfully imported ${rates.length} rates into IndexedDB database in ${duration}ms.`);
        eventBus.emit("db_updated");
        resolve(rates.length);
      };

      transaction.onerror = (event) => {
        const error = (event.target as IDBTransaction).error;
        logSystem("error", "Failed to complete rate import transaction", error);
        reject(error);
      };
    });
  }

  /**
   * Get all stored rates
   */
  public static async getAllRates(): Promise<FreightRate[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as FreightRate[]);
      };

      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        logSystem("error", "Failed to retrieve rates from database", error);
        reject(error);
      };
    });
  }

  /**
   * Filter rates based on conditions
   */
  public static async getFilteredRates(filters: {
    mes?: string;
    pol?: string;
    pod?: string;
    carrier?: string;
    sheetSource?: string;
  }): Promise<FreightRate[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      const results: FreightRate[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const val = cursor.value as FreightRate;
          
          let matches = true;

          if (filters.sheetSource && filters.sheetSource !== "all") {
            if (val.sheetSource !== filters.sheetSource) matches = false;
          }
          if (matches && filters.mes && filters.mes !== "all") {
            if (val.mes !== filters.mes) matches = false;
          }
          if (matches && filters.pol && filters.pol !== "all") {
            if (val.pol !== filters.pol) matches = false;
          }
          if (matches && filters.pod && filters.pod !== "all") {
            if (val.pod !== filters.pod) matches = false;
          }
          if (matches && filters.carrier && filters.carrier !== "all") {
            if (val.carrier !== filters.carrier) matches = false;
          }

          if (matches) {
            results.push(val);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        logSystem("error", "Error filtering rates cursor", error);
        reject(error);
      };
    });
  }

  /**
   * Clear all rates from the store
   */
  public static async clearAll(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        logSystem("warn", "Database wapped cleanly. All rates purged.");
        eventBus.emit("db_cleared");
        resolve();
      };

      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        logSystem("error", "Wiping database failed", error);
        reject(error);
      };
    });
  }
}
