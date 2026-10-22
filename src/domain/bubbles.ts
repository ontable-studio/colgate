import type { BubbleSize, GameRules } from '@/config/game';

export interface BubbleBody {
  readonly x: number;
  readonly y: number;
  readonly size: BubbleSize;
}

const SIZES: readonly BubbleSize[] = ['small', 'medium', 'large'];

/**
 * Pick a size by weight. `roll` is a random number in [0, 1). `shift` (0..1, see `weightShift`)
 * moves the weights from `weight` to `lateWeight`.
 */
export function pickSize(bubbles: GameRules['bubbles'], roll: number, shift = 0): BubbleSize {
  const weightOf = (size: BubbleSize): number => {
    const { weight, lateWeight } = bubbles[size];
    return weight + (lateWeight - weight) * shift;
  };
  const total = SIZES.reduce((sum, size) => sum + weightOf(size), 0);
  let left = roll * total;
  for (const size of SIZES) {
    left -= weightOf(size);
    if (left < 0) return size;
  }
  return 'large';
}

/**
 * How long a molecule spawned now lives. Normal until the last `rush.lastSec` seconds, then it
 * shrinks evenly down to `rush.minLifetimeMs` when the round ends.
 */
export function lifetimeFor(rules: GameRules, remainingMs: number): number {
  const { lifetimeMs } = rules.spawn;
  const progress = rushProgress(rules, remainingMs);
  return lifetimeMs + (rules.rush.minLifetimeMs - lifetimeMs) * progress;
}

/** Multiplier on the drift speed of every molecule: 1 until the final stretch, then rising evenly. */
export function speedFactorFor(rules: GameRules, remainingMs: number): number {
  return 1 + (rules.rush.maxSpeedFactor - 1) * rushProgress(rules, remainingMs);
}

/** 0 until `weightShiftFromSec` seconds into the round, then rising evenly to 1 when time is up. */
export function weightShift(rules: GameRules, remainingMs: number): number {
  const fromMs = rules.weightShiftFromSec * 1000;
  const leftMs = rules.durationSec * 1000 - fromMs;
  const elapsedMs = rules.durationSec * 1000 - remainingMs;
  return Math.min(1, Math.max(0, (elapsedMs - fromMs) / leftMs));
}

/** Time to wait before the next molecule: short at first, longer and longer in the final stretch. */
export function spawnIntervalFor(rules: GameRules, remainingMs: number): number {
  const { intervalMs } = rules.spawn;
  return intervalMs + (rules.rush.maxIntervalMs - intervalMs) * rushProgress(rules, remainingMs);
}

/** 0 until the final `rush.lastSec` seconds, then rising evenly to 1 when the round ends. */
function rushProgress(rules: GameRules, remainingMs: number): number {
  const rushMs = rules.rush.lastSec * 1000;
  if (remainingMs >= rushMs) return 0;
  return 1 - Math.max(0, remainingMs) / rushMs;
}

/**
 * The molecule a tap at (x, y) pops, if any: the one whose centre is nearest, among those the tap
 * lands on (a little outside the edge still counts, so a small molecule is not unfair).
 */
export function findTapped(
  bubbles: readonly BubbleBody[],
  rules: GameRules,
  x: number,
  y: number,
): number {
  return nearestWithin(bubbles, rules, x, y, rules.tapForgiveness);
}

/**
 * The molecule a tap at (x, y) missed but was shot at: the nearest one whose shooting range
 * (see `GameRules.missRange`) holds the tap. Call it only after `findTapped` found nothing.
 */
export function findMissed(
  bubbles: readonly BubbleBody[],
  rules: GameRules,
  x: number,
  y: number,
): number {
  return nearestWithin(bubbles, rules, x, y, rules.missRange);
}

function nearestWithin(
  bubbles: readonly BubbleBody[],
  rules: GameRules,
  x: number,
  y: number,
  reach: number,
): number {
  let best = -1;
  let bestDistance = Infinity;
  bubbles.forEach((bubble, index) => {
    const radius = (rules.bubbles[bubble.size].diameter / 2) * (1 + reach);
    const distance = Math.hypot(bubble.x - x, bubble.y - y);
    if (distance <= radius && distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}
