import Phaser from 'phaser';
import { RULES } from '@/config/game';
import { bump } from './motion';
import { textStyle } from './theme';

export interface BrushMeter {
  /** 0..RULES.targetPoints: the gold rises from the bottom of the brush. */
  setValue: (percent: number) => void;
  pulse: () => void;
  /** Everything it is made of, so a scene can animate the whole meter in. */
  parts: (Phaser.GameObjects.Image | Phaser.GameObjects.Text)[];
}

/** Width of the toothbrush artwork when it is shown `height` tall. */
export function brushWidth(scene: Phaser.Scene, height: number): number {
  const frame = scene.textures.getFrame('brush-fill');
  return (frame.width / frame.height) * height;
}

/**
 * Toothbrush that fills with gold as points come in, with the percentage beside it.
 * (x, y) is the centre of the brush; `height` is its on-screen height.
 */
export function createBrushMeter(
  scene: Phaser.Scene,
  x: number,
  y: number,
  height = 620,
): BrushMeter {
  const width = brushWidth(scene, height);
  const empty = scene.add.image(x, y, 'brush-empty').setDisplaySize(width, height);
  const fill = scene.add.image(x, y, 'brush-fill').setDisplaySize(width, height);
  const source = scene.textures.get('brush-fill').getSourceImage();

  const percent = scene.add
    .text(x + width / 2 + 24, y + height / 2 - 70, '0%', textStyle({ size: 84, align: 'left' }))
    .setOrigin(0, 0.5);

  const setValue = (value: number): void => {
    const ratio = Phaser.Math.Clamp(value / RULES.targetPoints, 0, 1);
    percent.setText(`${Math.round(Phaser.Math.Clamp(value, 0, RULES.targetPoints))}%`);
    const shown = Math.round(source.height * ratio);
    fill.setVisible(shown > 0);
    fill.setCrop(0, source.height - shown, source.width, Math.max(1, shown));
  };
  const pulse = (): void => bump(scene, percent, 1.22, 120);
  setValue(0);
  return { setValue, pulse, parts: [empty, fill, percent] };
}
