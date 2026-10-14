import type { PlaysRepository } from '@/services/storage/playsRepository';
import type { SendBatch } from './sheetsClient';

export interface SyncServiceOptions {
  repo: PlaysRepository;
  send: SendBatch;
  intervalMs?: number;
  maxBackoffMs?: number;
  batchSize?: number;
}

export interface SyncStatusSnapshot {
  lastSyncAt: string | null;
  lastError: string | null;
  failures: number;
}

/**
 * Offline-first sync: results are always saved locally first; this drains the pending queue
 * whenever the network allows. Never deletes data; only flips pending -> synced after the
 * server confirmed the ids.
 */
export class SyncService {
  private readonly intervalMs: number;
  private readonly maxBackoffMs: number;
  private readonly batchSize: number;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private inFlight = false;
  private lastSyncAt: string | null = null;
  private lastError: string | null = null;
  private failures = 0;

  constructor(private readonly opts: SyncServiceOptions) {
    this.intervalMs = opts.intervalMs ?? 30_000;
    this.maxBackoffMs = opts.maxBackoffMs ?? 5 * 60_000;
    this.batchSize = opts.batchSize ?? 50;
  }

  get status(): SyncStatusSnapshot {
    return { lastSyncAt: this.lastSyncAt, lastError: this.lastError, failures: this.failures };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    if (typeof window !== 'undefined') window.addEventListener('online', this.onOnline);
    this.schedule(0);
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (typeof window !== 'undefined') window.removeEventListener('online', this.onOnline);
  }

  /** Drain the queue once. Returns how many plays were confirmed. Safe to call concurrently. */
  async flush(): Promise<number> {
    if (this.inFlight) return 0;
    this.inFlight = true;
    let sent = 0;
    try {
      // Read -> (transaction closed) -> network -> new transaction. Never fetch inside a transaction.
      for (;;) {
        const batch = await this.opts.repo.pending(this.batchSize);
        if (batch.length === 0) break;
        const accepted = await this.opts.send(batch);
        if (accepted.length === 0) throw new Error('Sync failed: server accepted nothing');
        await this.opts.repo.markSynced(accepted);
        sent += accepted.length;
      }
      this.failures = 0;
      this.lastError = null;
      if (sent > 0) this.lastSyncAt = new Date().toISOString();
    } catch (err) {
      this.failures += 1;
      this.lastError = err instanceof Error ? err.message : String(err);
    } finally {
      this.inFlight = false;
    }
    return sent;
  }

  private readonly onOnline = (): void => {
    if (this.timer) clearTimeout(this.timer);
    this.schedule(0);
  };

  private schedule(delayMs: number): void {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      void this.flush().then(() => {
        this.schedule(this.nextDelay());
      });
    }, delayMs);
  }

  private nextDelay(): number {
    if (this.failures === 0) return this.intervalMs;
    return Math.min(this.intervalMs * 2 ** this.failures, this.maxBackoffMs);
  }
}
