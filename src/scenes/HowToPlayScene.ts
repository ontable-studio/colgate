import Phaser from 'phaser';
import { audio } from '@/audio';
import { GAME_WIDTH } from '@/config/game';
import { addArt } from '@/ui/art/canvas';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader, addSparkles } from '@/ui/effects';
import { addHomeButton } from '@/ui/homeButton';
import { fadeIn, popIn, slideIn } from '@/ui/motion';
import { createPanel } from '@/ui/panel';
import { textStyle } from '@/ui/theme';
import { SceneKey } from './keys';

const PANEL_WIDTH = 920;
const PANEL_HEIGHT = 250;
const ROW_Y = [770, 1050, 1330] as const;
const BASKET_Y = 1566;
const BUTTON_Y = 1760;
/** Every card's text starts at this x, so the three lines read as one column. */
const TEXT_X = 560;
const TEXT_WIDTH = 420;

export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.HowToPlay);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    fadeIn(this);
    audio.playMusic('bgm-attract');
    addBackground(this);
    addSparkles(this, 8, { x: 40, y: 420, width: 1000, height: 1300 });
    addHeader(this);
    addHomeButton(this);
    popIn(this, addArt(this, cx, 520, 'title-how'), 100, 0.8);

    // Each card slides in from alternating sides, one after the other.
    const rows = [this.rowDrag(ROW_Y[0]), this.rowCatch(ROW_Y[1]), this.rowAvoid(ROW_Y[2])];
    rows.forEach((row, i) => {
      slideIn(this, row, i % 2 === 0 ? -460 : 460, 220 + i * 170);
      this.time.delayedCall(220 + i * 170, () =>
        audio.playSfx('sfx-whoosh', { volume: 1 - i * 0.2 }),
      );
    });

    // The basket, gently swaying, shows what the player will be moving.
    const basket = this.add.image(cx, BASKET_Y, 'basket').setDisplaySize(270, 164);
    popIn(this, basket, 760);
    this.time.delayedCall(760, () => audio.playSfx('sfx-pop'));
    this.time.delayedCall(1300, () => {
      this.tweens.add({
        targets: basket,
        x: { from: cx - 120, to: cx + 120 },
        yoyo: true,
        repeat: -1,
        duration: 1600,
        ease: 'Sine.easeInOut',
      });
    });

    const start = createButton(
      this,
      cx,
      BUTTON_Y,
      "LET'S PLAY!",
      () => this.scene.start(SceneKey.Gameplay),
      { width: 760, height: 150, fontSize: 62, variant: 'gold', sound: 'sfx-ui-start' },
    );
    popIn(this, start, 900);
    this.time.delayedCall(1500, () => {
      this.tweens.add({ targets: start, scale: 1.04, yoyo: true, repeat: -1, duration: 800 });
    });
  }

  private label(x: number, y: number, text: string, width: number): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, textStyle({ size: 52, align: 'left', wrapWidth: width, lineSpacing: 4 }))
      .setOrigin(0, 0.5);
  }

  private row(items: Phaser.GameObjects.GameObject[]): Phaser.GameObjects.Container {
    return this.add.container(0, 0, items);
  }

  private rowDrag(y: number): Phaser.GameObjects.Container {
    const panel = createPanel(this, GAME_WIDTH / 2, y, PANEL_WIDTH, PANEL_HEIGHT, 36, 'gold');
    const icon = this.add.image(310, y, 'ico-drag').setDisplaySize(236, 209);
    const text = this.label(TEXT_X, y, 'DRAG LEFT\nOR RIGHT', TEXT_WIDTH);

    // The whole icon sways side to side, like the finger it shows.
    this.tweens.add({
      targets: icon,
      x: { from: 285, to: 335 },
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine.easeInOut',
    });
    return this.row([panel, icon, text]);
  }

  private rowCatch(y: number): Phaser.GameObjects.Container {
    const panel = createPanel(this, GAME_WIDTH / 2, y, PANEL_WIDTH, PANEL_HEIGHT, 36, 'gold');
    const glow = addGlow(this, 310, y, 300, 0.7);
    const capsule = this.add.image(310, y, 'capsule').setDisplaySize(170, 170);
    const text = this.label(TEXT_X, y, 'CATCH VITAMIN\nC MOLECULES', TEXT_WIDTH);

    this.tweens.add({
      targets: [capsule, glow],
      y: y - 12,
      yoyo: true,
      repeat: -1,
      duration: 1100,
      ease: 'Sine.easeInOut',
    });
    return this.row([panel, glow, capsule, text]);
  }

  private rowAvoid(y: number): Phaser.GameObjects.Container {
    const panel = createPanel(this, GAME_WIDTH / 2, y, PANEL_WIDTH, PANEL_HEIGHT, 36, 'gold');
    const stain = this.add.image(185, y, 'stain').setDisplaySize(150, 150);
    const bubble = this.add.image(325, y, 'decoy').setDisplaySize(125, 125);
    const cross = addArt(this, 450, y, 'ico-x').setDisplaySize(86, 86);
    const text = this.label(TEXT_X, y, 'AVOID GERMS\n& BUBBLES', TEXT_WIDTH);

    this.tweens.add({
      targets: stain,
      angle: { from: -8, to: 8 },
      yoyo: true,
      repeat: -1,
      duration: 700,
    });
    this.tweens.add({
      targets: bubble,
      angle: { from: -14, to: 14 },
      yoyo: true,
      repeat: -1,
      duration: 900,
    });
    this.tweens.add({
      targets: cross,
      scale: cross.scale * 1.15,
      yoyo: true,
      repeat: -1,
      duration: 600,
    });
    return this.row([panel, stain, bubble, cross, text]);
  }
}
