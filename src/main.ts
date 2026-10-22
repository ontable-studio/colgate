import './style.css';
import { createGame } from '@/app/createGame';
import { initUpdates } from '@/app/updates';
import {
  installCrashGuard,
  installFpsMonitor,
  installFrameWatchdog,
  reloadIfAllowed,
} from '@/app/watchdog';
import { SceneKey } from '@/scenes/keys';

// Any uncaught error reloads the booth back to the attract screen (rate limited).
installCrashGuard();

async function bootstrap(): Promise<void> {
  // Canvas-drawn art uses the brand font, so it must be loaded before any texture is generated.
  await Promise.all([
    document.fonts.load('300 48px "Colgate Ready"'),
    document.fonts.load('700 48px "Colgate Ready"'),
    document.fonts.load('italic 700 48px "Colgate Ready"'),
  ]);
  const game = createGame('game');
  installFrameWatchdog(game);
  installFpsMonitor(game);
  // Offline support + auto-update that only applies while the attract screen is showing.
  initUpdates(() => game.scene.isActive(SceneKey.Attract));
}

bootstrap().catch((error: unknown) => reloadIfAllowed(`boot failed: ${String(error)}`));
