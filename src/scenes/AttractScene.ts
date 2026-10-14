import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';
import { createButton } from '@/ui/button';
import { SceneKey } from './keys';

const ADMIN_HOTSPOT_SIZE = 220;
const ADMIN_HOLD_MS = 2000;

/** Looping idle screen that invites people to play. Everything else returns here when idle. */
export class AttractScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Attract);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .text(cx, 420, 'CATCH THE\nBRIGHTNESS', {
        fontFamily: 'sans-serif',
        fontSize: '120px',
        fontStyle: 'bold',
        align: 'center',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 620, 'Colgate Optic White Vitamin C', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#ffd9a0',
      })
      .setOrigin(0.5);

    this.addHero(cx);
    this.addAdminHotspot();

    const cta = createButton(this, cx, GAME_HEIGHT - 330, 'PLAY NOW', () => {
      // Fullscreen needs a user gesture, so request it from the first tap. Best effort.
      if (!this.scale.isFullscreen) {
        try {
          this.scale.startFullscreen();
        } catch {
          /* TV browser may refuse; ignore */
        }
      }
      this.scene.start(SceneKey.HowToPlay);
    });
    this.tweens.add({ targets: cta, scale: 1.06, yoyo: true, repeat: -1, duration: 700 });
  }

  /** Invisible top-left corner: press and hold for 2 s to open the operator screen. */
  private addAdminHotspot(): void {
    let timer: Phaser.Time.TimerEvent | undefined;
    const cancel = (): void => {
      timer?.remove(false);
      timer = undefined;
    };
    this.add
      .zone(0, 0, ADMIN_HOTSPOT_SIZE, ADMIN_HOTSPOT_SIZE)
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => {
        cancel();
        timer = this.time.delayedCall(ADMIN_HOLD_MS, () => {
          this.scene.start(SceneKey.Admin);
        });
      })
      .on('pointerup', cancel)
      .on('pointerout', cancel);
  }

  /** Hero: tube with a slow glow behind it and capsules floating around it. */
  private addHero(cx: number): void {
    const cy = 1050;
    const flare = this.add
      .image(cx, cy, 'flare')
      .setDisplaySize(1100, 1100)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.6);
    this.tweens.add({ targets: flare, angle: 360, duration: 24_000, repeat: -1 });

    this.add.image(cx, cy, 'tube').setDisplaySize(250, 700);

    const capsules = [
      { x: cx - 330, y: cy - 200, size: 170, delay: 0 },
      { x: cx + 340, y: cy - 60, size: 130, delay: 500 },
      { x: cx - 300, y: cy + 230, size: 120, delay: 1000 },
      { x: cx + 290, y: cy + 300, size: 190, delay: 1500 },
    ];
    for (const c of capsules) {
      const img = this.add.image(c.x, c.y, 'capsule').setDisplaySize(c.size, c.size);
      this.tweens.add({
        targets: img,
        y: c.y - 40,
        yoyo: true,
        repeat: -1,
        duration: 1800,
        delay: c.delay,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
