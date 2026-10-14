import type { SessionResult } from '@/domain/session';

/** Passed Gameplay -> Unlock -> Initials. */
export interface GameResultData {
  result: SessionResult;
}

/** Passed Initials -> Result. */
export interface ResultSceneData extends GameResultData {
  initials: string;
}
