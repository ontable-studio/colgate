import type { BubbleSize, GameRules } from '@/config/game';

export interface BubbleBody {
  readonly x: number;
  readonly y: number;
  readonly size: BubbleSize;
}

const SIZES: readonly BubbleSize[] = ['small', 'medium', 'large'];

/** Pick a size by weight. `roll` is a random number in [0, 1). */
export function pickSize(bubbles: GameRules['bubbles'], roll: number): BubbleSize {
  const total = SIZES.reduce((sum, size) => sum + bubbles[size].weight, 0);
  let left = roll * total;
  for (const size of SIZES) {
    left -= bubbles[size].weight;
    if (left < 0) return size;
  }
  return 'large';
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
  let best = -1;
  let bestDistance = Infinity;
  bubbles.forEach((bubble, index) => {
    const radius = (rules.bubbles[bubble.size].diameter / 2) * (1 + rules.tapForgiveness);
    const distance = Math.hypot(bubble.x - x, bubble.y - y);
    if (distance <= radius && distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}
