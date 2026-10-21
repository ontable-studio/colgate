import Phaser from 'phaser';
import { audio } from '@/audio';
import { getServices } from '@/app/container';
import { env } from '@/config/env';
import { GAME_WIDTH, RULES } from '@/config/game';
import type { PlayRecord } from '@/domain/play';
import type { SessionResult } from '@/domain/session';
import { newId } from '@/util/id';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader } from '@/ui/effects';
import { bump, countUp, fadeIn, float, popIn, sparkBurst } from '@/ui/motion';
import { COLORS, GLOW_PAD, textStyle } from '@/ui/theme';
import type { GameResultData } from './data';
import { SceneKey } from './keys';

const MARGIN = 80;
const MOLECULE_SIZE = 170;
const MOLECULE_GAP = 36;

/** Decorative molecules, only in the clear bands above and below the text: x, y, diameter, float delay. */
const MOLECULES = [
  [110, 400, 110, 0],
  [960, 370, 90, 600],
  [100, 1340, 90, 1100],
  [940, 1390, 170, 300],
] as const;

export class ResultScene extends Phaser.Scene {
  private result!: SessionResult;

  constructor() {
    super(SceneKey.Result);
  }

  init(data: GameResultData): void {
    this.result = data.result;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const won = this.result.score >= RULES.targetPoints;
    fadeIn(this);
    audio.playMusic('bgm-attract', 1200);
    addBackground(this);
    addHeader(this, false);
    this.addMolecules();
    this.addMessage(cx, won);
    this.addBottomButtons();
    void this.save();
  }

  /** Headline, the big percentage counting up, and what it measures. */
  private addMessage(cx: number, won: boolean): void {
    const headline = won ? 'CONGRATULATIONS!' : 'GOOD TRY!';
    const lead = won ? 'YOU HAVE REACHED' : 'YOU REACHED';
    const title = this.add
      .text(cx, 560, headline, textStyle({ size: 84, glow: 'rgba(255,150,40,0.7)' }))
      .setOrigin(0.5);
    popIn(this, title, 200, 0.7);
    const leadText = this.add
      .text(cx, 670, lead, textStyle({ size: 46, letterSpacing: 5, color: COLORS.cream }))
      .setOrigin(0.5);
    popIn(this, leadText, 450, 0.9);

    // The percentage with a molecule to its left, the pair centred as one group.
    addGlow(this, cx, 900, 1000, 0.35);
    const finalLabel = `${Math.round(this.result.meterPct)}%`;
    const pct = this.add
      .text(
        0,
        900,
        finalLabel,
        textStyle({ size: 250, color: COLORS.goldLight, glow: 'rgba(255,170,60,0.9)' }),
      )
      .setOrigin(0, 0.5);
    const textWidth = pct.width - GLOW_PAD * 2;
    const left = cx - (MOLECULE_SIZE + MOLECULE_GAP + textWidth) / 2;
    pct.setX(left + MOLECULE_SIZE + MOLECULE_GAP - GLOW_PAD);
    pct.setText('0%');
    addGlow(this, left + MOLECULE_SIZE / 2, 900, MOLECULE_SIZE * 2.2, 0.6);
    const molecule = this.add
      .image(left + MOLECULE_SIZE / 2, 900, 'capsule')
      .setDisplaySize(MOLECULE_SIZE, MOLECULE_SIZE);
    popIn(this, molecule, 650, 0.2);
    popIn(this, pct, 650, 0.6);
    this.time.delayedCall(1500, () => float(this, molecule, 12, 1900));
    countUp(this, pct, Math.round(this.result.meterPct), 1200, 300, '%');

    const subtitle = this.add
      .text(cx, 1090, 'High Purity Vitamin C Blast', textStyle({ size: 56, weight: 'light' }))
      .setOrigin(0.5);
    popIn(this, subtitle, 1300, 0.9);
    if (!won) {
      this.add
        .text(
          cx,
          1190,
          `Play again to reach ${RULES.targetPoints}%`,
          textStyle({ size: 42, color: COLORS.goldSoft }),
        )
        .setOrigin(0.5);
    }

    const tagline = this.add
      .text(
        cx,
        1560,
        'BRIGHTER SMILES, BRIGHTER DAYS',
        textStyle({ size: 32, color: COLORS.goldSoft, glow: 'rgba(255,150,40,0.7)' }),
      )
      .setOrigin(0.5);
    popIn(this, tagline, 1000, 0.85);

    this.time.delayedCall(1500, () => {
      bump(this, pct, 1.1, 140);
      audio.playSfx('sfx-result');
      if (won) sparkBurst(this, cx, 900, 20, 420);
    });
  }

  private addMolecules(): void {
    for (const [x, y, size, delay] of MOLECULES) {
      addGlow(this, x, y, size * 2.2, 0.5);
      const molecule = this.add.image(x, y, 'capsule').setDisplaySize(size, size);
      float(this, molecule, 16, 2000, delay);
    }
  }

  /** HOME (icon only) on the left and PLAY AGAIN on the right, side by side at the bottom. */
  private addBottomButtons(): void {
    const y = 1740;
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

  /** Store the play locally (the sync service sends it on). No personal data is kept. */
  private async save(): Promise<void> {
    const { repo } = getServices();
    const play: PlayRecord = {
      id: newId(),
      timestamp: new Date().toISOString(),
      deviceId: env.deviceId,
      score: this.result.score,
      meterPct: this.result.meterPct,
      pops: this.result.pops,
      misses: this.result.misses,
      durationSec: this.result.durationSec,
      gameVersion: env.gameVersion,
      syncStatus: 'pending',
    };
    await repo.add(play);
  }
}
