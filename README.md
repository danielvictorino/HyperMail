<h1 align="center">HyperMail</h1>

<p align="center">
  <img src="build/icon.png" alt="HyperMail" width="128" />
</p>

<p align="center">
  <b>A keyboard-first, offline-first Gmail client for Windows — open source, vim-inspired, and built for people who live in their inbox.</b>
</p>

<p align="center">
  Optimistic sync, a modifier queue that survives app kills, and a command palette that keeps your hands off the mouse.
</p>

<p align="center">
  <a href="https://github.com/danielvictorino/HyperMail/actions/workflows/verify.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/danielvictorino/HyperMail/verify.yml?style=flat-square&label=ci" /></a>
  <a href="https://github.com/danielvictorino/HyperMail/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/danielvictorino/HyperMail?style=flat-square&include_prereleases" /></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows-blue?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
</p>

<p align="center">
  <a href="https://github.com/danielvictorino/HyperMail/releases/latest">Download</a> ·
  <a href="docs/security.md">Security</a> ·
  <a href="docs/smoke-test-checklist.md">Smoke test</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="AGENTS.md">Agent briefing</a>
</p>

* * *

## By the numbers

| Metric | Value |
|---|---|
| Renderer app chunk | **497 kB → 112 kB** (−77.5%) |
| IPC channels with zod validation | 12 (10 mutating) |
| Keyboard shortcuts | 14 primary + `Ctrl+K` command palette |
| Security hardening layers | 8 |
| OAuth refresh | PKCE S256 + state verify + single-flight + 1 s / 2 s / 4 s jittered backoff |
| Offline modifier queue | 4 retries (2 s · 4 s · 8 s · 16 s), rollback on the 5th failure |
| AI providers with fallback routing | 3 (OpenAI · Anthropic · Ollama) |
| Dexie schema versions shipped | 3 (v1 → v2 → v3 with `.upgrade()` backfill) |
| CI matrix | Ubuntu + Windows, Node 20 |

* * *

## Install

Download the latest Windows release:

