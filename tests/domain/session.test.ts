import { describe, expect, it } from 'vitest';
import { RULES } from '@/config/game';
import { GameSession } from '@/domain/session';

describe('GameSession', () => {
  it('pays points by molecule size and tracks the percentage', () => {
    const s = new GameSession(RULES);
    expect(s.pop('small')).toBe(2);
    expect(s.pop('medium')).toBe(1);
    expect(s.pop('large')).toBe(0.5);
    expect(s.score).toBe(3.5);
    expect(s.meterPct).toBe(3.5);
  });

  it('pays more in the final stretch', () => {
    const s = new GameSession(RULES);
    s.tick((RULES.durationSec - 0.1) * 1000);
    expect(s.pop('small')).toBe(RULES.bubbles.small.points * RULES.rush.maxPointsFactor);
  });

  it('ends once the target is reached and caps the percentage', () => {
    const s = new GameSession(RULES);
    for (let i = 0; i < 48; i++) s.pop('small');
    expect(s.reachedTarget).toBe(true);
    expect(s.isOver).toBe(true);
    expect(s.pop('small')).toBe(0);
    s.pop('small');
    expect(s.meterPct).toBe(RULES.targetPoints);
    expect(s.result().score).toBe(96);
  });

  it('counts misses and runs out of time', () => {
    const s = new GameSession(RULES);
    s.miss();
    s.tick(RULES.durationSec * 1000 + 50);
    expect(s.isOver).toBe(true);
    s.miss();
    expect(s.result()).toMatchObject({ misses: 1, pops: 0, durationSec: RULES.durationSec });
  });
});
