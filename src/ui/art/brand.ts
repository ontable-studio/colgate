import type Phaser from 'phaser';
import { canvasFont } from '@/ui/theme';
import { drawTexture, trackedText, trackedWidth } from './canvas';

/** Red half-disc tab at the top carrying the white Colgate wordmark (560x250). */
export function makeLogoTab(scene: Phaser.Scene): void {
  drawTexture(scene, 'logo-tab', 560, 250, (ctx) => {
    const fill = ctx.createRadialGradient(280, 40, 20, 280, 0, 270);
    fill.addColorStop(0, '#F5202A');
    fill.addColorStop(1, '#D3101B');
    ctx.save();
    ctx.shadowColor = 'rgba(60,0,6,0.55)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(280, -20, 205, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const logo = scene.textures.get('logo-colgate').getSourceImage() as CanvasImageSource;
    const w = 280;
    const h = (w * 167) / 781;
    const top = 46;
    ctx.drawImage(logo, 280 - w / 2, top, w, h);

    // The brand's smile swoosh under the wordmark, thick in the middle and thin at both ends.
    const y = top + h + 12;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(280 - 96, y - 4);
    ctx.quadraticCurveTo(280 + 6, y + 36, 280 + 104, y - 14);
    ctx.quadraticCurveTo(280 + 6, y + 18, 280 - 96, y - 4);
    ctx.closePath();
    ctx.fill();
  });
}

/** "OPTIC WHITE+ / VITAMIN C" lockup, set in the brand font (640x190). */
export function makeLockup(scene: Phaser.Scene): void {
  drawTexture(scene, 'lockup', 640, 190, (ctx, w) => {
    ctx.textBaseline = 'alphabetic';

    ctx.font = canvasFont('light', 46);
    ctx.fillStyle = '#FFFFFF';
    const line1 = trackedWidth(ctx, 'OPTIC WHITE', 7);
    const startX = (w - line1) / 2;
    trackedText(ctx, 'OPTIC WHITE', startX, 56, 7);
    ctx.font = canvasFont('light', 26);
    ctx.fillText('+', startX + line1 + 6, 34);

    ctx.font = canvasFont('light', 84);
    ctx.fillStyle = '#FFC93C';
    const line2 = trackedWidth(ctx, 'VITAMIN C', 13);
    trackedText(ctx, 'VITAMIN C', (w - line2) / 2, 148, 13);
  });
}

/** Glowing open ring (gap at the upper right) that frames the game title (820x820). */
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
    ctx.arc(w / 2, h / 2, 350, (-20 * Math.PI) / 180, (285 * Math.PI) / 180);
    ctx.stroke();
    ctx.restore();

    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 350, (-20 * Math.PI) / 180, (285 * Math.PI) / 180);
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
