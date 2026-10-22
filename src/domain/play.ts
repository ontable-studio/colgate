/** One finished play (no personal data). `id` is a unique key. */
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
}
