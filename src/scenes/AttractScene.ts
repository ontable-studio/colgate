import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/game';
import { createButton } from '@/ui/button';
import { SceneKey } from './keys';

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
      .text(cx, 700, 'Colgate Optic White Vitamin C', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#ffd9a0',
      })
      .setOrigin(0.5);

    const cta = createButton(this, cx, GAME_HEIGHT - 500, 'PLAY NOW', () => {
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
}
