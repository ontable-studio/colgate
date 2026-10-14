# Architecture

Goal: a booth game that keeps working when things go wrong (no internet, idle visitors, TV browser quirks) and is easy for one developer to change quickly.

## Layers

```
src/
  main.ts            entry: register service worker, init services, create game
  app/               composition root (container.ts) and Phaser game factory (createGame.ts)
  config/            tunables: game.ts (resolution, rules, idle timeout), env.ts (build-time env)
  domain/            PURE logic, no Phaser, no browser APIs  -> unit tested
  services/          I/O: storage (IndexedDB), sync (Google Sheets), idle watcher
  scenes/            Phaser scenes (thin: input, rendering, call into domain/services)
  ui/                reusable Phaser UI pieces: button, panel, keyboard, meter, effects, theme
  ui/art/            procedural canvas textures (background, skins, icons, objects, brand marks)
  util/              small helpers
tests/               Vitest, mirrors src/ (domain, services)
```

Dependency rule: `scenes -> domain/services/config`, `services -> domain/config`, `domain -> config` only. Domain never imports Phaser or services. This keeps the rules testable without a browser.

## Flow

```
Boot -> Preload -> Attract -> HowToPlay -> Gameplay -> Unlock -> Initials -> Result -> (Play again -> Gameplay)
                      ^                                                   |
                      +---------- idle 30 s on HowToPlay / Initials / Result ----------+
```

Scene keys are in `src/scenes/keys.ts`. Scenes pass data with `scene.start(key, data)`.

## Game rules

`GameSession` (`domain/session.ts`) owns score, brightness meter and timer. `GameplayScene` only spawns objects and forwards catches (`session.catch(kind)`). All numbers come from `RULES` in `config/game.ts`; change rules there, not in scenes.

## Data and sync (offline-first)

1. `ResultScene` writes a `PlayRecord` (`syncStatus: 'pending'`) to IndexedDB via `PlaysRepository`. This always happens first.
2. The leaderboard (top N) is read from local data, so it never depends on the network.
3. `SyncService` drains `pending` on an interval, when the browser fires `online`, and with exponential backoff after failures. It reads a batch, closes the transaction, calls `SendBatch`, then marks only the ids the server accepted as `synced`.
4. `createSheetsClient` posts JSON as `text/plain` to a Google Apps Script web app (a "simple" CORS request, no preflight). The script de-duplicates by `id`, so retries are safe.
5. If `VITE_SYNC_ENDPOINT` is empty, sync is disabled and everything stays local.

Idb caveat: a transaction auto-closes if you await unrelated async work (e.g. `fetch`) inside it. Keep transactions short and never network inside one.

## Booth-proofing

- `IdleWatcher` returns to Attract after 30 s without pointer/key activity, but only from HowToPlay, Initials and Result (`IDLE_RESET_SCENES` in `scenes/keys.ts`). A scene can implement `IdleAware.onIdle()` to handle it itself: Initials saves the play with whatever was typed instead of dropping it. Gameplay/Unlock are excluded: a round ends by itself, and cutting it short loses the player's result.
- `style.css` disables scroll, zoom, text selection, long-press callouts and pull-to-refresh; Phaser's context menu is disabled.
- Fullscreen is requested from the first tap on PLAY NOW (needs a user gesture).
- PWA (`vite-plugin-pwa`, `autoUpdate`) precaches the build so the game runs offline. Asset types must be listed in `workbox.globPatterns` (`vite.config.ts`) or they will not be cached.
- `navigator.storage.persist()` is requested to reduce the chance the TV evicts stored plays.

## Motion and layout checks

- Reusable animation helpers live in `ui/motion.ts` (fade-in, pop-in, slide-in, float, count-up, bump, floating "+10", spark burst, black shards). Every scene fades in; Attract and Result are the liveliest.
- Each scene documents its vertical layout in a comment block (which y-range belongs to which element). Keep elements in their own ranges so nothing collides.
- In dev (`pnpm dev`) the game is exposed as `window.__game`, so from the browser console you can jump to any screen, e.g. `__game.scene.getScenes(true)[0].scene.start('Result', { result: { score: 205, meterPct: 62, catches: 14, hits: 3, durationSec: 40 }, initials: 'ABC' })`, and measure element bounds to look for overlaps.

## Sound

All audio is synthesised by `tools/generate-audio/generate_audio.py` (no samples), so it is royalty free and reproducible: 14 effects and two music loops, each written as OGG (gapless loops) and MP3 (fallback for TV browsers without Vorbis) into `public/assets/audio/`.

- **Direction:** bright and clean like the product. Rewards are high, short and rising (glass bells); penalties are low and dull but never harsh; music stays well below the effects.
- **Music:** `bgm-attract` (92 BPM, 8 bars, calm and sparkling) plays on Attract, How to Play, Initials and Result. `bgm-game` (124 BPM, 16 bars, four sections that build up) plays during a round and cross-fades in and out.
- **Moments:** button taps, keyboard keys (with random pitch jitter), catch (a streak of capsules climbs one semitone each, up to 8), stain and decoy hits, last-5-seconds ticks (rising pitch), time-up, the Unlock stinger (its chord is timed to the sparkle burst), score count ticks and the Result jingle.
- **Code:** `config/audio.ts` lists keys and relative volumes; `domain/audioSettings.ts` is the testable logic (settings parsing, volume steps, combo pitch); `audio/audioManager.ts` wraps Phaser's sound manager (music cross-fades, mute and master volume saved in localStorage); scenes call the safe `audio` facade from `audio/index.ts`.
- **Operator:** the admin screen has SOUND ON/OFF and a VOLUME button (25, 50, 75, 100%).
- **Autoplay:** browsers only allow sound after the first touch. Effects before that are dropped, and music starts on the first tap (PLAY NOW). For attract music with nobody touching the screen, launch the booth browser with `--autoplay-policy=no-user-gesture-required`.
- **Changing the sound:** edit the generator (tempo, chords, patterns and levels are plain constants at the top of each function) and re-run it; the random seed is fixed, so output is identical between runs.

## Operator (admin) screen

Press and hold the invisible top-left corner of the Attract screen for 2 s. Shows device id, version, online state, sync on/off, plays and pending counts, last sync and error. Buttons: SYNC NOW (flush the queue immediately), EXPORT CSV (`domain/csv.ts`, UTF-8 BOM so Excel opens it; some TV browsers block downloads, so test this on the real TV), RESET DATA (two taps within 4 s, deletes all local plays) and BACK. Idle for 30 s returns to Attract. There is no PIN: it relies on the hidden hotspot, so do not rely on it to protect personal data.

## Testing

Vitest in a Node environment. Only non-Phaser code is unit tested (`domain`, `services`); IndexedDB is provided by `fake-indexeddb`. Scenes are verified manually on a real screen, see the TV checklist in PLAN.md.

## Not built yet (see PLAN.md)

Remaining art (basket, stain enemy, UI) and the final end-screen animation.
