import type { FallingKind, GameRules } from '@/config/game';

export interface SessionResult {
  /** Final score, including any time bonus. */
  readonly score: number;
  /** Points added for finishing early (0 when time ran out). */
  readonly timeBonus: number;
  readonly meterPct: number;
  readonly catches: number;
  readonly hits: number;
  readonly durationSec: number;
}

/** Pure game state (no Phaser): score, brightness meter and timer. */
export class GameSession {
  private _score = 0;
  private _meterPct = 0;
  private _catches = 0;
  private _hits = 0;
  private _streak = 0;
  private _lastPoints = 0;
  private _remainingMs: number;
  private readonly totalMs: number;

  constructor(private readonly rules: GameRules) {
    this.totalMs = rules.durationSec * 1000;
    this._remainingMs = this.totalMs;
  }

  get score(): number {
    return this._score;
  }
  get meterPct(): number {
    return this._meterPct;
  }
  /** Capsules caught in a row. */
  get streak(): number {
    return this._streak;
  }
  /** Score change of the latest catch (after the combo multiplier). */
  get lastPoints(): number {
    return this._lastPoints;
  }
  /** Score multiplier for the next capsule, from the current streak. */
  get multiplier(): number {
    let multiplier = 1;
    for (const tier of this.rules.combo)
      if (this._streak >= tier.streak) multiplier = tier.multiplier;
    return multiplier;
  }
  get remainingMs(): number {
    return this._remainingMs;
  }
  get isOver(): boolean {
    return this._remainingMs <= 0 || this._meterPct >= 100;
  }

  tick(deltaMs: number): void {
    this._remainingMs = Math.max(0, this._remainingMs - deltaMs);
  }

  /** Apply the effect of catching one falling object. No-op once the session is over. */
  catch(kind: FallingKind): void {
    if (this.isOver) return;
    // The streak counts this catch, so the third capsule in a row is the first one that pays double.
    if (kind === 'capsule') this._streak += 1;
    else this._streak = 0;
    const points = this.rules.points[kind] * (kind === 'capsule' ? this.multiplier : 1);
    this._lastPoints = points;
    this._score = Math.max(0, this._score + points);
    this._meterPct = Math.min(100, Math.max(0, this._meterPct + this.rules.meter[kind]));
    if (kind === 'capsule') this._catches += 1;
    else this._hits += 1;
  }

  /** A capsule fell past the basket: the streak is over. */
  missCapsule(): void {
    if (!this.isOver) this._streak = 0;
  }

  /** Points for the seconds left when the meter filled up; nothing if time ran out first. */
  get timeBonus(): number {
    if (this._meterPct < 100) return 0;
    return Math.floor(this._remainingMs / 1000) * this.rules.timeBonusPerSec;
  }

  result(): SessionResult {
    const timeBonus = this.timeBonus;
    return {
      score: this._score + timeBonus,
      timeBonus,
      meterPct: this._meterPct,
      catches: this._catches,
      hits: this._hits,
      durationSec: Math.round((this.totalMs - this._remainingMs) / 1000),
    };
  }
}
