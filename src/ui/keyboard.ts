import type Phaser from 'phaser';
import { KEYBOARD_ROWS } from '@/domain/initials';
import { createButton } from './button';
import { popIn } from './motion';

const KEY_SIZE = 120;
const KEY_GAP = 12;
const KEY_STAGGER_MS = 16;

export interface KeyboardHandlers {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
}

/**
 * Placeholder on-screen keyboard (A-Z + DEL). `topY` is the vertical centre of the first row.
 * Keys pop in one after another when the screen opens.
 */
export function createKeyboard(
  scene: Phaser.Scene,
  centerX: number,
  topY: number,
  { onLetter, onBackspace }: KeyboardHandlers,
): void {
  const step = KEY_SIZE + KEY_GAP;
  let order = 0;
  const appear = (key: Phaser.GameObjects.Container): void => {
    popIn(scene, key, 250 + order * KEY_STAGGER_MS, 0.6);
    order += 1;
  };

  KEYBOARD_ROWS.forEach((row, rowIndex) => {
    const isLast = rowIndex === KEYBOARD_ROWS.length - 1;
    const count = row.length + (isLast ? 1 : 0);
    const left = centerX - ((count - 1) * step) / 2;
    const y = topY + rowIndex * step;

    [...row].forEach((letter, i) => {
      appear(
        createButton(scene, left + i * step, y, letter, () => onLetter(letter), {
          width: KEY_SIZE,
          height: KEY_SIZE,
          fontSize: 56,
        }),
      );
    });
    if (isLast) {
      appear(
        createButton(scene, left + row.length * step, y, 'DEL', onBackspace, {
          width: KEY_SIZE,
          height: KEY_SIZE,
          fontSize: 40,
        }),
      );
    }
  });
}
