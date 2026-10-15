import { describe, expect, it, vi } from 'vitest';
import { isBlockedInitials } from '@/domain/initials';
import { LOW_FPS, LOW_FPS_STREAK, scaleEffectCount, updateLowFpsStreak } from '@/domain/lowPower';
import { DEFAULT_RELOAD_POLICY, planReload } from '@/domain/reloadGuard';
import { UpdateController } from '@/domain/updateController';

describe('planReload', () => {
  it('allows reloads until the limit within the window', () => {
    let history: number[] = [];
    for (let i = 0; i < DEFAULT_RELOAD_POLICY.maxReloads; i++) {
      const plan = planReload(history, 1000 + i * 100);
      expect(plan.allowed).toBe(true);
      history = plan.history;
    }
    const blocked = planReload(history, 1500);
    expect(blocked.allowed).toBe(false);
    expect(blocked.history).toHaveLength(DEFAULT_RELOAD_POLICY.maxReloads);
  });

  it('forgets old reloads so a later crash can reload again', () => {
    const history = [1000, 1100, 1200];
    const later = 1200 + DEFAULT_RELOAD_POLICY.windowMs + 1;
    const plan = planReload(history, later);
    expect(plan.allowed).toBe(true);
    expect(plan.history).toEqual([later]);
  });
});

describe('low power mode', () => {
  it('counts consecutive slow readings and resets on a healthy one', () => {
    let streak = 0;
    streak = updateLowFpsStreak(streak, 20);
    streak = updateLowFpsStreak(streak, 25);
    expect(streak).toBe(2);
    expect(updateLowFpsStreak(streak, 60)).toBe(0);
  });

  it('ignores a zero reading (loop not started / hidden tab)', () => {
    expect(updateLowFpsStreak(3, 0)).toBe(3);
  });

  it('only trips after enough slow readings in a row', () => {
    let streak = 0;
    for (let i = 0; i < LOW_FPS_STREAK - 1; i++) streak = updateLowFpsStreak(streak, LOW_FPS - 1);
    expect(streak).toBeLessThan(LOW_FPS_STREAK);
    streak = updateLowFpsStreak(streak, LOW_FPS - 1);
    expect(streak).toBe(LOW_FPS_STREAK);
  });

  it('thins out effects in low power mode but never to zero', () => {
    expect(scaleEffectCount(14, false)).toBe(14);
    expect(scaleEffectCount(14, true)).toBe(5);
    expect(scaleEffectCount(1, true)).toBe(1);
  });
});

describe('UpdateController', () => {
  it('applies an update immediately when the booth is idle', () => {
    const apply = vi.fn();
    new UpdateController(() => true, apply).markAvailable();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('holds the update while someone is playing and applies it once idle', () => {
    const apply = vi.fn();
    let idle = false;
    const controller = new UpdateController(() => idle, apply);
    controller.markAvailable();
    controller.tick();
    expect(apply).not.toHaveBeenCalled();
    expect(controller.isPending).toBe(true);

    idle = true;
    controller.tick();
    expect(apply).toHaveBeenCalledTimes(1);
    controller.tick();
    expect(apply).toHaveBeenCalledTimes(1); // only once
  });

  it('does nothing when no update is waiting', () => {
    const apply = vi.fn();
    new UpdateController(() => true, apply).tick();
    expect(apply).not.toHaveBeenCalled();
  });
});

describe('isBlockedInitials', () => {
  it('blocks listed combinations regardless of case', () => {
    expect(isBlockedInitials('ASS')).toBe(true);
    expect(isBlockedInitials('ajg')).toBe(true);
  });

  it('lets ordinary initials through', () => {
    expect(isBlockedInitials('ABC')).toBe(false);
    expect(isBlockedInitials('')).toBe(false);
    expect(isBlockedInitials('AB')).toBe(false);
  });
});
