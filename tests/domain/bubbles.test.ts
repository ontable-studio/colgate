import { describe, expect, it } from 'vitest';
import { RULES } from '@/config/game';
import { findTapped, pickSize } from '@/domain/bubbles';

describe('pickSize', () => {
  it('follows the weights from one end of the roll to the other', () => {
    expect(pickSize(RULES.bubbles, 0)).toBe('small');
    expect(pickSize(RULES.bubbles, 0.5)).toBe('medium');
    expect(pickSize(RULES.bubbles, 0.99)).toBe('large');
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
