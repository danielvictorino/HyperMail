# HyperMail

HyperMail is a Gmail-first, keyboard-first, offline-first desktop email client inspired by Superhuman.

## Current scope

- Electron desktop shell with React 19 + TypeScript
- Gmail OAuth desktop flow with PKCE and secure token storage via `keytar`
- Dexie-backed local mailbox cache with optimistic modifier queue
- offline thread reading, cached attachment export, compose drafts, send later, snooze, unsubscribe, and cached search
- command palette, keyboard engine, AI summaries, and voice drafting

## Development quickstart

1. Copy `.env.example` to `.env`.
2. Add `GOOGLE_OAUTH_CLIENT_ID`.
3. Optionally add `OPENAI_API_KEY`.
4. Optionally add `HYPERMAIL_UPDATES_URL` and `HYPERMAIL_CRASH_REPORT_URL`.
5. Install dependencies with `npm install`.
6. Start the app with `npm run dev`.

## Runtime config

In development, HyperMail prefers:

- `<repo>/.env`

In a packaged desktop build, HyperMail prefers:

- `%APPDATA%\\HyperMail\\.env` on Windows

If no config file is found, the app now reports the preferred path directly in the runtime UI and in error messages.

Packaged builds can also use:

- `HYPERMAIL_UPDATES_URL` for Windows NSIS update checks
- `HYPERMAIL_UPDATE_CHANNEL` for channel selection, defaulting to `latest`
- `HYPERMAIL_CRASH_REPORT_URL` for optional remote crash upload

If the update URL is missing, the packaged app still works normally and simply keeps auto-update disabled.
If the crash-report URL is missing, HyperMail still keeps local crash dumps and main-process logs on disk.

## Build and package

- `npm run build:brand`
- `npm run build`
- `npm run package:dir`
- `npm run dist`

`package:dir` creates an unpacked app for smoke testing. `dist` creates installer artifacts through `electron-builder`.
See [docs/distribution-playbook.md](/C:/Users/Daniel Victorino/Vaults/daniel_victorino/Projects/HyperMail/docs/distribution-playbook.md) for the Windows release flow.

## Smoke test

1. Build an unpacked app with `npm run package:dir`.
2. Put your packaged-build `.env` in the preferred runtime config path shown in the app.
3. Launch the unpacked app and confirm the `Runtime config` card shows `Gmail OAuth: ready`.
4. Connect Gmail.
5. Confirm initial sync, cached attachment export, offline search, queued archive/star/snooze/unsubscribe, and send-later still work.
6. If Gmail incremental sync can no longer continue from stored history, confirm HyperMail falls back to a full refresh cleanly.
7. If AI is configured, generate a summary and a voice draft.
8. Open the logs folder from the right rail and confirm packaged release diagnostics are visible.

## Verification

- `npm run typecheck`
- `npm test`
- `npm run build`