- **NSIS installer** — [`HyperMail-*-win-x64.exe`](https://github.com/danielvictorino/HyperMail/releases/latest)
- **Portable** — [`HyperMail-*-portable-x64.exe`](https://github.com/danielvictorino/HyperMail/releases/latest)
- **Checksums** — [`SHA256SUMS.txt`](https://github.com/danielvictorino/HyperMail/releases/latest)

Verify the download:

```powershell
Get-FileHash HyperMail-*.exe -Algorithm SHA256
# Compare against SHA256SUMS.txt from the release
```

* * *

## Quick start (dev)

Prerequisites: Node 20, Git, Python + C++ build tools for `keytar` on Windows.

```bash
git clone https://github.com/danielvictorino/HyperMail.git
cd HyperMail
cp .env.example .env   # fill GOOGLE_OAUTH_CLIENT_ID and optional AI defaults
npm install
npm run dev
```

Before shipping anything, run the full regression gate:

```bash
npm run verify   # lint + format:check + typecheck + test + build
```

* * *

## Keyboard-first

Shortcuts fire only outside editable fields — `isEditableTarget()` skips dispatch inside `<input>`, `<textarea>`, `contenteditable`, and `role="textbox"` so typing never collides with navigation.

| Key | Action | Implementation |
|---|---|---|
| `Ctrl+K` / `Cmd+K` | Open command palette | `src/renderer/lib/keyboard-dispatch.ts` |
| `1`–`7` | Jump mailbox section (inbox · important · vip · other · starred · snoozed · archive) | ` ⟂ ` |
| `j` / `↓` | Next thread | ` ⟂ ` |
| `k` / `↑` | Previous thread | ` ⟂ ` |
| `/` | Focus search | ` ⟂ ` |
| `r` | Open composer | ` ⟂ ` |
| `e` | Toggle archive | ` ⟂ ` |
| `s` | Toggle star | ` ⟂ ` |
| `z` | Snooze / unsnooze | ` ⟂ ` |
| `u` | Unsubscribe (when offered) | ` ⟂ ` |
| `a` | AI: summarize thread | `src/shared/ai/mail-assistant.ts` |
| `d` | AI: voice-matched draft | ` ⟂ ` |
| `l` | AI: suggest thread split | ` ⟂ ` |

Inside the command palette: `↑` / `↓` move selection, `Enter` runs the highlighted command, `Esc` closes.

* * *

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Concurrent renderer + electron bundle + runtime |
| `npm run typecheck` | `tsc` on renderer + electron projects |
| `npm run test` | Vitest 2 suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier check (CI enforces) |
| `npm run build` | typecheck + vite build + tsup electron |
| `npm run verify` | **Full gate:** lint + format:check + typecheck + test + build |
| `npm run package:dir` | Unpacked Windows app under `release/` for smoke testing |
| `npm run dist` | NSIS + portable installers via `electron-builder` |

* * *

## Architecture

```
electron/
  main.ts                    CSP header install, IPC handler registration
  preload.ts                 context-isolated bridge → window.hypermail
  oauth/                     Google + optional Microsoft PKCE, keytar token store
  gmail/                     Gmail REST client (Retry-After aware)
  runtime/retry.ts           retryWithBackoff + createSingleFlight
  updater/                   electron-updater NSIS pipeline
  observability/             electron-log + crash reporting

src/
  shared/                    cross-process contracts
    ipc-contracts.ts           zod schemas + parseIpcPayload for 12 IPC channels
    ai/mail-assistant.ts       provider enum + model presets
    mail/models.ts             LocalMail* domain types
  renderer/                  React 19 + Tailwind 3
    lib/
      keyboard-dispatch.ts     single-sink keyboard router
      command-palette.ts       intent-ranked command palette
    hooks/
      use-keyboard-engine.ts   window keydown listener lifecycle
    offline/
      db/hypermail-db.ts       Dexie v1 → v3 with .upgrade() backfill
      queue/                   modifier queue engine (1.5 s tick)

docs/                         security.md · smoke-test-checklist.md · release-notes/
.github/workflows/            verify.yml (Ubuntu + Windows) · release.yml (NSIS + portable)
```

* * *

## IPC boundary (zod-validated)

Every mutating main-process handler routes through `parseIpcPayload(channel, schema, input)`. A failed parse throws `IpcValidationError` carrying the channel name + the full zod issue list — validation errors never reach domain code.

| Channel | Purpose | Key limits |
|---|---|---|
| `gmailMailboxSync` | Pull Gmail mailbox delta | `maxResults ≤ 500` |
| `setThreadStarred` | Toggle star | idempotency key required |
| `setThreadArchived` | Toggle archive | idempotency key required |
| `unsubscribeThread` | mailto / http-get / http-post unsubscribe | endpoint must be `https:` or `mailto:` |
| `downloadGmailAttachment` | Fetch + cache attachment | `size ≤ 100 MB` |
| `sendDraft` | Send or schedule draft | recipients ≤ 100 · body ≤ 5 MB · `sendAt > now` |
| `summarizeThread` | AI summarize | thread context ≤ 512 KB |
| `suggestSplit` | AI split suggestion | thread context ≤ 512 KB |
| `generateDraftReply` | AI voice-matched draft | `voiceExamples ≤ 50` |
| `saveMailAssistantSettings` | Persist provider config + keys | primary ≠ fallback |
| `testMailAssistantProviderConnection` | Ping provider without persisting | — |
| `listOllamaModels` | List Ollama models for a base URL | — |

Two further schemas validate storage (`cachedAttachmentPayloadSchema`) and renderer crash telemetry (`rendererErrorPayloadSchema`).

* * *

## Security model

Full threat model + hardening inventory: [`docs/security.md`](docs/security.md). Summary:

| Layer | Mechanism | Anchor |
|---|---|---|
| Sandbox + context isolation | `sandbox: true` · `contextIsolation: true` · `nodeIntegration: false` · `webSecurity: true` · `allowRunningInsecureContent: false` | `electron/main.ts` |
| Navigation guard | `setWindowOpenHandler` + `will-navigate` → `isAllowedExternalUrl` (https / mailto only) | `src/shared/ipc-contracts.ts` |
| CSP | Meta tag + runtime header. `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `form-action 'none'`; pinned origins for Google / Microsoft / OpenAI / Anthropic / Ollama | `electron/main.ts` |
| IPC zod validation | 10 mutating channels parsed before any handler runs | `parseIpcPayload` |
| Unsubscribe URL allowlist | `https:` / `mailto:` only | `safeHttpsUrl` in `ipc-contracts.ts` |
| OAuth hardening | PKCE S256 · per-sign-in state verification · single-flight refresh · jittered `1 s / 2 s / 4 s` backoff · transient vs terminal error classifier | `electron/oauth/google-oauth.ts` |
| Secret storage | All refresh tokens and OpenAI/Anthropic keys via `keytar` (Windows Credential Manager) | `electron/oauth/` |
| Gmail retry classifier | `429` / `5xx` honor `Retry-After`; `4xx` terminal | `electron/runtime/retry.ts` |

* * *

## Offline modifier queue

Optimistic mutations survive app kills and reconcile with Gmail when you reconnect.

```
user action (archive / star / snooze / draft)
  └── enqueue → queuedModifiers table (IndexedDB)
                    ↓  kick() every 1.5 s (or on connectivity resume)
                    ↓  dedupe by aggregateKey
                    ↓  filter nextAttemptAt ≤ now
                    ↓
                processRecord
                  ├── success → Dexie txn { apply modifier · bulkPut messages · delete record }
                  └── failure
                        ├── attempts < 5 → reschedule with backoff
                        └── attempts ≥ 5 → rollback · surface error to UI
```

| Attempt | Delay after failure |
|---|---|
| Retry 1 | 2 s |
| Retry 2 | 4 s |
| Retry 3 | 8 s |
| Retry 4 | 16 s |
| 5th failure | Rollback — record deleted, error surfaced to UI |

Source: [`src/renderer/offline/queue/modifier-queue-engine.ts`](src/renderer/offline/queue/modifier-queue-engine.ts)

* * *

## Multi-provider AI

Optional. Invoked via `a` (summarize), `d` (voice draft), `l` (split). Calls originate from the Electron main process — keys never touch the renderer.

| Provider | Default endpoint | Key storage | Bootstrap env |
|---|---|---|---|
| OpenAI | `https://api.openai.com` | `keytar` | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Anthropic | `https://api.anthropic.com` | `keytar` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| Ollama | `http://127.0.0.1:11434` | — (localhost) | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |

Fallback routing: when the primary provider fails, the optional fallback retries once. Provider selection, model ids, presets, and non-secret settings persist under Electron `userData`.

* * *

## Runtime config

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | ✅ | Google desktop OAuth client ID (PKCE, installed-app flow) |
| `MICROSOFT_OAUTH_CLIENT_ID` | — | Microsoft desktop OAuth client ID (optional) |
| `OPENAI_API_KEY` | — | Default OpenAI API key |
| `OPENAI_MODEL` | — | Default OpenAI model |
| `ANTHROPIC_API_KEY` | — | Default Anthropic API key |
| `ANTHROPIC_MODEL` | — | Default Anthropic model |
| `OLLAMA_BASE_URL` | — | Default Ollama base URL (`http://127.0.0.1:11434`) |
| `OLLAMA_MODEL` | — | Default Ollama model |
| `HYPERMAIL_AI_PRIMARY_PROVIDER` | — | Default primary provider (`openai`, `anthropic`, `ollama`) |
| `HYPERMAIL_AI_FALLBACK_PROVIDER` | — | Default fallback provider (`openai`, `anthropic`, `ollama`, `none`) |
| `HYPERMAIL_UPDATES_URL` | — | Windows auto-update feed; omit to disable auto-update |
| `HYPERMAIL_UPDATE_CHANNEL` | — | Defaults to `latest` |
| `HYPERMAIL_CRASH_REPORT_URL` | — | Optional remote crash upload |

**Config file locations:** `./.env` in dev; `%APPDATA%\HyperMail\.env` in packaged builds. If no config is found, the runtime UI reports the preferred path.

**AI settings precedence:** the in-app settings panel persists provider choice, fallback routing, models, and non-secret settings under Electron `userData`. OpenAI and Anthropic keys live in OS secure storage via `keytar`. `.env` values bootstrap defaults.

* * *

## Build & release pipeline

**Verify** — [`.github/workflows/verify.yml`](.github/workflows/verify.yml) runs on every PR and push to `main` across `ubuntu-latest` + `windows-latest` on Node 20:
`npm ci` → `lint` → `format:check` → `typecheck` → `test` → `build`.

**Release** — [`.github/workflows/release.yml`](.github/workflows/release.yml) fires on tag `v*.*.*` (or `v*.*.*-*`) or `workflow_dispatch` with a tag input:
`npm ci` → `typecheck` → `test` → `build` → `electron-builder --win --x64 --publish=never` → emits `HyperMail-*-win-x64.exe` (NSIS) + `HyperMail-*-portable-x64.exe`, generates `SHA256SUMS.txt` via PowerShell, and attaches every asset to the GitHub release via `gh release upload --clobber`.

* * *

## Tech stack

| Component | Version |
|---|---|
| Node | 20 |
| Electron | 35 |
| React / ReactDOM | 19.0.0 |
| Vite | 6.0.7 |
| Vitest | 2.1.8 |
| TypeScript | 5.7.2 |
| Tailwind CSS | 3.4.17 |
| Dexie | 4.4.2 |
| zod | 4.3.6 |
| zustand | 5.0.3 |
| keytar | 7.9.0 |
| electron-updater | 6.8.3 |
| electron-builder | 25.1.8 |
| electron-log | 5.4.3 |
| ESLint | 9.39.4 |
| Prettier | 3.8.3 |
| TipTap | 3.22.4 |
| TanStack Query / Virtual | 5.68.0 / 3.13.24 |

* * *

## Roadmap / known gaps

- Executable code signing not yet enabled (`signAndEditExecutable: false` in `package.json`).
- Auto-update only fires when `HYPERMAIL_UPDATES_URL` is set **and** the app is packaged **and** the platform is Windows.
- Microsoft OAuth refresh is hardened end-to-end; first-class UI surfacing is not yet at Google parity.
- Dexie v1 → v3 upgrade path lacks a seeded-fixture test.
- `exactOptionalPropertyTypes` is not yet enabled in `tsconfig`.
- No e2e tests for OAuth flows — unit coverage only.

* * *

## Docs

- [Security model](docs/security.md) — threat model, hardening inventory, known gaps
- [Smoke test checklist](docs/smoke-test-checklist.md) — runtime verification before tagging
- [Distribution playbook](docs/distribution-playbook.md)
- [Release notes](docs/release-notes/)
- [Changelog](CHANGELOG.md)
- [Agent briefing](AGENTS.md) — for agentic coding tools working in this repo

* * *

## Contributing

HyperMail welcomes issues and pull requests. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow (fork → branch → PR, conventional commits, `npm run verify` before push), then read [`AGENTS.md`](AGENTS.md) for the deeper technical briefing.

* * *

## Community

- [Code of Conduct](CODE_OF_CONDUCT.md) — Contributor Covenant v2.1
- [Security policy](SECURITY.md) — how to report vulnerabilities (GitHub private advisory flow, not a public issue)

* * *

## License

[MIT](LICENSE) — Copyright (c) 2026 HyperMail contributors.
