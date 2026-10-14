import Phaser from 'phaser';
import { GAME_WIDTH } from '@/config/game';
import { addArt } from '@/ui/art/canvas';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader, addSparkles } from '@/ui/effects';
import { createPanel } from '@/ui/panel';
import { textStyle } from '@/ui/theme';
import { SceneKey } from './keys';

const PANEL_WIDTH = 920;
const PANEL_HEIGHT = 250;
const ROW_Y = [770, 1050, 1330] as const;

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

    for (const y of ROW_Y) createPanel(this, cx, y, PANEL_WIDTH, PANEL_HEIGHT, 36, 'gold');
    this.rowDrag(ROW_Y[0]);
    this.rowCatch(ROW_Y[1]);
    this.rowAvoid(ROW_Y[2]);

    // The basket, gently swaying, shows what the player will be moving.
    const basket = this.add.image(cx, 1570, 'basket').setDisplaySize(300, 194);
    this.tweens.add({
      targets: basket,
      x: { from: cx - 120, to: cx + 120 },
      yoyo: true,
      repeat: -1,
      duration: 1600,
      ease: 'Sine.easeInOut',
    });

    createButton(this, cx, 1760, "LET'S PLAY!", () => this.scene.start(SceneKey.Gameplay), {
      width: 760,
      height: 150,
      fontSize: 62,
      variant: 'gold',
    });
  }

  private label(x: number, y: number, text: string, width: number): void {
    this.add
      .text(x, y, text, textStyle({ size: 52, align: 'left', wrapWidth: width, lineSpacing: 4 }))
      .setOrigin(0, 0.5);
  }

  private rowDrag(y: number): void {
    this.add.image(190, y, 'ico-hand').setDisplaySize(170, 170);
    addArt(this, 450, y, 'ico-arrows').setDisplaySize(250, 70);
    this.label(600, y, 'DRAG LEFT\nOR RIGHT', 300);
  }

  private rowCatch(y: number): void {
    addGlow(this, 190, y, 300, 0.7);
    this.add.image(190, y, 'capsule').setDisplaySize(170, 170);
    this.label(340, y, 'CATCH VITAMIN\nC CAPSULES', 540);
  }

  private rowAvoid(y: number): void {
    addArt(this, 160, y, 'stain').setDisplaySize(150, 150);
    addArt(this, 300, y, 'decoy-pill-a').setDisplaySize(120, 120);
    addArt(this, 420, y, 'ico-x').setDisplaySize(86, 86);
    this.label(520, y, 'AVOID STAINS\n& DECOYS', 380);
  }
}
