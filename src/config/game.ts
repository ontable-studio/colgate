/** Fixed design resolution (portrait). Phaser scales this to the real screen (FIT). */
export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

/** Back to the attract screen after this long without touch (any screen except attract). */
export const IDLE_TIMEOUT_MS = 30_000;

export type FallingKind = 'capsule' | 'stain' | 'decoy';

/** One keyframe of the difficulty curve; values are blended smoothly between keyframes. */
export interface Stage {
  /** Position in the round, 0 (start) to 1 (end of the time limit). */
  readonly at: number;
  /** Time between two falling objects. */
  readonly intervalMs: number;
  /** Fall speed in px/s. */
  readonly fallSpeed: number;
  /** Share (0..1) of objects that are hazards (stains and decoys). */
  readonly hazardShare: number;
}

export interface GameRules {
  readonly durationSec: number;
  /** Score change per kind (score never goes below 0). */
  readonly points: Readonly<Record<FallingKind, number>>;
  /** Brightness meter change (percentage points) per kind. Meter is clamped to 0..100. */
  readonly meter: Readonly<Record<FallingKind, number>>;
  /** Filling the meter early ends the round and pays this many points per second left. */
  readonly timeBonusPerSec: number;
  /** Capsules caught in a row multiply their points: the highest tier whose `streak` is reached
   *  applies. A stain, a decoy or a missed capsule breaks the streak. Sorted by `streak`. */
  readonly combo: readonly { readonly streak: number; readonly multiplier: number }[];
  readonly spawn: {
    /** Difficulty curve: starts gentle, ends brisk. Must be sorted by `at`. */
    readonly stages: readonly Stage[];
    /** Of all hazards, how many are stains (the rest are decoys). */
    readonly stainShareOfHazards: number;
    /** The first few objects are always capsules so nobody starts with a penalty. */
    readonly safeOpeningSpawns: number;
    /** Never more than this many hazards back to back. */
    readonly maxHazardsInRow: number;
    /** After this many capsules in a row a hazard is due, so the rhythm stays interesting. */
    readonly maxCapsulesInRow: number;
    /** How far (px per second) a player can realistically move the basket; limits how far apart
     *  two consecutive objects may land, so every object is reachable in order. */
    readonly lateralReach: number;
    /** Keep objects this far from the left and right edge. */
    readonly marginX: number;
  };
  readonly catching: {
    /** Y where the rim of the basket is; an object counts when its centre crosses it. */
    readonly lineY: number;
    /** Half the width of the basket opening. */
    readonly basketHalfWidth: number;
    /** Capsules count even when this share of their radius hangs outside the opening. */
    readonly capsuleForgiveness: number;
    /** Hazards only count when they are this share of their radius INSIDE the opening (negative
     *  = near misses pass by), so a hit never feels unfair. */
    readonly hazardForgiveness: number;
    /** Fastest the basket slides toward the finger (px/s). Keeps a tap from teleporting it; must
     *  not be below `spawn.lateralReach`, the speed every object is guaranteed reachable at. */
    readonly basketSpeed: number;
  };
}

/** On-screen size (px) of each falling object; textures differ in resolution. */
export const OBJECT_SIZE: Readonly<Record<FallingKind, number>> = {
  capsule: 150,
  decoy: 150,
  stain: 175,
};

/**
 * TODO(client): every number here is an ASSUMPTION until the client confirms
 * (see PLAN.md sections 5 and 11). Change here only, not in scene code.
 * `tests/domain/balance.test.ts` simulates players of every skill level against these numbers;
 * run it after changing anything.
 */
export const RULES: GameRules = {
  durationSec: 15,
  points: { capsule: 10, stain: -10, decoy: -5 },
  meter: { capsule: 11, stain: -9, decoy: -5 },
  timeBonusPerSec: 25,
  combo: [
    { streak: 2, multiplier: 2 },
    { streak: 4, multiplier: 3 },
    { streak: 6, multiplier: 4 },
    { streak: 8, multiplier: 5 },
  ],
  spawn: {
    stages: [
      { at: 0, intervalMs: 500, fallSpeed: 680, hazardShare: 0.3 },
      { at: 0.25, intervalMs: 430, fallSpeed: 780, hazardShare: 0.42 },
      { at: 0.6, intervalMs: 380, fallSpeed: 880, hazardShare: 0.5 },
      { at: 1, intervalMs: 340, fallSpeed: 980, hazardShare: 0.55 },
    ],
    stainShareOfHazards: 0.6,
    safeOpeningSpawns: 3,
    maxHazardsInRow: 2,
    maxCapsulesInRow: 4,
    lateralReach: 1000,
    marginX: 100,
  },
  catching: {
    lineY: 1400,
    basketHalfWidth: 141,
    capsuleForgiveness: 0.5,
    hazardForgiveness: -0.25,
    basketSpeed: 1400,
  },
};
