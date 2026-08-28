import type { Drill, PracticeLog } from "./types";

const DB_NAME = "tempo-lab";
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("drills")) db.createObjectStore("drills", { keyPath: "id" });
      if (!db.objectStoreNames.contains("logs")) db.createObjectStore("logs", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
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

async function store(mode: IDBTransactionMode, name: "drills" | "logs"): Promise<IDBObjectStore> {
  const db = await openDatabase();
  const transaction = db.transaction(name, mode);
  transaction.oncomplete = () => db.close();
  return transaction.objectStore(name);
}

export const database = {
  async getDrills(): Promise<Drill[]> { return requestResult((await store("readonly", "drills")).getAll()); },
  async getLogs(): Promise<PracticeLog[]> { return requestResult((await store("readonly", "logs")).getAll()); },
  async saveDrill(drill: Drill): Promise<void> { await requestResult((await store("readwrite", "drills")).put(drill)); },
  async saveLog(log: PracticeLog): Promise<void> { await requestResult((await store("readwrite", "logs")).put(log)); },
  async deleteDrill(id: string): Promise<void> { await requestResult((await store("readwrite", "drills")).delete(id)); },
  async deleteLog(id: string): Promise<void> { await requestResult((await store("readwrite", "logs")).delete(id)); },
  async importData(drills: Drill[], logs: PracticeLog[]): Promise<void> {
    const db = await openDatabase();
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
    const db = await openDatabase();
    const transaction = db.transaction(["drills", "logs"], "readwrite");
    await completeTransaction(db, transaction, () => {
      const drillStore = transaction.objectStore("drills");
      const logStore = transaction.objectStore("logs");
      drillIds.forEach((id) => drillStore.delete(id));
      logIds.forEach((id) => logStore.delete(id));
    });
  }
};
