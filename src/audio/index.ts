import type Phaser from 'phaser';
import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from '@/domain/audioSettings';
import type { MusicKey, SfxKey } from '@/config/audio';
import { AudioManager, type PlayOptions } from './audioManager';

let manager: AudioManager | undefined;

/** Create the audio manager once the game's sound system exists (called from PreloadScene). */
export function initAudio(sound: Phaser.Sound.BaseSoundManager): void {
  manager = new AudioManager(sound);
}

/**
 * Safe entry point for scenes and UI: every call does nothing until `initAudio` has run, so
 * code never has to check whether sound is ready.
 */
export const audio = {
  playSfx(key: SfxKey, options?: PlayOptions): void {
    manager?.playSfx(key, options);
  },
  playMusic(key: MusicKey, fadeMs?: number): void {
    manager?.playMusic(key, fadeMs);
  },
  stopMusic(fadeMs?: number): void {
    manager?.stopMusic(fadeMs);
  },
  get settings(): AudioSettings {
    return manager?.settings ?? DEFAULT_AUDIO_SETTINGS;
  },
  toggleMuted(): AudioSettings {
    return manager?.toggleMuted() ?? DEFAULT_AUDIO_SETTINGS;
  },
  cycleVolume(): AudioSettings {
    return manager?.cycleVolume() ?? DEFAULT_AUDIO_SETTINGS;
  },
};
