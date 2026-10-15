import { describe, it } from 'vitest';
import { OBJECT_SIZE, RULES } from '@/config/game';
import { Spawner } from '@/domain/spawner';
import { mulberry32, playerChances } from '../support/simulate';

/*
 * Experiment, skipped unless LEADERBOARD is set: compares ways of scoring a round by how well the
 * resulting leaderboard separates players (few ties at the top, wide spread, skill matters).
 *   LEADERBOARD=1 pnpm exec vitest run tests/domain/leaderboard.sweep.test.ts --reporter=verbose
 */

type Mode = 'current' | 'combo' | 'boost' | 'combo+boost';

const comboMultiplier = (streak: number): number =>
  streak >= 15 ? 5 : streak >= 10 ? 4 : streak >= 6 ? 3 : streak >= 3 ? 2 : 1;

interface Round {
  score: number;
}

function play(skill: number, seed: number, mode: Mode): Round {
  const rand = mulberry32(seed);
  const spawner = new Spawner(RULES, rand);
  const totalMs = RULES.durationSec * 1000;
  const events = [];
  for (let t = 0; t <= totalMs; t += 25) events.push(...spawner.due(t));
  const landings = events
    .map((e) => ({
      e,
      land: e.atMs + ((RULES.catching.lineY + OBJECT_SIZE[e.kind] / 2) / e.speed) * 1000,
    }))
    .filter((l) => l.land <= totalMs)
    .sort((a, b) => a.land - b.land);

  const useCombo = mode === 'combo' || mode === 'combo+boost';
  const useBoost = mode === 'boost' || mode === 'combo+boost';
  let meter = 0;
  let score = 0;
  let streak = 0;
  let clock = 0;
  for (const { e, land } of landings) {
    clock = land;
    const p = playerChances(skill, (700 / e.intervalMs) * Math.sqrt(e.speed / 600));
    const roll = rand();
    if (e.kind === 'capsule') {
      if (roll < p.catchRate) {
        meter = Math.min(100, meter + RULES.meter.capsule);
        streak += 1;
        score += RULES.points.capsule * (useCombo ? comboMultiplier(streak) : 1);
      } else if (useCombo) streak = 0;
    } else if (roll < (e.kind === 'stain' ? p.stainHit : p.decoyHit)) {
      meter = Math.max(0, meter + RULES.meter[e.kind]);
      score = Math.max(0, score + RULES.points[e.kind]);
      streak = 0;
    }
    if (meter >= 100) break;
  }
  const remainingSec = Math.max(0, (totalMs - clock) / 1000);
  if (meter >= 100) {
    score += Math.floor(remainingSec) * RULES.timeBonusPerSec;
    if (useBoost) {
      // 8 s golden rain after the meter fills: dense, capsules only, worth more, hard to catch all.
      const drops = Math.floor(8000 / 380);
      const dense = Math.pow(playerChances(skill, 1.6).catchRate, 1.35);
      for (let i = 0; i < drops; i++) {
        if (rand() < dense) {
          streak += 1;
          score += 25 * (useCombo ? comboMultiplier(streak) : 1);
        } else if (useCombo) streak = 0;
      }
    }
  }
  return { score };
}

const TIERS: [number, number][] = [
  [0.1, 0.15],
  [0.35, 0.3],
  [0.55, 0.3],
  [0.75, 0.18],
  [0.95, 0.07],
];

function mixedPlays(n: number, mode: Mode, seedBase: number): number[] {
  const rand = mulberry32(seedBase);
  return Array.from({ length: n }, (_, i) => {
    let r = rand();
    let skill = 0.55;
    for (const [s, w] of TIERS) {
      if (r < w) {
        skill = s;
        break;
      }
      r -= w;
    }
    return play(skill, seedBase * 7919 + i, mode).score;
  });
}

describe.runIf(process.env['LEADERBOARD'])('leaderboard variety', () => {
  it('compares scoring designs', () => {
    const rows = (['current', 'combo', 'boost', 'combo+boost'] as Mode[]).map((mode) => {
      // 300 plays in a day, repeated over many days: how many of the top 10 share a score?
      let tiedTop10 = 0;
      let top1Gap = 0;
      let distinctAll = 0;
      let topCluster = 0;
      const days = 400;
      for (let d = 0; d < days; d++) {
        const scores = mixedPlays(300, mode, 100 + d).sort((a, b) => b - a);
        const top = scores.slice(0, 10);
        const counts = new Map<number, number>();
        for (const s of top) counts.set(s, (counts.get(s) ?? 0) + 1);
        tiedTop10 += top.filter((s) => (counts.get(s) ?? 0) > 1).length;
        top1Gap += (top[0] ?? 0) - (top[9] ?? 0);
        distinctAll += new Set(scores).size;
        const max = top[0] ?? 1;
        topCluster += scores.filter((s) => s >= max * 0.95).length;
      }
      const single = (skill: number) =>
        Array.from({ length: 600 }, (_, i) => play(skill, 5000 + i, mode).score).sort(
          (a, b) => a - b,
        );
      const q = (a: number[], f: number) => a[Math.floor(f * (a.length - 1))] ?? 0;
      const good = single(0.75);
      const expert = single(0.95);
      const casual = single(0.35);
      return {
        scoring: mode,
        'tied entries in top10': (tiedTop10 / days).toFixed(1),
        'top1-top10 gap': Math.round(top1Gap / days),
        'distinct scores /300': Math.round(distinctAll / days),
        'plays within 5% of best': (topCluster / days).toFixed(1),
        'casual p10-p90': `${q(casual, 0.1)}-${q(casual, 0.9)}`,
        'good p10-p90': `${q(good, 0.1)}-${q(good, 0.9)}`,
        'expert p10-p90': `${q(expert, 0.1)}-${q(expert, 0.9)}`,
      };
    });
    console.table(rows);
  }, 180_000);
});
