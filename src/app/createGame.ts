import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, IDLE_TIMEOUT_MS } from '@/config/game';
import { scenes } from '@/scenes';
import { IDLE_RESET_SCENES, SceneKey } from '@/scenes/keys';
import { IdleWatcher } from '@/services/idle/idleWatcher';

export function createGame(parent: string): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#c8102e',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    physics: { default: 'arcade' },
    input: { activePointers: 1 },
    disableContextMenu: true,
    scene: scenes,
  });

  // Booth-proofing: a lost WebGL context (weak TV GPU, driver reset) leaves a dead white screen
  // forever, so reload the page; the service worker serves it instantly even when offline.
  game.events.once(Phaser.Core.Events.READY, () => {
    game.canvas.addEventListener('webglcontextlost', () => {
      setTimeout(() => {
        location.reload();
      }, 1000);
    });
  });

  // Booth-proofing: waiting screens return to attract after a period of no touch.
  new IdleWatcher(IDLE_TIMEOUT_MS, () => {
    const current = game.scene.getScenes(true)[0];
    if (current && IDLE_RESET_SCENES.includes(current.scene.key as SceneKey)) {
      current.scene.start(SceneKey.Attract);
    }
  }).start();

  return game;
}
