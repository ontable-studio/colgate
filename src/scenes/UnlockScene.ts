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
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'UNLOCK YOUR\nBRIGHTEST SMILE!', {
        fontFamily: 'sans-serif',
        fontSize: '110px',
        fontStyle: 'bold',
        align: 'center',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.time.delayedCall(2500, () => {
      this.scene.start(SceneKey.Result, { result: this.result } satisfies ResultSceneData);
    });
  }
}
