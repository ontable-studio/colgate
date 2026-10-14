import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PlayRecord } from '@/domain/play';

interface BoothDB extends DBSchema {
  plays: {
    key: string;
    value: PlayRecord;
    indexes: { 'by-status': string; 'by-score': number };
  };
}

export type BoothDatabase = IDBPDatabase<BoothDB>;

export function openBoothDb(name = 'colgate-booth'): Promise<BoothDatabase> {
  return openDB<BoothDB>(name, 1, {
    upgrade(db) {
      const plays = db.createObjectStore('plays', { keyPath: 'id' });
      plays.createIndex('by-status', 'syncStatus');
      plays.createIndex('by-score', 'score');
    },
  });
}

/** Ask the browser not to evict our data under storage pressure. Best effort. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
