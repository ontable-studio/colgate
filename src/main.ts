import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { initServices } from '@/app/container';
import { createGame } from '@/app/createGame';

// Offline support + silent auto-update (new build is picked up on next reload).
registerSW({ immediate: true });

async function bootstrap(): Promise<void> {
  // Canvas-drawn art uses the brand font, so it must be loaded before any texture is generated.
  await Promise.all([
    document.fonts.load('300 48px "Colgate Ready"'),
    document.fonts.load('700 48px "Colgate Ready"'),
    document.fonts.load('italic 700 48px "Colgate Ready"'),
  ]);
  await initServices();
  createGame('game');
}

void bootstrap();
