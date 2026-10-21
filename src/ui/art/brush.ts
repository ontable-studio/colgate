import type Phaser from 'phaser';
import { drawTexture } from './canvas';

/** Aim marker shown where the player taps. */
export function makeCrosshair(scene: Phaser.Scene): void {
  drawTexture(scene, 'crosshair', 140, 140, (ctx) => {
    ctx.save();
    ctx.translate(70, 70);
    ctx.shadowColor = 'rgba(255,150,40,0.95)';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = '#FFD36B';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const) {
      ctx.moveTo(dx * 24, dy * 24);
      ctx.lineTo(dx * 58, dy * 58);
    }
    ctx.stroke();
    ctx.fillStyle = '#FFF3BF';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}
