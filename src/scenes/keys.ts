export const SceneKey = {
  Boot: 'Boot',
  Preload: 'Preload',
  Attract: 'Attract',
  HowToPlay: 'HowToPlay',
  Gameplay: 'Gameplay',
  Result: 'Result',
} as const;

export type SceneKey = (typeof SceneKey)[keyof typeof SceneKey];

/**
 * Screens that react to the idle timeout (go back to Attract, or run their own `onIdle`).
 * Gameplay is excluded on purpose: a round always ends by itself, and cutting it short
 * would lose the player's result.
 */
export const IDLE_RESET_SCENES: readonly SceneKey[] = [SceneKey.HowToPlay, SceneKey.Result];
