/**
 * Holds back an app update until it is safe to apply. A new version found while someone is playing
 * would reload the page mid-round, so it waits until the booth is idle (the attract screen).
 */
export class UpdateController {
  private pending = false;

  constructor(
    private readonly canApply: () => boolean,
    private readonly apply: () => void,
  ) {}

  get isPending(): boolean {
    return this.pending;
  }

  /** A new version has been downloaded and is waiting. */
  markAvailable(): void {
    this.pending = true;
    this.tick();
  }

  /** Call regularly; applies the update as soon as it is allowed. */
  tick(): void {
    if (!this.pending || !this.canApply()) return;
    this.pending = false;
    this.apply();
  }
}
