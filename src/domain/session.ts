import type { BubbleSize, GameRules } from '@/config/game';
import { pointsFactorFor } from '@/domain/bubbles';

export interface SessionResult {
  /** Points scored (can pass the target; the percentage cannot). */
  readonly score: number;
  /** 0..targetPoints, shown as the percentage. */
  readonly meterPct: number;
  /** Molecules popped. */
  readonly pops: number;
  /** Taps that hit nothing. */
  readonly misses: number;
  readonly durationSec: number;
}

/** Pure game state (no Phaser): points, percentage and timer. */
export class GameSession {
  private _score = 0;
  private _pops = 0;
  private _misses = 0;
  private _remainingMs: number;
  private readonly totalMs: number;

  constructor(private readonly rules: GameRules) {
    this.totalMs = rules.durationSec * 1000;
    this._remainingMs = this.totalMs;
  }

  get score(): number {
    return this._score;
  }
  /** Percentage shown beside the toothbrush; full at `targetPoints`. */
  get meterPct(): number {
    return Math.min(this._score, this.rules.targetPoints);
  }
  get reachedTarget(): boolean {
    return this._score >= this.rules.targetPoints;
  }
  get remainingMs(): number {
    return this._remainingMs;
  }
  /** Over when the clock runs out or the target is reached. */
  get isOver(): boolean {
    return this._remainingMs <= 0 || this.reachedTarget;
  }

  tick(deltaMs: number): void {
    if (!this.isOver) this._remainingMs = Math.max(0, this._remainingMs - deltaMs);
  }

  /** A molecule was popped; returns the points it paid (0 once the session is over). */
  pop(size: BubbleSize): number {
    if (this.isOver) return 0;
    const base = this.rules.bubbles[size].points;
    // Fewer molecules come late in the round, so each one pays more.
    // Rounded to the nearest half point so the numbers on screen stay tidy.
    const points = Math.round(base * pointsFactorFor(this.rules, this._remainingMs) * 2) / 2;
    this._score += points;
    this._pops += 1;
    return points;
  }

  /** A tap that hit nothing. */
  miss(): void {
    if (!this.isOver) this._misses += 1;
  }

  result(): SessionResult {
    return {
      score: this._score,
      meterPct: this.meterPct,
      pops: this._pops,
      misses: this._misses,
      durationSec: Math.round((this.totalMs - this._remainingMs) / 1000),
    };
  }
}
