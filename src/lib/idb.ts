import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface ProvidenceDB extends DBSchema {
  store: {
    key: string;
    value: any;
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

export async function idbSet(key: string, val: any): Promise<void> {
  try {
    const db = await initDB();
    await db.put('store', val, key);
  } catch (err) {
    console.error(`idbSet(${key}) error:`, err);
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
