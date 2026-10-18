import Phaser from 'phaser';
import { RULES } from '@/config/game';
import { addArt } from './art/canvas';
import { bump } from './motion';
import { COLORS, textStyle } from './theme';

const TRACK_WIDTH = 840;
const FILL_LEFT = 62; // fill starts after the capsule badge
const FILL_WIDTH = 748;
const FILL_HEIGHT = 44;

export interface MeterOptions {
  /** Show the current percentage above the molecule badge (the in-game meter does). */
  showPercent?: boolean;
}

export interface Meter {
  /** 0..RULES.meterFull (the bar is full at the top of that range) */
  setValue: (percent: number) => void;
  /** Little bounce of the capsule badge (call when the meter gains). */
  pulse: () => void;
}

/** Brightness Meter: gold fill inside a glowing track, with a capsule badge at the left end. */
export function createMeter(
  scene: Phaser.Scene,
  centerX: number,
  y: number,
  { showPercent = false }: MeterOptions = {},
): Meter {
  addArt(scene, centerX, y, 'meter-track');

  const left = centerX - TRACK_WIDTH / 2;
  const fill = scene.add
    .image(left + FILL_LEFT, y, 'meter-fill')
    .setOrigin(0, 0.5)
    .setDisplaySize(FILL_WIDTH, FILL_HEIGHT);
  const frame = scene.textures.get('meter-fill').getSourceImage();
  const sourceWidth = frame.width;
  const sourceHeight = frame.height;

  const badge = scene.add.image(left + 16, y, 'capsule').setDisplaySize(104, 104);

  const percentText = showPercent
    ? scene.add
        .text(left + 16, y - 88, '0%', textStyle({ size: 46, color: COLORS.goldLight }))
        .setOrigin(0.5)
    : null;

  const setValue = (percent: number): void => {
    percentText?.setText(`${Math.round(percent)}%`);
    const ratio = Phaser.Math.Clamp(percent, 0, RULES.meterFull) / RULES.meterFull;
    fill.setVisible(ratio > 0);
    fill.setCrop(0, 0, Math.max(1, Math.round(sourceWidth * ratio)), sourceHeight);
  };
  const pulse = (): void => bump(scene, badge, 1.22, 120);
  setValue(0);
  return { setValue, pulse };
}
