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
const RING_SIZE = 780;
const HERO_Y = 1260;
const TUBE_HEIGHT = 780;
const TUBE_WIDTH = 279;
/** How far the platform's back edge sits above the tube's foot. */
const STAGE_FOOT_OFFSET = 110;

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
    this.addRing(cx);
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
      'START',
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

  /** Gold "C" ring, floating gently (it does not turn). Drawn before the hero so the tube stands in front. */
  private addRing(cx: number): void {
    const ring = addArt(this, cx, RING_Y, 'ring').setDisplaySize(RING_SIZE, RING_SIZE);
    float(this, ring, 14, 3000);
  }

  /** The game title popping in inside the ring. */
  private addTitle(cx: number): void {
    const title = addArt(this, cx, RING_Y, 'title-game').setAngle(-4);
    title.setScale(title.scale * 0.95);
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

  /** Hero: the tube centred on its platform in front of the ring, capsules floating around. */
  private addHero(): void {
    const tubeX = GAME_WIDTH / 2;
    const cX = tubeX;
    // Glossy platform the tube stands on (its feet sit just below the platform's back edge).
    const tubeFootY = HERO_Y + TUBE_HEIGHT / 2;
    addArt(this, GAME_WIDTH / 2, tubeFootY - STAGE_FOOT_OFFSET, 'stage').setOrigin(0.5, 0);
    const flare = this.add
      .image(GAME_WIDTH / 2, HERO_Y, 'flare')
      .setDisplaySize(1100, 1100)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);
    this.tweens.add({ targets: flare, angle: 360, duration: 26_000, repeat: -1 });

    // Warm glow behind the tube.
    addGlow(this, cX, HERO_Y, 760, 0.6);

    // The Vitamin C dropper from the key visual, tip pointing down into the ring.
    const dropperGlow = addGlow(this, 885, 570, 600, 0.45);
    const dropper = this.add.image(885, 570, 'dropper').setDisplaySize(360, 384).setAngle(4);
    float(this, [dropper, dropperGlow], 14, 2600, 300);

    const tube = this.add.image(tubeX, HERO_Y, 'tube').setDisplaySize(TUBE_WIDTH, TUBE_HEIGHT);
    float(this, tube, 12, 2400);

    // Vitamin C molecules of different sizes, scattered so they fill the space around the ring and
    // tube without covering the title, tube, dropper or button. Smaller ones float less.
    const capsules = [
      { x: 110, y: 300, size: 70, delay: 200 },
      { x: 990, y: 330, size: 85, delay: 900 },
      { x: 85, y: 560, size: 135, delay: 0 },
      { x: 130, y: 830, size: 75, delay: 1300 },
      { x: 1000, y: 800, size: 110, delay: 500 },
      { x: 70, y: 1040, size: 105, delay: 700 },
      { x: 955, y: 1050, size: 70, delay: 1600 },
      { x: 185, y: 1260, size: 140, delay: 1000 },
      { x: 985, y: 1150, size: 95, delay: 300 },
      { x: 880, y: 1360, size: 60, delay: 1100 },
      { x: 960, y: 1440, size: 130, delay: 1500 },
      { x: 80, y: 1510, size: 85, delay: 600 },
      { x: 270, y: 1590, size: 58, delay: 1800 },
      { x: 900, y: 1595, size: 78, delay: 400 },
    ];
    for (const c of capsules) {
      const glow = addGlow(this, c.x, c.y, c.size * 2.4, 0.65);
      const img = this.add.image(c.x, c.y, 'capsule').setDisplaySize(c.size, c.size);
      this.tweens.add({
        targets: [img, glow],
        y: c.y - (18 + c.size * 0.25),
        yoyo: true,
        repeat: -1,
        duration: 1500 + c.size * 6,
        delay: c.delay,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({ targets: img, angle: 360, duration: 12_000 + c.size * 40, repeat: -1 });
    }
  }
}
