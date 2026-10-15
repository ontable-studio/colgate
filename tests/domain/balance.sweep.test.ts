import { it } from 'vitest';

/*
 * Tuning aid, skipped unless SWEEP is set: tries combinations of meter values and hazard share and
 * prints the win rate per skill level (novice/casual/average/good/expert), so a new balance can be
 * chosen with numbers instead of guesses.
 *   SWEEP=1 pnpm exec vitest run tests/domain/balance.sweep.test.ts --reporter=verbose
 */
import { RULES, type GameRules } from '@/config/game';
import { simulateTier } from '../support/simulate';

const TIERS = [0.1, 0.35, 0.55, 0.75, 0.95];

it.runIf(process.env['SWEEP'])('sweeps balance parameters', () => {
  const rows: Record<string, string | number>[] = [];
  for (const capsule of [5, 5.5, 6]) {
    for (const stain of [-4, -5, -6]) {
      for (const scale of [1, 1.2]) {
        const rules: GameRules = {
          ...RULES,
          meter: { capsule, stain, decoy: -3 },
          spawn: {
            ...RULES.spawn,
            stages: RULES.spawn.stages.map((s) => ({
              ...s,
              hazardShare: Math.min(0.7, s.hazardShare * scale),
            })),
          },
        };
        const stats = TIERS.map((skill) => simulateTier(rules, skill, 1000));
        rows.push({
          cap: capsule,
          stain,
          hazX: scale,
          win: stats.map((s) => Math.round(s.winRate * 100)).join('/'),
          meterNovice: Math.round(stats[0]?.meanMeter ?? 0),
          expertFinish: (stats[4]?.medianFinishSec ?? 0).toFixed(1),
          goodFinish: (stats[3]?.medianFinishSec ?? 0).toFixed(1),
        });
      }
    }
  }
  console.table(rows);
});
