import type Phaser from 'phaser';
import { KEYBOARD_ROWS } from '@/domain/initials';
import { createButton } from './button';

const KEY_SIZE = 120;
const KEY_GAP = 12;

export interface KeyboardHandlers {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
}

/** Placeholder on-screen keyboard (A-Z + DEL). `topY` is the vertical centre of the first row. */
export function createKeyboard(
  scene: Phaser.Scene,
  centerX: number,
  topY: number,
  { onLetter, onBackspace }: KeyboardHandlers,
): void {
  const step = KEY_SIZE + KEY_GAP;
  KEYBOARD_ROWS.forEach((row, rowIndex) => {
    const isLast = rowIndex === KEYBOARD_ROWS.length - 1;
    const count = row.length + (isLast ? 1 : 0);
    const left = centerX - ((count - 1) * step) / 2;
    const y = topY + rowIndex * step;

    [...row].forEach((letter, i) => {
      createButton(scene, left + i * step, y, letter, () => onLetter(letter), {
        width: KEY_SIZE,
        height: KEY_SIZE,
        fontSize: 56,
      });
    });
    if (isLast) {
      createButton(scene, left + row.length * step, y, 'DEL', onBackspace, {
        width: KEY_SIZE,
        height: KEY_SIZE,
        fontSize: 40,
      });
    }
  });
}
