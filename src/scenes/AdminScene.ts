import Phaser from 'phaser';
import { audio } from '@/audio';
import { getServices } from '@/app/container';
import { env } from '@/config/env';
import { GAME_WIDTH } from '@/config/game';
import { playsToCsv } from '@/domain/csv';
import type { PlayRecord } from '@/domain/play';
import { createButton } from '@/ui/button';
import { addBackground } from '@/ui/effects';
import { createPanel } from '@/ui/panel';
import { COLORS, textStyle } from '@/ui/theme';
import { downloadText } from '@/util/download';
import { SceneKey } from './keys';

const RESET_CONFIRM_MS = 4000;
const REFRESH_MS = 1500;

/*
 * Layout (1080x1920), top to bottom:
 *   volume | sound        the two audio buttons side by side
 *   DATA PEMAIN           header of the list
 *   list                  one row per play (time and score), newest first, scrolls
 *   status                last action / sync state
 *   total | save | reset  player count, save as CSV, reset (icons; reset needs a second tap)
 *   BACK HOME
 */
const MARGIN = 80;
const WIDTH = GAME_WIDTH - MARGIN * 2;
const GAP = 30;
const AUDIO_Y = 290;
const AUDIO_HEIGHT = 120;
const HEADER_Y = 470;
const HEADER_HEIGHT = 110;
const LIST_TOP = 540;
const LIST_HEIGHT = 790;
const LIST_INSET = 16;
const ROW_HEIGHT = 84;
const STATUS_Y = 1368;
const BOTTOM_Y = 1475;
const BOTTOM_HEIGHT = 130;
const SQUARE = 150;
const BACK_Y = 1690;

/** Hidden operator screen: audio, the list of plays, CSV save and data reset. */
export class AdminScene extends Phaser.Scene {
  private message!: Phaser.GameObjects.Text;
  private total!: Phaser.GameObjects.Text;
  private resetIcon!: Phaser.GameObjects.Image;
  private soundLabel!: Phaser.GameObjects.Text;
  private volumeLabel!: Phaser.GameObjects.Text;
  private rows!: Phaser.GameObjects.Container;
  private resetArmed = false;
  private messageBusy = false;
  private listKey = '';
  private scrollY = 0;
  private contentHeight = 0;

  constructor() {
    super(SceneKey.Admin);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.resetArmed = false;
    this.messageBusy = false;
    this.listKey = '';
    this.scrollY = 0;
    this.contentHeight = 0;
    addBackground(this);

    this.add.text(cx, 130, 'ADMIN', textStyle({ size: 90 })).setOrigin(0.5);

    this.addAudioButtons();

    createPanel(this, cx, HEADER_Y, WIDTH, HEADER_HEIGHT, 28, 'gold');
    this.add.text(cx, HEADER_Y, 'DATA PEMAIN', textStyle({ size: 46 })).setOrigin(0.5);
    this.addList();

    this.message = this.add
      .text(cx, STATUS_Y, '', textStyle({ size: 34, weight: 'light', color: COLORS.goldLight }))
      .setOrigin(0.5);
    this.addBottomRow();

    createButton(this, cx, BACK_Y, 'BACK HOME', () => this.scene.start(SceneKey.Attract), {
      width: WIDTH,
      height: 130,
      fontSize: 48,
      icon: 'ico-home',
    });

    void this.refresh();
    this.time.addEvent({ delay: REFRESH_MS, loop: true, callback: () => void this.refresh() });
  }

  /** Volume and sound side by side; each shows its current state and changes it when pressed. */
  private addAudioButtons(): void {
    const width = (WIDTH - GAP) / 2;
    const volume = createButton(
      this,
      MARGIN + width / 2,
      AUDIO_Y,
      '',
      () => {
        audio.cycleVolume();
        audio.playSfx('sfx-catch'); // preview at the new level
        this.updateAudioLabels();
      },
      { width, height: AUDIO_HEIGHT, fontSize: 44 },
    );
    this.volumeLabel = volume.getAt<Phaser.GameObjects.Text>(1).setOrigin(0.5).setX(0);
    const sound = createButton(
      this,
      MARGIN + width + GAP + width / 2,
      AUDIO_Y,
      '',
      () => {
        audio.toggleMuted();
        this.updateAudioLabels();
      },
      { width, height: AUDIO_HEIGHT, fontSize: 44 },
    );
    this.soundLabel = sound.getAt<Phaser.GameObjects.Text>(1).setOrigin(0.5).setX(0);
    this.updateAudioLabels();
  }

  private updateAudioLabels(): void {
    const { muted, volume } = audio.settings;
    this.volumeLabel.setText(`VOLUME ${Math.round(volume * 100)}%`);
    this.soundLabel.setText(muted ? 'SOUND: OFF' : 'SOUND: ON');
  }

