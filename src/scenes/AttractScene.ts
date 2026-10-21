import Phaser from 'phaser';
import { audio } from '@/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';
import { addArt } from '@/ui/art/canvas';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader } from '@/ui/effects';
import { fadeIn, float, popIn, riseIn } from '@/ui/motion';
import { SceneKey } from './keys';

const ADMIN_HOTSPOT_SIZE = 220;
const ADMIN_HOLD_MS = 2000;

/*
 * Vertical layout (1080x1920), everything centred:
 *   0-190     Colgate tab            235-425   Optic White lockup
 *   520-740   title "95% VITAMIN C BLAST", then a clear gap
 *   780-1540  the smaller "C" (gap facing right), the tube in front of it
 *   900-1920  packshot: the tube on its glossy podium, START in front of it
 */
const CX = GAME_WIDTH / 2;
const RING_Y = 1180;
const RING_SIZE = 760;
const TITLE_Y = 620;
/**
 * The packshot (tube standing on the podium, 1520x1416) is drawn at this scale, its bottom edge on
 * the bottom of the screen. The tube is 394 px wide and 1030 px tall in the file, so it stands
 * about 740 px tall on screen.
 */
const PACK_SCALE = 0.72;
const PACK_Y = GAME_HEIGHT - (1416 * PACK_SCALE) / 2;
const TUBE_TOP = GAME_HEIGHT - 1416 * PACK_SCALE;
const TUBE_HEIGHT = 1030 * PACK_SCALE;
const TUBE_HALF_WIDTH = (394 / 2) * PACK_SCALE;
const BUTTON_Y = 1745;

/** Entrance order (ms): the C, the tube, the title, the badge, the button. */
const ENTER = {
  ring: 300,
  tube: 550,
  title: 1000,
  badge: 1450,
  cta: 1650,
};

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
    this.addRing();
    this.addHero();
    addHeader(this);
    this.addTitle();
    this.addBadge();
    this.addAdminHotspot();

    // Warm halo that breathes behind the call to action.
    const halo = addGlow(this, cx, BUTTON_Y, 1000, 0.25).setDepth(4);
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
      BUTTON_Y,
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
    // The button rises last (in front of the podium), then keeps pulsing.
    cta.setDepth(5);
    riseIn(this, cta, 160, ENTER.cta, 600);
    this.time.delayedCall(ENTER.cta + 700, () => {
      this.tweens.add({ targets: cta, scale: 1.04, yoyo: true, repeat: -1, duration: 800 });
    });
    this.time.delayedCall(ENTER.cta, () => audio.playSfx('sfx-pop'));
  }

  /** Gold "C" (an open ring, gap facing right), floating gently. Drawn before the tube so it stands in front. */
  private addRing(): void {
    const ring = addArt(this, CX, RING_Y, 'ring').setDisplaySize(RING_SIZE, RING_SIZE);
    // The C swings in (a little turn plus a pop), then floats.
    popIn(this, ring, ENTER.ring, 0.55);
    ring.setAngle(-40);
    this.tweens.add({
      targets: ring,
      angle: 0,
      duration: 900,
      delay: ENTER.ring,
      ease: 'Cubic.easeOut',
    });
    this.time.delayedCall(ENTER.ring + 900, () => float(this, ring, 14, 3000));
  }

  /** The game title popping in inside the ring. */
  private addTitle(): void {
    const title = addArt(this, CX, TITLE_Y, 'title-game').setAngle(-4);
    title.setScale(title.scale * 0.88);
    popIn(this, title, ENTER.title, 0.5);
    this.time.delayedCall(ENTER.title, () => audio.playSfx('sfx-pop'));
    this.time.delayedCall(ENTER.title + 800, () => {
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

  /** Hero: the packshot (tube on its podium) in front of the "C", with a warm glow behind the tube. */
  private addHero(): void {
    const glow = addGlow(this, CX, TUBE_TOP + TUBE_HEIGHT / 2, 760, 0);
    this.tweens.add({ targets: glow, alpha: 0.6, delay: ENTER.tube + 300, duration: 800 });
    const pack = this.add.image(CX, PACK_Y, 'packshot').setScale(PACK_SCALE).setDepth(2);
    // The product rises up into place.
    // No overshoot: the podium must never dip below the bottom edge of the screen.
    riseIn(this, pack, 420, ENTER.tube, 800, 'Cubic.easeOut');
    this.time.delayedCall(ENTER.tube, () => audio.playSfx('sfx-whoosh'));
  }

  /** The orange "BARU" tag beside the top of the tube pops on with a small wobble. */
  private addBadge(): void {
    // Its flat left end tucks behind the tube's edge.
    const x = CX + TUBE_HALF_WIDTH + 82 - 30;
    const y = TUBE_TOP + 64;
    const badge = addArt(this, x, y, 'badge-baru').setDepth(1);
    popIn(this, badge, ENTER.badge, 0.3);
    this.tweens.add({
      targets: badge,
      angle: { from: -14, to: 0 },
      duration: 700,
      delay: ENTER.badge,
      ease: 'Back.easeOut',
    });
  }
}
