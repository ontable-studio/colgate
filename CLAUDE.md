# CLAUDE.md

Colgate Optic White Vitamin C - **95% Vitamin C Blast**: booth touchscreen game (Phaser 3 + TypeScript + Vite, PWA, offline). Read this first: several older docs describe earlier versions of the game.

## The game today (22 Oct 2026)

- Tap the floating Vitamin C molecules for **30 seconds**. Points are the percentage: 95 points = 95% = win. The round ends at 95% or when time is up.
- Points by size: small 3, medium 2, large 1. No multiplier, no penalties (a missed tap only counts as a miss; a molecule next to the tap gets away).
- Over time: until 10 s normal (small 40% / medium 30% / large 30%); from 10 s the chance of small rises evenly to 70% (medium 20%, large 10%); in the last 15 s the gap between spawns widens from 0.33 s to 0.5 s.
- Constant all round: molecule lifetime 3 s, drift speed 40 px/s, at most 7 on screen, molecules slow down instead of colliding and spawn 30 px clear of each other.
- Screens: Attract, How to Play, Gameplay (countdown first), Result (CONGRATULATIONS! / GOOD TRY!, percentage, "High Purity Vitamin C", HOME, PLAY AGAIN).
- Hardware: 43 inch Android TV, portrait, driven with a remote. Install guide: `docs/INSTALL.md` (+ `.pdf`, rebuilt with `python tools/docs-pdf/build_pdf.py`; close any open PDF viewer first, Chrome cannot overwrite a locked file).

## Does NOT exist (do not describe or invoice these as features)

Backend, stored player data, IndexedDB, admin screen, CSV export, leaderboard / Top 10, initials entry, Unlock screen, in-game volume control, capsules, stains, decoys, basket, combo multiplier, 15-second round.

## Where things are

- All tunable numbers: `src/config/game.ts` (`RULES`). Pure logic with tests: `src/domain/` (`bubbles.ts`, `session.ts`). Scenes: `src/scenes/`.
- Kept current: `docs/ARCHITECTURE.md`, `README.md`, `docs/INSTALL.md`, `docs/UAT-test-case-tambahan.csv` (rewritten for the current game).
- **Outdated, kept as history:** `PLAN.md` below its "Kondisi game saat ini" section (original scope, price, schedule) and `docs/wireframes/index.html` (marked USANG).
- The difficulty numbers were tuned with a rough simulated-player model, not real play-tests.

## Working here

- `pnpm check` = typecheck + lint + format:check + test. Commits follow Conventional Commits (commitlint: header up to 100 chars, body lines up to 100).
- Screenshots: run `pnpm dev`, then `node tools/screenshots/capture.mjs` (writes `docs/screenshots/`; the zip there is rebuilt by hand).
- Reply to the user in Indonesian.
