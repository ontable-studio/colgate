import Phaser from 'phaser';
import { SceneKey } from './keys';

/**
 * Loads assets. Until Oji's final art lands in public/assets, generates placeholder textures
 * so the game loop is playable. Replace each generated texture with this.load.image(...) later,
 * keeping the same texture keys.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Preload);
  }

  preload(): void {
    // TODO(assets): this.load.image('capsule', 'assets/capsule.webp'), etc.
  }

  create(): void {
    this.makeCircle('capsule', 0xffa31a, 44);
    this.makeCircle('stain', 0x2b2b2b, 44);
    this.makeCircle('decoy', 0xff6b6b, 44);
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
