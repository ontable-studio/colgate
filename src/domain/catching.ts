import type { FallingKind, GameRules } from '@/config/game';

/**
 * Half the width of the zone in which an object counts. Generous for capsules (a rim touch still
 * scores) and strict for hazards (only a clear drop into the bowl is a hit), so when something
 * goes wrong the player can see why.
 */
export function catchHalfWidth(
  kind: FallingKind,
  objectRadius: number,
  rules: GameRules['catching'],
): number {
  const forgiveness = kind === 'capsule' ? rules.capsuleForgiveness : rules.hazardForgiveness;
  return rules.basketHalfWidth + objectRadius * forgiveness;
}

/** Did an object whose centre is at `objectX` land in the basket centred at `basketX`? */
export function isCaught(
  kind: FallingKind,
  objectX: number,
  basketX: number,
  objectRadius: number,
  rules: GameRules['catching'],
): boolean {
  return Math.abs(objectX - basketX) <= catchHalfWidth(kind, objectRadius, rules);
}

/** True on the frame the object's centre passes the rim line while falling. */
export function crossedLine(previousY: number, y: number, lineY: number): boolean {
  return previousY < lineY && y >= lineY;
}