  /** The scrolling list: a panel, rows clipped to it, drag or wheel to scroll. */
  private addList(): void {
    createPanel(this, GAME_WIDTH / 2, LIST_TOP + LIST_HEIGHT / 2, WIDTH, LIST_HEIGHT, 28, 'red');
    const viewTop = LIST_TOP + LIST_INSET;
    const viewHeight = LIST_HEIGHT - LIST_INSET * 2;

    this.rows = this.add.container(0, viewTop);
    const clip = this.make.graphics({}, false);
    clip.fillStyle(0xffffff, 1);
    clip.fillRect(MARGIN, viewTop, WIDTH, viewHeight);
    this.rows.setMask(clip.createGeometryMask());

    const scrollTo = (value: number): void => {
      const max = Math.max(0, this.contentHeight - viewHeight);
      this.scrollY = Phaser.Math.Clamp(value, 0, max);
      this.rows.setY(viewTop - this.scrollY);
    };

    const zone = this.add.zone(MARGIN, viewTop, WIDTH, viewHeight).setOrigin(0).setInteractive();
    let dragFrom: { y: number; scroll: number } | undefined;
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragFrom = { y: pointer.y, scroll: this.scrollY };
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (dragFrom && pointer.isDown) scrollTo(dragFrom.scroll - (pointer.y - dragFrom.y));
    });
    this.input.on('pointerup', () => {
      dragFrom = undefined;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      scrollTo(this.scrollY + dy);
    });
  }

  /** Player count, save (CSV) and reset (trash), both icon only, side by side. */
  private addBottomRow(): void {
    const totalWidth = WIDTH - SQUARE * 2 - GAP * 2;
    const totalX = MARGIN + totalWidth / 2;
    createPanel(this, totalX, BOTTOM_Y, totalWidth, BOTTOM_HEIGHT, 36, 'gold');
    this.total = this.add
      .text(totalX, BOTTOM_Y, 'TOTAL PEMAIN : 0', textStyle({ size: 42 }))
      .setOrigin(0.5);

    createButton(
      this,
      MARGIN + totalWidth + GAP + SQUARE / 2,
      BOTTOM_Y,
      '',
      () => void this.saveCsv(),
      { width: SQUARE, height: BOTTOM_HEIGHT, icon: 'ico-save' },
    );
    const reset = createButton(
      this,
      MARGIN + totalWidth + GAP * 2 + SQUARE * 1.5,
      BOTTOM_Y,
      '',
      () => void this.resetData(),
      { width: SQUARE, height: BOTTOM_HEIGHT, icon: 'ico-trash' },
    );
    this.resetIcon = reset.getAt<Phaser.GameObjects.Image>(1);
  }

  private async refresh(): Promise<void> {
    const { repo, sync } = getServices();
    const [plays, pending] = await Promise.all([repo.all(), repo.pendingCount()]);
    if (!this.scene.isActive()) return;

    this.total.setText(`TOTAL PEMAIN : ${plays.length}`);
    this.renderList(plays);
    // Idle state of the status line: sync health, unless an action message is showing.
    if (!this.messageBusy) {
      this.message.setText(sync ? `SYNC ON  |  PENDING ${pending}` : 'SYNC OFF (NO ENDPOINT)');
    }
  }

  /** Newest first; rebuilt only when the set of plays changed, so scrolling is not disturbed. */
  private renderList(plays: PlayRecord[]): void {
    const sorted = [...plays].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const key = `${sorted.length}:${sorted[0]?.id ?? ''}`;
    if (key === this.listKey) return;
    this.listKey = key;

    this.rows.removeAll(true);
    sorted.forEach((play, i) => {
      const y = i * ROW_HEIGHT;
      const mid = y + ROW_HEIGHT / 2 - 4;
      if (i % 2 === 0) {
        const band = this.add
          .rectangle(MARGIN + 20, y, WIDTH - 40, ROW_HEIGHT - 8, 0xffffff, 0.08)
          .setOrigin(0);
        this.rows.add(band);
      }
      const when = this.add
        .text(
          MARGIN + 44,
          mid,
          formatTime(play.timestamp),
          textStyle({ size: 38, weight: 'light' }),
        )
        .setOrigin(0, 0.5);
      const score = this.add
        .text(MARGIN + WIDTH - 44, mid, `${play.score} pts`, textStyle({ size: 40 }))
        .setOrigin(1, 0.5);
      this.rows.add([when, score]);
    });
    this.contentHeight = sorted.length * ROW_HEIGHT;
    if (sorted.length === 0) {
      const empty = this.add
        .text(
          GAME_WIDTH / 2,
          120,
          'Belum ada data pemain',
          textStyle({ size: 40, weight: 'light' }),
        )
        .setOrigin(0.5);
      this.rows.add(empty);
    }
  }

  private async saveCsv(): Promise<void> {
    const { repo } = getServices();
    const plays = await repo.all();
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    try {
      downloadText(`colgate-plays-${env.deviceId}-${stamp}.csv`, playsToCsv(plays));
      this.say(`Saved ${plays.length} plays to CSV`);
    } catch {
      this.say('Download blocked by this browser');
    }
  }

  /** Two taps within a few seconds: the first arms it, the second deletes everything. */
  private async resetData(): Promise<void> {
    if (!this.resetArmed) {
      this.resetArmed = true;
      this.resetIcon.setTint(0xffd36b);
      this.say('Tap the trash icon again to delete all data', RESET_CONFIRM_MS);
      this.time.delayedCall(RESET_CONFIRM_MS, () => {
        this.resetArmed = false;
        this.resetIcon.clearTint();
      });
      return;
    }
    this.resetArmed = false;
    this.resetIcon.clearTint();
    await getServices().repo.clear();
    this.say('All local data deleted');
    await this.refresh();
  }

  /** Show an action message for a while, then the status line takes over again. */
  private say(text: string, ms = 3000): void {
    this.message.setText(text);
    this.messageBusy = true;
    this.time.delayedCall(ms, () => {
      this.messageBusy = false;
      void this.refresh();
    });
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}  ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
