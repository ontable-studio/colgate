import type Phaser from 'phaser';
import { makeBackgrounds } from './background';
import { makeBigC, makeGradientText, makeLockup, makeLogoTab, makeRing } from './brand';
import { makeIcons } from './icons';
import { makeObjects } from './objects';
import { makeBrush } from './brush';
import { makeStage } from './stage';

/**
 * Draw every procedural texture once at boot. Needs 'logo-colgate' to be loaded already.
 * Texture keys: bg-main, logo-tab, lockup, ring, big-c, c-orbit, title-game, title-how,
 * ico-*, brush-empty, brush-fill, crosshair, podium, spark, glow, confetti
 * (buttons/panels are cached on demand).
 */
export function registerUiArt(scene: Phaser.Scene): void {
  makeBackgrounds(scene);
  makeIcons(scene);
  makeObjects(scene);
  makeBrush(scene);
  makeStage(scene);
  makeLogoTab(scene);
  makeLockup(scene);
  makeRing(scene);
  makeBigC(scene);

  makeGradientText(
    scene,
    'title-game',
    [
      { text: '95%', size: 220 },
      { text: 'VITAMIN BLAST', size: 96 },
    ],
    { weight: 'boldItalic', maxWidth: 640, gap: 0.0 },
  );
  makeGradientText(scene, 'title-how', [{ text: 'HOW TO PLAY', size: 92 }], {
    weight: 'bold',
    maxWidth: 760,
  });
}
