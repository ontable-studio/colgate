import type Phaser from 'phaser';
import { drawTexture } from './canvas';

/** Backgrounds are smooth gradients, so 1x is enough (and keeps GPU memory low on TVs). */
export function makeBackgrounds(scene: Phaser.Scene): void {
  drawTexture(scene, 'bg-main', 1080, 1920, (ctx, w, h) => paint(ctx, w, h, false), 1);
  drawTexture(scene, 'bg-play', 1080, 1920, (ctx, w, h) => paint(ctx, w, h, true), 1);
}

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, horizon: boolean): void {
  // Radial red glow, bright near the top-centre and dark at the edges.
  const base = ctx.createRadialGradient(w / 2, h * 0.4, 40, w / 2, h * 0.4, h * 0.88);
  base.addColorStop(0, '#F4151F');
  base.addColorStop(0.45, '#D8101C');
  base.addColorStop(1, '#6A0710');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Vertical light rays fanning out from the top.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = -7; i <= 7; i++) {
    const topX = w / 2 + i * 22;
    const bottomX = w / 2 + i * 150;
    const spread = i % 2 === 0 ? 70 : 34;
    const ray = ctx.createLinearGradient(0, 0, 0, h * 0.92);
    ray.addColorStop(0, 'rgba(255,160,100,0.12)');
    ray.addColorStop(1, 'rgba(255,90,60,0)');
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(topX - 6, -20);
    ctx.lineTo(topX + 6, -20);
    ctx.lineTo(bottomX + spread, h);
    ctx.lineTo(bottomX - spread, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  if (horizon) paintHorizon(ctx, w, h);

  // Vignette.
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, h * 0.82);
  vignette.addColorStop(0, 'rgba(40,0,5,0)');
  vignette.addColorStop(1, 'rgba(40,0,5,0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

/** Glowing curved horizon near the bottom (gameplay), like a stage floor. */
function paintHorizon(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const cy = h + 330;
  const rx = 1050;
  const ry = 760;

  const floor = ctx.createLinearGradient(0, cy - ry, 0, h);
  floor.addColorStop(0, 'rgba(255,120,70,0.42)');
  floor.addColorStop(0.12, 'rgba(150,6,16,0.55)');
  floor.addColorStop(1, 'rgba(70,0,8,0.7)');
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.shadowColor = 'rgba(255,140,60,0.95)';
  ctx.shadowBlur = 46;
  ctx.lineWidth = 8;
  const rim = ctx.createLinearGradient(0, 0, w, 0);
  rim.addColorStop(0, 'rgba(255,190,120,0)');
  rim.addColorStop(0.5, 'rgba(255,225,170,0.95)');
  rim.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.strokeStyle = rim;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.04, Math.PI * 1.96);
  ctx.stroke();
  ctx.restore();
}
