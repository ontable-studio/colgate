import { GAME_WIDTH, OBJECT_SIZE, type FallingKind, type GameRules } from '@/config/game';
import { stageAt } from './difficulty';

export interface SpawnEvent {
  readonly kind: FallingKind;
  /** Horizontal centre in px. */
  readonly x: number;
  /** Fall speed in px/s. */
  readonly speed: number;
  /** When it appears, in ms since the round started (negative: it is already falling at the start). */
  readonly atMs: number;
  /** When its centre reaches the rim of the basket, in ms since the round started. */
  readonly landMs: number;
  /** Gap to the next object at this point of the round (how brisk the pace is). */
  readonly intervalMs: number;
}

/**
 * Choose what falls next. Plain dice rolls produce unfair runs (five stains in a row, or a
 * minute with nothing to catch), so the roll is bent by a few rules:
 * the opening is all capsules, hazards never come more than `maxHazardsInRow` times in a row, and
 * a hazard is due after `maxCapsulesInRow` capsules. In between it is random.
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
  const wantsHazard = capsulesInRow >= rules.maxCapsulesInRow || rand() < hazardShare;
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

/** Seconds into the round when the first object reaches the basket (it starts already in the air). */
const FIRST_LANDING_MS = 1000;

/**
 * Schedules falling objects along the difficulty curve. Pure: time and randomness are injected.
 *
 * The rhythm is laid out on the moment objects REACH the basket, not on the moment they appear:
 * the first one lands almost at once (it simply starts already part-way down), and the last one
 * lands in the final second, so every object that falls is catchable and the very last chance
 * to score is right at 00:00. Nothing is wasted falling after the timer has run out.
 */
export class Spawner {
  private readonly events: SpawnEvent[] = [];
  private next = 0;

  constructor(
    private readonly rules: GameRules,
    rand: () => number = Math.random,
    width = GAME_WIDTH,
  ) {
    const totalMs = rules.durationSec * 1000;
    const history: FallingKind[] = [];
    let lastX = width / 2;
    let landMs = FIRST_LANDING_MS;
    while (landMs <= totalMs) {
      const stage = stageAt(rules.spawn.stages, landMs / totalMs);
      const kind = pickNextKind(history, stage.hazardShare, rules.spawn, rand);
      const x = pickNextX(lastX, stage.intervalMs, rules.spawn, rand, width);
      history.push(kind);
      lastX = x;
      const travelMs = ((rules.catching.lineY + OBJECT_SIZE[kind]) / stage.fallSpeed) * 1000;
      this.events.push({
        kind,
        x,
        speed: stage.fallSpeed,
        atMs: landMs - travelMs,
        landMs,
        intervalMs: stage.intervalMs,
      });
      landMs += stage.intervalMs;
    }
    this.events.sort((a, b) => a.atMs - b.atMs);
  }

  /** Every object that should exist by `elapsedMs`, in order. Call each frame. */
  due(elapsedMs: number): SpawnEvent[] {
    const events: SpawnEvent[] = [];
    while (this.next < this.events.length) {
      const event = this.events[this.next];
      if (!event || event.atMs > elapsedMs) break;
      events.push(event);
      this.next += 1;
    }
    return events;
  }
}
