import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, IDLE_TIMEOUT_MS } from '@/config/game';
import { scenes } from '@/scenes';
import { isIdleAware } from '@/scenes/idleAware';
import { IDLE_RESET_SCENES, SceneKey } from '@/scenes/keys';
import { videoBackdrop } from '@/ui/videoBackground';
import { IdleWatcher } from '@/services/idle/idleWatcher';
import { reloadIfAllowed } from './watchdog';

/**
 * Phaser's additive blend is `src + dst * dstAlpha`. With the canvas now transparent (the video
 * shows through), every translucent pixel already drawn has dstAlpha < 1, so each glow's whole
 * rectangle, even its fully transparent corners, darkened what lay under it: black blocks around
 * the glowing molecules. Plain `src + dst` leaves untouched pixels untouched.
 */
function fixAdditiveBlend(game: Phaser.Game): void {
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  const gl = renderer.gl;
  const modes = renderer.blendModes as { func: number[] }[];
  const additive = modes[Phaser.BlendModes.ADD];
  if (additive) additive.func = [gl.ONE, gl.ONE];
}

export function createGame(parent: string): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    // Transparent so the looping video behind the canvas (ui/videoBackground.ts) shows through.
    transparent: true,
    render: { powerPreference: 'high-performance' },
    scale: {
      mode: Phaser.Scale.FIT,
      // Fullscreen the page container, not a wrapper Phaser would make around the canvas alone:
      // the video behind the canvas lives in the container and would otherwise vanish.
      fullscreenTarget: parent,
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
    videoBackdrop.attach(game.canvas);
    fixAdditiveBlend(game);
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
