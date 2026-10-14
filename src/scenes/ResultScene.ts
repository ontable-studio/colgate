import Phaser from 'phaser';
import { getServices } from '@/app/container';
import { env } from '@/config/env';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';
import type { PlayRecord } from '@/domain/play';
import type { SessionResult } from '@/domain/session';
import { newId } from '@/util/id';
import { createButton } from '@/ui/button';
import { SceneKey } from './keys';
import type { ResultSceneData } from './UnlockScene';

export class ResultScene extends Phaser.Scene {
  private result!: SessionResult;

  constructor() {
    super(SceneKey.Result);
  }

  init(data: ResultSceneData): void {
    this.result = data.result;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const style = { fontFamily: 'sans-serif', color: '#ffffff', align: 'center' };

    this.add.text(cx, 300, 'YOUR SCORE', { ...style, fontSize: '56px' }).setOrigin(0.5);
    this.add
      .text(cx, 440, String(this.result.score), { ...style, fontSize: '200px', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(cx, 620, `Brightness Meter ${Math.round(this.result.meterPct)}%`, {
        ...style,
        fontSize: '52px',
      })
      .setOrigin(0.5);

    const board = this.add
      .text(cx, 1000, '', { ...style, fontSize: '44px', lineSpacing: 12 })
      .setOrigin(0.5);
    void this.saveAndShowBoard(board);

    createButton(this, cx, GAME_HEIGHT - 300, 'PLAY AGAIN', () => {
      this.scene.start(SceneKey.Gameplay);
    });
  }

  private async saveAndShowBoard(board: Phaser.GameObjects.Text): Promise<void> {
    const { repo } = getServices();
    const play: PlayRecord = {
      id: newId(),
      timestamp: new Date().toISOString(),
      deviceId: env.deviceId,
      // TODO(client): initials entry via on-screen keyboard (Option A in PLAN.md).
      initials: '---',
      score: this.result.score,
      meterPct: this.result.meterPct,
      catches: this.result.catches,
      hits: this.result.hits,
      durationSec: this.result.durationSec,
      gameVersion: env.gameVersion,
      syncStatus: 'pending',
    };
    await repo.add(play);

    const top = await repo.topScores(5);
    // The scene may have been left (idle reset) while the DB was busy.
    if (!this.scene.isActive()) return;
    board.setText(
      ['TOP 5', ...top.map((p, i) => `${i + 1}. ${p.initials}   ${p.score}`)].join('\n'),
    );
  }
}
