/**
 * Audio files live in public/assets/audio and are produced by tools/generate-audio.
 * Both ogg and mp3 exist for every key; the browser picks whichever it can play.
 */
export const SFX_KEYS = [
  'sfx-ui-tap',
  'sfx-ui-start',
  'sfx-pop',
  'sfx-key',
  'sfx-key-del',
  'sfx-catch',
  'sfx-stain',
  'sfx-decoy',
  'sfx-tick',
  'sfx-timeup',
  'sfx-count',
  'sfx-whoosh',
  'sfx-unlock',
  'sfx-result',
] as const;

export const MUSIC_KEYS = ['bgm-attract', 'bgm-game'] as const;

export type SfxKey = (typeof SFX_KEYS)[number];
export type MusicKey = (typeof MUSIC_KEYS)[number];

/** Relative loudness of each effect (1 = as rendered). Tune by ear on the real TV. */
export const SFX_VOLUME: Readonly<Record<SfxKey, number>> = {
  'sfx-ui-tap': 0.55,
  'sfx-ui-start': 0.8,
  'sfx-pop': 0.4,
  'sfx-key': 0.5,
  'sfx-key-del': 0.5,
  'sfx-catch': 0.85,
  'sfx-stain': 0.85,
  'sfx-decoy': 0.7,
  'sfx-tick': 0.5,
  'sfx-timeup': 0.7,
  'sfx-count': 0.3,
  'sfx-whoosh': 0.35,
  'sfx-unlock': 0.85,
  'sfx-result': 0.85,
};

/** Music sits well below the effects so rewards and penalties always cut through. */
export const MUSIC_VOLUME: Readonly<Record<MusicKey, number>> = {
  'bgm-attract': 0.4,
  'bgm-game': 0.42,
};

export const MUSIC_FADE_MS = 700;
export const AUDIO_STORAGE_KEY = 'colgate.audio';
