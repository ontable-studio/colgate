import type Phaser from 'phaser';
import { drawTexture } from './canvas';

/** Small vector icons drawn on canvas (200x200 unless noted). */
function drawPlay(ctx: CanvasRenderingContext2D, disc: string, triangle: string): void {
  ctx.save();
  ctx.shadowColor = 'rgba(255,230,170,0.7)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(100, 100, 84, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = triangle;
  ctx.beginPath();
  ctx.moveTo(80, 56);
  ctx.lineTo(80, 144);
  ctx.lineTo(148, 100);
  ctx.closePath();
  ctx.fill();
}

function drawReplay(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(100, 104, 62, Math.PI * 0.15, Math.PI * 1.45);
  ctx.stroke();
  // Arrow head at the end of the arc: a triangle pointing along the direction of travel.
  const a = Math.PI * 1.45;
  const ex = 100 + Math.cos(a) * 62;
  const ey = 104 + Math.sin(a) * 62;
  const tx = -Math.sin(a); // clockwise tangent
  const ty = Math.cos(a);
  const nx = Math.cos(a); // outward normal
  const ny = Math.sin(a);
  ctx.beginPath();
  ctx.moveTo(ex + nx * 34, ey + ny * 34);
  ctx.lineTo(ex - nx * 34, ey - ny * 34);
  ctx.lineTo(ex + tx * 44, ey + ty * 44);
  ctx.closePath();
  ctx.fill();
}

export function makeIcons(scene: Phaser.Scene): void {
  // Light icons for red buttons, dark-red icons for the gold call-to-action buttons.
  drawTexture(scene, 'ico-play', 200, 200, (ctx) => drawPlay(ctx, '#FFF1D6', '#C8101E'));
  drawTexture(scene, 'ico-play-red', 200, 200, (ctx) => drawPlay(ctx, '#B3101B', '#FFE9A6'));
  drawTexture(scene, 'ico-replay', 200, 200, (ctx) => drawReplay(ctx, '#FFF1D6'));
  drawTexture(scene, 'ico-replay-red', 200, 200, (ctx) => drawReplay(ctx, '#7A0A12'));

  drawTexture(scene, 'ico-home', 200, 200, (ctx) => {
    ctx.fillStyle = '#FFF1D6';
    ctx.strokeStyle = '#FFF1D6';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    // Roof.
    ctx.beginPath();
    ctx.moveTo(24, 104);
    ctx.lineTo(100, 34);
    ctx.lineTo(176, 104);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Body with a door cut out.
    ctx.fillRect(46, 100, 108, 70);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillRect(84, 124, 32, 46);
    ctx.globalCompositeOperation = 'source-over';
  });

  // Save / download: an arrow dropping into a tray.
  drawTexture(scene, 'ico-save', 200, 200, (ctx) => {
    ctx.strokeStyle = '#FFF1D6';
    ctx.fillStyle = '#FFF1D6';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(100, 28);
    ctx.lineTo(100, 100);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(60, 82);
    ctx.lineTo(100, 124);
    ctx.lineTo(140, 82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(34, 128);
    ctx.lineTo(34, 168);
    ctx.lineTo(166, 168);
    ctx.lineTo(166, 128);
    ctx.stroke();
  });

  // Reset / delete: a trash can.
  drawTexture(scene, 'ico-trash', 200, 200, (ctx) => {
    ctx.strokeStyle = '#FFF1D6';
    ctx.fillStyle = '#FFF1D6';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Lid and handle.
    ctx.beginPath();
    ctx.moveTo(36, 56);
    ctx.lineTo(164, 56);
    ctx.moveTo(78, 56);
    ctx.lineTo(78, 36);
    ctx.lineTo(122, 36);
    ctx.lineTo(122, 56);
    ctx.stroke();
    // Bin.
    ctx.beginPath();
    ctx.moveTo(52, 56);
    ctx.lineTo(60, 164);
    ctx.lineTo(140, 164);
    ctx.lineTo(148, 56);
    ctx.stroke();
    // Slats.
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(88, 82);
    ctx.lineTo(90, 140);
    ctx.moveTo(112, 82);
    ctx.lineTo(110, 140);
    ctx.stroke();
  });

  drawTexture(scene, 'ico-x', 200, 200, (ctx) => {
    ctx.save();
    ctx.shadowColor = 'rgba(255,80,60,0.8)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#F2141E';
    ctx.lineWidth = 34;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(48, 48);
    ctx.lineTo(152, 152);
    ctx.moveTo(152, 48);
    ctx.lineTo(48, 152);
    ctx.stroke();
    ctx.restore();
  });

  // Four-point sparkle (64x64) and soft round glow (256x256).
  drawTexture(scene, 'spark', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,250,225,1)');
    g.addColorStop(0.25, 'rgba(255,214,120,0.7)');
    g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.quadraticCurveTo(35, 29, 64, 32);
    ctx.quadraticCurveTo(35, 35, 32, 64);
    ctx.quadraticCurveTo(29, 35, 0, 32);
    ctx.quadraticCurveTo(29, 29, 32, 0);
    ctx.closePath();
    ctx.fill();
  });

  drawTexture(scene, 'glow', 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,205,110,0.85)');
    g.addColorStop(0.45, 'rgba(255,150,50,0.32)');
    g.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
}
