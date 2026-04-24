# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
From v0.2.0 onward, this file is maintained automatically by
[release-please](https://github.com/googleapis/release-please) from
[Conventional Commits](https://www.conventionalcommits.org/).

## [0.2.0](https://github.com/danielvictorino/HyperMail/compare/v0.1.4...v0.2.0) (2026-04-24)


### ⚠ BREAKING CHANGES

* project is now MIT-licensed. Prior releases shipped under a proprietary all-rights-reserved license. Contributors should review LICENSE, CONTRIBUTING.md, and CODE_OF_CONDUCT.md before their next PR.

### Bug Fixes

* **ci:** auto-enable Pages so docs workflow unblocks on first run ([#9](https://github.com/danielvictorino/HyperMail/issues/9)) ([4f5c040](https://github.com/danielvictorino/HyperMail/commit/4f5c0406d937ca32b1a58bab6a5bbf59b64ab8db))


### Miscellaneous Chores

* relicense under MIT and reposition as open-source project ([#11](https://github.com/danielvictorino/HyperMail/issues/11)) ([f0532af](https://github.com/danielvictorino/HyperMail/commit/f0532afbb8350330d68e45f00a76dbfce3ff078c))

## [0.1.4](https://github.com/danielvictorino/HyperMail/compare/v0.1.3...v0.1.4) (2026-04-23)


### Features

* **ai:** multi-provider mail assistant with fallback routing ([11100cd](https://github.com/danielvictorino/HyperMail/commit/11100cdb5304682223f304ae274bc06a85b011ff))


### Bug Fixes

* **build:** unblock packaged app startup from tsup CJS transpile ([77ac247](https://github.com/danielvictorino/HyperMail/commit/77ac24724d4209f9fb17cbe31e0e7484eaffbc80))

## [0.1.3](https://github.com/danielvictorino/HyperMail/compare/v0.1.2...v0.1.3) (2026-04-21)


### Features

* attachment overload cleanup, Dexie migration fixtures, Windows release workflow ([6224961](https://github.com/danielvictorino/HyperMail/commit/62249617b25ba80de03ba5592dcd640f735a4564))
* **oauth:** harden Microsoft refresh with backoff, single-flight, and state-tampering guard ([5efc3b1](https://github.com/danielvictorino/HyperMail/commit/5efc3b14d02f3362b8ef1cc9d6b8782699b8bd70))


### Bug Fixes

* **ci:** release-please job must always run to create the release tag ([c4035d4](https://github.com/danielvictorino/HyperMail/commit/c4035d41088b0f696e174e4d4db9702196ba09fc))
* **ci:** release-please package job checks out merged commit, not unpushed tag ([971ab70](https://github.com/danielvictorino/HyperMail/commit/971ab70d041fc5d9483d82d027f1c70bd0f0748d))

## [0.1.2](https://github.com/danielvictorino/HyperMail/compare/v0.1.1...v0.1.2) (2026-04-21)


### Features

* **oauth:** harden Microsoft refresh with backoff, single-flight, and state-tampering guard ([5efc3b1](https://github.com/danielvictorino/HyperMail/commit/5efc3b14d02f3362b8ef1cc9d6b8782699b8bd70))

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
