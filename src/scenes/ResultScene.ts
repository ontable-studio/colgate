import Phaser from 'phaser';
import { getServices } from '@/app/container';
import { env } from '@/config/env';
import { GAME_WIDTH } from '@/config/game';
import type { PlayRecord } from '@/domain/play';
import type { SessionResult } from '@/domain/session';
import { newId } from '@/util/id';
import { createButton } from '@/ui/button';
import { addBackground, addConfetti, addGlow, addHeader, addSparkles } from '@/ui/effects';
import { createMeter } from '@/ui/meter';
import { createPanel } from '@/ui/panel';
import { COLORS, textStyle } from '@/ui/theme';
import type { ResultSceneData } from './data';
import { SceneKey } from './keys';

const BOARD_SIZE = 10;
const BOARD_TOP = 1085;
const ROW_STEP = 46;

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
    addConfetti(this);
    addSparkles(this, 10, { x: 40, y: 260, width: 1000, height: 700 });
    addHeader(this, false);

    // Score block
    createPanel(this, cx, 430, 900, 240);
    this.add
      .text(cx, 360, 'YOUR SCORE', textStyle({ size: 42, letterSpacing: 6, color: COLORS.cream }))
      .setOrigin(0.5);
    this.add
      .text(
        cx,
        465,
        String(this.result.score),
        textStyle({ size: 140, color: COLORS.goldLight, glow: 'rgba(255,170,60,0.9)' }),
      )
      .setOrigin(0.5);

    // Brightness meter, frozen at the final value
    createMeter(this, cx, 625).setValue(this.result.meterPct);
    this.add
      .text(
        110,
        705,
        'BRIGHTNESS METER',
        textStyle({ size: 30, align: 'left', letterSpacing: 4, color: COLORS.cream }),
      )
      .setOrigin(0, 0.5);
    this.add
      .text(
        970,
        705,
        `${Math.round(this.result.meterPct)}%`,
        textStyle({ size: 44, align: 'right' }),
      )
      .setOrigin(1, 0.5);

    this.addDayCompare();
    this.addTube();

    // Leaderboard card (filled in once the play is saved)
    createPanel(this, cx, 1290, 920, 580);
    this.add
      .text(
        cx,
        BOARD_TOP - 42,
        `TOP ${BOARD_SIZE}`,
        textStyle({ size: 42, letterSpacing: 8, color: COLORS.goldSoft }),
      )
      .setOrigin(0.5);
    void this.saveAndShowBoard();

    this.add
      .text(
        cx,
        1635,
        'BRIGHTER SMILES, BRIGHTER DAYS',
        textStyle({ size: 38, color: COLORS.goldSoft, glow: 'rgba(255,150,40,0.7)' }),
      )
      .setOrigin(0.5);

    createButton(this, cx, 1765, 'PLAY AGAIN', () => this.scene.start(SceneKey.Gameplay), {
      width: 760,
      height: 140,
      fontSize: 58,
      icon: 'ico-replay-red',
      variant: 'gold',
    });
  }

  /** Small before/after card: stained tooth (Day 1) next to the clean one (Day 7). */
  private addDayCompare(): void {
    createPanel(this, 330, 880, 560, 230, 34, 'gold');
    this.add.image(190, 868, 'tooth1').setDisplaySize(110, 140);
    this.add.image(360, 868, 'tooth4').setDisplaySize(113, 140);
    const label = (x: number, text: string) =>
      this.add
        .text(x, 968, text, textStyle({ size: 30, letterSpacing: 3, color: COLORS.goldLight }))
        .setOrigin(0.5);
    label(190, 'DAY 1');
    label(360, 'DAY 7');
    this.add
      .text(
        275,
        868,
        '>',
        textStyle({ size: 56, color: COLORS.goldSoft, glow: 'rgba(255,170,60,0.8)' }),
      )
      .setOrigin(0.5);
  }

  /** The product with a warm glow and two capsules, tucked to the right of the compare card. */
  private addTube(): void {
    addGlow(this, 860, 930, 520, 0.7);
    this.add.image(860, 930, 'tube').setDisplaySize(118, 330).setAngle(8);
    for (const [x, y, size] of [
      [760, 800, 84],
      [985, 1010, 90],
    ] as const) {
      addGlow(this, x, y, size * 2.2, 0.6);
      this.add.image(x, y, 'capsule').setDisplaySize(size, size);
    }
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
        this.add.text(x, y, text, textStyle({ size: 36, color })).setOrigin(origin, 0.5);
      cell(210, `${i + 1}.`, 1);
      cell(262, entry.initials, 0);
      cell(870, String(entry.score), 1);
    });
  }
}
