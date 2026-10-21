import type Phaser from 'phaser';
import { drawTexture } from './canvas';

/**
 * Small procedural pieces. The falling objects themselves (molecule, germ, bubble) and the basket
 * are supplied artwork, loaded in PreloadScene.
 */
export function makeObjects(scene: Phaser.Scene): void {
  // Gold confetti piece (22x34), tinted per piece in the scene.
  drawTexture(scene, 'confetti', 22, 34, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 22, 34);
    g.addColorStop(0, '#FFF3B8');
    g.addColorStop(0.5, '#FFC83D');
    g.addColorStop(1, '#E58A12');
    ctx.fillStyle = g;
    ctx.fillRect(1, 1, 20, 32);
  });

  // Black-and-white copy of the molecule, shown while a missed one fades away. Needs 'capsule'.
  const source = scene.textures.get('capsule').getSourceImage() as CanvasImageSource;
  const { width, height } = source as HTMLImageElement;
  drawTexture(
    scene,
    'capsule-gray',
    width,
    height,
    (ctx) => {
      ctx.filter = 'grayscale(1) brightness(0.9)';
      ctx.drawImage(source, 0, 0, width, height);
    },
    1,
  );
}
