import { describe, expect, it } from 'vitest';
import { RULES, type GameRules } from '@/config/game';
import { GameSession } from '@/domain/session';

const rules: GameRules = {
  ...RULES,
  durationSec: 10,
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

  it('ends early when the meter is full and ignores further catches', () => {
    const s = new GameSession(rules);
    for (let i = 0; i < 4; i++) s.catch('capsule');
    expect(s.meterPct).toBe(100);
    expect(s.isOver).toBe(true);
    s.catch('capsule');
    expect(s.score).toBe(60); // 10 + 10 + 20 + 20: the third and fourth catch pay double
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

describe('time bonus', () => {
  it('pays per second left when the meter fills before time runs out', () => {
    const s = new GameSession({ ...rules, timeBonusPerSec: 8 });
    s.tick(3000); // 7 s left
    for (let i = 0; i < 4; i++) s.catch('capsule');
    const result = s.result();
    expect(s.meterPct).toBe(100);
    expect(result.timeBonus).toBe(7 * 8);
    expect(result.score).toBe(s.score + 56);
  });

  it('only counts whole seconds', () => {
    const s = new GameSession({ ...rules, timeBonusPerSec: 10 });
    s.tick(3500); // 6.5 s left
    for (let i = 0; i < 4; i++) s.catch('capsule');
    expect(s.result().timeBonus).toBe(60);
  });

  it('pays nothing when time ran out first', () => {
    const s = new GameSession({ ...rules, timeBonusPerSec: 8 });
    s.catch('capsule');
    s.tick(60_000);
    const result = s.result();
    expect(result.timeBonus).toBe(0);
    expect(result.score).toBe(s.score);
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
