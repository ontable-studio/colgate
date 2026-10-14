import type { FallingKind } from '@/config/game';

/** Weighted pick. `rand` is injectable (0 <= rand < 1) so it can be tested. */
export function pickKind(
  weights: Readonly<Record<FallingKind, number>>,
  rand: () => number = Math.random,
): FallingKind {
  const entries = Object.entries(weights) as [FallingKind, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;
  for (const [kind, weight] of entries) {
    roll -= weight;
    if (roll < 0) return kind;
  }
  return 'capsule';
}
