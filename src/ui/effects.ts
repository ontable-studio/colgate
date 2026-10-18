import Phaser from 'phaser';
import { quality } from '@/config/quality';
import { addArt } from './art/canvas';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';
import { videoBackdrop, type VideoName } from './videoBackground';

/**
 * Full-screen background (call first so everything draws above it). A video name plays that
 * looping clip behind the transparent canvas; 'bg-main' / 'bg-play' draw a still image instead.
 */
export function addBackground(
  scene: Phaser.Scene,
  key: VideoName | 'bg-main' | 'bg-play' = 'home',
): void {
  if (key === 'bg-main' || key === 'bg-play') {
    videoBackdrop.show(null);
    scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    return;
  }
  videoBackdrop.show(key);
}

/** Soft warm halo, additive so it brightens whatever is behind it. */
export function addGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  alpha = 0.8,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, 'glow')
    .setDisplaySize(size, size)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(alpha);
}

/** Twinkling four-point stars scattered over a rectangle. */
export function addSparkles(
  scene: Phaser.Scene,
  count: number,
  area: { x: number; y: number; width: number; height: number },
): void {
  for (let i = 0; i < quality.count(count); i++) {
    const size = Phaser.Math.Between(26, 60);
    const star = addArt(
      scene,
      area.x + Math.random() * area.width,
      area.y + Math.random() * area.height,
      'spark',
    )
      .setDisplaySize(size, size)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    scene.tweens.add({
      targets: star,
      alpha: { from: 0, to: Phaser.Math.FloatBetween(0.5, 0.95) },
      scale: star.scale * 1.25,
      yoyo: true,
      repeat: -1,
      duration: Phaser.Math.Between(900, 1700),
      delay: Phaser.Math.Between(0, 2400),
      ease: 'Sine.easeInOut',
    });
  }
}

/** Logo tab at the top plus the "Optic White Vitamin C" lockup below it. */
export function addHeader(scene: Phaser.Scene, withLockup = true): void {
  addArt(scene, GAME_WIDTH / 2, 0, 'logo-tab').setOrigin(0.5, 0);
  if (withLockup) addArt(scene, GAME_WIDTH / 2, 330, 'lockup');
}
