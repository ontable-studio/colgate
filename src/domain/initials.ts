export const MAX_INITIALS = 3;

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
