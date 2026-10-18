import Phaser from 'phaser';
import { initAudio } from '@/audio';
import { MUSIC_KEYS, SFX_KEYS } from '@/config/audio';
import { registerUiArt } from '@/ui/art';
import { preloadVideos } from '@/ui/videoBackground';
import { SceneKey } from './keys';

/** Game-ready assets exported by tools/export-assets (texture key = file name without extension). */
const IMAGES = [
  'capsule',
  'stain',
  'decoy',
  'basket',
  'btn-gold',
  'tube',
  'dropper',
  'flare',
  'tooth1',
  'tooth2',
  'tooth3',
  'tooth4',
  'logo-colgate',
  'logo-wordmark',
] as const;

/**
 * Loads the supplied art and the sound files, then draws the rest of the UI kit (backgrounds,
 * buttons, icons, ...) procedurally. To replace any generated texture with real
 * art from Oji, load it here under the same key and drop the matching draw call in `ui/art`.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Preload);
  }

  preload(): void {
    for (const key of IMAGES) this.load.image(key, `assets/${key}.webp`);
    // ogg first (gapless loops), mp3 as the fallback for TV browsers without Vorbis support.
    for (const key of [...SFX_KEYS, ...MUSIC_KEYS]) {
      this.load.audio(key, [`assets/audio/${key}.ogg`, `assets/audio/${key}.mp3`]);
    }
  }

  create(): void {
    preloadVideos();
    registerUiArt(this);
    initAudio(this.sound);
    this.scene.start(SceneKey.Attract);
  }
}
