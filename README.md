<h1 align="center">HyperMail</h1>

<p align="center">
  <a href="https://github.com/danielvictorino/HyperMail/actions/workflows/verify.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/danielvictorino/HyperMail/verify.yml?style=flat-square&label=ci" /></a>
  <a href="https://github.com/danielvictorino/HyperMail/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/danielvictorino/HyperMail?style=flat-square&include_prereleases" /></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows-blue?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-Proprietary-red?style=flat-square" />
  <img alt="Electron" src="https://img.shields.io/badge/electron-35-47848f?style=flat-square" />
  <img alt="React" src="https://img.shields.io/badge/react-19-61dafb?style=flat-square" />
</p>

<h3 align="center">A keyboard-first, offline-first Gmail client that feels like Superhuman — running as a native Windows app.</h3>

<p align="center">
  <a href="https://danielvictorino.github.io/HyperMail/">Docs</a> ·
  <a href="https://github.com/danielvictorino/HyperMail/releases/latest">Download</a> ·
  <a href="docs/security.md">Security</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

HyperMail puts your Gmail inbox behind a keyboard-driven, offline-capable desktop client. Sync is optimistic, mutations queue locally and reconcile with Gmail when you reconnect, and the command palette + j/k/e/s/z shortcuts keep your hands off the mouse.

- **Offline-first** — Dexie-backed local cache, modifier queue survives app kills and flushes when you reconnect.
- **Keyboard-first** — `Ctrl+K` palette, single-key shortcuts (j/k to move, e archive, s star, z snooze, u unsubscribe, a summarize, d voice draft, l split).
- **Secure by default** — Electron sandbox + context isolation, CSP, IPC zod validation, `https:`/`mailto:`-only external links.
- **Optional AI** — per-thread summaries, split suggestions, and voice drafts via OpenAI (requires your own key).

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

## Quick start (dev)

```bash
# Prerequisites: Node 20, Git, Python + C++ build tools for keytar on Windows
git clone https://github.com/danielvictorino/HyperMail.git
cd HyperMail
cp .env.example .env   # fill GOOGLE_OAUTH_CLIENT_ID
npm install
npm run dev
```

Full verification before shipping:

```bash
npm run verify   # typecheck + test + build
```

## Runtime config

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | ✅ | Google desktop OAuth client ID (PKCE, installed-app flow) |
| `MICROSOFT_OAUTH_CLIENT_ID` | — | Microsoft desktop OAuth client ID (optional) |
| `OPENAI_API_KEY` | — | Enables thread summary, voice draft, split |
| `HYPERMAIL_UPDATES_URL` | — | Windows auto-update feed; disables auto-update if unset |
| `HYPERMAIL_UPDATE_CHANNEL` | — | Defaults to `latest` |
| `HYPERMAIL_CRASH_REPORT_URL` | — | Optional remote crash upload |

**Config file locations** — `./.env` in dev; `%APPDATA%\HyperMail\.env` in packaged builds. If no config is found, the runtime UI reports the preferred path.

## Architecture at a glance

```
electron/            # main process — OAuth, Gmail, Dexie IPC bridge, updater
  main.ts            # CSP, sandbox, validated IPC handlers
  oauth/             # Google + Microsoft PKCE, keytar token store
  gmail/             # Gmail REST client (Retry-After-aware backoff)
  runtime/retry.ts   # retryWithBackoff + single-flight lock
src/
  shared/            # cross-process contracts + zod IPC schemas
  renderer/          # React 19 + Tailwind UI, virtualized list, keyboard engine, Dexie
docs/                # security.md, smoke-test-checklist.md, release-notes
.github/workflows/   # verify.yml (matrix CI) + release-please.yml (packaged Windows releases)
```

See [AGENTS.md](AGENTS.md) for a more detailed agent-oriented briefing.

## Docs

- [Security model](docs/security.md)
- [Smoke test checklist](docs/smoke-test-checklist.md)
- [Release notes](docs/release-notes/)
- [Changelog](CHANGELOG.md)

## License

Proprietary. See [LICENSE](LICENSE). Viewing the source on GitHub is permitted for evaluation. Redistribution, modification, and commercial use require written permission.

Contact: danielvictorino@galaxies.gg
