import type Phaser from 'phaser';
import { makeBigC, makeGradientText, makeLockup, makeLogoTab } from './brand';
import { makeIcons } from './icons';
import { makeObjects } from './objects';
import { makeCrosshair } from './brush';

/**
 * Draw every procedural texture once at boot. Needs 'logo-colgate' to be loaded already.
 * Texture keys: logo-tab, lockup, big-c, c-orbit, title-game, title-how,
 * ico-*, crosshair, spark, glow, confetti, capsule-gray
 * (buttons/panels are cached on demand).
 */
export function registerUiArt(scene: Phaser.Scene): void {
  makeIcons(scene);
  makeObjects(scene);
  makeCrosshair(scene);
  makeLogoTab(scene);
  makeLockup(scene);
  makeBigC(scene);

  makeGradientText(
    scene,
    'title-game',
    [
      { text: '95%', size: 220 },
      { text: 'VITAMIN C BLAST', size: 96 },
    ],
    { weight: 'boldItalic', maxWidth: 700, gap: 0.0 },
  );
  makeGradientText(scene, 'title-how', [{ text: 'HOW TO PLAY', size: 92 }], {
    weight: 'bold',
    maxWidth: 760,
  });
}
