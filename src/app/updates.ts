import { registerSW } from 'virtual:pwa-register';
import { UpdateController } from '@/domain/updateController';

/** A kiosk never navigates, so ask the browser for a new version on a timer. */
const UPDATE_CHECK_MS = 10 * 60_000;
/** How often to see whether a waiting update may be applied. */
const APPLY_TICK_MS = 15_000;

/**
 * Offline support plus safe auto-update. New versions are downloaded in the background but only
 * activated (which reloads the page) when `isIdle()` says nobody is playing.
 */
export function initUpdates(isIdle: () => boolean): void {
  // `updateSW` is only called after registration, so the closure may refer to it before it exists.
  const controller = new UpdateController(isIdle, () => {
    void updateSW(true);
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh: () => controller.markAvailable(),
    onRegisteredSW: (_url, registration) => {
      if (registration) {
        setInterval(() => {
          void registration.update();
        }, UPDATE_CHECK_MS);
      }
    },
  });
  setInterval(() => controller.tick(), APPLY_TICK_MS);
}
