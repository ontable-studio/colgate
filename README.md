# Colgate Optic White Vitamin C - Catch the Brightness

Booth touchscreen game by Ontable Studio. Portrait TV (43"/55", Full HD/4K) running in the TV browser, offline-first.

See [PLAN.md](PLAN.md) for scope, schedule, assumptions and open client questions, and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code is organised.

## Stack

Phaser 3.90 · TypeScript 6 · Vite 8 · vite-plugin-pwa (offline) · idb (IndexedDB) · Vitest · ESLint 10 + Prettier · Husky + lint-staged + commitlint

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

| Variable             | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `VITE_SYNC_ENDPOINT` | Google Apps Script web app URL. Empty = local-only, no sync |
| `VITE_SYNC_SECRET`   | Shared secret checked by the script (noise reduction only)  |
| `VITE_DEVICE_ID`     | Booth identifier written to the sheet                       |

Game rules (duration, points, spawn rates) live in `src/config/game.ts`. They are assumptions until the client confirms.

Google Sheet setup: [docs/apps-script/README.md](docs/apps-script/README.md).

## Assets

- `.resources/` holds the raw client files (CMYK PSD/AI/TIF, zips, ~14 GB). It is **git-ignored**. Do not commit it.
- Game-ready assets (RGB PNG/WebP, fonts) go in `public/assets/`. Use the same texture keys as the placeholders generated in `src/scenes/PreloadScene.ts`.
- The PWA icons in `public/icons/` are solid-colour placeholders.
