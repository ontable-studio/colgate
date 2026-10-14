import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';
import { createButton } from '@/ui/button';
import { SceneKey } from './keys';

export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.HowToPlay);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const style = { fontFamily: 'sans-serif', fontSize: '52px', color: '#ffffff', align: 'center' };
    this.add
      .text(cx, 360, 'HOW TO PLAY', { ...style, fontSize: '88px', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add.text(cx, 760, 'Drag left or right\nto move the basket', style).setOrigin(0.5);
    this.add
      .text(cx, 1060, 'Catch the Vitamin C capsules\nto fill your Brightness Meter', style)
      .setOrigin(0.5);
    this.add.text(cx, 1360, 'Avoid the stains\nand decoy capsules', style).setOrigin(0.5);

    createButton(this, cx, GAME_HEIGHT - 300, "LET'S PLAY!", () => {
      this.scene.start(SceneKey.Gameplay);
    });
  }
}
