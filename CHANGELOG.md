# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
From v0.2.0 onward, this file is maintained automatically by
[release-please](https://github.com/googleapis/release-please) from
[Conventional Commits](https://www.conventionalcommits.org/).

## [0.1.1](https://github.com/danielvictorino/HyperMail/compare/v0.1.0...v0.1.1) (2026-04-21)


### Features

* attachment overload cleanup, Dexie migration fixtures, Windows release workflow ([6224961](https://github.com/danielvictorino/HyperMail/commit/62249617b25ba80de03ba5592dcd640f735a4564))

## [0.1.1-hardened] — 2026-04-21

Five-day security, reliability, and test-coverage pass on the v0.1.0 foundation.

### Added

- `Content-Security-Policy` via meta tag + runtime header (dev-aware).
- zod IPC schemas for all 10 mutating channels in `src/shared/ipc-contracts.ts`.
- `retryWithBackoff` + `createSingleFlight` helpers in `electron/runtime/retry.ts`.
- Gmail 429/5xx retry honoring `Retry-After`.
- Dexie v3 `.upgrade()` backfill for `snoozedUntil` and `unsubscribedAt`; `deleteAccountCascade` transactional purge.
- `validateOAuthCallback` pure helper for state-tampering defense.
- Pure `dispatchKeyboardEvent` extracted from the keyboard hook for testability.
- `React.memo`'d `ThreadRow` + stable callbacks in the virtualized list.
- `docs/security.md`, `docs/smoke-test-checklist.md`, `docs/release-notes/`.
- `npm run verify` (typecheck + test + build) as the regression gate.
- `AGENTS.md` + `CLAUDE.md` at repo root for agent briefing.
- GitHub Actions: `verify.yml` (Ubuntu + Windows matrix) and `release.yml` (Windows NSIS + portable installers, SHA256 checksums, auto-attach on tag).
- Dexie v1 → v3 migration fixture tests.
- `LICENSE` (proprietary, all rights reserved).

### Changed

- `BrowserWindow` hardened: `sandbox: true`, `webSecurity: true`, `nodeIntegration: false`, `allowRunningInsecureContent: false`.
- `shell.openExternal` + `will-navigate` restricted to `https:` and `mailto:` via `isAllowedExternalUrl`.
- OAuth refresh: jittered exponential backoff, single-flight lock, correct error classification (only terminal OAuth codes clear the stored session).
- Vite bundle: 6 vendor chunks; app chunk 497 kB → 112 kB; source maps `"hidden"` in prod.
- `tsconfig`: `noUncheckedIndexedAccess` + `noImplicitOverride` enabled.
- `downloadGmailAttachment` collapsed to a single correct signature using `DownloadGmailAttachmentRequest`.

### Fixed

- `runtime-config-paths.test.ts` made platform-agnostic for Linux CI.

## [0.1.0] — 2026-04-20

Initial foundation. 15 build phases delivered: Electron + React scaffolding, Gmail OAuth 2.0 with PKCE, Dexie offline cache, React 19 renderer with virtualized mailbox, compose / drafts / attachments / search / snooze / unsubscribe, optional OpenAI integration for summaries / voice drafts / thread splitting, packaged runtime hardening, and auto-update via electron-updater.
