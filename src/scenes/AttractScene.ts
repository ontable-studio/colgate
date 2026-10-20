import Phaser from 'phaser';
import { audio } from '@/audio';
import { GAME_WIDTH } from '@/config/game';
import { addArt } from '@/ui/art/canvas';
import { createButton } from '@/ui/button';
import { addBackground, addGlow, addHeader } from '@/ui/effects';
import { fadeIn, float, popIn } from '@/ui/motion';
import { textStyle } from '@/ui/theme';
import { SceneKey } from './keys';

const ADMIN_HOTSPOT_SIZE = 220;
const ADMIN_HOLD_MS = 2000;

/*
 * Vertical layout (1080x1920), everything centred:
 *   0-250     Colgate tab            235-425   Optic White lockup, claim just below it
 *   600-800   title "95% VITAMIN BLAST", then a clear gap
 *   780-1540  the smaller "C" (gap facing right), the tube in front of it
 *   1630-1900 glossy stage the tube stands on, PLAY NOW in front of it
 */
const CX = GAME_WIDTH / 2;
const RING_Y = 1180;
const RING_SIZE = 760;
const TITLE_Y = 668;
const TUBE_HEIGHT = 764;
const TUBE_WIDTH = 275;
/** Back corner of the stage; the tube's glass foot rests on it. */
const STAGE_Y = 1610;
const TUBE_Y = STAGE_Y - TUBE_HEIGHT / 2 + 14;
const CLAIM_Y = 490;
const BUTTON_Y = 1745;

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
    this.addStage();
    this.addRing();
    this.addHero();
    addHeader(this);
    this.addTitle();
    this.addClaim();
    this.addAdminHotspot();

    // Warm halo that breathes behind the call to action.
    const halo = addGlow(this, cx, BUTTON_Y, 1000, 0.25);
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
    this.tweens.add({ targets: cta, scale: 1.04, yoyo: true, repeat: -1, duration: 800 });
  }

  /** Gold "C" (an open ring, gap facing right), floating gently. Drawn before the tube so it stands in front. */
  private addRing(): void {
    const ring = addArt(this, CX, RING_Y, 'ring').setDisplaySize(RING_SIZE, RING_SIZE);
    float(this, ring, 14, 3000);
  }

  /** The game title popping in inside the ring. */
  private addTitle(): void {
    const title = addArt(this, CX, TITLE_Y, 'title-game').setAngle(-4);
    title.setScale(title.scale * 0.88);
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

  /** The product claim, centred just under the "Optic White Vitamin C" lockup. */
  private addClaim(): void {
    const claim = this.add
      .text(
        CX,
        CLAIM_Y,
        'MENGURANGI NODA 7 TAHUN\nHANYA DALAM 7 HARI*',
        textStyle({ size: 42, weight: 'light', lineSpacing: 8 }),
      )
      .setOrigin(0.5);
    popIn(this, claim, 500, 0.9);
  }

  /** The glossy stage (drawn in ui/art/stage.ts), its back corner under the tube. */
  private addStage(): void {
    addArt(this, CX, STAGE_Y, 'podium').setOrigin(0.5, 0);
  }

  /** Hero: the tube standing on the stage in front of the "C", with a warm glow behind it. */
  private addHero(): void {
    addGlow(this, CX, TUBE_Y, 760, 0.6);
    this.add.image(CX, TUBE_Y, 'tube').setDisplaySize(TUBE_WIDTH, TUBE_HEIGHT);
  }
}
