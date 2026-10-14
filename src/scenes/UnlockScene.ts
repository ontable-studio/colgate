import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';
import type { SessionResult } from '@/domain/session';
import { SceneKey } from './keys';

export interface ResultSceneData {
  result: SessionResult;
}

/** Short celebration between gameplay and the result screen. */
export class UnlockScene extends Phaser.Scene {
  private result!: SessionResult;

  constructor() {
    super(SceneKey.Unlock);
  }

  init(data: ResultSceneData): void {
    this.result = data.result;
  }

  create(): void {
    // TODO(client): final animation is undecided (Day 1 -> Day 7 teeth vs. Vitamin C wave).
    // Assumed option A: stained tooth cross-fades into the clean one.
    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, 360, 'UNLOCK YOUR\nBRIGHTEST SMILE!', {
        fontFamily: 'sans-serif',
        fontSize: '110px',
        fontStyle: 'bold',
        align: 'center',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const cy = GAME_HEIGHT / 2 + 180;
    const glow = this.add
      .image(cx, cy, 'flare')
      .setDisplaySize(1300, 1300)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0);
    this.add.image(cx, cy, 'tooth1').setDisplaySize(566, 720);
    const clean = this.add.image(cx, cy, 'tooth4').setDisplaySize(580, 720).setAlpha(0);
    this.add
      .text(cx - 330, cy + 480, 'DAY 1', {
        fontFamily: 'sans-serif',
        fontSize: '56px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.add
      .text(cx + 330, cy + 480, 'DAY 7', {
        fontFamily: 'sans-serif',
        fontSize: '56px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: clean, alpha: 1, delay: 500, duration: 1400 });
    this.tweens.add({ targets: glow, alpha: 0.8, delay: 500, duration: 1400, yoyo: true });
    this.time.delayedCall(2500, () => {
      this.scene.start(SceneKey.Result, { result: this.result } satisfies ResultSceneData);
    });
  }
}
