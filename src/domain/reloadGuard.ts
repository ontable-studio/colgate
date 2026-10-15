export interface ReloadPolicy {
  maxReloads: number;
  windowMs: number;
}

/** Allow at most 3 automatic reloads per minute, so a bug that fails on every boot cannot loop forever. */
export const DEFAULT_RELOAD_POLICY: ReloadPolicy = { maxReloads: 3, windowMs: 60_000 };

export interface ReloadPlan {
  allowed: boolean;
  /** Reload timestamps to remember (old ones dropped, this one added when allowed). */
  history: number[];
}

/** Decide whether the page may reload itself now, given the times of its recent reloads. */
export function planReload(
  history: readonly number[],
  now: number,
  policy: ReloadPolicy = DEFAULT_RELOAD_POLICY,
): ReloadPlan {
  const recent = history.filter((at) => now - at < policy.windowMs);
  if (recent.length >= policy.maxReloads) return { allowed: false, history: recent };
  return { allowed: true, history: [...recent, now] };
}
