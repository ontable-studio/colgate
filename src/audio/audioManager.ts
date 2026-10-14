import type Phaser from 'phaser';
import {
  AUDIO_STORAGE_KEY,
  MUSIC_FADE_MS,
  MUSIC_VOLUME,
  SFX_VOLUME,
  type MusicKey,
  type SfxKey,
} from '@/config/audio';
import { nextVolume, parseAudioSettings, type AudioSettings } from '@/domain/audioSettings';

export interface PlayOptions {
  /** Multiplies the effect's base volume. */
  volume?: number;
  /** Pitch shift in cents (WebAudio only). */
  detune?: number;
  /** Playback speed; 1 = normal. */
  rate?: number;
}

interface Fadeable {
  volume: number;
}

/** A music track plus its own bookkeeping, because WebAudio's `volume` getter lags behind writes. */
interface Track {
  sound: Phaser.Sound.BaseSound;
  key: MusicKey;
  /** The volume we last asked for (the source of truth for fades). */
  level: number;
  timer?: ReturnType<typeof setInterval>;
}

/**
 * Linear volume fade driven by a timer, so it keeps running when scenes change. A new fade on the
 * same track replaces the running one and continues from the current level.
 */
function fadeTrack(track: Track, to: number, ms: number, done?: () => void): void {
  if (track.timer) clearInterval(track.timer);
  const from = track.level;
  const startedAt = performance.now();
  const target = track.sound as unknown as Fadeable;
  track.timer = setInterval(() => {
    const k = Math.min(1, (performance.now() - startedAt) / ms);
    track.level = from + (to - from) * k;
    try {
      target.volume = track.level;
    } catch {
      // The sound was destroyed while fading; nothing left to do.
      clearInterval(track.timer);
      return;
    }
    if (k >= 1) {
      clearInterval(track.timer);
      track.timer = undefined;
      done?.();
    }
  }, 30);
}

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * Plays sound effects and background music through Phaser's sound manager.
 *
 * Browsers only allow audio after the first tap. Effects requested before that are dropped (so
 * they do not all burst out at once on the first touch); music requested before that starts as
 * soon as audio unlocks. Operator settings (mute, master volume) persist in localStorage.
 */
export class AudioManager {
  private current: Track | null = null;
  private state: AudioSettings;

  constructor(
    private readonly sound: Phaser.Sound.BaseSoundManager,
    private readonly storage: Storage | null = browserStorage(),
  ) {
    this.state = parseAudioSettings(this.storage?.getItem(AUDIO_STORAGE_KEY) ?? null);
    this.apply();
  }

  get settings(): AudioSettings {
    return this.state;
  }

  private get locked(): boolean {
    return Boolean((this.sound as { locked?: boolean }).locked);
  }

  playSfx(key: SfxKey, { volume = 1, detune = 0, rate = 1 }: PlayOptions = {}): void {
    if (this.state.muted || this.locked) return;
    this.sound.play(key, { volume: SFX_VOLUME[key] * volume, detune, rate });
  }

  /** Start a looping track, cross-fading from whatever is playing. No-op if it is already playing. */
  playMusic(key: MusicKey, fadeMs = MUSIC_FADE_MS): void {
    if (this.current?.key === key) return;
    this.fadeOutCurrent(fadeMs);

    const sound = this.sound.add(key, { loop: true, volume: 0 });
    sound.play();
    // Phaser applies full volume on play(); make sure the track really starts silent.
    (sound as unknown as Fadeable).volume = 0;
    const track: Track = { sound, key, level: 0 };
    fadeTrack(track, MUSIC_VOLUME[key], fadeMs);
    this.current = track;
  }

  stopMusic(fadeMs = MUSIC_FADE_MS): void {
    this.fadeOutCurrent(fadeMs);
    this.current = null;
  }

  setMuted(muted: boolean): AudioSettings {
    return this.update({ ...this.state, muted });
  }

  toggleMuted(): AudioSettings {
    return this.setMuted(!this.state.muted);
  }

  cycleVolume(): AudioSettings {
    return this.update({ ...this.state, volume: nextVolume(this.state.volume) });
  }

  private fadeOutCurrent(fadeMs: number): void {
    const old = this.current;
    if (!old) return;
    fadeTrack(old, 0, fadeMs, () => old.sound.destroy());
  }

  private update(next: AudioSettings): AudioSettings {
    this.state = next;
    this.apply();
    try {
      this.storage?.setItem(AUDIO_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private mode or a full disk: the setting still applies for this session.
    }
    return next;
  }

  private apply(): void {
    this.sound.mute = this.state.muted;
    this.sound.volume = this.state.volume;
  }
}
