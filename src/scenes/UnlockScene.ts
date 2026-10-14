import Phaser from 'phaser';
import { GAME_WIDTH } from '@/config/game';
import type { SessionResult } from '@/domain/session';
import { addArt } from '@/ui/art/canvas';
import { addBackground, addGlow, addHeader, addSparkles } from '@/ui/effects';
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
    addBackground(this);
    addSparkles(this, 16, { x: 60, y: 560, width: 960, height: 1150 });
    addHeader(this, false);
    addArt(this, cx, 470, 'title-unlock');

    const halo = addGlow(this, cx, cy, 1200, 0);
    this.add.image(cx, cy, 'tooth1').setDisplaySize(560, 714);
    const clean = this.add.image(cx, cy, 'tooth4').setDisplaySize(575, 714).setAlpha(0);

    const day = (x: number, label: string) =>
      this.add
        .text(
          x,
          cy + 450,
          label,
          textStyle({ size: 54, letterSpacing: 4, color: COLORS.goldLight }),
        )
        .setOrigin(0.5);
    day(cx - 300, 'DAY 1');
    day(cx + 300, 'DAY 7');

    this.tweens.add({ targets: clean, alpha: 1, delay: REVEAL_DELAY_MS, duration: REVEAL_MS });
    this.tweens.add({
      targets: halo,
      alpha: 0.95,
      delay: REVEAL_DELAY_MS,
      duration: REVEAL_MS,
      yoyo: true,
    });
    this.time.delayedCall(SCENE_MS, () => {
      this.scene.start(SceneKey.Initials, { result: this.result } satisfies GameResultData);
    });
  }
}
