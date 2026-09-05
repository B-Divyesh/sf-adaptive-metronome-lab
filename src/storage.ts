import type { Drill, PracticeLog } from "./types";

const VERSION = 1;

export type StorageScope = "real" | "demo";

function databaseName(scope: StorageScope): string {
  // Demo data deliberately lives in a different IndexedDB database. Keeping
  // the boundary at the storage layer makes an accidental real-data read or
  // write from the sample route impossible.
  return scope === "demo" ? "demo:tempo-lab" : "tempo-lab";
}

function openDatabase(scope: StorageScope): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName(scope), VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("drills")) db.createObjectStore("drills", { keyPath: "id" });
      if (!db.objectStoreNames.contains("logs")) db.createObjectStore("logs", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function completeTransaction(db: IDBDatabase, transaction: IDBTransaction, write: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("IndexedDB transaction aborted")); };
    transaction.onerror = () => { /* The abort handler reports the transaction failure. */ };
    try { write(); }
    catch (error) { transaction.abort(); reject(error); }
  });
}

async function singleStore(scope: StorageScope, mode: IDBTransactionMode, name: "drills" | "logs"): Promise<{ db: IDBDatabase; transaction: IDBTransaction; store: IDBObjectStore }> {
  const db = await openDatabase(scope);
  const transaction = db.transaction(name, mode);
  return { db, transaction, store: transaction.objectStore(name) };
}

async function readAll<T>(scope: StorageScope, name: "drills" | "logs"): Promise<T[]> {
  const { db, transaction, store } = await singleStore(scope, "readonly", name);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => { db.close(); reject(transaction.error); };
  });
}

async function writeOne(scope: StorageScope, name: "drills" | "logs", operation: (store: IDBObjectStore) => IDBRequest): Promise<void> {
  const { db, transaction, store } = await singleStore(scope, "readwrite", name);
  await completeTransaction(db, transaction, () => { operation(store); });
}

export function createDatabase(scope: StorageScope = "real") {
  return {
  async getDrills(): Promise<Drill[]> { return readAll<Drill>(scope, "drills"); },
  async getLogs(): Promise<PracticeLog[]> { return readAll<PracticeLog>(scope, "logs"); },
  async saveDrill(drill: Drill): Promise<void> { await writeOne(scope, "drills", (store) => store.put(drill)); },
  async saveLog(log: PracticeLog): Promise<void> { await writeOne(scope, "logs", (store) => store.put(log)); },
  async deleteDrill(id: string): Promise<void> { await writeOne(scope, "drills", (store) => store.delete(id)); },
  async deleteLog(id: string): Promise<void> { await writeOne(scope, "logs", (store) => store.delete(id)); },
  async importData(drills: Drill[], logs: PracticeLog[]): Promise<void> {
    const db = await openDatabase(scope);
    const transaction = db.transaction(["drills", "logs"], "readwrite");
    await completeTransaction(db, transaction, () => {
      const drillStore = transaction.objectStore("drills");
      const logStore = transaction.objectStore("logs");
      drills.forEach((drill) => drillStore.put(drill));
      logs.forEach((log) => logStore.put(log));
    });
  },
  async removeInvalidData(drillIds: string[], logIds: string[]): Promise<void> {
    if (!drillIds.length && !logIds.length) return;
    const db = await openDatabase(scope);
    const transaction = db.transaction(["drills", "logs"], "readwrite");
    await completeTransaction(db, transaction, () => {
      const drillStore = transaction.objectStore("drills");
      const logStore = transaction.objectStore("logs");
      drillIds.forEach((id) => drillStore.delete(id));
      logIds.forEach((id) => logStore.delete(id));
    });
  },
  async clearAll(): Promise<void> {
    const db = await openDatabase(scope);
    const transaction = db.transaction(["drills", "logs"], "readwrite");
    await completeTransaction(db, transaction, () => {
      transaction.objectStore("drills").clear();
      transaction.objectStore("logs").clear();
    });
  }
  };
}

export const database = createDatabase();
