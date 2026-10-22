import type { PlayRecord } from '@/domain/play';

const COLUMNS = [
  'id',
  'timestamp',
  'deviceId',
  'score',
  'meterPct',
  'pops',
  'misses',
  'durationSec',
  'gameVersion',
] as const satisfies readonly (keyof PlayRecord)[];

/** Local time of the device as `YYYY-MM-DD HH:mm:ss`; Excel and Sheets read it as a date. */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function escapeCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV with a header row; prefixed with a BOM so Excel opens it as UTF-8. */
export function playsToCsv(plays: readonly PlayRecord[]): string {
  const lines = [COLUMNS.join(',')];
  for (const play of plays) {
    lines.push(
      COLUMNS.map((col) =>
        escapeCell(col === 'timestamp' ? formatTimestamp(play.timestamp) : (play[col] ?? '')),
      ).join(','),
    );
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
