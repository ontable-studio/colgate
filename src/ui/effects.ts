import Phaser from 'phaser';
import { quality } from '@/config/quality';
import { addArt } from './art/canvas';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';

/** Full-screen background (call first so everything draws above it). 'bg-main' or 'bg-play'. */
export function addBackground(
  scene: Phaser.Scene,
  key: 'bg-main' | 'bg-play' = 'bg-main',
): Phaser.GameObjects.Image {
  return scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key)
    .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
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

const CONFETTI_TINTS = [0xffffff, 0xffe08a, 0xffb52e] as const;

/** Gold confetti drifting down the whole screen on a loop (add it before the UI so it sits behind). */
export function addConfetti(scene: Phaser.Scene, count = 26): void {
  for (let i = 0; i < quality.count(count); i++) {
    const x = Math.random() * GAME_WIDTH;
    const piece = scene.add
      .image(x, -60, 'confetti')
      .setScale(Phaser.Math.FloatBetween(0.45, 0.8))
      .setTint(Phaser.Utils.Array.GetRandom([...CONFETTI_TINTS]))
      .setAngle(Phaser.Math.Between(0, 360));
    const duration = Phaser.Math.Between(5200, 9000);
    scene.tweens.add({
      targets: piece,
      y: GAME_HEIGHT + 60,
      x: x + Phaser.Math.Between(-90, 90),
      angle: piece.angle + Phaser.Math.Between(360, 900),
      duration,
      delay: Phaser.Math.Between(0, duration),
      repeat: -1,
    });
  }
}

/** Logo tab at the top plus the "Optic White Vitamin C" lockup below it. */
export function addHeader(scene: Phaser.Scene, withLockup = true): void {
  addArt(scene, GAME_WIDTH / 2, 0, 'logo-tab').setOrigin(0.5, 0);
  if (withLockup) addArt(scene, GAME_WIDTH / 2, 330, 'lockup');
}
