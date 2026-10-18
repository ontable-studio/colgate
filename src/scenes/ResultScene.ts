import Phaser from 'phaser';
import { audio } from '@/audio';
import { getServices } from '@/app/container';
import { env } from '@/config/env';
import { GAME_WIDTH } from '@/config/game';
import type { PlayRecord } from '@/domain/play';
import type { SessionResult } from '@/domain/session';
import { newId } from '@/util/id';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader, addSparkles } from '@/ui/effects';
import { createMeter } from '@/ui/meter';
import { bump, countUp, fadeIn, float, popIn, slideIn } from '@/ui/motion';
import { createPanel } from '@/ui/panel';
import { COLORS, textStyle } from '@/ui/theme';
import type { ResultSceneData } from './data';
import { SceneKey } from './keys';

/*
 * Vertical layout (1080x1920); the left and right columns of the first block never overlap:
 *   285-535   score card (left)      285-755  tube (right)
 *   542-757   Day 1 > Day 7 card     792-868  Brightness Meter, labels at 905
 *   970-1530  Top 10 card   1610 tagline   1695-1840  HOME (icon, left) + PLAY AGAIN (right)
 *
 * Safe area: every card and button stays inside x 80-1000 (80 px from each side) and above
 * y 1840; only the Colgate tab hangs from the top edge.
 */
