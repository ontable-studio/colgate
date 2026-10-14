/**
 * A scene that wants to handle the idle timeout itself (e.g. save a half-finished form)
 * instead of just being sent back to Attract.
 */
export interface IdleAware {
  onIdle(): void;
}

export function isIdleAware(scene: unknown): scene is IdleAware {
  return typeof (scene as Partial<IdleAware>).onIdle === 'function';
}
