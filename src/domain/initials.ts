export const MAX_INITIALS = 5;

/** Stored when the player skips (or walks away from) the initials screen. */
export const EMPTY_INITIALS = '---';

/** On-screen keyboard layout: 7 large keys per row so each key is a comfortable touch target. */
export const KEYBOARD_ROWS: readonly string[] = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', 'VWXYZ'];

/** Append a letter (A-Z only). Ignores anything else and respects the length limit. */
export function appendInitial(current: string, letter: string, max = MAX_INITIALS): string {
  if (!/^[A-Z]$/.test(letter) || current.length >= max) return current;
  return current + letter;
}

export function removeLastInitial(current: string): string {
  return current.slice(0, -1);
}

export function finalizeInitials(current: string): string {
  return current.length > 0 ? current : EMPTY_INITIALS;
}

/**
 * Three-letter combinations that must never appear on a brand's public leaderboard, alone or
 * inside longer initials. Add to this list freely; matching is case-insensitive.
 */
export const BLOCKED_INITIALS: ReadonlySet<string> = new Set([
  // English
  'ASS',
  'SEX',
  'FUK',
  'FCK',
  'FUC',
  'DIK',
  'DIC',
  'COK',
  'TIT',
  'CUM',
  'KKK',
  'NZI',
  'WTF',
  'BCH',
  'SHT',
  'FAG',
  'NIG',
  'PIS',
  'CNT',
  'DMN',
  'XXX',
  // Indonesian
  'AJG',
  'ANJ',
  'BGS',
  'KNT',
  'MMK',
  'KON',
  'JNC',
  'TLL',
  'NGN',
  'PNT',
  'CBL',
  'BNG',
  'EWE',
  'NGW',
  'NTD',
  'ASU',
  'BJG',
  'BGT',
  'BDG',
  'BSD',
  'GBL',
  'TOL',
  'GLK',
  'SKS',
  'SLT',
  'PKI',
  'PPK',
  'CUK',
  'JLK',
  'JNK',
  'KPR',
  'BCT',
  'BTL',
  'CBO',
  'LNT',
  'LCR',
  'PUS',
  // English, more
  'FUQ',
  'FVK',
  'FUX',
  'DCK',
  'DIX',
  'COC',
  'CUN',
  'PRN',
  'POR',
  'RPE',
  'FGT',
  'NGR',
  'WHR',
  'JIZ',
  'JZZ',
  'TTS',
  'BBS',
  'WNK',
  'FKU',
]);

/** Is the text, or any three letters in a row inside it, on the list? Longer initials must not hide a word. */
export function isBlockedInitials(initials: string): boolean {
  const text = initials.toUpperCase();
  for (let i = 0; i + 3 <= text.length; i++)
    if (BLOCKED_INITIALS.has(text.slice(i, i + 3))) return true;
  return false;
}
