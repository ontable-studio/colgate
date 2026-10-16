import { describe, expect, it } from 'vitest';
import { RULES, type FallingKind, type GameRules } from '@/config/game';
import type { SpawnEvent } from '@/domain/spawner';
import { simulateTier, type ScheduleFn, type TierStats } from '../support/simulate';

/*
 * Guard rails for fairness. Simulated players of five skill levels play thousands of rounds
 * against the real rules; if someone changes a number in config/game.ts and the game becomes
 * brutal, trivial or unable to tell good players apart, one of these fails.
 * The player model is an ASSUMPTION; calibrate it (tests/support/simulate.ts) with real play-tests.
 *
 * To see the numbers:  BALANCE_REPORT=1 pnpm exec vitest run tests/domain/balance.test.ts --reporter=verbose
 */

/** The first version of the rules (plain dice rolls, flat pace), kept to measure the improvement. */
const LEGACY: GameRules = {
  ...RULES,
  durationSec: 40,
  meter: { capsule: 5, stain: -5, decoy: -3 },
  timeBonusPerSec: 0,
};

const legacySchedule: ScheduleFn = (rules, rand) => {
  const events: SpawnEvent[] = [];
  const weights: [FallingKind, number][] = [
    ['capsule', 6],
    ['stain', 3],
    ['decoy', 2],
  ];
  for (let at = 0; at <= rules.durationSec * 1000; at += 700) {
    let roll = rand() * 11;
    let kind: FallingKind = 'capsule';
    for (const [k, w] of weights) {
      roll -= w;
      if (roll < 0) {
        kind = k;
        break;
      }
    }
    events.push({ kind, x: 540, speed: 600, atMs: at, intervalMs: 700 });
  }
  return events;
};

const TIERS = [
  ['novice', 0.1],
  ['casual', 0.35],
  ['average', 0.55],
  ['good', 0.75],
  ['expert', 0.95],
] as const;
const ROUNDS = 800;

const stats = Object.fromEntries(
  TIERS.map(([name, skill]) => [name, simulateTier(RULES, skill, ROUNDS)]),
) as Record<(typeof TIERS)[number][0], TierStats>;

describe('balance of the current rules', () => {
  it('rewards skill: win rate and score rise with every skill level', () => {
    const order = TIERS.map(([name]) => stats[name]);
    for (let i = 1; i < order.length; i++) {
      const a = order[i - 1];
      const b = order[i];
      if (!a || !b) throw new Error('missing tier');
      expect(b.winRate).toBeGreaterThanOrEqual(a.winRate);
      expect(b.meanScore).toBeGreaterThan(a.meanScore);
    }
  });

  it('is welcoming: beginners see real progress and ordinary players have a fair chance', () => {
    expect(stats.novice.meanMeter).toBeGreaterThanOrEqual(38);
    expect(stats.casual.winRate).toBeGreaterThanOrEqual(0.25);
    expect(stats.casual.winRate).toBeLessThanOrEqual(0.55);
    expect(stats.average.winRate).toBeGreaterThanOrEqual(0.75);
    expect(stats.average.winRate).toBeLessThanOrEqual(0.97);
  });

  it('is still a challenge: weak players rarely fill the meter, strong ones almost always do', () => {
    expect(stats.novice.winRate).toBeLessThanOrEqual(0.1);
    expect(stats.good.winRate).toBeGreaterThanOrEqual(0.95);
    expect(stats.expert.winRate).toBeGreaterThanOrEqual(0.99);
  });

  it('keeps the round long enough to enjoy, even for an expert', () => {
    expect(stats.expert.medianFinishSec).toBeGreaterThanOrEqual(RULES.durationSec * 0.4);
    expect(stats.expert.medianFinishSec).toBeLessThanOrEqual(RULES.durationSec * 0.75);
    expect(stats.good.medianFinishSec).toBeLessThanOrEqual(RULES.durationSec - 2);
  });

  it('spreads scores so the leaderboard is not full of ties', () => {
    // Medians of neighbouring levels are separated by more than the noise within a level.
    expect(stats.expert.p10Score).toBeGreaterThan(stats.good.meanScore);
    expect(stats.good.p10Score).toBeGreaterThan(stats.casual.meanScore);
    expect(stats.expert.p90Score - stats.expert.p10Score).toBeGreaterThanOrEqual(80); // combo and time bonus make the top end vary
  });

  it('is clearly fairer than the first version for ordinary players', () => {
    const oldCasual = simulateTier(LEGACY, 0.35, ROUNDS, legacySchedule);
    const oldAverage = simulateTier(LEGACY, 0.55, ROUNDS, legacySchedule);
    expect(stats.casual.winRate).toBeGreaterThan(oldCasual.winRate + 0.2);
    expect(stats.average.winRate).toBeGreaterThan(oldAverage.winRate + 0.4);
  });
});

describe.runIf(process.env['BALANCE_REPORT'])('balance report', () => {
  it('prints win rates per skill level', () => {
    const rows = (label: string, rules: GameRules, schedule?: ScheduleFn) =>
      TIERS.map(([name, skill]) => {
        const s = simulateTier(rules, skill, 1500, schedule);
        return {
          rules: label,
          player: name,
          win: `${Math.round(s.winRate * 100)}%`,
          finishSec: s.medianFinishSec.toFixed(1),
          meter: `${Math.round(s.meanMeter)}%`,
          score: Math.round(s.meanScore),
          'p10-p90': `${s.p10Score}-${s.p90Score}`,
        };
      });
    console.table([...rows('old', LEGACY, legacySchedule), ...rows('new', RULES)]);
  });
});
