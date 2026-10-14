export interface AudioSettings {
  muted: boolean;
  /** Master volume, 0..1. */
  volume: number;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { muted: false, volume: 0.75 };

/** Levels the operator cycles through on the admin screen. */
export const VOLUME_STEPS = [0.25, 0.5, 0.75, 1] as const;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** Read settings saved as JSON, falling back to defaults for anything missing or invalid. */
export function parseAudioSettings(raw: string | null): AudioSettings {
  if (!raw) return DEFAULT_AUDIO_SETTINGS;
  try {
    const data = JSON.parse(raw) as Partial<AudioSettings> | null;
    const volume =
      typeof data?.volume === 'number' && Number.isFinite(data.volume)
        ? clamp01(data.volume)
        : DEFAULT_AUDIO_SETTINGS.volume;
    const muted = typeof data?.muted === 'boolean' ? data.muted : DEFAULT_AUDIO_SETTINGS.muted;
    return { muted, volume };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

/** The next preset above `current`, wrapping back to the quietest. */
export function nextVolume(current: number): number {
  const next = VOLUME_STEPS.find((step) => step > current + 1e-6);
  return next ?? VOLUME_STEPS[0];
}

/**
 * Pitch shift (cents) for the catch sound: every capsule in a row goes one semitone higher,
 * up to `maxSteps`, so a streak sounds like a rising scale.
 */
export function comboDetune(combo: number, maxSteps = 8, centsPerStep = 100): number {
  const steps = Math.min(Math.max(combo - 1, 0), maxSteps);
  return steps * centsPerStep;
}
