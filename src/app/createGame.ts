import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, IDLE_TIMEOUT_MS } from '@/config/game';
import { scenes } from '@/scenes';
import { isIdleAware } from '@/scenes/idleAware';
import { IDLE_RESET_SCENES, SceneKey } from '@/scenes/keys';
import { IdleWatcher } from '@/services/idle/idleWatcher';
import { reloadIfAllowed } from './watchdog';

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

  // Dev only: lets the browser console jump to any scene (e.g. __game.scene.start('Result', ...)).
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;

  // Booth-proofing: a lost WebGL context (weak TV GPU, driver reset) leaves a dead white screen
  // forever, so reload the page; the service worker serves it instantly even when offline.
  game.events.once(Phaser.Core.Events.READY, () => {
    game.canvas.addEventListener('webglcontextlost', () => {
      reloadIfAllowed('WebGL context lost');
    });
  });

  // Booth-proofing: waiting screens return to attract after a period of no touch.
  new IdleWatcher(IDLE_TIMEOUT_MS, () => {
    const current = game.scene.getScenes(true)[0];
    if (!current || !IDLE_RESET_SCENES.includes(current.scene.key as SceneKey)) return;
    if (isIdleAware(current)) current.onIdle();
    else current.scene.start(SceneKey.Attract);
  }).start();

  return game;
}
