import { GAME_WIDTH, type FallingKind, type GameRules } from '@/config/game';
import { stageAt } from './difficulty';

export interface SpawnEvent {
  readonly kind: FallingKind;
  /** Horizontal centre in px. */
  readonly x: number;
  /** Fall speed in px/s. */
  readonly speed: number;
  /** When it was scheduled, in ms since the round started. */
  readonly atMs: number;
  /** Gap to the next object at this point of the round (how brisk the pace is). */
  readonly intervalMs: number;
}

/**
 * Choose what falls next. Plain dice rolls produce unfair runs (five stains in a row, or a
 * minute with nothing to catch), so the roll is bent by a few rules:
 * the opening is all capsules, hazards never come more than `maxHazardsInRow` times in a row, and
 * a hazard is due after `maxCapsulesInRow` capsules. In between it is random, but with
 * `repeatChance` the previous sort simply repeats, so objects arrive in waves (a run of stains to
 * weave through, a run of capsules to keep the combo going) instead of evenly mixed.
 */
export function pickNextKind(
  history: readonly FallingKind[],
  hazardShare: number,
  rules: GameRules['spawn'],
  rand: () => number,
): FallingKind {
  if (history.length < rules.safeOpeningSpawns) return 'capsule';

  const hazardsInRow = countTrailing(history, (k) => k !== 'capsule');
  if (hazardsInRow >= rules.maxHazardsInRow) return 'capsule';
  const capsulesInRow = countTrailing(history, (k) => k === 'capsule');
  let wantsHazard: boolean;
  if (capsulesInRow >= rules.maxCapsulesInRow) wantsHazard = true;
  else if (rand() < rules.repeatChance)
    wantsHazard = hazardsInRow > 0; // same sort again: a streak
  else wantsHazard = rand() < hazardShare;
  if (!wantsHazard) return 'capsule';

  return rand() < rules.stainShareOfHazards ? 'stain' : 'decoy';
}

function countTrailing(
  history: readonly FallingKind[],
  test: (kind: FallingKind) => boolean,
): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const kind = history[i];
    if (kind === undefined || !test(kind)) break;
    count += 1;
  }
  return count;
}

/**
 * Where the next object lands. It stays within what a player can reach from the previous one in
 * the time between them, so every object can be caught or dodged in order.
 */
export function pickNextX(
  previousX: number,
  intervalMs: number,
  rules: GameRules['spawn'],
  rand: () => number,
  width = GAME_WIDTH,
): number {
  const reach = rules.lateralReach * (intervalMs / 1000);
  const lo = Math.max(rules.marginX, previousX - reach);
  const hi = Math.min(width - rules.marginX, previousX + reach);
  return lo + rand() * (hi - lo);
}

/** Schedules falling objects along the difficulty curve. Pure: time and randomness are injected. */
export class Spawner {
  private nextAtMs = 0;
  private readonly history: FallingKind[] = [];
  private lastX: number;

  constructor(
    private readonly rules: GameRules,
    private readonly rand: () => number = Math.random,
    private readonly width = GAME_WIDTH,
  ) {
    this.lastX = width / 2;
  }

  /** Every object that should exist by `elapsedMs`, in order. Call each frame. */
  due(elapsedMs: number): SpawnEvent[] {
    const events: SpawnEvent[] = [];
    const totalMs = this.rules.durationSec * 1000;
    while (this.nextAtMs <= elapsedMs) {
      const stage = stageAt(this.rules.spawn.stages, this.nextAtMs / totalMs);
      const kind = pickNextKind(this.history, stage.hazardShare, this.rules.spawn, this.rand);
      const x = pickNextX(this.lastX, stage.intervalMs, this.rules.spawn, this.rand, this.width);
      this.history.push(kind);
      this.lastX = x;
      events.push({
        kind,
        x,
        speed: stage.fallSpeed,
        atMs: this.nextAtMs,
        intervalMs: stage.intervalMs,
      });
      this.nextAtMs += stage.intervalMs;
    }
    return events;
  }
}
