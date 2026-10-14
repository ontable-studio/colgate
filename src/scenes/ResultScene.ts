import Phaser from 'phaser';
import { getServices } from '@/app/container';
import { env } from '@/config/env';
import { GAME_WIDTH } from '@/config/game';
import type { PlayRecord } from '@/domain/play';
import type { SessionResult } from '@/domain/session';
import { newId } from '@/util/id';
import { createButton } from '@/ui/button';
import { addBackground, addHeader, addSparkles } from '@/ui/effects';
import { createMeter } from '@/ui/meter';
import { createPanel } from '@/ui/panel';
import { COLORS, textStyle } from '@/ui/theme';
import type { ResultSceneData } from './data';
import { SceneKey } from './keys';

const BOARD_SIZE = 10;
const BOARD_TOP = 955;
const ROW_STEP = 54;

export class ResultScene extends Phaser.Scene {
  private result!: SessionResult;
  private initials = '';

  constructor() {
    super(SceneKey.Result);
  }

  init(data: ResultSceneData): void {
    this.result = data.result;
    this.initials = data.initials;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    addBackground(this);
    addSparkles(this, 10, { x: 40, y: 260, width: 1000, height: 700 });
    addHeader(this, false);

    // Score block
    createPanel(this, cx, 470, 900, 290);
    this.add
      .text(cx, 385, 'YOUR SCORE', textStyle({ size: 44, letterSpacing: 6, color: COLORS.cream }))
      .setOrigin(0.5);
    this.add
      .text(
        cx,
        495,
        String(this.result.score),
        textStyle({ size: 150, color: COLORS.goldLight, glow: 'rgba(255,170,60,0.9)' }),
      )
      .setOrigin(0.5);

    // Brightness meter, frozen at the final value
    createMeter(this, cx, 690).setValue(this.result.meterPct);
    this.add
      .text(
        110,
        772,
        'BRIGHTNESS METER',
        textStyle({ size: 32, align: 'left', letterSpacing: 4, color: COLORS.cream }),
      )
      .setOrigin(0, 0.5);
    this.add
      .text(
        970,
        772,
        `${Math.round(this.result.meterPct)}%`,
        textStyle({ size: 46, align: 'right' }),
      )
      .setOrigin(1, 0.5);

    // Leaderboard card (filled in once the play is saved)
    createPanel(this, cx, 1190, 920, 700);
    this.add
      .text(
        cx,
        BOARD_TOP - 62,
        `TOP ${BOARD_SIZE}`,
        textStyle({ size: 46, letterSpacing: 8, color: COLORS.goldSoft }),
      )
      .setOrigin(0.5);
    void this.saveAndShowBoard();

    this.add
      .text(
        cx,
        1610,
        'BRIGHTER SMILES, BRIGHTER DAYS',
        textStyle({ size: 40, color: COLORS.goldSoft, glow: 'rgba(255,150,40,0.7)' }),
      )
      .setOrigin(0.5);

    createButton(this, cx, 1745, 'PLAY AGAIN', () => this.scene.start(SceneKey.Gameplay), {
      width: 760,
      height: 150,
      fontSize: 60,
      icon: 'ico-replay',
    });
  }

  private async saveAndShowBoard(): Promise<void> {
    const { repo } = getServices();
    const play: PlayRecord = {
      id: newId(),
      timestamp: new Date().toISOString(),
      deviceId: env.deviceId,
      initials: this.initials,
      score: this.result.score,
      meterPct: this.result.meterPct,
      catches: this.result.catches,
      hits: this.result.hits,
      durationSec: this.result.durationSec,
      gameVersion: env.gameVersion,
      syncStatus: 'pending',
    };
    await repo.add(play);

    const top = await repo.topScores(BOARD_SIZE);
    // The scene may have been left (idle reset) while the DB was busy.
    if (!this.scene.isActive()) return;

    top.forEach((entry, i) => {
      const y = BOARD_TOP + i * ROW_STEP + ROW_STEP / 2;
      const mine = entry.id === play.id;
      const color = mine ? COLORS.goldLight : COLORS.white;
      if (mine) {
        this.add.rectangle(GAME_WIDTH / 2, y, 840, ROW_STEP - 4, 0xffc83d, 0.22).setOrigin(0.5);
      }
      const cell = (x: number, text: string, origin: number) =>
        this.add.text(x, y, text, textStyle({ size: 38, color })).setOrigin(origin, 0.5);
      cell(210, `${i + 1}.`, 1);
      cell(262, entry.initials, 0);
      cell(870, String(entry.score), 1);
    });
  }
}
