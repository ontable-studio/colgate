import type Phaser from 'phaser';
import { drawTexture } from './canvas';

export const PODIUM_WIDTH = 1400;
export const PODIUM_HEIGHT = 280;
/** The back corner, where the product stands; the two edges run from here toward the viewer. */
const APEX = { x: PODIUM_WIDTH / 2, y: 6 };
const LEFT_END = { x: -10, y: 140 };
const RIGHT_END = { x: PODIUM_WIDTH + 10, y: 188 };

/** Point on an edge, offset straight down by `dy` (used for bevel strips). */
function down(p: { x: number; y: number }, dy: number): { x: number; y: number } {
  return { x: p.x, y: p.y + dy };
}

/**
 * Glossy red glass stage seen from above, the way the product visual shows it: a back corner in
 * the middle with two bevelled edges running down to the left and right, a bright thin line along
 * each bevel, and the red top surface getting darker toward the viewer. Drawn, not cropped art.
 */
export function makeStage(scene: Phaser.Scene): void {
  drawTexture(scene, 'podium', PODIUM_WIDTH, PODIUM_HEIGHT, (ctx, w, h) => {
    // Top surface: everything below the two edges.
    const surface = ctx.createLinearGradient(0, APEX.y, 0, h);
    surface.addColorStop(0, '#FF2C1E');
    surface.addColorStop(0.22, '#D50F1B');
    surface.addColorStop(0.6, '#A30812');
    surface.addColorStop(1, '#4A0008');
    ctx.fillStyle = surface;
    ctx.beginPath();
    ctx.moveTo(LEFT_END.x, LEFT_END.y);
    ctx.lineTo(APEX.x, APEX.y);
    ctx.lineTo(RIGHT_END.x, RIGHT_END.y);
    ctx.lineTo(RIGHT_END.x, h);
    ctx.lineTo(LEFT_END.x, h);
    ctx.closePath();
    ctx.fill();

    // Glossy sheen across the surface, strongest below the corner. 'source-atop' keeps it on the
    // surface only: painted over the empty area above the edges it showed as a hard-edged band.
    ctx.globalCompositeOperation = 'source-atop';
    const sheen = ctx.createRadialGradient(APEX.x, APEX.y + 40, 20, APEX.x, APEX.y + 40, 620);
    sheen.addColorStop(0, 'rgba(255,150,120,0.55)');
    sheen.addColorStop(0.5, 'rgba(255,80,60,0.18)');
    sheen.addColorStop(1, 'rgba(255,60,40,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    for (const end of [LEFT_END, RIGHT_END]) {
      // Bevel: a darker strip hugging the edge, with a lighter lip right on it.
      const strip = (thickness: number, fill: CanvasGradient | string): void => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(APEX.x, APEX.y);
        ctx.lineTo(end.x, end.y);
        const far = down(end, thickness);
        ctx.lineTo(far.x, far.y);
        const near = down(APEX, thickness);
        ctx.lineTo(near.x, near.y);
        ctx.closePath();
        ctx.fill();
      };
      const bevel = ctx.createLinearGradient(0, APEX.y, 0, APEX.y + 44);
      bevel.addColorStop(0, '#6E0610');
      bevel.addColorStop(1, 'rgba(110,6,16,0)');
      strip(44, bevel);
      const lip = ctx.createLinearGradient(0, APEX.y, 0, APEX.y + 12);
      lip.addColorStop(0, '#FF6A48');
      lip.addColorStop(1, 'rgba(255,90,60,0)');
      strip(12, lip);

      // The thin glowing line along the edge.
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255,150,90,0.95)';
      ctx.shadowBlur = 14;
      const line = ctx.createLinearGradient(APEX.x, 0, end.x, 0);
      line.addColorStop(0, 'rgba(255,245,230,1)');
      line.addColorStop(0.6, 'rgba(255,190,120,0.9)');
      line.addColorStop(1, 'rgba(255,140,80,0.5)');
      ctx.strokeStyle = line;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(APEX.x, APEX.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();

      // A fainter second line deeper in the glass.
      ctx.strokeStyle = 'rgba(255,170,130,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const a = down(APEX, 34);
      const b = down(end, 34);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Soft pool of light where the glass foot meets the stage: a radial fade with no hard edge.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.translate(APEX.x, APEX.y + 30);
    ctx.scale(1, 0.55);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 150);
    pool.addColorStop(0, 'rgba(255,190,170,0.45)');
    pool.addColorStop(0.5, 'rgba(255,120,100,0.14)');
    pool.addColorStop(1, 'rgba(255,100,80,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(-150, -150, 300, 300);
    ctx.restore();

    // Fade the bottom into the background so the stage has no hard cut.
    ctx.globalCompositeOperation = 'destination-out';
    const fade = ctx.createLinearGradient(0, h * 0.62, 0, h);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
  });
}
