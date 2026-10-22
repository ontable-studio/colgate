# Colgate Optic White Vitamin C - 95% Vitamin C Blast

Booth touchscreen game by Ontable Studio. Portrait TV (43"/55", Full HD/4K) running in the TV browser, offline-first.

**What the game is now:** tap the floating Vitamin C molecules for 30 seconds to fill the toothbrush to 95%. Screens: Attract, How to Play, Gameplay, Result (HOME / PLAY AGAIN). There is no backend, no player data, no admin screen, no leaderboard and no CSV export. Older notes about capsules, stains, decoys, combo, initials, Top 10 or a 15-second round describe earlier versions and are out of date (see [CLAUDE.md](CLAUDE.md)).

See [docs/INSTALL.md](docs/INSTALL.md) for the on-site installation and operation checklist (Indonesian), [PLAN.md](PLAN.md) for scope, schedule, assumptions and open client questions, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code is organised.

## Stack

Phaser 3.90 · TypeScript 6 · Vite 8 · vite-plugin-pwa (offline) · Vitest · ESLint 10 + Prettier · Husky + lint-staged + commitlint

## Getting started

Requires Node >= 22.12 and pnpm 10.

```bash
pnpm install
pnpm dev
```

Open the printed URL. Resize the window to a portrait ratio (9:16) to preview the TV layout.

## Scripts

| Script                          | What it does                                          |
| ------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                      | Dev server                                            |
| `pnpm build`                    | Typecheck + production build (+ service worker)       |
| `pnpm preview`                  | Serve the production build (test offline/PWA here)    |
| `pnpm typecheck`                | `tsc --noEmit`                                        |
| `pnpm lint` / `pnpm lint:fix`   | ESLint                                                |
| `pnpm format` / `format:check`  | Prettier                                              |
| `pnpm test` / `pnpm test:watch` | Vitest                                                |
| `pnpm check`                    | typecheck + lint + format:check + test (what CI runs) |

## Git workflow

- Conventional Commits are enforced by commitlint (`feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`, `refactor: ...`, `test: ...`).
- Hooks (Husky): `pre-commit` runs lint-staged (ESLint + Prettier on staged files), `commit-msg` runs commitlint, `pre-push` runs typecheck + tests.
- Branch from `main`, open a PR. CI runs `pnpm check` and a build.

## Configuration

Copy `.env.example` to `.env` (never commit it):

| Variable        | Purpose                                                     |
| --------------- | ----------------------------------------------------------- |
| `VITE_SITE_URL` | Public address of the deployed game (canonical/share links) |

Game rules (duration, points, spawn rates, how the round gets harder) live in `src/config/game.ts`. They are assumptions until the client confirms.

The game has no backend and stores no player data.

## Assets

- `.resources/` holds the raw client files (CMYK PSD/AI/TIF, zips, ~14 GB). It is **git-ignored**. Do not commit it.
- Game-ready assets (RGB WebP) live in `src/assets/` and are loaded in `src/scenes/PreloadScene.ts` (texture key = file name).
- Most are generated from the raw files by `tools/export-assets/export_assets.py` (CMYK TIF/PSD -> trimmed, resized, transparent WebP; it also cuts the white Colgate wordmark out of the tube artwork). Re-run it when Oji sends a new source file:

  ```bash
  pip install -r tools/export-assets/requirements.txt
  python tools/export-assets/export_assets.py
  ```

- The rest of the UI kit is drawn in code from the client's storyboard (`src/ui/art/`): red radial background with light rays, glowing pill buttons, panels, HUD icons, Brightness Meter, gold gradient titles and the toothbrush meter. Drawing them in code keeps the download small and sharp at 4K. If Oji delivers final art for any of these, load it in `PreloadScene` under the same texture key and delete the matching draw call.
- Brand font: Colgate Ready (Light, Bold, Bold Italic) is in `src/assets/fonts/` and loaded in `src/style.css`; `src/main.ts` waits for it before the game starts.
- Brand colours come from the client's palette file (`COLGATE COLOR.ai`): red `#ED1C24`, orange `#F37021`, gold `#FDB415` (see `src/ui/theme.ts`).
- The PWA icons in `public/icons/` are solid-colour placeholders.

## Sound

Music and effects are generated, not recorded: `pip install -r tools/generate-audio/requirements.txt` then `python tools/generate-audio/generate_audio.py --report` (writes OGG + MP3 to `src/assets/audio/` and prints levels). Volumes per effect live in `src/config/audio.ts`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#sound) for the sound design and the browser autoplay note.
