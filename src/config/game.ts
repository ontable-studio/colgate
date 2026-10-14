/** Fixed design resolution (portrait). Phaser scales this to the real screen (FIT). */
export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

/** Back to the attract screen after this long without touch (any screen except attract). */
export const IDLE_TIMEOUT_MS = 30_000;

export type FallingKind = 'capsule' | 'stain' | 'decoy';

export interface GameRules {
  readonly durationSec: number;
  /** Score change per kind (score never goes below 0). */
  readonly points: Readonly<Record<FallingKind, number>>;
  /** Brightness meter change (percentage points) per kind. Meter is clamped to 0..100. */
  readonly meter: Readonly<Record<FallingKind, number>>;
  readonly spawn: {
    readonly intervalMs: number;
    readonly fallSpeed: number;
    /** Relative spawn weights. */
    readonly weights: Readonly<Record<FallingKind, number>>;
  };
}

/**
 * TODO(client): every number here is an ASSUMPTION until the client confirms
 * (see PLAN.md sections 5 and 11). Change here only, not in scene code.
 */
export const RULES: GameRules = {
  durationSec: 40,
  points: { capsule: 10, stain: -10, decoy: -5 },
  meter: { capsule: 5, stain: -5, decoy: -3 },
  spawn: {
    intervalMs: 700,
    fallSpeed: 600,
    weights: { capsule: 6, stain: 3, decoy: 2 },
  },
};
