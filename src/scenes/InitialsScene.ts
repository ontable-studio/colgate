import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';
import {
  appendInitial,
  finalizeInitials,
  MAX_INITIALS,
  removeLastInitial,
} from '@/domain/initials';
import type { SessionResult } from '@/domain/session';
import { createButton } from '@/ui/button';
import { createKeyboard } from '@/ui/keyboard';
import type { GameResultData, ResultSceneData } from './data';
import type { IdleAware } from './idleAware';
import { SceneKey } from './keys';

/** Asks for the player's initials on an on-screen keyboard, then goes to the result screen. */
export class InitialsScene extends Phaser.Scene implements IdleAware {
  private result!: SessionResult;
  private initials = '';
  private submitted = false;
  private slots: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(SceneKey.Initials);
  }

  init(data: GameResultData): void {
    this.result = data.result;
    this.initials = '';
    this.submitted = false;
    this.slots = [];
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const style = { fontFamily: 'sans-serif', color: '#ffffff', align: 'center' };

    this.add.text(cx, 200, 'YOUR SCORE', { ...style, fontSize: '64px' }).setOrigin(0.5);
    this.add
      .text(cx, 340, String(this.result.score), { ...style, fontSize: '200px', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add.text(cx, 560, 'ENTER YOUR INITIALS', { ...style, fontSize: '50px' }).setOrigin(0.5);

    const boxSize = 200;
    const gap = 60;
    const left = cx - ((MAX_INITIALS - 1) * (boxSize + gap)) / 2;
    for (let i = 0; i < MAX_INITIALS; i++) {
      const x = left + i * (boxSize + gap);
      this.add.rectangle(x, 730, boxSize, boxSize, 0xffffff, 0.12).setStrokeStyle(6, 0xffffff);
      this.slots.push(this.add.text(x, 730, '', { ...style, fontSize: '130px' }).setOrigin(0.5));
    }
    this.refresh();

    createKeyboard(this, cx, 960, {
      onLetter: (letter) => {
        this.initials = appendInitial(this.initials, letter);
        this.refresh();
      },
      onBackspace: () => {
        this.initials = removeLastInitial(this.initials);
        this.refresh();
      },
    });

    createButton(this, cx, GAME_HEIGHT - 180, 'SAVE', () => this.submit(), {
      width: 600,
      height: 150,
    });
  }

  /** Idle: do not lose the play, save with whatever was typed (or the placeholder). */
  onIdle(): void {
    this.submit();
  }

  private refresh(): void {
    this.slots.forEach((slot, i) => slot.setText(this.initials[i] ?? '_'));
  }

  private submit(): void {
    if (this.submitted) return;
    this.submitted = true;
    this.scene.start(SceneKey.Result, {
      result: this.result,
      initials: finalizeInitials(this.initials),
    } satisfies ResultSceneData);
  }
}
