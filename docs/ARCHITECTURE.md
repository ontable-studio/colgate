# Architecture

Goal: a booth game that keeps working when things go wrong (no internet, idle visitors, TV browser quirks) and is easy for one developer to change quickly.

## Layers

```
src/
  main.ts            entry: register service worker, init services, create game
  app/               composition root (container.ts) and Phaser game factory (createGame.ts)
  config/            tunables: game.ts (resolution, rules, idle timeout), env.ts (build-time env)
  domain/            PURE logic, no Phaser, no browser APIs  -> unit tested
  services/          I/O: storage (IndexedDB), idle watcher
  scenes/            Phaser scenes (thin: input, rendering, call into domain/services)
  ui/                reusable Phaser UI pieces: button, panel, keyboard, meter, effects, theme
  ui/art/            procedural canvas textures (background, skins, icons, objects, brand marks)
  util/              small helpers
tests/               Vitest, mirrors src/ (domain, services)
```

Dependency rule: `scenes -> domain/services/config`, `services -> domain/config`, `domain -> config` only. Domain never imports Phaser or services. This keeps the rules testable without a browser.

## Flow

```
Boot -> Preload -> Attract -> HowToPlay -> Gameplay -> Result -> (Play again -> Gameplay | Home -> Attract)
                      ^                                    |
                      +---------- idle 30 s on HowToPlay / Result / Admin ----------+
```

Scene keys are in `src/scenes/keys.ts`. Scenes pass data with `scene.start(key, data)`.

## Game rules

`GameSession` (`domain/session.ts`) owns score, brightness meter and timer. `GameplayScene` only spawns objects and forwards catches (`session.catch(kind)`). All numbers come from `RULES` in `config/game.ts`; change rules there, not in scenes.

## Data (offline-first)

1. `ResultScene` writes a `PlayRecord` to IndexedDB via `PlaysRepository`. Nothing leaves the device.
2. The admin screen lists the stored plays from local data, so it never depends on the network.
3. The operator exports all plays from the admin screen as CSV (`domain/csv.ts`).

Idb caveat: a transaction auto-closes if you await unrelated async work (e.g. `fetch`) inside it. Keep transactions short and never network inside one.

## Booth-proofing

- `IdleWatcher` returns to Attract after 30 s without pointer/key activity, but only from HowToPlay, Result and Admin (`IDLE_RESET_SCENES` in `scenes/keys.ts`). A scene can implement `IdleAware.onIdle()` to handle it itself instead. Gameplay is excluded: a round ends by itself, and cutting it short loses the player's result.
- `style.css` disables scroll, zoom, text selection, long-press callouts and pull-to-refresh; Phaser's context menu is disabled.
- Fullscreen is requested from the first tap on START (needs a user gesture).
- PWA (`vite-plugin-pwa`, `autoUpdate`) precaches the build so the game runs offline. Asset types must be listed in `workbox.globPatterns` (`vite.config.ts`) or they will not be cached.
- `navigator.storage.persist()` is requested to reduce the chance the TV evicts stored plays.

## Motion and layout checks

- Reusable animation helpers live in `ui/motion.ts` (fade-in, pop-in, slide-in, float, count-up, bump, floating "+10", spark burst, black shards). Every scene fades in; Attract and Result are the liveliest.
- Each scene documents its vertical layout in a comment block (which y-range belongs to which element). Keep elements in their own ranges so nothing collides.
- In dev (`pnpm dev`) the game is exposed as `window.__game`, so from the browser console you can jump to any screen, e.g. `__game.scene.getScenes(true)[0].scene.start('Result', { result: { score: 205, meterPct: 62, catches: 14, hits: 3, durationSec: 40 }, initials: 'ABC' })`, and measure element bounds to look for overlaps.

## Sound

All audio is synthesised by `tools/generate-audio/generate_audio.py` (no samples), so it is royalty free and reproducible: 14 effects and two music loops, each written as OGG (gapless loops) and MP3 (fallback for TV browsers without Vorbis) into `public/assets/audio/`.

