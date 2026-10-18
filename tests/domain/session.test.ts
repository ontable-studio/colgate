import { describe, expect, it } from 'vitest';
import { RULES, type GameRules } from '@/config/game';
import { GameSession } from '@/domain/session';

const rules: GameRules = {
  ...RULES,
  durationSec: 10,
  combo: [
    { streak: 3, multiplier: 2 },
    { streak: 6, multiplier: 3 },
    { streak: 10, multiplier: 4 },
    { streak: 15, multiplier: 5 },
  ],
  points: { capsule: 10, stain: -10, decoy: -5 },
  meter: { capsule: 25, stain: -10, decoy: -5 },
};

describe('GameSession', () => {
  it('adds score and meter for a capsule', () => {
    const s = new GameSession(rules);
    s.catch('capsule');
    expect(s.score).toBe(10);
    expect(s.meterPct).toBe(25);
    expect(s.result().catches).toBe(1);
  });

  it('never lets score or meter go below zero', () => {
    const s = new GameSession(rules);
    s.catch('stain');
    s.catch('decoy');
    expect(s.score).toBe(0);
    expect(s.meterPct).toBe(0);
    expect(s.result().hits).toBe(2);
  });

  it('keeps playing after the meter is full, and the meter never passes its maximum', () => {
    const s = new GameSession(rules);
    for (let i = 0; i < 4; i++) s.catch('capsule');
    expect(s.meterPct).toBe(rules.meterFull);
    expect(s.filled).toBe(true);
    expect(s.isOver).toBe(false);
    s.catch('capsule');
    expect(s.meterPct).toBe(rules.meterFull);
    expect(s.score).toBe(80); // 10 + 10 + 20 + 20 + 20: from the third catch on every one pays double
  });

  it('remembers that the meter was full even if a stain lowers it again', () => {
    const s = new GameSession(rules);
    for (let i = 0; i < 4; i++) s.catch('capsule');
    s.catch('stain');
    expect(s.meterPct).toBeLessThan(rules.meterFull);
    expect(s.filled).toBe(true);
  });

  it('ends when time runs out and reports elapsed seconds', () => {
    const s = new GameSession(rules);
    s.tick(4000);
    expect(s.isOver).toBe(false);
    s.tick(60_000);
    expect(s.isOver).toBe(true);
    expect(s.remainingMs).toBe(0);
    expect(s.result().durationSec).toBe(10);
  });
});

describe('combo multiplier', () => {
  const comboRules: GameRules = { ...rules, meter: { capsule: 1, stain: -1, decoy: -1 } };

  it('pays more the longer the streak: x1, x1, x2 from the third capsule in a row', () => {
    const s = new GameSession(comboRules);
    s.catch('capsule');
    s.catch('capsule');
    expect(s.score).toBe(20);
    expect(s.multiplier).toBe(1);
    s.catch('capsule');
    expect(s.lastPoints).toBe(20);
    expect(s.score).toBe(40);
    expect(s.multiplier).toBe(2);
  });

  it('climbs through every tier up to the highest', () => {
    const s = new GameSession(comboRules);
    for (let i = 0; i < 40; i++) s.catch('capsule');
    expect(s.multiplier).toBe(5);
    expect(s.lastPoints).toBe(50);
  });

  it('breaks on a stain, a decoy or a missed capsule', () => {
    for (const breakIt of [
      (s: GameSession) => s.catch('stain'),
      (s: GameSession) => s.catch('decoy'),
      (s: GameSession) => s.missCapsule(),
    ]) {
      const s = new GameSession(comboRules);
      for (let i = 0; i < 6; i++) s.catch('capsule');
      expect(s.multiplier).toBe(3);
      breakIt(s);
      expect(s.streak).toBe(0);
      expect(s.multiplier).toBe(1);
    }
  });

  it('does not multiply penalties', () => {
    const s = new GameSession(comboRules);
    for (let i = 0; i < 6; i++) s.catch('capsule');
    const before = s.score;
    s.catch('stain');
    expect(s.score).toBe(before - 10);
  });

  it('does not change the meter', () => {
    const s = new GameSession(comboRules);
    for (let i = 0; i < 10; i++) s.catch('capsule');
    expect(s.meterPct).toBe(10);
  });
});
