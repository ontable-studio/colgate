import Phaser from 'phaser';
import { GAME_WIDTH } from '@/config/game';
import { addArt } from '@/ui/art/canvas';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader, addSparkles } from '@/ui/effects';
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
    addBackground(this);
    addSparkles(this, 14, { x: 60, y: 420, width: 960, height: 1250 });
    this.addHero(cx);
    addHeader(this);
    this.addTitle(cx);
    this.addAdminHotspot();

    const cta = createButton(
      this,
      cx,
      1745,
      'PLAY NOW',
      () => {
        // Fullscreen needs a user gesture, so request it from the first tap. Best effort.
        if (!this.scale.isFullscreen) {
          try {
            this.scale.startFullscreen();
          } catch {
            /* TV browser may refuse; ignore */
          }
        }
        this.scene.start(SceneKey.HowToPlay);
      },
      { width: 760, height: 170, fontSize: 68, icon: 'ico-play-red', variant: 'gold' },
    );
    this.tweens.add({ targets: cta, scale: 1.04, yoyo: true, repeat: -1, duration: 800 });
  }

  /** Gold ring with the game title inside it. */
  private addTitle(cx: number): void {
    const ring = addArt(this, cx, 800, 'ring').setDisplaySize(760, 760);
    this.tweens.add({ targets: ring, alpha: 0.82, yoyo: true, repeat: -1, duration: 1800 });
    const title = addArt(this, cx, 800, 'title-game').setAngle(-4);
    this.tweens.add({
      targets: title,
      scale: title.scale * 1.025,
      yoyo: true,
      repeat: -1,
      duration: 1600,
      ease: 'Sine.easeInOut',
    });
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

  /** Hero: tube on the left, the glowing "C" of Vitamin C on the right, capsules floating around. */
  private addHero(cx: number): void {
    const cy = 1290;
    const tubeX = 390;
    const cX = 735;
    const flare = this.add
      .image(cx, cy, 'flare')
      .setDisplaySize(1150, 1150)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);
    this.tweens.add({ targets: flare, angle: 360, duration: 26_000, repeat: -1 });

    // Big "C" with orbiting light trails.
    addGlow(this, cX, cy - 20, 760, 0.6);
    const orbit = addArt(this, cX, cy - 20, 'c-orbit').setDisplaySize(620, 620);
    this.tweens.add({ targets: orbit, angle: 360, duration: 18_000, repeat: -1 });
    const letter = addArt(this, cX, cy - 20, 'big-c').setDisplaySize(400, 400);
    this.tweens.add({
      targets: letter,
      scale: letter.scale * 1.05,
      yoyo: true,
      repeat: -1,
      duration: 1700,
      ease: 'Sine.easeInOut',
    });

    this.add.image(tubeX, cy, 'tube').setDisplaySize(250, 700);

    const capsules = [
      { x: 135, y: 560, size: 150, delay: 0 },
      { x: 965, y: 640, size: 120, delay: 500 },
      { x: 110, y: 1190, size: 120, delay: 1000 },
      { x: 985, y: 1030, size: 140, delay: 1500 },
      { x: 905, y: 1560, size: 120, delay: 700 },
      { x: 560, y: 1560, size: 100, delay: 300 },
    ];
    for (const c of capsules) {
      const glow = addGlow(this, c.x, c.y, c.size * 2.4, 0.65);
      const img = this.add.image(c.x, c.y, 'capsule').setDisplaySize(c.size, c.size);
      this.tweens.add({
        targets: [img, glow],
        y: c.y - 36,
        yoyo: true,
        repeat: -1,
        duration: 1900,
        delay: c.delay,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
