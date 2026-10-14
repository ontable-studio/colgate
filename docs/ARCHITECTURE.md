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
  ui/                reusable Phaser UI pieces (button, later: keyboard, meter)
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

## Operator (admin) screen

Press and hold the invisible top-left corner of the Attract screen for 2 s. Shows device id, version, online state, sync on/off, plays and pending counts, last sync and error. Buttons: SYNC NOW (flush the queue immediately), EXPORT CSV (`domain/csv.ts`, UTF-8 BOM so Excel opens it; some TV browsers block downloads, so test this on the real TV), RESET DATA (two taps within 4 s, deletes all local plays) and BACK. Idle for 30 s returns to Attract. There is no PIN: it relies on the hidden hotspot, so do not rely on it to protect personal data.

## Testing

Vitest in a Node environment. Only non-Phaser code is unit tested (`domain`, `services`); IndexedDB is provided by `fake-indexeddb`. Scenes are verified manually on a real screen, see the TV checklist in PLAN.md.

## Not built yet (see PLAN.md)

Remaining art (basket, stain enemy, UI), final end-screen animation, audio.
