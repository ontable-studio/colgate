import { describe, expect, it } from 'vitest';
import { GAME_WIDTH, RULES } from '@/config/game';
import { stageAt } from '@/domain/difficulty';
import { pickNextKind, pickNextX, Spawner, type SpawnEvent } from '@/domain/spawner';
import { mulberry32 } from '../support/simulate';

const SPAWN = RULES.spawn;

function schedule(seed: number): SpawnEvent[] {
  const spawner = new Spawner(RULES, mulberry32(seed));
  const events: SpawnEvent[] = [];
  for (let t = 0; t <= RULES.durationSec * 1000; t += 25) events.push(...spawner.due(t));
  return events;
}

describe('stageAt', () => {
  it('returns the first and last keyframe at the ends and clamps outside', () => {
    const first = SPAWN.stages[0];
    const last = SPAWN.stages[SPAWN.stages.length - 1];
    expect(stageAt(SPAWN.stages, 0)).toEqual(first);
    expect(stageAt(SPAWN.stages, -3)).toEqual(first);
    expect(stageAt(SPAWN.stages, 1)).toEqual(last);
    expect(stageAt(SPAWN.stages, 9)).toEqual(last);
  });

  it('blends linearly between two keyframes', () => {
    const stages = [
      { at: 0, intervalMs: 1000, fallSpeed: 400, hazardShare: 0 },
      { at: 1, intervalMs: 500, fallSpeed: 800, hazardShare: 0.5 },
    ];
    const mid = stageAt(stages, 0.5);
    expect(mid.intervalMs).toBeCloseTo(750);
    expect(mid.fallSpeed).toBeCloseTo(600);
    expect(mid.hazardShare).toBeCloseTo(0.25);
  });

  it('gets brisker over the round (shorter gaps, faster fall)', () => {
    const start = stageAt(SPAWN.stages, 0);
    const end = stageAt(SPAWN.stages, 1);
    expect(end.intervalMs).toBeLessThan(start.intervalMs);
    expect(end.fallSpeed).toBeGreaterThan(start.fallSpeed);
  });
});

describe('pickNextKind', () => {
  it('opens with capsules only', () => {
    const rand = () => 0; // would always roll a hazard
    const plain = { ...SPAWN, repeatChance: 0 };
    expect(pickNextKind([], 1, plain, rand)).toBe('capsule');
    expect(pickNextKind(['capsule', 'capsule'], 1, plain, rand)).toBe('capsule');
    expect(pickNextKind(['capsule', 'capsule', 'capsule'], 1, plain, rand)).not.toBe('capsule');
  });

  it('never allows more hazards in a row than the limit', () => {
    const history = Array.from({ length: SPAWN.maxHazardsInRow }, () => 'stain' as const);
    expect(pickNextKind(['capsule', 'capsule', 'capsule', ...history], 1, SPAWN, () => 0)).toBe(
      'capsule',
    );
  });

  it('repeats the previous sort when the streak roll hits, so objects come in waves', () => {
    const wave = { ...SPAWN, repeatChance: 1 };
    const opening = ['capsule', 'capsule', 'capsule'] as const;
    expect(pickNextKind([...opening], 1, wave, () => 0.5)).toBe('capsule');
    expect(pickNextKind([...opening, 'stain'], 0, wave, () => 0.5)).not.toBe('capsule');
  });

  it('forces a hazard after too many capsules in a row, even when the share says none', () => {
    const history = Array.from({ length: SPAWN.maxCapsulesInRow }, () => 'capsule' as const);
    // hazardShare 0 would never roll a hazard, yet the streak limit demands one.
    const kind = pickNextKind([...history], 0, SPAWN, () => 0.1);
    expect(kind).not.toBe('capsule');
    expect(kind).toBe('stain'); // 0.1 < stainShareOfHazards
    expect(pickNextKind([...history], 0, SPAWN, () => 0.99)).toBe('decoy');
  });
});

describe('pickNextX', () => {
  it('never lands further away than a player can reach in the time between objects', () => {
    const rand = mulberry32(5);
    let previous = GAME_WIDTH / 2;
    for (let i = 0; i < 2000; i++) {
      const interval = 560 + (i % 5) * 80;
      const x = pickNextX(previous, interval, SPAWN, rand);
      const reach = SPAWN.lateralReach * (interval / 1000);
      expect(Math.abs(x - previous)).toBeLessThanOrEqual(reach + 1e-9);
      expect(x).toBeGreaterThanOrEqual(SPAWN.marginX);
      expect(x).toBeLessThanOrEqual(GAME_WIDTH - SPAWN.marginX);
      previous = x;
    }
  });
});

describe('Spawner schedule', () => {
  const events = schedule(11);

  it('is reproducible for a given seed', () => {
    expect(schedule(11)).toEqual(events);
    expect(schedule(12)).not.toEqual(events);
  });

  it('starts with the safe opening and has a sensible number of objects', () => {
    expect(events.slice(0, SPAWN.safeOpeningSpawns).every((e) => e.kind === 'capsule')).toBe(true);
    expect(events.length).toBeGreaterThan(25);
    expect(events.length).toBeLessThan(45);
  });

  it('spaces objects by the stage interval and speeds up over time', () => {
    for (let i = 1; i < events.length; i++) {
      const previous = events[i - 1];
      const current = events[i];
      if (!previous || !current) throw new Error('missing event');
      expect(current.atMs - previous.atMs).toBeCloseTo(previous.intervalMs);
    }
    const first = events[0];
    const last = events[events.length - 1];
    expect(last?.speed ?? 0).toBeGreaterThan(first?.speed ?? Infinity);
  });

  it('never produces long streaks of either kind, across many seeds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      let hazards = 0;
      let capsules = 0;
      for (const event of schedule(seed)) {
        if (event.kind === 'capsule') {
          capsules += 1;
          hazards = 0;
        } else {
          hazards += 1;
          capsules = 0;
        }
        expect(hazards).toBeLessThanOrEqual(SPAWN.maxHazardsInRow);
        expect(capsules).toBeLessThanOrEqual(SPAWN.maxCapsulesInRow);
      }
    }
  });
});
