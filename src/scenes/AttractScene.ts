import Phaser from 'phaser';
import { audio } from '@/audio';
import { GAME_WIDTH } from '@/config/game';
import { addArt } from '@/ui/art/canvas';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader, addSparkles } from '@/ui/effects';
import { fadeIn, float, popIn } from '@/ui/motion';
import { SceneKey } from './keys';

const ADMIN_HOTSPOT_SIZE = 220;
const ADMIN_HOLD_MS = 2000;

/*
 * Vertical layout (1080x1920), top to bottom, nothing shares a row:
 *   0-250     Colgate tab            235-425   Optic White lockup
 *   435-1055  ring + title           1030-1650 tube (left) and the big "C" (right)
 *   1660-1830 PLAY NOW
 */
const RING_Y = 745;
const RING_SIZE = 620;
const HERO_Y = 1340;

/** Looping idle screen that invites people to play. Everything else returns here when idle. */
export class AttractScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Attract);
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    fadeIn(this);
    audio.playMusic('bgm-attract');
    addBackground(this);
    addSparkles(this, 14, { x: 60, y: 440, width: 960, height: 1200 });
    this.addHero();
    addHeader(this);
    this.addTitle(cx);
    this.addAdminHotspot();

    // Warm halo that breathes behind the call to action.
    const halo = addGlow(this, cx, 1745, 1000, 0.25);
    this.tweens.add({
      targets: halo,
      alpha: 0.6,
      yoyo: true,
      repeat: -1,
      duration: 1100,
      ease: 'Sine.easeInOut',
    });
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
      {
        width: 760,
        height: 170,
        fontSize: 68,
        icon: 'ico-play-red',
        variant: 'gold',
        sound: 'sfx-ui-start',
      },
    );
    this.tweens.add({ targets: cta, scale: 1.04, yoyo: true, repeat: -1, duration: 800 });
  }

  /** Gold ring (slowly turning) with the game title popping in inside it. */
  private addTitle(cx: number): void {
    const ring = addArt(this, cx, RING_Y, 'ring').setDisplaySize(RING_SIZE, RING_SIZE);
    this.tweens.add({ targets: ring, angle: 360, duration: 40_000, repeat: -1 });

    const title = addArt(this, cx, RING_Y, 'title-game').setAngle(-4);
    title.setScale(title.scale * 0.82);
    popIn(this, title, 150, 0.5);
    this.time.delayedCall(150, () => audio.playSfx('sfx-pop'));
    this.time.delayedCall(900, () => {
      this.tweens.add({
        targets: title,
        scale: title.scale * 1.03,
        yoyo: true,
        repeat: -1,
        duration: 1700,
        ease: 'Sine.easeInOut',
      });
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
  private addHero(): void {
    const tubeX = 390;
    const cX = 735;
    const flare = this.add
      .image(GAME_WIDTH / 2, HERO_Y, 'flare')
      .setDisplaySize(1100, 1100)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);
    this.tweens.add({ targets: flare, angle: 360, duration: 26_000, repeat: -1 });

    // Big "C" with orbiting light trails.
    addGlow(this, cX, HERO_Y - 5, 700, 0.6);
    const orbit = addArt(this, cX, HERO_Y - 5, 'c-orbit').setDisplaySize(600, 600);
    this.tweens.add({ targets: orbit, angle: 360, duration: 18_000, repeat: -1 });
    const letter = addArt(this, cX, HERO_Y - 5, 'big-c').setDisplaySize(380, 380);
    this.tweens.add({
      targets: letter,
      scale: letter.scale * 1.05,
      yoyo: true,
      repeat: -1,
      duration: 1700,
      ease: 'Sine.easeInOut',
    });

    // The Vitamin C dropper from the key visual, tip pointing down into the ring.
    const dropperGlow = addGlow(this, 935, 560, 440, 0.45);
    const dropper = this.add.image(935, 560, 'dropper').setDisplaySize(250, 267).setAngle(4);
    float(this, [dropper, dropperGlow], 14, 2600, 300);

    const tube = this.add.image(tubeX, HERO_Y, 'tube').setDisplaySize(222, 620);
    float(this, tube, 12, 2400);

    const capsules = [
      { x: 115, y: 610, size: 130, delay: 0 },
      { x: 990, y: 890, size: 110, delay: 500 },
      { x: 100, y: 1230, size: 110, delay: 1000 },
      { x: 990, y: 1010, size: 120, delay: 1500 },
      { x: 920, y: 1585, size: 100, delay: 700 },
      { x: 610, y: 1600, size: 90, delay: 300 },
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
      this.tweens.add({ targets: img, angle: 360, duration: 16_000, repeat: -1 });
    }
  }
}
