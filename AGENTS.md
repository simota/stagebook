# AGENTS.md

Stagebook: a static React + TypeScript app (Vite, Zustand, zod) that makes a band's documents for one show and
prints them. No server: data lives in the browser's localStorage. What it does: `README.md`. Why it is built
this way: `docs/plans/architecture.md`. Where a feature's code and tests are: `docs/feature-map.md`.

## Architecture
- Imports run one way (checked by `node scripts/static-metrics.mjs --check`, part of `scripts/verify.sh`):
  `src/model/` imports nothing of ours · `src/store/` → model · `src/sheets/` → model ·
  `src/editor/` → model, store, and from sheets only `src/sheets/stage/StageSvg.tsx` ·
  `src/download.ts` → model, store · `src/share.ts` → model · `src/Topbar.tsx` → model, store, download, share ·
  `src/App.tsx` and `src/main.tsx` → anything
- `src/model/` and `src/store/` do not touch the DOM (`document`, `window`): same check
- Data from outside (a file, a share link, localStorage) enters only through `parseShow` in `src/model/show.ts`
- Sheets in `src/sheets/` draw from the show they are given and hold no state; the same component is the
  preview and the printed page
- Change only what the task needs. Unrelated edits go in their own commit

## Coding
- Code, identifiers, comments and commit messages are in English; UI text and `docs/` are in Japanese.
  Commits follow conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- New behaviour comes with a test: logic in `src/model/` or `src/store/` gets a Vitest test next to it,
  anything on screen gets a Playwright test in `e2e/`. Only review checks this
- A field added to the schema in `src/model/show.ts` gets a default (`.default(...)` / `.prefault({})`)
  so that data saved by an older build, backups and share links still open (only review checks this). Values
  that can be computed (song numbers, channel numbers, totals, the band's own timetable slot) are computed,
  never stored
- Storage keys (`setlist:*`) and the backup format name (`setlist-generator-backup`) are kept as they are:
  existing saved data depends on them
- A type error is fixed, never silenced (`@ts-ignore`, `any` to get past it)

## Verification
- After every change: `./scripts/verify.sh` (types, boundaries, and the unit tests related to what changed).
  Before a commit that touches anything on screen, and before a pull request: `./scripts/verify.sh --full`
  (adds all unit tests, the build and the e2e suite; timings in `.verify/timings`)
- A failing check is investigated and repaired. Its log is `.verify/<check>.log`; Playwright's traces and
  screenshots are under `test-results/`. No test is deleted or skipped to make the gate pass (only review checks
  this)
- e2e builds the app, serves it on 127.0.0.1:4173 and drives the system Google Chrome. Where opening a local
  port is forbidden (a sandbox), `e2e` fails with `listen EPERM`: that is the environment, not the code
- To see a change in the app: `npm run dev`. Quality measurements (not a gate): `npm run measure`

## Safety
- A push to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`, https://simota.github.io/stagebook/):
  that is production. Only a person pushes. Nothing enforces this: no branch protection is configured on
  `main` of https://github.com/simota/stagebook
- No secret or credential is printed, committed or pasted into a file. The app has none and needs none
- These need a person before the change is made: a new dependency (`package.json`, `package-lock.json`), a
  change to the schema in `src/model/show.ts`, the Content-Security-Policy in `vite.config.ts`, what a share
  link carries (`src/share.ts`), and the gate itself (`scripts/verify.sh`, `.github/`, this file). Nothing enforces
  this either (no CODEOWNERS yet)
  <!-- #TODO(agent): BLOCKED — CODEOWNERS and branch protection on main wait for a person to confirm owners. -->
- Guests' names in the ticket reservations never go into a share link (`src/share.ts` leaves them out; tested)

## Pull requests
- Fill every section of `.github/pull_request_template.md`, with the output of `./scripts/verify.sh --full`
- Say what was not verified (Safari and Firefox are never checked by the suite) and what could go wrong
- A pull request with a failing check is not merged
