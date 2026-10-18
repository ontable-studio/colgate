import type Phaser from 'phaser';
import { drawTexture } from './canvas';

export const STAGE_WIDTH = 1080;
export const STAGE_HEIGHT = 380;
/** Where the ridge (the highest point of the platform's back edge) sits, from the top of the texture. */
const RIDGE_Y = 38;
const SIDE_Y = 104;

/**
 * Glossy red platform the teeth stand on, like the key visual: two planes meeting in a shallow
 * ridge and a dotted gold line along the back edge. Draw order matters: surface, shading, gloss,
 * dotted edge.
 */
export function makeStage(scene: Phaser.Scene): void {
  drawTexture(scene, 'stage', STAGE_WIDTH, STAGE_HEIGHT, (ctx, w, h) => {
    const mid = w / 2;
    const surface = (from: number, to: number, fromY: number, toY: number): Path2D => {
      const path = new Path2D();
      path.moveTo(from, fromY);
      path.lineTo(to, toY);
      path.lineTo(to, h);
      path.lineTo(from, h);
      path.closePath();
      return path;
    };
    // One continuous surface (no seam, no second tone): any straight vertical line or step in
    // brightness reads as a cut-off light.
    const left = surface(0, mid, SIDE_Y, RIDGE_Y);
    const right = surface(mid, w, RIDGE_Y, SIDE_Y + 8);

    // Surfaces: brighter by the back edge, falling to deep red at the front.
    for (const [path, light] of [
      [left, '#B42629'],
      [right, '#B42629'],
    ] as const) {
      const fill = ctx.createLinearGradient(0, RIDGE_Y, 0, h);
      fill.addColorStop(0, light);
      fill.addColorStop(0.35, '#8C1017');
      fill.addColorStop(1, '#690A10');
      ctx.fillStyle = fill;
      ctx.fill(path);
    }

    // Soft sheen across the surface, strongest in the middle.
    const sheen = ctx.createRadialGradient(mid, 120, 10, mid, 120, 520);
    sheen.addColorStop(0, 'rgba(255,170,150,0.28)');
    sheen.addColorStop(1, 'rgba(255,170,150,0)');
    // Clipped to the platform: unclipped, the sheen lit a wedge above the sloping back edge that
    // ended in a hard line (a light cut off by an invisible clip).
    ctx.save();
    ctx.clip(left);
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    ctx.save();
    ctx.clip(right);
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Dotted gold line a little below the back edge, with a faint glow.
    ctx.save();
    ctx.lineCap = 'round';
    ctx.setLineDash([3, 11]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,214,120,0.95)';
    ctx.shadowColor = 'rgba(255,190,80,0.9)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, SIDE_Y + 22);
    ctx.lineTo(mid, RIDGE_Y + 12);
    ctx.lineTo(w, SIDE_Y + 30);
    ctx.stroke();
    ctx.restore();

    // Fade the front away so the platform melts into the background instead of ending in a line.
    ctx.globalCompositeOperation = 'destination-out';
    const fade = ctx.createLinearGradient(0, h * 0.7, 0, h);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    // Feather the back edge too, so the light of the video behind the teeth melts into the
    // platform instead of meeting a hard line.
    const back = ctx.createLinearGradient(0, RIDGE_Y, 0, SIDE_Y + 40);
    back.addColorStop(0, 'rgba(0,0,0,1)');
    back.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = back;
    ctx.fillRect(0, 0, w, SIDE_Y + 40);
    const side = ctx.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, 'rgba(0,0,0,0.85)');
    side.addColorStop(0.12, 'rgba(0,0,0,0)');
    side.addColorStop(0.88, 'rgba(0,0,0,0)');
    side.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  });
}
