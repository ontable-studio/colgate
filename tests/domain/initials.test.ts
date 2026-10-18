import { describe, expect, it } from 'vitest';
import {
  appendInitial,
  EMPTY_INITIALS,
  finalizeInitials,
  isBlockedInitials,
  KEYBOARD_ROWS,
  MAX_INITIALS,
  removeLastInitial,
} from '@/domain/initials';

describe('initials', () => {
  it('appends letters up to the limit', () => {
    let s = '';
    for (const ch of 'ABCDEFG') s = appendInitial(s, ch);
    expect(s).toBe('ABCDE');
    expect(s).toHaveLength(MAX_INITIALS);
    expect(MAX_INITIALS).toBe(5);
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

describe('blocked initials', () => {
  it('rejects slang reported in UAT (EWE) in any letter case', () => {
    expect(isBlockedInitials('EWE')).toBe(true);
    expect(isBlockedInitials('ewe')).toBe(true);
  });
  it('finds a blocked word hidden inside longer initials', () => {
    expect(isBlockedInitials('XEWEX')).toBe(true);
    expect(isBlockedInitials('EWE')).toBe(true);
  });
  it('lets ordinary names through', () => {
    for (const name of ['SAM', 'JAN', 'RAM', 'DEA', 'BUDI', 'RAMAD'])
      expect(isBlockedInitials(name)).toBe(false);
  });
});
