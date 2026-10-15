/** Below this frame rate the screen is struggling. */
export const LOW_FPS = 38;

/** How many checks in a row must be slow before switching to the lighter look. */
export const LOW_FPS_STREAK = 5;

/**
 * Track consecutive slow frame-rate readings. A reading of 0 means the loop has not started or
 * the tab is hidden, so it neither counts as slow nor as healthy.
 */
export function updateLowFpsStreak(streak: number, fps: number, threshold = LOW_FPS): number {
  if (fps <= 0) return streak;
  return fps < threshold ? streak + 1 : 0;
}

/** Reduce an effect count (sparkles, confetti) when running in the lighter mode. */
export function scaleEffectCount(count: number, low: boolean): number {
  return low ? Math.max(1, Math.ceil(count / 3)) : count;
}
