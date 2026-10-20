import Phaser from 'phaser';
import { audio } from '@/audio';
import { getServices } from '@/app/container';
import { env } from '@/config/env';
import { quality } from '@/config/quality';
import { GAME_WIDTH } from '@/config/game';
import { playsToCsv } from '@/domain/csv';
import { createButton } from '@/ui/button';
import { addBackground } from '@/ui/effects';
import { textStyle } from '@/ui/theme';
import { downloadText } from '@/util/download';
import { SceneKey } from './keys';

const REFRESH_MS = 1500;
const RESET_CONFIRM_MS = 4000;

/** Hidden operator screen: sync status, manual sync, CSV export, data reset. */
export class AdminScene extends Phaser.Scene {
  private info!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private resetLabel!: Phaser.GameObjects.Text;
  private soundLabel!: Phaser.GameObjects.Text;
  private volumeLabel!: Phaser.GameObjects.Text;
  private resetArmed = false;

  constructor() {
    super(SceneKey.Admin);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.resetArmed = false;
    addBackground(this);

    this.add.text(cx, 130, 'ADMIN', textStyle({ size: 90 })).setOrigin(0.5);

    this.info = this.add
      .text(110, 240, '', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#ffffff',
        lineSpacing: 14,
      })
      .setOrigin(0, 0);

    this.message = this.add
      .text(cx, 880, '', { fontFamily: 'sans-serif', fontSize: '42px', color: '#ffd9a0' })
      .setOrigin(0.5);

    const button = (y: number, label: string, onClick: () => void) =>
      createButton(this, cx, y, label, onClick, { width: 720, height: 130, fontSize: 48 });

    button(990, 'SYNC NOW', () => void this.syncNow());
    button(1125, 'EXPORT CSV', () => void this.exportCsv());
    const reset = button(1260, 'RESET DATA', () => void this.resetData());
    this.resetLabel = reset.getAt<Phaser.GameObjects.Text>(1);
    const sound = button(1395, '', () => {
      audio.toggleMuted();
      this.updateSoundLabels();
      void this.refresh();
    });
    this.soundLabel = sound.getAt<Phaser.GameObjects.Text>(1).setOrigin(0.5).setX(0);
    const volume = button(1530, '', () => {
      audio.cycleVolume();
      audio.playSfx('sfx-catch'); // preview at the new level
      this.updateSoundLabels();
      void this.refresh();
    });
    this.volumeLabel = volume.getAt<Phaser.GameObjects.Text>(1).setOrigin(0.5).setX(0);
    this.updateSoundLabels();
    button(1690, 'BACK', () => {
      this.scene.start(SceneKey.Attract);
    });

    void this.refresh();
    this.time.addEvent({
      delay: REFRESH_MS,
      loop: true,
      callback: () => void this.refresh(),
    });
  }

  private async refresh(): Promise<void> {
    const { repo, sync } = getServices();
    const [total, pending, persisted] = await Promise.all([
      repo.count(),
      repo.pendingCount(),
      navigator.storage?.persisted?.() ?? Promise.resolve(false),
    ]);
    if (!this.scene.isActive()) return;

    const status = sync?.status;
    const rows: [string, string][] = [
      ['DEVICE', env.deviceId],
      ['VERSION', env.gameVersion],
      ['ONLINE', navigator.onLine ? 'yes' : 'no'],
      ['SYNC', sync ? 'on' : 'off (no endpoint)'],
      ['PLAYS', String(total)],
      ['STICKERS', `${total} (1 per play)`],
      ['PENDING', String(pending)],
      ['LAST SYNC', status?.lastSyncAt ? status.lastSyncAt.slice(0, 19).replace('T', ' ') : '-'],
      ['LAST ERROR', status?.lastError ? status.lastError.slice(0, 30) : '-'],
      ['STORAGE', persisted ? 'persistent' : 'best effort'],
      [
        'SOUND',
        audio.settings.muted ? 'muted' : `on, volume ${Math.round(audio.settings.volume * 100)}%`,
      ],
      ['QUALITY', quality.isLow ? 'low (light effects)' : 'normal'],
    ];
    this.info.setText(rows.map(([k, v]) => `${k.padEnd(11)}${v}`).join('\n'));
  }

  /** Buttons show the current state; pressing one changes it. */
  private updateSoundLabels(): void {
    const { muted, volume } = audio.settings;
    this.soundLabel.setText(muted ? 'SOUND: OFF' : 'SOUND: ON');
    this.volumeLabel.setText(`VOLUME ${Math.round(volume * 100)}%`);
  }

  private async syncNow(): Promise<void> {
    const { sync } = getServices();
    if (!sync) {
      this.say('Sync is off: no endpoint configured');
      return;
    }
    this.say('Syncing...');
    const sent = await sync.flush();
    const error = sync.status.lastError;
    this.say(error ? `Sync failed: ${error.slice(0, 40)}` : `Sync done, ${sent} sent`);
    await this.refresh();
  }

  private async exportCsv(): Promise<void> {
    const { repo } = getServices();
    const plays = await repo.all();
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    try {
      downloadText(`colgate-plays-${env.deviceId}-${stamp}.csv`, playsToCsv(plays));
      this.say(`Exported ${plays.length} plays`);
    } catch {
      this.say('Download blocked by this browser');
    }
  }

  /** Two taps within a few seconds: the first arms it, the second deletes everything. */
  private async resetData(): Promise<void> {
    if (!this.resetArmed) {
      this.resetArmed = true;
      this.resetLabel.setText('TAP AGAIN TO CONFIRM');
      this.time.delayedCall(RESET_CONFIRM_MS, () => {
        this.resetArmed = false;
        this.resetLabel.setText('RESET DATA');
      });
      return;
    }
    this.resetArmed = false;
    this.resetLabel.setText('RESET DATA');
    await getServices().repo.clear();
    this.say('All local data deleted');
    await this.refresh();
  }

  private say(text: string): void {
    this.message.setText(text);
  }
}
