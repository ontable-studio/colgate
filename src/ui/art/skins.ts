import type Phaser from 'phaser';
import { drawTexture, roundRect } from './canvas';

const SKIN_PAD = 36;

export type ButtonVariant = 'red' | 'gold';
export type PanelBorder = 'red' | 'gold';

export function buttonSkinKey(w: number, h: number, variant: ButtonVariant): string {
  return `btn-${variant}-${w}x${h}`;
}

export function panelSkinKey(w: number, h: number, border: PanelBorder): string {
  return `panel-${border}-${w}x${h}`;
}

const BUTTON_STYLE: Record<
  ButtonVariant,
  {
    top: string;
    mid: string;
    bottom: string;
    glow: string;
    rimA: string;
    rimB: string;
    gloss: number;
  }
> = {
  red: {
    top: '#E8161F',
    mid: '#C80F19',
    bottom: '#980912',
    glow: 'rgba(255,170,70,0.9)',
    rimA: '#FFF1CC',
    rimB: '#FFBE45',
    gloss: 0.26,
  },
  gold: {
    top: '#FFE680',
    mid: '#FFC531',
    bottom: '#F0951C',
    glow: 'rgba(255,205,100,0.95)',
    rimA: '#FFFBEA',
    rimB: '#FFD36B',
    gloss: 0.5,
  },
};

/**
 * Glowing pill button with a double outline. 'red' is the quiet default (keys, secondary);
 * 'gold' is the primary call to action and uses the supplied glossy orange-gold artwork
 * ('btn-gold'), stretched in the middle so the rounded ends keep their shape.
 */
export function makeButtonSkin(
  scene: Phaser.Scene,
  w: number,
  h: number,
  variant: ButtonVariant = 'red',
): string {
  const key = buttonSkinKey(w, h, variant);
  if (scene.textures.exists(key)) return key;
  const style = BUTTON_STYLE[variant];

  if (variant === 'gold' && scene.textures.exists('btn-gold')) {
    drawGoldSkin(scene, key, w, h);
    return key;
  }

  drawTexture(scene, key, w + SKIN_PAD * 2, h + SKIN_PAD * 2, (ctx) => {
    const x = SKIN_PAD;
    const y = SKIN_PAD;
    const r = h / 2;

    // Outer glow + body.
    const body = ctx.createLinearGradient(0, y, 0, y + h);
    body.addColorStop(0, style.top);
    body.addColorStop(0.5, style.mid);
    body.addColorStop(1, style.bottom);
    ctx.save();
    ctx.shadowColor = style.glow;
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
    gloss.addColorStop(0, `rgba(255,255,255,${style.gloss})`);
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(x, y, w, h * 0.6);
    ctx.restore();

    // Outer rim.
    const rim = ctx.createLinearGradient(x, 0, x + w, 0);
    rim.addColorStop(0, style.rimA);
    rim.addColorStop(0.5, style.rimB);
    rim.addColorStop(1, style.rimA);
    ctx.lineWidth = 6;
    ctx.strokeStyle = rim;
    roundRect(ctx, x + 3, y + 3, w - 6, h - 6, r - 3);
    ctx.stroke();

    // Fine inner line.
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    roundRect(ctx, x + 13, y + 13, w - 26, h - 26, r - 13);
    ctx.stroke();
  });
  return key;
}

/** Source art: pill body is about 84% of the image height; its glow sits in the margin. */
const GOLD_BODY_RATIO = 0.84;
/** Width (source px) of each rounded end that must not be stretched. */
const GOLD_CAP = 230;

function drawGoldSkin(scene: Phaser.Scene, key: string, w: number, h: number): void {
  const image = scene.textures.get('btn-gold').getSourceImage() as CanvasImageSource & {
    width: number;
    height: number;
  };
  const scale = h / (image.height * GOLD_BODY_RATIO);
  const drawH = image.height * scale;
  const cap = GOLD_CAP * scale;
  const margin = ((1 - GOLD_BODY_RATIO) / 2) * image.height * scale; // glow around the body
  const drawW = w + margin * 2;
  drawTexture(scene, key, w + SKIN_PAD * 2, h + SKIN_PAD * 2, (ctx) => {
    const x = SKIN_PAD - margin;
    const y = SKIN_PAD + h / 2 - drawH / 2;
    const middleSrc = image.width - GOLD_CAP * 2;
    ctx.drawImage(image, 0, 0, GOLD_CAP, image.height, x, y, cap, drawH);
    ctx.drawImage(image, GOLD_CAP, 0, middleSrc, image.height, x + cap, y, drawW - cap * 2, drawH);
    ctx.drawImage(
      image,
      image.width - GOLD_CAP,
      0,
      GOLD_CAP,
      image.height,
      x + drawW - cap,
      y,
      cap,
      drawH,
    );
  });
}

/** Dark translucent card used for instructions and the leaderboard. */
export function makePanelSkin(
  scene: Phaser.Scene,
  w: number,
  h: number,
  radius = 40,
  border: PanelBorder = 'red',
): string {
  const key = panelSkinKey(w, h, border);
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

    if (border === 'gold') {
      ctx.save();
      ctx.shadowColor = 'rgba(255,190,80,0.55)';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,214,130,0.95)';
      roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, radius - 1.5);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,92,72,0.7)';
      roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, radius - 1.5);
      ctx.stroke();
    }
  });
  return key;
}
