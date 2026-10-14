import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayRecord } from '@/domain/play';
import { openBoothDb } from '@/services/storage/db';
import { PlaysRepository } from '@/services/storage/playsRepository';
import { createSheetsClient } from '@/services/sync/sheetsClient';
import { SyncService } from '@/services/sync/syncService';

let n = 0;
const play = (): PlayRecord => ({
  id: `s${++n}`,
  timestamp: new Date(2026, 9, 28, 10, 0, n).toISOString(),
  deviceId: 'booth-test',
  initials: 'AAA',
  score: n,
  meterPct: 10,
  catches: 1,
  hits: 0,
  durationSec: 40,
  gameVersion: '0.0.0',
  syncStatus: 'pending',
});

let repo: PlaysRepository;
beforeEach(async () => {
  repo = new PlaysRepository(await openBoothDb(`sync-${++n}`));
});

describe('SyncService', () => {
  it('sends pending plays and marks the accepted ones synced', async () => {
    await repo.add(play());
    await repo.add(play());
    const send = vi.fn((plays: readonly PlayRecord[]) => Promise.resolve(plays.map((p) => p.id)));
    const sync = new SyncService({ repo, send, batchSize: 1 });

    expect(await sync.flush()).toBe(2);
    expect(send).toHaveBeenCalledTimes(2);
    expect(await repo.pendingCount()).toBe(0);
    expect(sync.status.lastError).toBeNull();
  });

  it('keeps data pending when the network fails, then recovers', async () => {
    await repo.add(play());
    let online = false;
    const send = vi.fn((plays: readonly PlayRecord[]) =>
      online ? Promise.resolve(plays.map((p) => p.id)) : Promise.reject(new Error('offline')),
    );
    const sync = new SyncService({ repo, send });

    expect(await sync.flush()).toBe(0);
    expect(await repo.pendingCount()).toBe(1);
    expect(sync.status.failures).toBe(1);
    expect(sync.status.lastError).toBe('offline');

    online = true;
    expect(await sync.flush()).toBe(1);
    expect(await repo.pendingCount()).toBe(0);
    expect(sync.status.failures).toBe(0);
  });

  it('does not run two flushes at once', async () => {
    await repo.add(play());
    let release: () => void = () => undefined;
    const send = vi.fn(
      (plays: readonly PlayRecord[]) =>
        new Promise<string[]>((resolve) => {
          release = () => resolve(plays.map((p) => p.id));
        }),
    );
    const sync = new SyncService({ repo, send });

    const first = sync.flush();
    expect(await sync.flush()).toBe(0);
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    release();
    expect(await first).toBe(1);
  });
});

describe('createSheetsClient', () => {
  it('posts text/plain JSON without local-only fields and returns accepted ids', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(Response.json({ ok: true, accepted: ['x'] })),
    ) as unknown as typeof fetch;
    const send = createSheetsClient({ endpoint: 'https://example.test', secret: 's3', fetchImpl });

    const accepted = await send([{ ...play(), id: 'x' }]);

    expect(accepted).toEqual(['x']);
    const [url, init] = vi.mocked(fetchImpl).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.test');
    expect((init.headers as Record<string, string>)['Content-Type']).toContain('text/plain');
    const body = JSON.parse(init.body as string) as { secret: string; plays: object[] };
    expect(body.secret).toBe('s3');
    expect(body.plays[0]).not.toHaveProperty('syncStatus');
  });

  it('throws on HTTP errors and on a bad response body', async () => {
    const bad = (res: Response): typeof fetch => vi.fn(() => Promise.resolve(res));
    const mk = (f: typeof fetch) =>
      createSheetsClient({ endpoint: 'https://example.test', secret: '', fetchImpl: f });

    await expect(mk(bad(new Response('no', { status: 500 })))([])).rejects.toThrow('HTTP 500');
    await expect(mk(bad(Response.json({ ok: false })))([])).rejects.toThrow('bad response');
  });
});
