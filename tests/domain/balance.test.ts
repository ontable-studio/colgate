import { describe, expect, it } from 'vitest';
import { RULES } from '@/config/game';
import { simulateTier, type TierStats } from '../support/simulate';

/*
 * Guard rails for fairness. Simulated players of five skill levels play thousands of rounds
 * against the real rules; if someone changes a number in config/game.ts and the game becomes
 * brutal, trivial or unable to tell good players apart, one of these fails.
 * The player model is an ASSUMPTION; calibrate it (tests/support/simulate.ts) with real play-tests.
 *
 * To see the numbers:  BALANCE_REPORT=1 pnpm exec vitest run tests/domain/balance.test.ts --reporter=verbose
 */

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

  it('is demanding but not hopeless: beginners still score, ordinary players can win now and then', () => {
    expect(stats.casual.meanMeter).toBeGreaterThanOrEqual(10);
    expect(stats.casual.winRate).toBeLessThanOrEqual(0.2);
    expect(stats.average.winRate).toBeGreaterThanOrEqual(0.02);
    expect(stats.average.winRate).toBeLessThanOrEqual(0.5);
  });

  it('is still a challenge: weak players rarely fill the meter, strong ones almost always do', () => {
    expect(stats.novice.winRate).toBeLessThanOrEqual(0.05);
    expect(stats.good.winRate).toBeGreaterThanOrEqual(0.5);
    expect(stats.expert.winRate).toBeGreaterThanOrEqual(0.99);
  });

  it('keeps the round long enough to enjoy, even for an expert', () => {
    expect(stats.expert.medianFinishSec).toBeGreaterThanOrEqual(RULES.durationSec * 0.4);
    expect(stats.expert.medianFinishSec).toBeLessThanOrEqual(RULES.durationSec * 0.75);
    expect(stats.good.medianFinishSec).toBeLessThanOrEqual(RULES.durationSec - 1);
  });

  it('spreads scores so the leaderboard is not full of ties', () => {
    // Medians of neighbouring levels are separated by more than the noise within a level.
    expect(stats.expert.p10Score).toBeGreaterThan(stats.good.meanScore);
    expect(stats.good.p10Score).toBeGreaterThan(stats.casual.meanScore);
    expect(stats.expert.p90Score - stats.expert.p10Score).toBeGreaterThanOrEqual(80); // the combo makes the top end vary
  });
});

describe.runIf(process.env['BALANCE_REPORT'])('balance report', () => {
  it('prints win rates per skill level', () => {
    const rows = () =>
      TIERS.map(([name, skill]) => {
        const s = simulateTier(RULES, skill, 1500);
        return {
          player: name,
          win: `${Math.round(s.winRate * 100)}%`,
          finishSec: s.medianFinishSec.toFixed(1),
          meter: `${Math.round(s.meanMeter)}%`,
          score: Math.round(s.meanScore),
          'p10-p90': `${s.p10Score}-${s.p90Score}`,
        };
      });
    console.table(rows());
  });
});
