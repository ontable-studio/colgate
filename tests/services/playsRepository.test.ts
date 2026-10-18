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

  it('breaks a tie by faster finish, then by earlier play', async () => {
    const slow = play({ score: 90, durationSec: 30, timestamp: '2026-10-28T09:00:00.000Z' });
    const fast = play({ score: 90, durationSec: 18, timestamp: '2026-10-28T10:00:00.000Z' });
    const fastEarlier = play({ score: 90, durationSec: 18, timestamp: '2026-10-28T08:00:00.000Z' });
    for (const p of [slow, fast, fastEarlier]) await repo.add(p);
    const top = await repo.topScores(3);
    expect(top.map((p) => p.id)).toEqual([fastEarlier.id, fast.id, slow.id]);
  });

  it('reports the rank of a play outside the top, and nothing extra for one inside it', async () => {
    const plays = [90, 80, 70, 60, 50].map((score) => play({ score }));
    for (const p of plays) await repo.add(p);
    const low = plays[4];
    const best = plays[0];
    if (!low || !best) throw new Error('missing play');
    const outside = await repo.board(3, low.id);
    expect(outside.top).toHaveLength(3);
    expect(outside.mine?.rank).toBe(5);
    expect(outside.mine?.play.id).toBe(low.id);
    expect((await repo.board(3, best.id)).mine).toBeUndefined();
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

  it('counts and clears all plays', async () => {
    await repo.add(play());
    await repo.add(play());
    expect(await repo.count()).toBe(2);
    await repo.clear();
    expect(await repo.count()).toBe(0);
    expect(await repo.pendingCount()).toBe(0);
  });

  it('ignores unknown ids when marking synced', async () => {
    await expect(repo.markSynced(['nope'])).resolves.toBeUndefined();
  });
});
