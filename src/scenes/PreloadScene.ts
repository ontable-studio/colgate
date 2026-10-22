import Phaser from 'phaser';
import { initAudio } from '@/audio';
import { MUSIC_KEYS, SFX_KEYS } from '@/config/audio';
import { registerUiArt } from '@/ui/art';
import { SceneKey } from './keys';

/** Game-ready assets exported by tools/export-assets (texture key = file name without extension). */
const IMAGES = [
  'capsule',
  'btn-gold',
  'tube',
  'bg-photo',
  'brush-empty',
  'brush-fill',
  'brush-outline',
  'ico-clock',
  'logo-colgate',
  'logo-wordmark',
] as const;

/**
 * Every game asset goes through Vite so its URL carries a content hash: a changed file gets a new
 * URL, so a browser or service worker that cached the old file can never serve it to new code.
 * (packshot.webp is only a source for the icon/PDF tools and is not shipped.)
 */
const ASSET_URLS = import.meta.glob<string>(
  ['../assets/*.webp', '../assets/audio/*.{ogg,mp3}', '!../assets/packshot.webp'],
  { eager: true, query: '?url', import: 'default' },
);

function assetUrl(file: string): string {
  const url = ASSET_URLS[`../assets/${file}`];
  if (!url) throw new Error(`Missing game asset: ${file}`);
  return url;
}

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
    for (const key of IMAGES) this.load.image(key, assetUrl(`${key}.webp`));
    // ogg first (gapless loops), mp3 as the fallback for TV browsers without Vorbis support.
    for (const key of [...SFX_KEYS, ...MUSIC_KEYS]) {
      this.load.audio(key, [assetUrl(`audio/${key}.ogg`), assetUrl(`audio/${key}.mp3`)]);
    }
  }

  create(): void {
    registerUiArt(this);
    initAudio(this.sound);
    this.scene.start(SceneKey.Attract);
  }
}
