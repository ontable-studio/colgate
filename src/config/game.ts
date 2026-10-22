/** Fixed design resolution (portrait). Phaser scales this to the real screen (FIT). */
export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

/** Back to the attract screen after this long without touch (any screen except attract). */
export const IDLE_TIMEOUT_MS = 30_000;

export type BubbleSize = 'small' | 'medium' | 'large';

export interface BubbleSpec {
  /** On-screen diameter (px). */
  readonly diameter: number;
  /** Points for popping it: the smaller the molecule, the harder to hit and the more it pays. */
  readonly points: number;
  /** Relative chance of spawning until `weightShiftFromSec`. */
  readonly weight: number;
  /** Relative chance of spawning at the end of the round; moves evenly from `weight` to this. */
  readonly lateWeight: number;
}

export interface GameRules {
  readonly durationSec: number;
  /** The spawn chances start moving from `weight` to `lateWeight` this many seconds in. */
  readonly weightShiftFromSec: number;
  /** Points needed to fill the toothbrush; shown as the percentage (95 pts = "95% Vitamin C"). */
  readonly targetPoints: number;
  readonly bubbles: Readonly<Record<BubbleSize, BubbleSpec>>;
  readonly spawn: {
    /** Never more than this many molecules on screen at once. */
    readonly maxOnScreen: number;
    /** Time between two new molecules while there is room (start of the round: a busy screen). */
    readonly intervalMs: number;
    /** A molecule that is not tapped fades away after this long. */
    readonly lifetimeMs: number;
    /** Slow drift speed (px/s) of a molecule. */
    readonly driftSpeed: number;
  };
  /**
   * Final stretch: molecules show up less often, live shorter and drift faster, all
   * changing evenly until the round ends.
   */
  readonly rush: {
    /** Starts this many seconds before the end of the round. */
    readonly lastSec: number;
    /** Lifetime of a molecule spawned right at the end of the round. */
    readonly minLifetimeMs: number;
    /** Drift speed multiplier when the round ends (1 = normal speed). */
    readonly maxSpeedFactor: number;
    /** Time between two new molecules when the round ends. */
    readonly maxIntervalMs: number;
  };
  /** Rectangle molecules float in (clear of the HUD at the top and the toothbrush at the left). */
  readonly area: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  /** A tap counts when it lands within this share of the radius beyond the molecule's edge. */
  readonly tapForgiveness: number;
  /**
   * Shooting range around a molecule, as a share of its radius beyond the edge. A tap that lands
   * in this ring but misses the molecule itself makes that molecule vanish (it got away).
   */
  readonly missRange: number;
}

/**
 * TODO(client): every number here is an ASSUMPTION until the client confirms
 * (see PLAN.md). Change here only, not in scene code.
 */
export const RULES: GameRules = {
  durationSec: 30,
  weightShiftFromSec: 10,
  targetPoints: 95,
  bubbles: {
    small: { diameter: 100, points: 3, weight: 4, lateWeight: 7 },
    medium: { diameter: 150, points: 2, weight: 3, lateWeight: 2 },
    large: { diameter: 210, points: 1, weight: 3, lateWeight: 1 },
  },
  spawn: { maxOnScreen: 7, intervalMs: 330, lifetimeMs: 2200, driftSpeed: 110 },
  rush: {
    lastSec: 15,
    minLifetimeMs: 1100,
    maxSpeedFactor: 2.5,
    maxIntervalMs: 500,
  },
  area: { left: 130, right: 950, top: 330, bottom: 1560 },
  tapForgiveness: 0.15,
  missRange: 1,
};
