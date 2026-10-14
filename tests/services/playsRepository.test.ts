import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PlayRecord } from '@/domain/play';
import { openBoothDb } from '@/services/storage/db';
import { PlaysRepository } from '@/services/storage/playsRepository';

let counter = 0;
const play = (over: Partial<PlayRecord> = {}): PlayRecord => ({
  id: `p${++counter}`,
  timestamp: new Date(2026, 9, 28, 10, 0, counter).toISOString(),
  deviceId: 'booth-test',
  initials: 'AAA',
  score: 0,
  meterPct: 0,
  catches: 0,
  hits: 0,
  durationSec: 40,
  gameVersion: '0.0.0',
  syncStatus: 'pending',
  ...over,
});

let repo: PlaysRepository;
beforeEach(async () => {
  repo = new PlaysRepository(await openBoothDb(`test-${++counter}`));
});

describe('PlaysRepository', () => {
  it('returns top scores highest first, earlier play wins ties', async () => {
    const a = play({ score: 50 });
    const b = play({ score: 80 });
    const c = play({ score: 50 });
    for (const p of [a, b, c]) await repo.add(p);
    const top = await repo.topScores(2);
    expect(top.map((p) => p.id)).toEqual([b.id, a.id]);
  });

  it('tracks pending plays and marks them synced', async () => {
    const a = play();
    const b = play();
    await repo.add(a);
    await repo.add(b);
    expect(await repo.pendingCount()).toBe(2);
    await repo.markSynced([a.id]);
    expect(await repo.pendingCount()).toBe(1);
    expect((await repo.pending(10)).map((p) => p.id)).toEqual([b.id]);
    expect((await repo.all()).find((p) => p.id === a.id)?.syncStatus).toBe('synced');
  });

  it('ignores unknown ids when marking synced', async () => {
    await expect(repo.markSynced(['nope'])).resolves.toBeUndefined();
  });
});
