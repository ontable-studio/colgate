import { scaleEffectCount } from '@/domain/lowPower';

const STORAGE_KEY = 'colgate.lowpower';

function readInitial(): boolean {
  try {
    if (new URLSearchParams(location.search).get('quality') === 'low') return true;
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let low = typeof location === 'undefined' ? false : readInitial();

/**
 * Visual quality. Starts normal; switches to "low" (fewer sparkles and confetti) when the screen
 * cannot keep up, or when the page is opened with `?quality=low` (handy to test on a weak TV).
 * The choice lasts for the browser session.
 */
export const quality = {
  get isLow(): boolean {
    return low;
  },
  setLow(value: boolean): void {
    low = value;
    try {
      sessionStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      /* storage unavailable: still applies for this page load */
    }
  },
  /** Effect count adjusted for the current quality. */
  count(n: number): number {
    return scaleEffectCount(n, low);
  },
};
