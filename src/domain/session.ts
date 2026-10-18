import type { FallingKind, GameRules } from '@/config/game';

export interface SessionResult {
  /** Final score. */
  readonly score: number;
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
  private _filled = false;
  private _lastPoints = 0;
  private _remainingMs: number;
  private readonly totalMs: number;

  /** Meter gained per capsule: the meter is full after `winShare` of the round's capsules. */
  private readonly meterPerCapsule: number;

  constructor(
    private readonly rules: GameRules,
    capsuleTotal: number,
  ) {
    const needed = Math.max(1, Math.round(capsuleTotal * rules.meter.winShare));
    this.meterPerCapsule = rules.meterFull / needed;
    this.totalMs = rules.durationSec * 1000;
    this._remainingMs = this.totalMs;
  }

  get score(): number {
    return this._score;
  }
  get meterPct(): number {
    return this._meterPct;
  }
  /** True once the meter has been full at any moment of the round (a later stain may lower it). */
  get filled(): boolean {
    return this._filled;
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
    return this._remainingMs <= 0;
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
    const cost = {
      capsule: -1,
      stain: this.rules.meter.stainCost,
      decoy: this.rules.meter.decoyCost,
    };
    const change = kind === 'capsule' ? this.meterPerCapsule : -cost[kind] * this.meterPerCapsule;
    this._meterPct = Math.min(this.rules.meterFull, Math.max(0, this._meterPct + change));
    if (this._meterPct >= this.rules.meterFull - 1e-6) this._filled = true;
    if (kind === 'capsule') this._catches += 1;
    else this._hits += 1;
  }

  /** A capsule fell past the basket: the streak is over. */
  missCapsule(): void {
    if (!this.isOver) this._streak = 0;
  }

  result(): SessionResult {
    return {
      score: this._score,
      meterPct: Math.round(this._meterPct),
      catches: this._catches,
      hits: this._hits,
      durationSec: Math.round((this.totalMs - this._remainingMs) / 1000),
    };
  }
}
