import { describe, expect, it } from 'vitest';
import { RULES } from '@/config/game';
import { stepToward } from '@/domain/basketMotion';

describe('stepToward', () => {
  it('reaches a nearby target in one step', () => {
    expect(stepToward(500, 510, 1400, 16)).toBe(510);
  });

  it('never moves further than the speed allows (a far tap does not teleport)', () => {
    expect(stepToward(100, 1000, 1400, 16)).toBeCloseTo(100 + 22.4);
    expect(stepToward(1000, 100, 1400, 16)).toBeCloseTo(1000 - 22.4);
  });

  it('crosses the whole screen in under a second but not instantly', () => {
    let x = 140;
    let ms = 0;
    while (x !== 940) {
      x = stepToward(x, 940, RULES.catching.basketSpeed, 16);
      ms += 16;
    }
    expect(ms).toBeGreaterThan(400);
    expect(ms).toBeLessThan(1000);
  });

  it('is at least as fast as the spawner assumes a player can move', () => {
    expect(RULES.catching.basketSpeed).toBeGreaterThanOrEqual(RULES.spawn.lateralReach);
  });

  it('does not move on a zero or negative delta', () => {
    expect(stepToward(300, 900, 1400, 0)).toBe(300);
    expect(stepToward(300, 900, 1400, -5)).toBe(300);
  });
});
