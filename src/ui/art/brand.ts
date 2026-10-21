import type Phaser from 'phaser';
import { canvasFont } from '@/ui/theme';
import { drawTexture, trackedText, trackedWidth } from './canvas';

/**
 * Red tab hanging from the top edge: a half-ellipse that is as wide as the tab, its flat top on the
 * screen edge, so the sides curve inward from the very top (360x214, 190 of it visible). It is
 * sized snugly around the white Colgate wordmark: the logo fills about 70% of its width.
 */
export function makeLogoTab(scene: Phaser.Scene): void {
  drawTexture(scene, 'logo-tab', 360, 214, (ctx, w) => {
    const fill = ctx.createRadialGradient(w / 2, 30, 15, w / 2, 0, 230);
    fill.addColorStop(0, '#F5202A');
    fill.addColorStop(1, '#D3101B');
    ctx.save();
    ctx.shadowColor = 'rgba(60,0,6,0.55)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(w / 2, 0, w / 2, 190, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const logo = scene.textures.get('logo-colgate').getSourceImage() as CanvasImageSource;
    // Wordmark with the brand's smile (the file is 1448x588).
    const lw = 250;
    const lh = (lw * 588) / 1448;
    ctx.drawImage(logo, w / 2 - lw / 2, 48, lw, lh);
  });
}

/** Four-point sparkle, like the one after "OPTIC WHITE" in the key visual. */
function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r);
  ctx.fill();
}

/**
 * "OPTIC WHITE* / VITAMIN C" lockup (640x190), as in the key visual: thin white line with a
 * sparkle, gold "VITAMIN" with a larger gold "C" that sits a little lower.
 */
export function makeLockup(scene: Phaser.Scene): void {
  drawTexture(scene, 'lockup', 640, 190, (ctx, w) => {
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFFFFF';

    ctx.font = canvasFont('light', 46);
    const line1 = trackedWidth(ctx, 'OPTIC WHITE', 7);
    const startX = (w - line1) / 2;
    trackedText(ctx, 'OPTIC WHITE', startX, 56, 7);
    drawSparkle(ctx, startX + line1 + 14, 22, 15);
    ctx.font = canvasFont('light', 10);
    ctx.fillText('.', startX + line1 - 4, 56);

    // "VITAMIN" is thin and wide-set; the closing "C" is half as big again and centred on it.
    ctx.fillStyle = '#FFC93C';
    ctx.font = canvasFont('light', 74);
    const vitamin = trackedWidth(ctx, 'VITAMIN', 14);
    ctx.font = canvasFont('light', 116);
    const letterC = trackedWidth(ctx, 'C', 0);
    const gap = 6;
    const left = (w - (vitamin + gap + letterC)) / 2;
    const baseline = 142;
    ctx.font = canvasFont('light', 74);
    trackedText(ctx, 'VITAMIN', left, baseline, 14);
    ctx.font = canvasFont('light', 116);
    const capHeight = 74 * 0.7;
    ctx.fillText('C', left + vitamin + gap, baseline - capHeight / 2 + 116 * 0.35);
  });
}

/** Glowing "C": an open ring with its gap facing right, behind the tube (820x820). */
export function makeRing(scene: Phaser.Scene): void {
  drawTexture(scene, 'ring', 820, 820, (ctx, w, h) => {
    const rim = ctx.createLinearGradient(0, h, w, 0);
    rim.addColorStop(0, '#FFE9A6');
    rim.addColorStop(0.5, '#FFF7DD');
    rim.addColorStop(1, '#FFB52E');
    ctx.lineCap = 'round';

    ctx.save();
    ctx.shadowColor = 'rgba(255,150,40,0.95)';
    ctx.shadowBlur = 44;
    ctx.lineWidth = 18;
    ctx.strokeStyle = rim;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 350, (38 * Math.PI) / 180, (322 * Math.PI) / 180);
    ctx.stroke();
    ctx.restore();

    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 350, (38 * Math.PI) / 180, (322 * Math.PI) / 180);
    ctx.stroke();
  });
}

