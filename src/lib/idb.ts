import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface ProvidenceDB extends DBSchema {
  store: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<ProvidenceDB>> | null = null;

export async function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<ProvidenceDB>('providence-erp', 1, {
      upgrade(db) {
        db.createObjectStore('store');
      },
    });
  }
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await initDB();
    const val = await db.get('store', key);
    return val !== undefined ? (val as T) : null;
  } catch (err) {
    console.error(`idbGet(${key}) error:`, err);
    return null;
  }
}

export async function idbSet(key: string, val: unknown): Promise<void> {
  try {
    const db = await initDB();
    await db.put('store', val, key);
  } catch (err) {
    console.error(`idbSet(${key}) error:`, err);
  }
}

export async function idbGetAll(): Promise<Record<string, unknown>> {
  try {
    const db = await initDB();
    const keys = await db.getAllKeys('store');
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      result[key] = await db.get('store', key);
    }
    return result;
  } catch (err) {
    console.error('idbGetAll error:', err);
    return {};
  }
}

export async function idbSetAll(data: Record<string, unknown>): Promise<void> {
  try {
    const db = await initDB();
    const tx = db.transaction('store', 'readwrite');
    for (const [key, val] of Object.entries(data)) {
      tx.store.put(val, key);
    }
    await tx.done;
  } catch (err) {
    console.error('idbSetAll error:', err);
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    const db = await initDB();
    await db.delete('store', key);
  } catch (err) {
    console.error(`idbDel(${key}) error:`, err);
  }
}

