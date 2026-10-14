import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { initServices } from '@/app/container';
import { createGame } from '@/app/createGame';

// Offline support + silent auto-update (new build is picked up on next reload).
registerSW({ immediate: true });

async function bootstrap(): Promise<void> {
  await initServices();
  createGame('game');
}

void bootstrap();
