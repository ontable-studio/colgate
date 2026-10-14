export type SyncStatus = 'pending' | 'synced';

/** One finished play. `id` is the idempotency key used by the sheet to drop duplicates. */
export interface PlayRecord {
  id: string;
  timestamp: string;
  deviceId: string;
  initials: string;
  score: number;
  meterPct: number;
  catches: number;
  hits: number;
  durationSec: number;
  gameVersion: string;
  syncStatus: SyncStatus;
}
