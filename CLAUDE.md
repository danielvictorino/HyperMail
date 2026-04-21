# AGENTS.md

This file is for agentic coding tools working in this repo.

HyperMail is a keyboard-first, offline-first Electron + React 19 email client for Gmail (+ Microsoft). Main process in Node; renderer in React/Vite; local cache in Dexie (IndexedDB). Platform target: Windows NSIS + portable builds first.

## Environment

- Node: 20 (pinned in CI; `.nvmrc` not present, matches `actions/setup-node@v4 node-version: "20"`)
- Electron: 35
- Vite: 6, Vitest: 2, Tailwind: 3
- Native deps: `keytar` (libsecret on Linux — `sudo apt-get install -y libsecret-1-dev`)
- Sensitive runtime config: `%APPDATA%\HyperMail\.env` (packaged) or `./.env` (dev). Never commit real keys; `.env.example` has the shape.

## Primary commands

- Install: `npm ci`
- Dev (concurrent renderer + electron bundle + electron runtime): `npm run dev`
- Typecheck (renderer + electron): `npm run typecheck`
- Run all tests: `npm run test`
- Watch tests: `npm run test:watch`
- Build (typecheck + renderer + electron): `npm run build`
- Full verify gate (typecheck + test + build): `npm run verify`
- Unpacked Windows app for smoke testing: `npm run package:dir`
- Signed/full NSIS + portable: `npm run dist` (also runs in CI on tag push)

## Single-test commands

- Run one file: `npm run test -- src/shared/ipc-contracts.test.ts`
- Run by name regex: `npm run test -- --testNamePattern "refresh"`
- Run without cache: `npm run test -- --no-file-parallelism`
- Coverage: `npm run test -- --coverage`

## Safest local verification after non-trivial changes

```bash
npm run verify
```

This runs typecheck → test → build. CI runs the same sequence on `ubuntu-latest` and `windows-latest`. On tag push (`v*.*.*`), the release workflow additionally packages Windows installers and attaches them to the GitHub release.

## Layout

- `electron/main.ts` — main process, CSP header install, IPC handler registration
- `electron/preload.ts` — context-isolated bridge (`window.hypermail`)
- `electron/oauth/` — Google + Microsoft OAuth PKCE, keytar-backed token store
- `electron/gmail/` — Gmail REST client with Retry-After-aware backoff
- `electron/runtime/retry.ts` — shared `retryWithBackoff` + `createSingleFlight`
- `electron/updater/` — `electron-updater` NSIS pipeline
- `electron/observability/` — `electron-log` + crash reporting
- `src/shared/` — cross-process contracts and schemas (`contracts.ts`, `ipc-contracts.ts`, `mail/models.ts`)
- `src/renderer/` — React UI, virtualized list, keyboard engine, Dexie engine
- `src/renderer/offline/db/hypermail-db.ts` — Dexie schema v1→v3 with `.upgrade()` transforms
- `src/renderer/offline/queue/` — offline modifier queue
- `docs/` — `security.md`, `smoke-test-checklist.md`, `release-notes/`
- `.github/workflows/` — `verify.yml` (CI matrix) + `release.yml` (Windows packaging)

## Conventions

- **Never commit real secrets.** `.env`, `release/**`, `dist/**`, `dist-electron/**`, `node_modules/**` are all gitignored — do not override.
- **Plan + minimize blast radius.** Match the `docs/` style: tight, reasoned, minimal churn. Don't refactor adjacent code unless the task requires it.
- **IPC boundary is authoritative.** New mutating IPC channels must go through `parseIpcPayload(channel, schema, input)` in `electron/main.ts` with a zod schema declared in `src/shared/ipc-contracts.ts`. See `docs/security.md` for why.
- **OAuth / Gmail errors flow through the shared retry helper.** Don't add ad-hoc fetch loops; extend the transient classifier instead.
- **Feedback on corrections goes to auto-memory**, not this file.
