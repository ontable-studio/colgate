import { type FallingKind, type GameRules } from '@/config/game';
import { GameSession } from '@/domain/session';
import { Spawner, type SpawnEvent } from '@/domain/spawner';

/** Small seeded random generator so every simulation run is reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * How a player of a given skill (0 = never played, 1 = expert) fares. This is a MODEL, not
 * measured data: replace the numbers with real play-test results when they exist.
 * `pressure` is how fast the round is compared with the reference pace (1 = 700 ms apart at
 * 600 px/s); a faster pace hurts weaker players more than strong ones.
 */
export function playerChances(
  skill: number,
  pressure: number,
): { catchRate: number; stainHit: number; decoyHit: number } {
  const delta = (pressure - 1) * (1 - skill);
  const catchBase = 0.35 + 0.62 * skill;
  const hitBase = 0.02 + 0.48 * Math.pow(1 - skill, 1.3);
  return {
    catchRate: clamp01(catchBase * (1 - 0.4 * delta)),
    stainHit: clamp01(hitBase * (1 + 0.8 * delta)),
    decoyHit: clamp01(hitBase * 1.15 * (1 + 0.8 * delta)),
  };
}

export interface RoundOutcome {
  win: boolean;
  /** Seconds the round lasted. */
  finishSec: number;
  score: number;
  meterPct: number;
}

/** Everything that falls during a round, supplied either by the real spawner or a legacy one. */
export type ScheduleFn = (rules: GameRules, rand: () => number) => SpawnEvent[];

export const realSchedule: ScheduleFn = (rules, rand) => {
  const spawner = new Spawner(rules, rand);
  const events: SpawnEvent[] = [];
  const totalMs = rules.durationSec * 1000;
  for (let t = -2000; t <= totalMs; t += 25) events.push(...spawner.due(t));
  return events;
};

/** Play one round with a simulated player. */
export function simulateRound(
  rules: GameRules,
  skill: number,
  seed: number,
  schedule: ScheduleFn = realSchedule,
): RoundOutcome {
  const rand = mulberry32(seed);
  const totalMs = rules.durationSec * 1000;
  const events = schedule(rules, rand);

  const landings = events
    .map((event) => ({ event, landMs: event.landMs }))
    .filter((landing) => landing.landMs <= totalMs)
    .sort((a, b) => a.landMs - b.landMs);

  const session = new GameSession(rules, events.filter((e) => e.kind === 'capsule').length);
  let clock = 0;
  let filledAt: number | undefined;
  for (const { event, landMs } of landings) {
    session.tick(landMs - clock);
    clock = landMs;
    if (session.isOver) break;

    // Pace relative to the reference of 700 ms between objects at 600 px/s.
    const pressure = (700 / event.intervalMs) * Math.sqrt(event.speed / 600);
    const chances = playerChances(skill, pressure);
    const rollsOk = rand();
    const kind: FallingKind = event.kind;
    const happens =
      kind === 'capsule'
        ? rollsOk < chances.catchRate
        : rollsOk < (kind === 'stain' ? chances.stainHit : chances.decoyHit);
    if (happens) {
      session.catch(kind);
      if (filledAt === undefined && session.filled) filledAt = landMs;
    } else if (kind === 'capsule') session.missCapsule();
  }
  if (!session.isOver) session.tick(totalMs - clock);

  const result = session.result();
  return {
    win: session.filled,
    finishSec: (filledAt ?? totalMs) / 1000,
    score: result.score,
    meterPct: result.meterPct,
  };
}

export interface TierStats {
  skill: number;
  winRate: number;
  medianFinishSec: number;
  meanMeter: number;
  meanScore: number;
  p10Score: number;
  p90Score: number;
}

export function simulateTier(
  rules: GameRules,
  skill: number,
  rounds = 1500,
  schedule: ScheduleFn = realSchedule,
): TierStats {
  const outcomes = Array.from({ length: rounds }, (_, i) =>
    simulateRound(rules, skill, 1000 + i, schedule),
  );
  const sorted = <T extends number>(values: T[]): T[] => [...values].sort((a, b) => a - b);
  const pick = (values: number[], q: number): number =>
    values[Math.floor(q * (values.length - 1))] ?? 0;
  const finishes = sorted(outcomes.filter((o) => o.win).map((o) => o.finishSec));
  const scores = sorted(outcomes.map((o) => o.score));
  return {
    skill,
    winRate: outcomes.filter((o) => o.win).length / rounds,
    medianFinishSec: finishes.length ? pick(finishes, 0.5) : rules.durationSec,
    meanMeter: outcomes.reduce((s, o) => s + o.meterPct, 0) / rounds,
    meanScore: scores.reduce((s, v) => s + v, 0) / rounds,
    p10Score: pick(scores, 0.1),
    p90Score: pick(scores, 0.9),
  };
}
