import Phaser from 'phaser';
import { GAME_WIDTH } from '@/config/game';
import type { SessionResult } from '@/domain/session';
import { addArt } from '@/ui/art/canvas';
import { addBackground, addGlow, addHeader, addSparkles } from '@/ui/effects';
import { fadeIn, float, popIn, sparkBurst } from '@/ui/motion';
import { COLORS, textStyle } from '@/ui/theme';
import type { GameResultData } from './data';
import { SceneKey } from './keys';

const REVEAL_DELAY_MS = 500;
const REVEAL_MS = 1400;
const SCENE_MS = 2600;

/** Short celebration between gameplay and the initials screen. */
export class UnlockScene extends Phaser.Scene {
  private result!: SessionResult;

  constructor() {
    super(SceneKey.Unlock);
  }

  init(data: GameResultData): void {
    this.result = data.result;
  }

  create(): void {
    // TODO(client): final animation is undecided (Day 1 -> Day 7 teeth vs. Vitamin C wave).
    // Assumed option A: stained tooth cross-fades into the clean one.
    const cx = GAME_WIDTH / 2;
    const cy = 1130;
    fadeIn(this);
    addBackground(this);
    addSparkles(this, 16, { x: 60, y: 560, width: 960, height: 1150 });
    addHeader(this, false);
    popIn(this, addArt(this, cx, 470, 'title-unlock'), 120, 0.6);

    const halo = addGlow(this, cx, cy, 1200, 0);
    const stained = this.add.image(cx, cy, 'tooth1').setDisplaySize(560, 714);
    popIn(this, stained, 250, 0.85);
    const clean = this.add.image(cx, cy, 'tooth4').setDisplaySize(575, 714).setAlpha(0);

    const day = (x: number, label: string, delay: number) => {
      const text = this.add
        .text(
          x,
          cy + 450,
          label,
          textStyle({ size: 54, letterSpacing: 4, color: COLORS.goldLight }),
        )
        .setOrigin(0.5);
      popIn(this, text, delay, 0.6);
    };
    day(cx - 300, 'DAY 1', 450);
    day(cx + 300, 'DAY 7', 700);

    this.tweens.add({ targets: clean, alpha: 1, delay: REVEAL_DELAY_MS, duration: REVEAL_MS });
    this.tweens.add({
      targets: halo,
      alpha: 0.95,
      delay: REVEAL_DELAY_MS,
      duration: REVEAL_MS,
      yoyo: true,
    });
    // Both teeth bob together; a burst of twinkles marks the moment the tooth turns bright.
    float(this, [stained, clean], 10, 1500, 600);
    this.time.delayedCall(REVEAL_DELAY_MS + REVEAL_MS / 2, () => sparkBurst(this, cx, cy, 16, 380));
    this.time.delayedCall(SCENE_MS, () => {
      this.scene.start(SceneKey.Initials, { result: this.result } satisfies GameResultData);
    });
  }
}
