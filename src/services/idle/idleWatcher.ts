const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown'] as const;

/** Calls onIdle after `timeoutMs` without user activity, then re-arms itself. */
export class IdleWatcher {
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly timeoutMs: number,
    private readonly onIdle: () => void,
    private readonly target: EventTarget = window,
  ) {}

  start(): void {
    for (const type of ACTIVITY_EVENTS) this.target.addEventListener(type, this.reset);
    this.reset();
  }

  stop(): void {
    for (const type of ACTIVITY_EVENTS) this.target.removeEventListener(type, this.reset);
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  readonly reset = (): void => {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.onIdle();
      this.reset();
    }, this.timeoutMs);
  };
}
