import type { Stage } from '@/config/game';

/**
 * Difficulty at a point in the round: the two surrounding keyframes blended linearly, so the pace
 * rises smoothly instead of jumping. `fraction` is 0 at the start and 1 at the time limit.
 */
export function stageAt(stages: readonly Stage[], fraction: number): Stage {
  const first = stages[0];
  const last = stages[stages.length - 1];
  if (!first || !last) throw new Error('At least one difficulty stage is required');

  const f = Math.min(1, Math.max(0, fraction));
  if (f <= first.at) return first;
  if (f >= last.at) return last;

  for (let i = 1; i < stages.length; i++) {
    const to = stages[i];
    const from = stages[i - 1];
    if (!to || !from || f > to.at) continue;
    const k = (f - from.at) / (to.at - from.at);
    const mix = (a: number, b: number): number => a + (b - a) * k;
    return {
      at: f,
      intervalMs: mix(from.intervalMs, to.intervalMs),
      fallSpeed: mix(from.fallSpeed, to.fallSpeed),
      hazardShare: mix(from.hazardShare, to.hazardShare),
    };
  }
  return last;
}
