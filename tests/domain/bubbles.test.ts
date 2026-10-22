import { describe, expect, it } from 'vitest';
import { RULES } from '@/config/game';
import { findMissed, findTapped, lifetimeFor, pickSize } from '@/domain/bubbles';

describe('pickSize', () => {
  it('follows the weights from one end of the roll to the other', () => {
    expect(pickSize(RULES.bubbles, 0)).toBe('small');
    expect(pickSize(RULES.bubbles, 0.5)).toBe('medium');
    expect(pickSize(RULES.bubbles, 0.99)).toBe('large');
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
