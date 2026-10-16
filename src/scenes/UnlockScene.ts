import Phaser from 'phaser';
import { audio } from '@/audio';
import { GAME_WIDTH } from '@/config/game';
import type { SessionResult } from '@/domain/session';
import { addArt } from '@/ui/art/canvas';
import { addBackground, addGlow, addHeader, addSparkles } from '@/ui/effects';
import { fadeIn, float, popIn, sparkBurst } from '@/ui/motion';
import { COLORS, textStyle } from '@/ui/theme';
import type { GameResultData } from './data';
import { SceneKey } from './keys';

const SCENE_MS = 3200;

/** The five steps from stained (Day 1) to clean and gleaming (Day 7): width in px, texture. */
const TEETH = [
  { texture: 'tooth1', width: 150 },
  { texture: 'tooth2', width: 182 },
  { texture: 'tooth3', width: 216 },
  { texture: 'tooth4', width: 254 },
  { texture: 'tooth4', width: 306 },
] as const;
const TOOTH_RATIO = 900 / 716;
const OVERLAP = 26;
const FIRST_AT_MS = 380;
const STEP_MS = 230;
const BASELINE_Y = 1240;

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
    // Assumed: a row of teeth that gets cleaner and bigger, from stained (Day 1) to gleaming (Day 7).
    const cx = GAME_WIDTH / 2;
    fadeIn(this);
    audio.stopMusic(300);
    // The chord inside the stinger lands about 0.9 s in; it meets the last tooth and its burst.
    this.time.delayedCall(300, () => audio.playSfx('sfx-unlock'));
    addBackground(this);
    addSparkles(this, 16, { x: 60, y: 560, width: 960, height: 1150 });
    addHeader(this, false);
    popIn(this, addArt(this, cx, 470, 'title-unlock'), 120, 0.6);

    const total = TEETH.reduce((sum, t) => sum + t.width, 0) - OVERLAP * (TEETH.length - 1);
    let left = cx - total / 2;
    let last = { x: cx, y: BASELINE_Y };

    TEETH.forEach((tooth, i) => {
      const height = tooth.width * TOOTH_RATIO;
      const x = left + tooth.width / 2;
      const y = BASELINE_Y - height / 2;
      left += tooth.width - OVERLAP;
      const delay = FIRST_AT_MS + i * STEP_MS;
      const image = this.add.image(x, y, tooth.texture).setDisplaySize(tooth.width, height);
      popIn(this, image, delay, 0.5);
      this.time.delayedCall(delay, () => audio.playSfx('sfx-pop', { detune: i * 140 }));
      float(this, image, 6, 1500 + i * 120, delay + 300);
      if (i === TEETH.length - 1) {
        // The last tooth gleams: a bright copy on top washes out the last trace of stain.
        const glow = this.add
          .image(x, y, tooth.texture)
          .setDisplaySize(tooth.width, height)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0);
        this.tweens.add({ targets: glow, alpha: 0.28, delay: delay + 250, duration: 500 });
        float(this, glow, 6, 1500 + i * 120, delay + 300);
        last = { x, y };
      }
    });

    const lastDelay = FIRST_AT_MS + (TEETH.length - 1) * STEP_MS;
    const halo = addGlow(this, last.x, last.y, 900, 0);
    halo.setDepth(-1);
    this.tweens.add({ targets: halo, alpha: 0.95, delay: lastDelay, duration: 600, yoyo: true });
    this.time.delayedCall(lastDelay + 150, () => sparkBurst(this, last.x, last.y, 18, 360));
    // Two glints that keep twinkling on the clean tooth.
    for (const [dx, dy, size, offset] of [
      [70, -150, 110, 0],
      [-90, -40, 70, 500],
    ] as const) {
      const star = addArt(this, last.x + dx, last.y + dy, 'spark')
        .setDisplaySize(size, size)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0);
      this.tweens.add({
        targets: star,
        alpha: 1,
        scale: star.scale * 1.3,
        angle: 20,
        yoyo: true,
        repeat: -1,
        duration: 700,
        delay: lastDelay + 400 + offset,
      });
    }

    const day = (x: number, label: string, delay: number) => {
      const text = this.add
        .text(
          x,
          BASELINE_Y + 70,
          label,
          textStyle({ size: 54, letterSpacing: 4, color: COLORS.goldLight }),
        )
        .setOrigin(0.5);
      popIn(this, text, delay, 0.6);
    };
    const firstX = cx - total / 2 + (TEETH[0]?.width ?? 0) / 2;
    day(firstX + 20, 'DAY 1', FIRST_AT_MS);
    day(last.x - 10, 'DAY 7', lastDelay);

    this.time.delayedCall(SCENE_MS, () => {
      this.scene.start(SceneKey.Initials, { result: this.result } satisfies GameResultData);
    });
  }
}
