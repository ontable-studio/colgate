import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PlayRecord } from '@/domain/play';

interface BoothDB extends DBSchema {
  plays: {
    key: string;
    value: PlayRecord;
    indexes: { 'by-score': number };
  };
}

export type BoothDatabase = IDBPDatabase<BoothDB>;

export function openBoothDb(name = 'colgate-booth'): Promise<BoothDatabase> {
  return openDB<BoothDB>(name, 2, {
    upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        const plays = db.createObjectStore('plays', { keyPath: 'id' });
        plays.createIndex('by-score', 'score');
      } else if (oldVersion < 2) {
        // v2 dropped the sync queue; stored plays are kept as they are.
        (tx.objectStore('plays') as unknown as IDBObjectStore).deleteIndex('by-status');
      }
    },
  });
}

/** Ask the browser not to evict our data under storage pressure. Best effort. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
