/**
 * Move `current` toward `target` by at most `maxSpeed` px/s over `deltaMs`.
 * A finger tap far from the basket must not teleport it: the basket slides there at a speed a
 * player could reach by dragging, which is also what the spawner's reachability rule assumes.
 */
export function stepToward(
  current: number,
  target: number,
  maxSpeed: number,
  deltaMs: number,
): number {
  const maxStep = (maxSpeed * Math.max(0, deltaMs)) / 1000;
  const distance = target - current;
  return Math.abs(distance) <= maxStep ? target : current + Math.sign(distance) * maxStep;
}
