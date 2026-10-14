import type Phaser from 'phaser';
import { addArt } from './art/canvas';
import { makePanelSkin } from './art/skins';

/** Dark translucent rounded card, centred at (x, y). */
export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 40,
): Phaser.GameObjects.Image {
  return addArt(scene, x, y, makePanelSkin(scene, width, height, radius));
}
