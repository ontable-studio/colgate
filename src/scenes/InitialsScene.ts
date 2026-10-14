import Phaser from 'phaser';
import { GAME_WIDTH } from '@/config/game';
import {
  appendInitial,
  finalizeInitials,
  MAX_INITIALS,
  removeLastInitial,
} from '@/domain/initials';
import type { SessionResult } from '@/domain/session';
import { createButton } from '@/ui/button';
import { addBackground, addHeader, addSparkles } from '@/ui/effects';
import { createKeyboard } from '@/ui/keyboard';
import { bump, countUp, fadeIn, popIn } from '@/ui/motion';
import { createPanel } from '@/ui/panel';
import { COLORS, textStyle } from '@/ui/theme';
import type { GameResultData, ResultSceneData } from './data';
import type { IdleAware } from './idleAware';
import { SceneKey } from './keys';

/** Asks for the player's initials on an on-screen keyboard, then goes to the result screen. */
export class InitialsScene extends Phaser.Scene implements IdleAware {
  private result!: SessionResult;
  private initials = '';
  private submitted = false;
  private slots: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(SceneKey.Initials);
  }

  init(data: GameResultData): void {
    this.result = data.result;
    this.initials = '';
    this.submitted = false;
    this.slots = [];
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    fadeIn(this);
    addBackground(this);
    addSparkles(this, 8, { x: 40, y: 300, width: 1000, height: 600 });
    addHeader(this, false);

    this.add
      .text(cx, 300, 'YOUR SCORE', textStyle({ size: 46, letterSpacing: 6, color: COLORS.cream }))
      .setOrigin(0.5);
    const score = this.add
      .text(
        cx,
        430,
        '0',
        textStyle({ size: 170, color: COLORS.goldLight, glow: 'rgba(255,170,60,0.9)' }),
      )
      .setOrigin(0.5);
    countUp(this, score, this.result.score, 700, 150);
    this.add
      .text(cx, 590, 'ENTER YOUR INITIALS', textStyle({ size: 46, weight: 'light' }))
      .setOrigin(0.5);

    const boxSize = 200;
    const gap = 50;
    const left = cx - ((MAX_INITIALS - 1) * (boxSize + gap)) / 2;
    for (let i = 0; i < MAX_INITIALS; i++) {
      const x = left + i * (boxSize + gap);
      createPanel(this, x, 745, boxSize, boxSize, 36);
      this.slots.push(
        this.add.text(x, 745, '', textStyle({ size: 132, color: COLORS.goldLight })).setOrigin(0.5),
      );
    }
    this.refresh();

    createKeyboard(this, cx, 960, {
      onLetter: (letter) => {
        const before = this.initials.length;
        this.initials = appendInitial(this.initials, letter);
        this.refresh();
        const slot = this.slots[this.initials.length - 1];
        if (this.initials.length > before && slot) bump(this, slot, 1.35, 120);
      },
      onBackspace: () => {
        this.initials = removeLastInitial(this.initials);
        this.refresh();
      },
    });

    const save = createButton(this, cx, 1745, 'SAVE', () => this.submit(), {
      width: 640,
      height: 150,
      fontSize: 60,
      variant: 'gold',
    });
    popIn(this, save, 450);
  }

  /** Idle: do not lose the play, save with whatever was typed (or the placeholder). */
  onIdle(): void {
    this.submit();
  }

  private refresh(): void {
    this.slots.forEach((slot, i) => {
      this.tweens.killTweensOf(slot);
      const letter = this.initials[i];
      slot.setText(letter ?? '_').setAlpha(letter ? 1 : 0.35);
    });
    // The next empty slot blinks like a text cursor.
    const next = this.slots[this.initials.length];
    if (next) {
      this.tweens.add({
        targets: next,
        alpha: { from: 0.2, to: 0.75 },
        yoyo: true,
        repeat: -1,
        duration: 480,
      });
    }
  }

  private submit(): void {
    if (this.submitted) return;
    this.submitted = true;
    this.scene.start(SceneKey.Result, {
      result: this.result,
      initials: finalizeInitials(this.initials),
    } satisfies ResultSceneData);
  }
}
