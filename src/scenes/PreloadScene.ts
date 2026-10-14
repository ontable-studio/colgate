import Phaser from 'phaser';
import { registerUiArt } from '@/ui/art';
import { SceneKey } from './keys';

/** Game-ready assets exported by tools/export-assets (texture key = file name without extension). */
const IMAGES = ['capsule', 'tube', 'dropper', 'flare', 'tooth1', 'tooth4', 'logo-colgate'] as const;

/**
 * Loads the supplied art, then draws the rest of the UI kit (backgrounds, buttons, icons,
 * basket, stain, ...) procedurally. To replace any generated texture with real art from Oji,
 * load it here under the same key and drop the matching draw call in `ui/art`.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Preload);
  }

  preload(): void {
    for (const key of IMAGES) this.load.image(key, `assets/${key}.webp`);
  }

  create(): void {
    registerUiArt(this);
    this.scene.start(SceneKey.Attract);
  }
}
