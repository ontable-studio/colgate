import Phaser from 'phaser';
import { addArt } from './art/canvas';

const TRACK_WIDTH = 840;
const FILL_LEFT = 62; // fill starts after the capsule badge
const FILL_WIDTH = 748;
const FILL_HEIGHT = 44;

export interface Meter {
  /** 0..100 */
  setValue(percent: number): void;
}

/** Brightness Meter: gold fill inside a glowing track, with a capsule badge at the left end. */
export function createMeter(scene: Phaser.Scene, centerX: number, y: number): Meter {
  addArt(scene, centerX, y, 'meter-track');

  const left = centerX - TRACK_WIDTH / 2;
  const fill = scene.add
    .image(left + FILL_LEFT, y, 'meter-fill')
    .setOrigin(0, 0.5)
    .setDisplaySize(FILL_WIDTH, FILL_HEIGHT);
  const frame = scene.textures.get('meter-fill').getSourceImage();
  const sourceWidth = frame.width;
  const sourceHeight = frame.height;

  scene.add.image(left + 16, y, 'capsule').setDisplaySize(104, 104);

  const setValue = (percent: number): void => {
    const ratio = Phaser.Math.Clamp(percent, 0, 100) / 100;
    fill.setVisible(ratio > 0);
    fill.setCrop(0, 0, Math.max(1, Math.round(sourceWidth * ratio)), sourceHeight);
  };
  setValue(0);
  return { setValue };
}