- **Direction:** bright and clean like the product. Rewards are high, short and rising (glass bells); penalties are low and dull but never harsh; music stays well below the effects.
- **Music:** `bgm-attract` (92 BPM, 8 bars, calm and sparkling) plays on Attract, How to Play and Result. `bgm-game` (124 BPM, 16 bars, four sections that build up) plays during a round and cross-fades in and out.
- **Moments:** button taps, keyboard keys (with random pitch jitter), catch (a streak of capsules climbs one semitone each, up to 8), stain and decoy hits, last-5-seconds ticks (rising pitch), time-up, the Unlock stinger (its chord is timed to the sparkle burst), score count ticks and the Result jingle.
- **Code:** `config/audio.ts` lists keys and relative volumes; `domain/audioSettings.ts` is the testable logic (settings parsing, volume steps, combo pitch); `audio/audioManager.ts` wraps Phaser's sound manager (music cross-fades, mute and master volume saved in localStorage); scenes call the safe `audio` facade from `audio/index.ts`.
- **Operator:** the admin screen has SOUND ON/OFF and a VOLUME button (25, 50, 75, 100%).
- **Autoplay:** browsers only allow sound after the first touch. Effects before that are dropped, and music starts on the first tap (START). For attract music with nobody touching the screen, launch the booth browser with `--autoplay-policy=no-user-gesture-required`.
- **Changing the sound:** edit the generator (tempo, chords, patterns and levels are plain constants at the top of each function) and re-run it; the random seed is fixed, so output is identical between runs.

## Game balance and fairness

Plain random spawning and box collisions felt unfair, so the round is built from small pure pieces in `domain/` (all unit tested):

- `difficulty.ts` blends a few keyframes (`RULES.spawn.stages`) so the pace rises smoothly: gentle start, brisk finish.
- `spawner.ts` schedules what falls and where. The opening is all capsules, hazards never come more than twice in a row, a hazard is due after four capsules in a row, and each object lands only where a player can reach it from the previous one in the time between them.
- `catching.ts` decides, the frame an object's centre crosses the rim line, whether it counts: capsules are forgiving (a rim touch scores), hazards strict (only a clear drop into the bowl hits). Physics only moves the objects.
- `session.ts` always runs the full round (15 s) even when the meter is full; the combo multiplier keeps spreading the scores after that.
- A combo multiplier (`RULES.combo`, streak of capsules in a row; broken by stain, decoy or a missed capsule) scales capsule points only, never the meter, so winning stays as fair as before while top scores vary widely (simulated expert about 285–415 in the 15 s round).

`tests/domain/balance.test.ts` simulates players from novice to expert over hundreds of rounds and fails if the rules become brutal, trivial or unable to tell good players apart. The player model (`tests/support/simulate.ts`) is an assumption: calibrate it with real play-tests. To see the numbers, run `BALANCE_REPORT=1 pnpm exec vitest run tests/domain/balance.test.ts --reporter=verbose`; to explore other values, `SWEEP=1 pnpm exec vitest run tests/domain/balance.sweep.test.ts --reporter=verbose`.

## Resilience (unattended booth)

- **Crash guard** (`app/watchdog.ts`): an uncaught error or rejected promise reloads the page back to Attract. A rate limit (`domain/reloadGuard.ts`, 3 reloads per minute) stops a bug that fails on every boot from looping; after the limit it shows "Something went wrong" and retries once the window has passed, so an unattended booth recovers by itself. WebGL context loss and a failed boot use the same path.
- **Frame watchdog:** if the render loop stops advancing for 15 s while the page is visible, the page reloads.
- **Safe updates** (`app/updates.ts`, `domain/updateController.ts`): the service worker uses `registerType: 'prompt'`, so a new build waits instead of replacing the running one. The page asks for updates every 2 minutes (a kiosk never navigates; `public/_headers` keeps `sw.js` out of the HTTP cache so the check sees new builds) and activates a waiting build only while the attract screen is showing, never mid-round. Verified end to end: held during How to Play, applied after the idle reset to Attract.
- **Light mode** (`config/quality.ts`, `domain/lowPower.ts`): if the frame rate stays below 38 fps for five checks in a row, sparkles and confetti are cut to a third for the rest of the session. `?quality=low` forces it (useful to test on a weak TV); the admin screen shows the current quality.

The operator checklist lives in [INSTALL.md](INSTALL.md).

## Operator (admin) screen

Press and hold the invisible top-left corner of the Attract screen for 2 s. Shows the stored plays (time and percentage, newest first), the total count, and VOLUME / SOUND buttons. Buttons: EXPORT CSV (the download icon) (`domain/csv.ts`, UTF-8 BOM so Excel opens it; some TV browsers block downloads, so test this on the real TV), a trash icon that asks in a dialog (HAPUS / BATAL) before deleting all local plays, and BACK HOME. Idle for 30 s returns to Attract. There is no PIN: it relies on the hidden hotspot, so do not rely on it to protect personal data.

## Testing

Vitest in a Node environment. Only non-Phaser code is unit tested (`domain`, `services`); IndexedDB is provided by `fake-indexeddb`. Scenes are verified manually on a real screen, see the TV checklist in PLAN.md.

## Not built yet (see PLAN.md)

Remaining art (basket, stain enemy, UI) and the final end-screen animation.
