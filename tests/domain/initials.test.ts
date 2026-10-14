import { describe, expect, it } from 'vitest';
import {
  appendInitial,
  EMPTY_INITIALS,
  finalizeInitials,
  KEYBOARD_ROWS,
  MAX_INITIALS,
  removeLastInitial,
} from '@/domain/initials';

describe('initials', () => {
  it('appends letters up to the limit', () => {
    let s = '';
    for (const ch of 'ABCD') s = appendInitial(s, ch);
    expect(s).toBe('ABC');
    expect(s).toHaveLength(MAX_INITIALS);
  });

  it('ignores anything that is not a single A-Z letter', () => {
    expect(appendInitial('A', 'b')).toBe('A');
    expect(appendInitial('A', '1')).toBe('A');
    expect(appendInitial('A', 'AB')).toBe('A');
    expect(appendInitial('A', '')).toBe('A');
  });

  it('removes the last letter and is safe on empty', () => {
    expect(removeLastInitial('AB')).toBe('A');
    expect(removeLastInitial('')).toBe('');
  });

  it('falls back to the placeholder when nothing was typed', () => {
    expect(finalizeInitials('')).toBe(EMPTY_INITIALS);
    expect(finalizeInitials('AB')).toBe('AB');
  });

  it('keyboard contains every letter exactly once', () => {
    const letters = KEYBOARD_ROWS.join('');
    expect([...letters].sort().join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  });
});
