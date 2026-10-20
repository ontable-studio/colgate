import type Phaser from 'phaser';
import { drawTexture } from './canvas';

/** Still fallback of the animated background (used when WebGL is not available). Smooth gradient, so 1x is enough (and keeps GPU memory low on TVs). */
export function makeBackgrounds(scene: Phaser.Scene): void {
  drawTexture(scene, 'bg-main', 1080, 1920, paint, 1);
}

/** Calm red base: bright near the top where the light comes from, dark at the edges. */
function paint(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const base = ctx.createRadialGradient(w / 2, h * 0.3, 40, w / 2, h * 0.3, h * 0.95);
  base.addColorStop(0, '#F4151F');
  base.addColorStop(0.45, '#D50F1B');
  base.addColorStop(1, '#6A0710');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, h * 0.82);
  vignette.addColorStop(0, 'rgba(40,0,5,0)');
  vignette.addColorStop(1, 'rgba(40,0,5,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}
