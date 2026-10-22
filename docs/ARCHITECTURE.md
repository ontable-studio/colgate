# Architecture

Goal: a booth game that keeps working when things go wrong (no internet, idle visitors, TV browser quirks) and is easy for one developer to change quickly.

## Layers

```
src/
  main.ts            entry: register service worker, create game
  app/               Phaser game factory (createGame.ts), updates, watchdog
  config/            tunables: game.ts (resolution, rules, idle timeout)
  domain/            PURE logic, no Phaser, no browser APIs  -> unit tested
  services/          I/O: idle watcher
  scenes/            Phaser scenes (thin: input, rendering, call into domain/services)
  ui/                reusable Phaser UI pieces: button, panel, brush meter, effects, motion, theme
  ui/art/            procedural canvas textures (background, skins, icons, objects, brand marks)
tests/               Vitest, mirrors src/ (domain, services)
```

Dependency rule: `scenes -> domain/services/config`, `services -> domain/config`, `domain -> config` only. Domain never imports Phaser or services. This keeps the rules testable without a browser.

## Flow

```
Boot -> Preload -> Attract -> HowToPlay -> Gameplay -> Result -> (Play again -> Gameplay | Home -> Attract)
                      ^                                    |
                      +---------- idle 30 s on HowToPlay / Result ----------+
```

Scene keys are in `src/scenes/keys.ts`. Scenes pass data with `scene.start(key, data)`.

## Game rules

The game: tap the floating Vitamin C molecules for 30 s. Points are the percentage (95 points = 95% = win); the round ends at 95% or when the time is up. No penalties: a missed tap only counts as a miss, and a molecule close to the tap gets away.

`GameSession` (`domain/session.ts`) owns score, percentage and timer (`pop(size)`, `miss()`). `GameplayScene` spawns and moves the molecules and forwards taps. All numbers come from `RULES` in `config/game.ts`; change rules there, not in scenes.

Points by size: small 3, medium 2, large 1. How the round changes over time (all in `RULES`, pure functions in `domain/bubbles.ts`):

| Time      | What changes                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------- |
| 0 - 10 s  | Normal: a molecule every 0.33 s, sizes small 40% / medium 30% / large 30%                               |
| 10 - 30 s | The size chances move evenly to small 70% / medium 20% / large 10% (`weightShiftFromSec`, `lateWeight`) |
| Last 15 s | The gap between spawns widens evenly from 0.33 s to 0.5 s (`rush`)                                      |

Constant all round: molecule lifetime 3 s, drift speed 40 px/s, at most 7 on screen. Molecules never run into each other: a new one only appears 30 px clear of the others, and one heading toward another slows to a stop (`crowd`, `crowdSlowdown`).

## Data

The game has no backend and keeps no player data: `ResultScene` only shows the result. Nothing is stored or exported.

## Booth-proofing

- `IdleWatcher` returns to Attract after 30 s without pointer/key activity, but only from HowToPlay and Result (`IDLE_RESET_SCENES` in `scenes/keys.ts`). A scene can implement `IdleAware.onIdle()` to handle it itself instead. Gameplay is excluded: a round ends by itself, and cutting it short loses the player's result.
- `style.css` disables scroll, zoom, text selection, long-press callouts and pull-to-refresh; Phaser's context menu is disabled.
- Fullscreen is requested from the first tap on START (needs a user gesture).
- PWA (`vite-plugin-pwa`) precaches the build so the game runs offline. Asset types must be listed in `workbox.globPatterns` (`vite.config.ts`) or they will not be cached.

## Motion and layout checks

- Reusable animation helpers live in `ui/motion.ts` (fade-in, pop-in, slide-in, float, count-up, bump, floating "+N points", spark burst). Every scene fades in; Attract and Result are the liveliest.
- Each scene documents its vertical layout in a comment block (which y-range belongs to which element). Keep elements in their own ranges so nothing collides.
- In dev (`pnpm dev`) the game is exposed as `window.__game`, so from the browser console you can jump to any screen, e.g. `__game.scene.getScenes(true)[0].scene.start('Result', { result: { score: 95, meterPct: 95, pops: 24, misses: 5, durationSec: 22 } })`, and measure element bounds to look for overlaps.

## Sound

All audio is synthesised by `tools/generate-audio/generate_audio.py` (no samples), so it is royalty free and reproducible: 14 effects (some, such as the keyboard and stain sounds, are left over from earlier versions and are not played) and two music loops, each written as OGG (gapless loops) and MP3 (fallback for TV browsers without Vorbis) into `src/assets/audio/`.

- **Direction:** bright and clean like the product. Rewards are high, short and rising (glass bells); penalties are low and dull but never harsh; music stays well below the effects.
- **Music:** `bgm-attract` (92 BPM, 8 bars, calm and sparkling) plays on Attract, How to Play and Result. `bgm-game` (124 BPM, 16 bars, four sections that build up) plays during a round and cross-fades in and out.
- **Moments:** button taps, keyboard keys (with random pitch jitter), a molecule popped (`sfx-catch`), a missed tap, last-5-seconds ticks (rising pitch), time-up, the end-of-round stinger, the whoosh on screen changes and the Result jingle.
- **Code:** `config/audio.ts` lists keys and relative volumes; `domain/audioSettings.ts` is the testable logic (settings parsing, volume steps); `audio/audioManager.ts` wraps Phaser's sound manager (music cross-fades, mute and master volume saved in localStorage); scenes call the safe `audio` facade from `audio/index.ts`.
- **Autoplay:** browsers only allow sound after the first touch. Effects before that are dropped, and music starts on the first tap (START). For attract music with nobody touching the screen, launch the booth browser with `--autoplay-policy=no-user-gesture-required`.
- **Changing the sound:** edit the generator (tempo, chords, patterns and levels are plain constants at the top of each function) and re-run it; the random seed is fixed, so output is identical between runs.

## Resilience (unattended booth)

- **Crash guard** (`app/watchdog.ts`): an uncaught error or rejected promise reloads the page back to Attract. A rate limit (`domain/reloadGuard.ts`, 3 reloads per minute) stops a bug that fails on every boot from looping; after the limit it shows "Something went wrong" and retries once the window has passed, so an unattended booth recovers by itself. WebGL context loss and a failed boot use the same path.
- **Frame watchdog:** if the render loop stops advancing for 15 s while the page is visible, the page reloads.
- **Safe updates** (`app/updates.ts`, `domain/updateController.ts`): the service worker uses `registerType: 'prompt'`, so a new build waits instead of replacing the running one. The page asks for updates every 2 minutes (a kiosk never navigates; `public/_headers` keeps `sw.js` out of the HTTP cache so the check sees new builds) and activates a waiting build only while the attract screen is showing, never mid-round. Verified end to end: held during How to Play, applied after the idle reset to Attract.
- **Light mode** (`config/quality.ts`, `domain/lowPower.ts`): if the frame rate stays below 38 fps for five checks in a row, sparkles and confetti are cut to a third for the rest of the session. `?quality=low` forces it (useful to test on a weak TV).

The operator checklist lives in [INSTALL.md](INSTALL.md).

## Testing

Vitest in a Node environment. Only non-Phaser code is unit tested (`domain`, `services`). Scenes are verified manually on a real screen, see the TV checklist in PLAN.md. The numbers in `RULES` were tuned with a rough simulated-player model (expert, good, average and casual players), not real play-tests: play it on the TV before the event.
