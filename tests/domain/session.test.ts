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
    expect(s.score).toBe(40);
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
