import type Phaser from 'phaser';
import { makeBackgrounds } from './background';
import { makeGradientText, makeLockup, makeLogoTab, makeRing } from './brand';
import { makeIcons } from './icons';
import { makeObjects } from './objects';
import { makeMeter } from './skins';

/**
 * Draw every procedural texture once at boot. Needs 'logo-colgate' to be loaded already.
 * Texture keys: bg-main, bg-play, logo-tab, lockup, ring, title-game, title-how, title-unlock,
 * ico-*, spark, glow, decoy, stain, basket, meter-track, meter-fill (buttons/panels are cached on demand).
 */
export function registerUiArt(scene: Phaser.Scene): void {
  makeBackgrounds(scene);
  makeIcons(scene);
  makeObjects(scene);
  makeMeter(scene);
  makeLogoTab(scene);
  makeLockup(scene);
  makeRing(scene);

  makeGradientText(
    scene,
    'title-game',
    [
      { text: 'CATCH', size: 118 },
      { text: 'THE', size: 84 },
      { text: 'BRIGHTNESS', size: 126 },
    ],
    { weight: 'boldItalic', maxWidth: 660, gap: 0.02 },
  );
  makeGradientText(scene, 'title-how', [{ text: 'HOW TO PLAY', size: 92 }], {
    weight: 'bold',
    maxWidth: 760,
  });
  makeGradientText(
    scene,
    'title-unlock',
    [
      { text: 'UNLOCK YOUR', size: 100 },
      { text: 'BRIGHTEST SMILE!', size: 100 },
    ],
    { weight: 'boldItalic', maxWidth: 900, gap: 0.06 },
  );
}
