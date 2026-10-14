import type Phaser from 'phaser';
import { drawTexture, roundRect } from './canvas';

const SKIN_PAD = 36;

export function buttonSkinKey(w: number, h: number): string {
  return `btn-${w}x${h}`;
}

export function panelSkinKey(w: number, h: number): string {
  return `panel-${w}x${h}`;
}

/** Glowing pill button: deep-red body, soft top gloss, double gold-cream outline. */
export function makeButtonSkin(scene: Phaser.Scene, w: number, h: number): string {
  const key = buttonSkinKey(w, h);
  if (scene.textures.exists(key)) return key;

  drawTexture(scene, key, w + SKIN_PAD * 2, h + SKIN_PAD * 2, (ctx) => {
    const x = SKIN_PAD;
    const y = SKIN_PAD;
    const r = h / 2;

    // Outer glow + body.
    const body = ctx.createLinearGradient(0, y, 0, y + h);
    body.addColorStop(0, '#E8161F');
    body.addColorStop(1, '#980912');
    ctx.save();
    ctx.shadowColor = 'rgba(255,170,70,0.9)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = body;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();

    // Gloss on the upper half.
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    const gloss = ctx.createLinearGradient(0, y, 0, y + h * 0.6);
    gloss.addColorStop(0, 'rgba(255,255,255,0.26)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(x, y, w, h * 0.6);
    ctx.restore();

    // Outer gold-cream rim.
    const rim = ctx.createLinearGradient(x, 0, x + w, 0);
    rim.addColorStop(0, '#FFF1CC');
    rim.addColorStop(0.5, '#FFBE45');
    rim.addColorStop(1, '#FFF1CC');
    ctx.lineWidth = 6;
    ctx.strokeStyle = rim;
    roundRect(ctx, x + 3, y + 3, w - 6, h - 6, r - 3);
    ctx.stroke();

    // Fine inner line.
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    roundRect(ctx, x + 13, y + 13, w - 26, h - 26, r - 13);
    ctx.stroke();
  });
  return key;
}

/** Dark translucent card used for instructions and the leaderboard. */
export function makePanelSkin(scene: Phaser.Scene, w: number, h: number, radius = 40): string {
  const key = panelSkinKey(w, h);
  if (scene.textures.exists(key)) return key;

  drawTexture(scene, key, w + 16, h + 16, (ctx) => {
    const x = 8;
    const y = 8;
    const fill = ctx.createLinearGradient(0, y, 0, y + h);
    fill.addColorStop(0, 'rgba(110,6,14,0.82)');
    fill.addColorStop(1, 'rgba(62,2,8,0.88)');
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w, h, radius);
    ctx.fill();

    ctx.save();
    roundRect(ctx, x, y, w, h, radius);
    ctx.clip();
    const sheen = ctx.createLinearGradient(0, y, 0, y + h * 0.35);
    sheen.addColorStop(0, 'rgba(255,255,255,0.09)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, w, h * 0.35);
    ctx.restore();

    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,92,72,0.7)';
    roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, radius - 1.5);
    ctx.stroke();
  });
  return key;
}

/** Brightness meter: pill track with a gold border, and the gold fill drawn separately. */
export function makeMeter(scene: Phaser.Scene): void {
  drawTexture(scene, 'meter-track', 840, 76, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(50,0,6,0.72)';
    roundRect(ctx, 4, 4, w - 8, h - 8, (h - 8) / 2);
    ctx.fill();
    const rim = ctx.createLinearGradient(0, 0, w, 0);
    rim.addColorStop(0, '#FFF1CC');
    rim.addColorStop(0.5, '#FFB93A');
    rim.addColorStop(1, '#FFF1CC');
    ctx.save();
    ctx.shadowColor = 'rgba(255,170,70,0.8)';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 5;
    ctx.strokeStyle = rim;
    roundRect(ctx, 4, 4, w - 8, h - 8, (h - 8) / 2);
    ctx.stroke();
    ctx.restore();
  });

  drawTexture(scene, 'meter-fill', 800, 46, (ctx, w, h) => {
    const fill = ctx.createLinearGradient(0, 0, w, 0);
    fill.addColorStop(0, '#FFE066');
    fill.addColorStop(0.6, '#FFB52E');
    fill.addColorStop(1, '#FF8A1C');
    ctx.fillStyle = fill;
    roundRect(ctx, 0, 0, w, h, h / 2);
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0, 0, w, h, h / 2);
    ctx.clip();
    const gloss = ctx.createLinearGradient(0, 0, 0, h);
    gloss.addColorStop(0, 'rgba(255,255,255,0.55)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  });
}
