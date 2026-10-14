import type Phaser from 'phaser';
import { addArt } from './art/canvas';
import { makePanelSkin, type PanelBorder } from './art/skins';

/** Dark translucent rounded card, centred at (x, y). `border: 'gold'` gives the thin gold frame. */
export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 40,
  border: PanelBorder = 'red',
): Phaser.GameObjects.Image {
  return addArt(scene, x, y, makePanelSkin(scene, width, height, radius, border));
}
