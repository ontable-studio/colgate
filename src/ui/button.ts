import type Phaser from 'phaser';
import { audio } from '@/audio';
import type { SfxKey } from '@/config/audio';
import { addArt } from './art/canvas';
import { makeButtonSkin, type ButtonVariant } from './art/skins';
import { COLORS, textStyle } from './theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  /** Texture key of an icon shown to the left of the label (e.g. 'ico-play'). */
  icon?: string;
  /** 'gold' is the primary call to action (dark label); 'red' is the quiet default. */
  variant?: ButtonVariant;
  /** Sound played the moment the button is pressed; `null` for silence. Default: a soft tap. */
  sound?: SfxKey | null;
  /** Random pitch variation (+/- cents) so repeated presses do not sound identical. */
  pitchJitter?: number;
}

const ICON_GAP = 26;

/** Glowing pill button with an optional icon. Fires on release; shrinks slightly while pressed. */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  {
    width = 640,
    height = 150,
    fontSize = 56,
    icon,
    variant = 'red',
    sound = 'sfx-ui-tap',
    pitchJitter = 0,
  }: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const skin = addArt(scene, 0, 0, makeButtonSkin(scene, width, height, variant));
  const color = variant === 'gold' ? COLORS.redDark : COLORS.white;
  const text = scene.add.text(0, 0, label, textStyle({ size: fontSize, color })).setOrigin(0, 0.5);

  const iconSize = height * 0.58;
  const hasIcon = icon !== undefined;
  const contentWidth = (hasIcon ? iconSize + (label ? ICON_GAP : 0) : 0) + (label ? text.width : 0);
  let cursor = -contentWidth / 2;

  const children: Phaser.GameObjects.GameObject[] = [skin];
  if (hasIcon) {
    const image = scene.add
      .image(cursor + iconSize / 2, 0, icon)
      .setDisplaySize(iconSize, iconSize);
    children.push(image);
    cursor += iconSize + (label ? ICON_GAP : 0);
  }
  text.setX(cursor);
  children.push(text);

  const hit = scene.add
    .rectangle(0, 0, width, height, 0xffffff, 0)
    .setInteractive({ useHandCursor: true });
  children.push(hit);

  const container = scene.add.container(x, y, children);
  const createdAt = performance.now();
  let pressed = false;
  const release = (): void => {
    pressed = false;
    container.setScale(1);
  };
  hit.on('pointerdown', () => {
    pressed = true;
    container.setScale(0.96);
    if (sound) {
      audio.playSfx(sound, { detune: (Math.random() * 2 - 1) * pitchJitter });
    }
  });
  hit.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    // A very quick tap (or a slow frame rate) can deliver down+up in the same frame, so `pressed`
    // may not be set yet. The press only counts if it began after this button appeared; a finger
    // still held down from the previous screen must not trigger it.
    const startedHere = pressed || pointer.downTime >= createdAt;
    release();
    if (startedHere) onClick();
  });
  hit.on('pointerout', release);
  return container;
}
