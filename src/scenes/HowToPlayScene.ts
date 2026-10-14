import Phaser from 'phaser';
import { GAME_WIDTH } from '@/config/game';
import { addArt } from '@/ui/art/canvas';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader, addSparkles } from '@/ui/effects';
import { createPanel } from '@/ui/panel';
import { textStyle } from '@/ui/theme';
import { SceneKey } from './keys';

const PANEL_WIDTH = 920;
const PANEL_HEIGHT = 290;
const ROW_Y = [800, 1120, 1440] as const;

export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.HowToPlay);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    addBackground(this);
    addSparkles(this, 8, { x: 40, y: 420, width: 1000, height: 1300 });
    addHeader(this);
    addArt(this, cx, 520, 'title-how');

    for (const y of ROW_Y) createPanel(this, cx, y, PANEL_WIDTH, PANEL_HEIGHT);
    this.rowDrag(ROW_Y[0]);
    this.rowCatch(ROW_Y[1]);
    this.rowAvoid(ROW_Y[2]);

    createButton(this, cx, 1745, "LET'S PLAY!", () => this.scene.start(SceneKey.Gameplay), {
      width: 760,
      height: 160,
      fontSize: 64,
    });
  }

  private label(x: number, y: number, text: string, width: number): void {
    this.add
      .text(x, y, text, textStyle({ size: 46, align: 'left', wrapWidth: width, lineSpacing: 6 }))
      .setOrigin(0, 0.5);
  }

  private rowDrag(y: number): void {
    this.add.image(190, y, 'ico-hand').setDisplaySize(190, 190);
    addArt(this, 700, y - 62, 'ico-arrows').setDisplaySize(380, 105);
    this.label(360, y + 52, 'Drag left or right\nto move the basket', 520);
  }

  private rowCatch(y: number): void {
    addGlow(this, 190, y, 330, 0.7);
    this.add.image(190, y, 'capsule').setDisplaySize(190, 190);
    this.label(360, y, 'Catch the Vitamin C capsules to fill your Brightness Meter', 520);
  }

  private rowAvoid(y: number): void {
    addArt(this, 160, y, 'stain').setDisplaySize(170, 170);
    addArt(this, 320, y, 'decoy').setDisplaySize(130, 130);
    addArt(this, 450, y, 'ico-x').setDisplaySize(96, 96);
    this.label(520, y, 'Avoid the stains and decoy capsules', 380);
  }
}
