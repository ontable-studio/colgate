import { describe, expect, it } from 'vitest';
import { formatTimestamp, playsToCsv } from '@/domain/csv';
import type { PlayRecord } from '@/domain/play';

const play = (over: Partial<PlayRecord> = {}): PlayRecord => ({
  id: 'a1',
  timestamp: '2026-10-28T10:00:00.000Z',
  deviceId: 'booth-01',
  score: 120,
  meterPct: 55,
  pops: 12,
  misses: 3,
  durationSec: 40,
  gameVersion: '0.1.0',
  ...over,
});

describe('formatTimestamp', () => {
  it('uses the local time as YYYY-MM-DD HH:mm:ss', () => {
    const d = new Date(2026, 9, 28, 9, 5, 7);
    expect(formatTimestamp(d.toISOString())).toBe('2026-10-28 09:05:07');
  });

  it('leaves an unparseable value as it is', () => {
    expect(formatTimestamp('not a date')).toBe('not a date');
  });
});

describe('playsToCsv', () => {
  it('writes a BOM, a header and one row per play', () => {
    const csv = playsToCsv([play(), play({ id: 'a2', score: 80 })]);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(
      'id,timestamp,deviceId,score,meterPct,pops,misses,durationSec,gameVersion',
    );
    expect(lines[1]).toBe(`a1,${formatTimestamp(play().timestamp)},booth-01,120,55,12,3,40,0.1.0`);
  });

  it('quotes cells containing commas, quotes or newlines', () => {
    const csv = playsToCsv([play({ deviceId: 'booth, "A"\nfloor 1' })]);
    expect(csv).toContain('"booth, ""A""\nfloor 1"');
  });

  it('returns only the header for no plays', () => {
    expect(playsToCsv([]).slice(1).trimEnd().split('\r\n')).toHaveLength(1);
  });
});
