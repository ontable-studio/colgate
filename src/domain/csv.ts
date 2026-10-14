import type { PlayRecord } from '@/domain/play';

const COLUMNS = [
  'id',
  'timestamp',
  'deviceId',
  'initials',
  'score',
  'meterPct',
  'catches',
  'hits',
  'durationSec',
  'gameVersion',
  'syncStatus',
] as const satisfies readonly (keyof PlayRecord)[];

function escapeCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV with a header row; prefixed with a BOM so Excel opens it as UTF-8. */
export function playsToCsv(plays: readonly PlayRecord[]): string {
  const lines = [COLUMNS.join(',')];
  for (const play of plays) {
    lines.push(COLUMNS.map((col) => escapeCell(play[col])).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
