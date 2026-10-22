import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PlayRecord } from '@/domain/play';
import { openBoothDb } from '@/services/storage/db';
import { PlaysRepository } from '@/services/storage/playsRepository';

let counter = 0;
const play = (over: Partial<PlayRecord> = {}): PlayRecord => ({
  id: `p${++counter}`,
  timestamp: new Date(2026, 9, 28, 10, 0, counter).toISOString(),
  deviceId: 'booth-test',
  score: 0,
  meterPct: 0,
  pops: 0,
  misses: 0,
  durationSec: 40,
  gameVersion: '0.0.0',
  ...over,
});

let repo: PlaysRepository;
beforeEach(async () => {
  repo = new PlaysRepository(await openBoothDb(`test-${++counter}`));
});

describe('PlaysRepository', () => {
  it('counts and clears all plays', async () => {
    await repo.add(play());
    await repo.add(play());
    expect(await repo.count()).toBe(2);
    await repo.clear();
    expect(await repo.count()).toBe(0);
  });

  it('keeps plays stored by the previous database version', async () => {
    const name = 'legacy-booth';
    const old = await openDB(name, 1, {
      upgrade(db) {
        const store = db.createObjectStore('plays', { keyPath: 'id' });
        store.createIndex('by-status', 'syncStatus');
        store.createIndex('by-score', 'score');
      },
    });
    await old.put('plays', { ...play({ id: 'old1' }), syncStatus: 'synced' });
    old.close();

    const migrated = new PlaysRepository(await openBoothDb(name));
    expect((await migrated.all()).map((p) => p.id)).toEqual(['old1']);
  });
});
