import Phaser from 'phaser';
import { audio } from '@/audio';
import { GAME_WIDTH } from '@/config/game';
import { addArt } from '@/ui/art/canvas';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader } from '@/ui/effects';
import { addHomeButton } from '@/ui/homeButton';
import { fadeIn, popIn, slideIn } from '@/ui/motion';
import { RULES } from '@/config/game';
import { createPanel } from '@/ui/panel';
import { COLORS, textStyle } from '@/ui/theme';
import { BRUSH_HEIGHT, BRUSH_WIDTH } from '@/ui/art/brush';
import { SceneKey } from './keys';

const PANEL_WIDTH = 920;
const PANEL_HEIGHT = 340;
const ROW_Y = [820, 1200] as const;
const BUTTON_Y = 1700;
/** Every card's text starts at this x, so the lines read as one column. */
const TEXT_X = 520;
const TEXT_WIDTH = 450;

export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.HowToPlay);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    fadeIn(this);
    audio.playMusic('bgm-attract');
    addBackground(this);
    addHeader(this);
    addHomeButton(this);
    popIn(this, addArt(this, cx, 520, 'title-how'), 100, 0.8);

    // Each card slides in from alternating sides, one after the other.
    const rows = [this.rowTap(ROW_Y[0]), this.rowReach(ROW_Y[1])];
    rows.forEach((row, i) => {
      slideIn(this, row, i % 2 === 0 ? -460 : 460, 220 + i * 170);
      this.time.delayedCall(220 + i * 170, () =>
        audio.playSfx('sfx-whoosh', { volume: 1 - i * 0.2 }),
      );
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

  /** Molecules of three sizes, each with its points; a crosshair keeps tapping the middle one. */
  private rowTap(y: number): Phaser.GameObjects.Container {
    const panel = createPanel(this, GAME_WIDTH / 2, y, PANEL_WIDTH, PANEL_HEIGHT, 36, 'gold');
    const items: Phaser.GameObjects.GameObject[] = [panel];
    const sizes = ['small', 'medium', 'large'] as const;
    const xs = [150, 270, 405];
    sizes.forEach((size, i) => {
      const spec = RULES.bubbles[size];
      const shown = spec.diameter * 0.62;
      const x = xs[i] ?? 0;
      const glow = addGlow(this, x, y - 20, shown * 2.2, 0.6);
      const capsule = this.add.image(x, y - 20, 'capsule').setDisplaySize(shown, shown);
      const points = this.add
        .text(x, y + 100, `+${spec.points}`, textStyle({ size: 40, color: COLORS.goldLight }))
        .setOrigin(0.5);
      this.tweens.add({
        targets: [capsule, glow],
        y: y - 32,
        yoyo: true,
        repeat: -1,
        duration: 1100 + i * 250,
        ease: 'Sine.easeInOut',
      });
      items.push(glow, capsule, points);
    });
    const aim = addArt(this, xs[1] ?? 0, y - 20, 'crosshair').setAlpha(0.95);
    this.tweens.add({
      targets: aim,
      scale: aim.scale * 1.3,
      yoyo: true,
      repeat: -1,
      duration: 650,
      ease: 'Sine.easeInOut',
    });
    items.push(aim, this.label(TEXT_X + 50, y, 'TAP TO SHOOT\nVIT C MOLECULES', TEXT_WIDTH - 50));
    return this.row(items);
  }

  /** A toothbrush that fills up, next to the goal. */
  private rowReach(y: number): Phaser.GameObjects.Container {
    const panel = createPanel(this, GAME_WIDTH / 2, y, PANEL_WIDTH, PANEL_HEIGHT, 36, 'gold');
    const brushH = 270;
    const brushW = (BRUSH_WIDTH / BRUSH_HEIGHT) * brushH;
    const x = 300;
    const empty = this.add.image(x, y, 'brush-empty').setDisplaySize(brushW, brushH);
    const fill = this.add.image(x, y, 'brush-fill').setDisplaySize(brushW, brushH);
    const source = this.textures.get('brush-fill').getSourceImage();
    const state = { ratio: 0 };
    this.tweens.add({
      targets: state,
      ratio: 1,
      yoyo: true,
      repeat: -1,
      hold: 500,
      repeatDelay: 300,
      duration: 1800,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const shown = Math.max(1, Math.round(source.height * state.ratio));
        fill.setCrop(0, source.height - shown, source.width, shown);
      },
    });
    const text = this.label(TEXT_X + 50, y, `REACH\n${RULES.targetPoints} PTS`, TEXT_WIDTH - 50);
    return this.row([panel, empty, fill, text]);
  }
}