const MARGIN = 80;
const BOARD_SIZE = 10;
const BOARD_TOP = 1050;
const ROW_STEP = 42;
const LEFT_X = 340;
const CARD_WIDTH = 520;

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
    fadeIn(this);
    audio.playMusic('bgm-attract', 1200);
    addBackground(this, 'winning');
    addSparkles(this, 10, { x: 40, y: 260, width: 1000, height: 700 });
    addHeader(this, false);

    this.addScoreCard();
    this.addDayCompare();
    this.addTube();
    this.addMeter(cx);

    // Leaderboard card (filled in once the play is saved)
    createPanel(this, cx, 1265, 920, 590);
    this.add
      .text(
        cx,
        BOARD_TOP - 40,
        `TOP ${BOARD_SIZE}`,
        textStyle({ size: 42, letterSpacing: 8, color: COLORS.goldSoft }),
      )
      .setOrigin(0.5);
    void this.saveAndShowBoard();

    const tagline = this.add
      .text(
        cx,
        1612,
        'BRIGHTER SMILES, BRIGHTER DAYS',
        textStyle({ size: 30, color: COLORS.goldSoft, glow: 'rgba(255,150,40,0.7)' }),
      )
      .setOrigin(0.5);
    popIn(this, tagline, 1000, 0.85);

    this.addBottomButtons();
  }

  /** HOME (icon only) on the left and PLAY AGAIN on the right, side by side at the bottom. */
  private addBottomButtons(): void {
    const y = 1768;
    const gap = 30;
    const homeWidth = 150;
    const home = createButton(
      this,
      MARGIN + homeWidth / 2,
      y,
      '',
      () => this.scene.start(SceneKey.Attract),
      { width: homeWidth, height: 140, icon: 'ico-home', sound: 'sfx-ui-tap' },
    );
    const againWidth = GAME_WIDTH - MARGIN * 2 - homeWidth - gap;
    const again = createButton(
      this,
      MARGIN + homeWidth + gap + againWidth / 2,
      y,
      'PLAY AGAIN',
      () => this.scene.start(SceneKey.Gameplay),
      {
        width: againWidth,
        height: 140,
        fontSize: 58,
        icon: 'ico-replay-red',
        variant: 'gold',
        sound: 'sfx-ui-start',
      },
    );
    popIn(this, home, 1100);
    popIn(this, again, 1100);
    this.time.delayedCall(1700, () => {
      this.tweens.add({ targets: again, scale: 1.03, yoyo: true, repeat: -1, duration: 800 });
    });
  }

  /** Score card (left column). The number counts up, then pops. */
  private addScoreCard(): void {
    createPanel(this, LEFT_X, 410, CARD_WIDTH, 250);
    this.add
      .text(
        LEFT_X + 3, // letter spacing leaves a trailing gap, nudge to look centred
        335,
        'YOUR SCORE',
        textStyle({ size: 38, letterSpacing: 6, color: COLORS.cream }),
      )
      .setOrigin(0.5);
    const score = this.add
      .text(
        LEFT_X,
        418,
        '0',
        textStyle({ size: 124, color: COLORS.goldLight, glow: 'rgba(255,170,60,0.9)' }),
      )
      .setOrigin(0.5);
    countUp(this, score, this.result.score, 1000, 250);
    // How full the meter ended up, stated plainly under the score.
    const brightness = this.add
      .text(
        LEFT_X + 2,
        500,
        `BRIGHTNESS  ${Math.round(this.result.meterPct)}%`,
        textStyle({ size: 34, letterSpacing: 4, color: COLORS.goldSoft }),
      )
      .setOrigin(0.5);
    popIn(this, brightness, 900, 0.85);
    this.playCountTicks();
    this.time.delayedCall(1300, () => {
      bump(this, score, 1.12, 140);
      audio.playSfx('sfx-result');
    });
  }

  /** A run of soft ticks, rising in pitch, while the score counts up. */
  private playCountTicks(): void {
    const ticks = 14;
    let i = 0;
    this.time.delayedCall(250, () => {
      this.time.addEvent({
        delay: 1000 / ticks,
        repeat: ticks - 1,
        callback: () => {
          audio.playSfx('sfx-count', { detune: i * 35 });
          i += 1;
        },
      });
    });
  }

  /** Brightness meter that fills up to the final value, with the percentage counting along. */
  private addMeter(cx: number): void {
    const meter = createMeter(this, cx, 830);
    const state = { value: 0 };
    this.tweens.add({
      targets: state,
      value: this.result.meterPct,
      duration: 1000,
      delay: 400,
      ease: 'Cubic.easeOut',
      onUpdate: () => meter.setValue(state.value),
      onComplete: () => meter.pulse(),
    });

    this.add
      .text(
        110,
        905,
        'BRIGHTNESS METER',
        textStyle({ size: 30, align: 'left', letterSpacing: 4, color: COLORS.cream }),
      )
      .setOrigin(0, 0.5);
    const pct = this.add
      .text(970, 905, '0%', textStyle({ size: 44, align: 'right' }))
      .setOrigin(1, 0.5);
    countUp(this, pct, Math.round(this.result.meterPct), 1000, 400, '%');
  }

  /** Small before/after card: the stained tooth (Day 1) turns clean (Day 7) a moment after it appears. */
  private addDayCompare(): void {
    createPanel(this, LEFT_X, 650, CARD_WIDTH, 215, 34, 'gold');
    this.add.image(LEFT_X - 140, 636, 'tooth1').setDisplaySize(110, 140);
    const clean = this.add
      .image(LEFT_X + 140, 636, 'tooth4')
      .setDisplaySize(113, 140)
      .setAlpha(0);
    this.tweens.add({ targets: clean, alpha: 1, delay: 700, duration: 900 });

    const label = (x: number, text: string) =>
      this.add
        .text(x, 722, text, textStyle({ size: 28, letterSpacing: 3, color: COLORS.goldLight }))
        .setOrigin(0.5);
    label(LEFT_X - 140, 'DAY 1');
    label(LEFT_X + 140, 'DAY 7');
    const arrow = this.add
      .text(
        LEFT_X,
        636,
        '>',
        textStyle({ size: 56, color: COLORS.goldSoft, glow: 'rgba(255,170,60,0.8)' }),
      )
      .setOrigin(0.5);
    this.tweens.add({ targets: arrow, x: LEFT_X + 14, yoyo: true, repeat: -1, duration: 600 });
  }

  /** The product on the right with a warm glow and a few capsules, clear of every card. */
  private addTube(): void {
    addGlow(this, 850, 520, 560, 0.7);
    const tube = this.add.image(850, 520, 'tube').setDisplaySize(168, 470).setAngle(6);
    slideIn(this, tube, 260, 200);
    this.time.delayedCall(800, () => float(this, tube, 12, 2300));

    for (const [x, y, size, delay] of [
      [715, 330, 84, 0],
      [935, 705, 96, 600],
      [705, 735, 70, 1100],
    ] as const) {
      addGlow(this, x, y, size * 2.2, 0.6);
      const capsule = this.add.image(x, y, 'capsule').setDisplaySize(size, size);
      float(this, capsule, 16, 1900, delay);
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

    const { top, mine } = await repo.board(BOARD_SIZE, play.id);
    // The scene may have been left (idle reset) while the DB was busy.
    if (!this.scene.isActive()) return;

    top.forEach((entry, i) => {
      const y = BOARD_TOP + i * ROW_STEP + ROW_STEP / 2;
      this.addBoardRow(y, i + 1, entry, entry.id === play.id, 350 + i * 70);
    });

    // Outside the top 10: the player's own place goes at the very bottom, as its own line.
    if (mine) {
      const y = BOARD_TOP + BOARD_SIZE * ROW_STEP + ROW_STEP / 2 + 14;
      const delay = 350 + BOARD_SIZE * 70;
      this.addBoardRow(y, mine.rank, mine.play, true, delay);
    }
  }

  /** One line of the leaderboard: rank, initials and score; the player's own line glows. */
  private addBoardRow(
    y: number,
    rank: number,
    entry: PlayRecord,
    isMine: boolean,
    delay: number,
  ): void {
    const color = isMine ? COLORS.goldLight : COLORS.white;
    if (isMine) {
      const row = this.add
        .rectangle(GAME_WIDTH / 2, y, 840, ROW_STEP - 4, 0xffc83d, 0.22)
        .setOrigin(0.5);
      slideIn(this, row, 160, delay);
      this.tweens.add({
        targets: row,
        fillAlpha: 0.42,
        yoyo: true,
        repeat: -1,
        duration: 700,
        delay: delay + 500,
      });
    }
    const cell = (x: number, text: string, origin: number): void => {
      const label = this.add
        .text(x, y, text, textStyle({ size: 36, color }))
        .setOrigin(origin, 0.5);
      slideIn(this, label, 160, delay);
    };
    cell(210, `${rank}.`, 1);
    cell(262, entry.initials, 0);
    cell(870, String(entry.score), 1);
  }
}
