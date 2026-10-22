import { describe, expect, it } from 'vitest';
import { RULES } from '@/config/game';
import {
  findMissed,
  findTapped,
  lifetimeFor,
  pickSize,
  spawnIntervalFor,
  speedFactorFor,
  weightShift,
} from '@/domain/bubbles';

describe('pickSize', () => {
  it('follows the weights from one end of the roll to the other', () => {
    expect(pickSize(RULES.bubbles, 0)).toBe('small');
    expect(pickSize(RULES.bubbles, 0.3)).toBe('small');
    expect(pickSize(RULES.bubbles, 0.5)).toBe('medium');
    expect(pickSize(RULES.bubbles, 0.99)).toBe('large');
  });
  it('makes the best-paying molecule more common as the round goes on', () => {
    // start: small 4/10; end: small 7/10, large 1/10
    expect(pickSize(RULES.bubbles, 0.5, 0)).toBe('medium');
    expect(pickSize(RULES.bubbles, 0.5, 1)).toBe('small');
    expect(pickSize(RULES.bubbles, 0.95, 1)).toBe('large');
  });
});

describe('weightShift', () => {
  it('stays 0 until the shift starts, then rises evenly to 1', () => {
    const totalMs = RULES.durationSec * 1000;
    const fromMs = RULES.weightShiftFromSec * 1000;
    expect(weightShift(RULES, totalMs)).toBe(0);
    expect(weightShift(RULES, totalMs - fromMs)).toBe(0);
    expect(weightShift(RULES, 0)).toBe(1);
    expect(weightShift(RULES, (totalMs - fromMs) / 2)).toBe(0.5);
  });
});

describe('lifetimeFor', () => {
  const { lifetimeMs } = RULES.spawn;
  const { lastSec, minLifetimeMs } = RULES.rush;
  it('is the normal lifetime until the final stretch', () => {
    expect(lifetimeFor(RULES, 30_000)).toBe(lifetimeMs);
    expect(lifetimeFor(RULES, lastSec * 1000)).toBe(lifetimeMs);
  });
  it('shrinks evenly to the minimum at the end', () => {
    expect(lifetimeFor(RULES, 0)).toBe(minLifetimeMs);
    expect(lifetimeFor(RULES, (lastSec * 1000) / 2)).toBe((lifetimeMs + minLifetimeMs) / 2);
  });
});

describe('speedFactorFor', () => {
  it('is normal until the final stretch and rises evenly to the maximum', () => {
    const { lastSec, maxSpeedFactor } = RULES.rush;
    expect(speedFactorFor(RULES, 30_000)).toBe(1);
    expect(speedFactorFor(RULES, lastSec * 1000)).toBe(1);
    expect(speedFactorFor(RULES, (lastSec * 1000) / 2)).toBeCloseTo((1 + maxSpeedFactor) / 2);
    expect(speedFactorFor(RULES, 0)).toBe(maxSpeedFactor);
  });
});

describe('spawnIntervalFor', () => {
  it('starts busy and ends sparse, evenly over the final stretch', () => {
    const { lastSec, maxIntervalMs } = RULES.rush;
    const { intervalMs } = RULES.spawn;
    expect(spawnIntervalFor(RULES, 30_000)).toBe(intervalMs);
    expect(spawnIntervalFor(RULES, lastSec * 1000)).toBe(intervalMs);
    expect(spawnIntervalFor(RULES, 0)).toBe(maxIntervalMs);
  });
});

describe('findTapped', () => {
  const bubbles = [
    { x: 300, y: 300, size: 'small' as const },
    { x: 330, y: 300, size: 'large' as const },
  ];
  it('returns -1 for a tap on empty space', () => {
    expect(findTapped(bubbles, RULES, 700, 900)).toBe(-1);
  });
  it('picks the nearest centre when two overlap', () => {
    expect(findTapped(bubbles, RULES, 305, 300)).toBe(0);
    expect(findTapped(bubbles, RULES, 340, 300)).toBe(1);
  });
  it('forgives a tap just outside the edge', () => {
    // small radius 50, edge at 350; forgiveness lets 55 px still count
    expect(findTapped([{ x: 300, y: 300, size: 'small' }], RULES, 355, 300)).toBe(0);
    expect(findTapped([{ x: 300, y: 300, size: 'small' }], RULES, 380, 300)).toBe(-1);
  });
});

describe('findMissed', () => {
  const one = [{ x: 300, y: 300, size: 'small' as const }];
  it('finds a molecule when the tap lands in its shooting range but not on it', () => {
    // small radius 50 -> range reaches 100 px from the centre with missRange 1
    expect(findMissed(one, RULES, 380, 300)).toBe(0);
  });
  it('ignores a tap beyond the range', () => {
    expect(findMissed(one, RULES, 420, 300)).toBe(-1);
  });
});
