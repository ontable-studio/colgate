export type SyncStatus = 'pending' | 'synced';

/** One finished play (no personal data). `id` is the idempotency key used by the sheet to drop duplicates. */
export interface PlayRecord {
  id: string;
  timestamp: string;
  deviceId: string;
  score: number;
  meterPct: number;
  pops: number;
  misses: number;
  durationSec: number;
  gameVersion: string;
  syncStatus: SyncStatus;
}
