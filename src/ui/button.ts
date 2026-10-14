import type Phaser from 'phaser';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
}

/** Placeholder pill button (replace with real art from Oji). */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  { width = 560, height = 140, fontSize = 56 }: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const bg = scene.add
    .rectangle(0, 0, width, height, 0xffffff, 0.12)
    .setStrokeStyle(6, 0xffffff)
    .setInteractive({ useHandCursor: true });
  const text = scene.add
    .text(0, 0, label, { fontFamily: 'sans-serif', fontSize: `${fontSize}px`, color: '#ffffff' })
    .setOrigin(0.5);
  bg.on('pointerdown', onClick);
  return scene.add.container(x, y, [bg, text]);
}