/** The "C" of Vitamin C as a glowing white letter (460x460) plus a gold orbit that circles it. */
export function makeBigC(scene: Phaser.Scene): void {
  drawTexture(scene, 'big-c', 460, 460, (ctx, w, h) => {
    const fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, '#FFFFFF');
    fill.addColorStop(1, '#FFE9B8');
    ctx.save();
    ctx.shadowColor = 'rgba(255,190,80,1)';
    ctx.shadowBlur = 50;
    ctx.lineWidth = 80;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = fill;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 150, (42 * Math.PI) / 180, (318 * Math.PI) / 180);
    ctx.stroke();
    ctx.restore();
  });

  drawTexture(scene, 'c-orbit', 640, 640, (ctx, w, h) => {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.shadowColor = 'rgba(255,170,50,0.95)';
    ctx.shadowBlur = 22;
    ctx.lineCap = 'round';
    for (const [rx, ry, rot, alpha, width] of [
      [290, 110, -0.5, 0.95, 5],
      [260, 90, 0.7, 0.7, 3],
      [300, 150, 1.4, 0.55, 3],
    ] as const) {
      const stroke = ctx.createLinearGradient(-rx, 0, rx, 0);
      stroke.addColorStop(0, `rgba(255,214,120,0)`);
      stroke.addColorStop(0.5, `rgba(255,236,170,${alpha})`);
      stroke.addColorStop(1, `rgba(255,170,50,${alpha * 0.3})`);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, rot, 0, Math.PI * 1.75);
      ctx.stroke();
    }
    ctx.restore();
  });
}

export interface TitleLine {
  text: string;
  size: number;
}

interface GradientTextOptions {
  weight: 'bold' | 'boldItalic';
  maxWidth: number;
  /** Extra space between lines, as a fraction of the line size. */
  gap?: number;
}

/** Headline with a cream-to-gold gradient, dark edge and warm glow. Fits itself to maxWidth. */
export function makeGradientText(
  scene: Phaser.Scene,
  key: string,
  lines: readonly TitleLine[],
  { weight, maxWidth, gap = 0.08 }: GradientTextOptions,
): void {
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('2D canvas is not available');
  const widest = Math.max(
    ...lines.map((line) => {
      probe.font = canvasFont(weight, line.size);
      return probe.measureText(line.text).width;
    }),
  );
  const fit = Math.min(1, maxWidth / widest);
  const sized = lines.map((line) => ({ text: line.text, size: Math.round(line.size * fit) }));

  const pad = 48;
  const height = sized.reduce((sum, l) => sum + l.size * (1 + gap), 0) + pad * 2;
  const width = Math.round(maxWidth + pad * 2);

  drawTexture(scene, key, width, height, (ctx) => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    let top = pad;
    for (const line of sized) {
      ctx.font = canvasFont(weight, line.size);
      const baseline = top + line.size * 0.88;

      ctx.save();
      ctx.shadowColor = 'rgba(255,140,30,0.95)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#FFB13B';
      ctx.fillText(line.text, width / 2, baseline);
      ctx.restore();

      ctx.lineWidth = Math.max(3, line.size * 0.05);
      ctx.strokeStyle = 'rgba(120,28,0,0.55)';
      ctx.strokeText(line.text, width / 2, baseline);

      const fill = ctx.createLinearGradient(0, top, 0, top + line.size);
      fill.addColorStop(0, '#FFFCEA');
      fill.addColorStop(0.5, '#FFDC6E');
      fill.addColorStop(1, '#FFA21F');
      ctx.fillStyle = fill;
      ctx.fillText(line.text, width / 2, baseline);

      top += line.size * (1 + gap);
    }
  });
}

/**
 * Orange "BARU" tag (new) that sits beside the tube (164x80): straight top and bottom edges, flat left edge (tucked
 * behind the tube), a sharp tip at the top right and a big curve at the bottom right, with slanted
 * bold white letters that start clear of the tube.
 */
export function makeBaruBadge(scene: Phaser.Scene): void {
  drawTexture(scene, 'badge-baru', 164, 80, (ctx, w, h) => {
    ctx.save();
    ctx.shadowColor = 'rgba(90,10,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    const body = ctx.createLinearGradient(0, 0, 0, h);
    body.addColorStop(0, '#FA9322');
    body.addColorStop(1, '#F07F10');
    ctx.fillStyle = body;
    // Straight top and bottom edges; the only curves are the tip at the top right (a sharp
    // corner) and the big round-off at the bottom right.
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(w - 40, 14);
    // The tip flicks up and out a little past the straight edge.
    ctx.quadraticCurveTo(w - 16, 12, w - 2, 3);
    ctx.bezierCurveTo(w - 10, h * 0.4, w - 22, h - 10, w - 86, h - 10);
    ctx.lineTo(0, h - 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = canvasFont('boldItalic', 34);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // The left 30 px hide behind the tube; the letters start 6 px after that. The body spans
    // y 14..70, so its middle (42) is where the middle of the capitals goes.
    const capHeight = 34 * 0.7;
    ctx.fillText('BARU', 36, 42 + capHeight / 2);
  });
}
