import Phaser from 'phaser';
import { audio } from '@/audio';
import { GAME_WIDTH } from '@/config/game';
import { addArt } from '@/ui/art/canvas';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader } from '@/ui/effects';
import { fadeIn, popIn, riseIn } from '@/ui/motion';
import { SceneKey } from './keys';

/*
 * Vertical layout (1080x1920), everything centred:
 *   0-190     Colgate tab            235-425   Optic White lockup
 *   520-740   title "95% VITAMIN C BLAST", then a clear gap
 *   760-1630  the tube, clear of the START button (top edge ~1660)
 */
const CX = GAME_WIDTH / 2;
const TITLE_Y = 550;
/** The tube artwork is 511x1400; it is drawn at this height (so about 317 px wide). */
const TUBE_TOP = 760;
const TUBE_HEIGHT = 870;
const TUBE_CENTER_Y = TUBE_TOP + TUBE_HEIGHT / 2;
const BUTTON_Y = 1745;

/** Entrance order (ms): the tube, the title, the button. */
const ENTER = {
  tube: 550,
  title: 1000,
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
    this.addHero();
    addHeader(this);
    this.addTitle();

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
    // The button rises last (in front of the tube), then keeps pulsing.
    cta.setDepth(5);
    riseIn(this, cta, 160, ENTER.cta, 600);
    this.time.delayedCall(ENTER.cta + 700, () => {
      this.tweens.add({ targets: cta, scale: 1.04, yoyo: true, repeat: -1, duration: 800 });
    });
    this.time.delayedCall(ENTER.cta, () => audio.playSfx('sfx-pop'));
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

  /** Hero: the tube with a warm glow behind it. */
  private addHero(): void {
    const glow = addGlow(this, CX, TUBE_CENTER_Y, 760, 0);
    this.tweens.add({ targets: glow, alpha: 0.6, delay: ENTER.tube + 300, duration: 800 });
    const tube = this.add.image(CX, TUBE_CENTER_Y, 'tube').setDepth(2);
    tube.setScale(TUBE_HEIGHT / tube.height);
    // The product rises up into place.
    riseIn(this, tube, 420, ENTER.tube, 800, 'Cubic.easeOut');
    this.time.delayedCall(ENTER.tube, () => audio.playSfx('sfx-whoosh'));
  }
}
