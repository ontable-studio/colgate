import type Phaser from 'phaser';
import { drawTexture, roundRect } from './canvas';

export const BRUSH_WIDTH = 120;
export const BRUSH_HEIGHT = 700;

/** Outline of the toothbrush: bristle head on top, slim neck, handle that widens and rounds off. */
function brushPath(ctx: CanvasRenderingContext2D): void {
  const cx = BRUSH_WIDTH / 2;
  roundRect(ctx, cx - 30, 6, 60, 120, 16);
  ctx.moveTo(cx - 14, 120);
  ctx.quadraticCurveTo(cx - 20, 190, cx - 20, 250);
  ctx.quadraticCurveTo(cx - 26, 430, cx - 26, 610);
  ctx.quadraticCurveTo(cx - 26, 694, cx, 694);
  ctx.quadraticCurveTo(cx + 26, 694, cx + 26, 610);
  ctx.quadraticCurveTo(cx + 26, 430, cx + 20, 250);
  ctx.quadraticCurveTo(cx + 20, 190, cx + 14, 120);
  ctx.closePath();
}

/**
 * The toothbrush that fills up as points are scored: 'brush-empty' is the dim outline, 'brush-fill'
 * the same shape in glossy gold, shown from the bottom up by cropping.
 */
export function makeBrush(scene: Phaser.Scene): void {
  drawTexture(scene, 'brush-empty', BRUSH_WIDTH, BRUSH_HEIGHT, (ctx) => {
    ctx.save();
    ctx.shadowColor = 'rgba(255,170,120,0.6)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(110,0,10,0.5)';
    brushPath(ctx);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FFC8B4';
    ctx.stroke();
    ctx.restore();
  });

  drawTexture(scene, 'brush-fill', BRUSH_WIDTH, BRUSH_HEIGHT, (ctx, w, h) => {
    ctx.save();
    brushPath(ctx);
    ctx.clip();
    const gold = ctx.createLinearGradient(0, 0, w, 0);
    gold.addColorStop(0, '#F5A21E');
    gold.addColorStop(0.35, '#FFE66F');
    gold.addColorStop(1, '#F0951C');
    ctx.fillStyle = gold;
    ctx.fillRect(0, 0, w, h);
    // Soft highlight along the left side.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(w / 2 - 16, 0, 5, h);
    ctx.restore();
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#FFF3BF';
    brushPath(ctx);
    ctx.stroke();
  });

  // Aim marker shown where the player taps.
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
