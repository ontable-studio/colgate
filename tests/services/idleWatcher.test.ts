import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IdleWatcher } from '@/services/idle/idleWatcher';

describe('IdleWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires after the timeout and re-arms', () => {
    const target = new EventTarget();
    const onIdle = vi.fn();
    new IdleWatcher(1000, onIdle, target).start();

    vi.advanceTimersByTime(999);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(onIdle).toHaveBeenCalledTimes(2);
  });

  it('resets on activity', () => {
    const target = new EventTarget();
    const onIdle = vi.fn();
    new IdleWatcher(1000, onIdle, target).start();

    vi.advanceTimersByTime(900);
    target.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(900);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('stops cleanly', () => {
    const target = new EventTarget();
    const onIdle = vi.fn();
    const watcher = new IdleWatcher(1000, onIdle, target);
    watcher.start();
    watcher.stop();
    vi.advanceTimersByTime(5000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
