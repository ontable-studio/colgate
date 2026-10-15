import type Phaser from 'phaser';
import { quality } from '@/config/quality';
import { LOW_FPS_STREAK, updateLowFpsStreak } from '@/domain/lowPower';
import { DEFAULT_RELOAD_POLICY, planReload } from '@/domain/reloadGuard';

const RELOAD_KEY = 'colgate.reloads';

/** Reload the page, unless it has already reloaded too often lately (avoids an endless loop). */
export function reloadIfAllowed(reason: string): void {
  let history: number[] = [];
  try {
    history = JSON.parse(sessionStorage.getItem(RELOAD_KEY) ?? '[]') as number[];
  } catch {
    /* start with an empty history */
  }
  const plan = planReload(history, Date.now());
  try {
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify(plan.history));
  } catch {
    /* storage unavailable */
  }
  if (plan.allowed) {
    console.error(`[watchdog] reloading: ${reason}`);
    setTimeout(() => location.reload(), 500);
  } else {
    console.error(`[watchdog] too many reloads, staying put: ${reason}`);
    showFatalMessage();
  }
}

/**
 * Last resort: tell staff something is wrong instead of leaving a blank or frozen screen, and try
 * again once the reload limit has expired so an unattended booth can recover on its own.
 */
export function showFatalMessage(): void {
  if (document.getElementById('fatal')) return;
  setTimeout(() => location.reload(), DEFAULT_RELOAD_POLICY.windowMs + 10_000);
  const box = document.createElement('div');
  box.id = 'fatal';
  box.textContent = 'Something went wrong. Please ask a staff member to restart the game.';
  box.style.cssText =
    'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:48px;' +
    'background:#6a0710;color:#fff;font:700 40px/1.3 sans-serif;text-align:center;z-index:99';
  document.body.appendChild(box);
}

/** Any uncaught error or rejected promise reloads the booth back to the attract screen. */
export function installCrashGuard(): void {
  window.addEventListener('error', (event) => {
    // Harmless browser notice that does not break anything.
    if (event.message.includes('ResizeObserver loop')) return;
    reloadIfAllowed(event.message || 'uncaught error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    reloadIfAllowed(`unhandled rejection: ${String(event.reason)}`);
  });
}

const FRAME_CHECK_MS = 5000;
const FRAME_STALL_CHECKS = 3;
const FPS_CHECK_MS = 2000;

/** Reload if the render loop stops advancing while the page is visible (frozen game). */
export function installFrameWatchdog(game: Phaser.Game): void {
  let lastFrame = game.getFrame();
  let stalled = 0;
  setInterval(() => {
    if (document.hidden) {
      stalled = 0;
      return;
    }
    const frame = game.getFrame();
    if (frame === lastFrame) {
      stalled += 1;
      if (stalled >= FRAME_STALL_CHECKS) {
        stalled = 0;
        reloadIfAllowed('render loop stalled');
      }
    } else {
      stalled = 0;
      lastFrame = frame;
    }
  }, FRAME_CHECK_MS);
}

/** Switch to the lighter look when the frame rate stays low for a while. */
export function installFpsMonitor(game: Phaser.Game): void {
  let streak = 0;
  setInterval(() => {
    if (quality.isLow || document.hidden) return;
    streak = updateLowFpsStreak(streak, game.loop.actualFps);
    if (streak >= LOW_FPS_STREAK) {
      quality.setLow(true);
      console.warn('[quality] low frame rate detected, switching to the lighter look');
    }
  }, FPS_CHECK_MS);
}
