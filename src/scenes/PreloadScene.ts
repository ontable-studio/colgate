import Phaser from 'phaser';
import { SceneKey } from './keys';

/** Game-ready assets exported by tools/export-assets (texture key = file name). */
const IMAGES = ['capsule', 'decoy', 'tube', 'dropper', 'flare', 'tooth1', 'tooth4'] as const;

/**
 * Loads assets. Anything not yet delivered as art (basket, stain) is generated as a placeholder
 * texture so the game loop stays playable. When Oji's art lands, load it with this.load.image(...)
 * under the same texture key and delete the matching make* call.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Preload);
  }

  preload(): void {
    for (const key of IMAGES) this.load.image(key, `assets/${key}.webp`);
  }

  create(): void {
    // TODO(art, Oji): stain enemy and basket. Placeholders for now.
    this.makeCircle('stain', 0x2b2b2b, 75);
    this.makeBasket('basket');
    this.scene.start(SceneKey.Attract);
  }

  private makeCircle(key: string, color: number, radius: number): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(color, 1).fillCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  private makeBasket(key: string): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, 280, 120, 40);
    g.generateTexture(key, 280, 120);
    g.destroy();
  }
}
