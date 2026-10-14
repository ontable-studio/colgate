import type Phaser from 'phaser';

/** Textures are drawn at 2x so they stay crisp when the 1080x1920 design is scaled up to 4K. */
export const ART_SCALE = 2;

const scales = new Map<string, number>();

/** Draw a canvas texture. `draw` works in design units (w x h); it is rendered at `scale`x. */
export function drawTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  scale: number = ART_SCALE,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.createCanvas(key, Math.round(w * scale), Math.round(h * scale));
  if (!texture) throw new Error(`Could not create canvas texture "${key}"`);
  const ctx = texture.getContext();
  ctx.scale(scale, scale);
  draw(ctx, w, h);
  texture.refresh();
  scales.set(key, scale);
}

/** Add an image of a drawn texture at its design size (compensates for the render scale). */
export function addArt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
): Phaser.GameObjects.Image {
  return scene.add.image(x, y, key).setScale(1 / (scales.get(key) ?? 1));
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Draw text one character at a time so letter-spacing works on every browser. */
export function trackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
  fill = true,
): number {
  let cursor = x;
  for (const ch of text) {
    if (fill) ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
  return cursor - x - tracking;
}

export function trackedWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  tracking: number,
): number {
  return trackedText(ctx, text, 0, 0, tracking, false);
}
