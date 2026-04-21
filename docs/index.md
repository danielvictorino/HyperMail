---
title: HyperMail
---

# HyperMail

**Keyboard-first, offline-first Gmail client that feels like Superhuman — running as a native Windows app.**

[⬇ Download latest release](https://github.com/danielvictorino/HyperMail/releases/latest) ·
[Source on GitHub](https://github.com/danielvictorino/HyperMail) ·
[Changelog](https://github.com/danielvictorino/HyperMail/blob/main/CHANGELOG.md)

---

## Why HyperMail

- **Offline-first.** Dexie-backed local cache, modifier queue survives app kills and flushes when you reconnect.
- **Keyboard-first.** `Ctrl+K` palette, single-key shortcuts (j/k move, e archive, s star, z snooze, u unsubscribe, a summarize, d voice draft, l split).
- **Secure by default.** Electron sandbox + context isolation, CSP, IPC zod validation, `https:`/`mailto:`-only external links.
- **Optional AI.** Per-thread summaries, split suggestions, and voice drafts via OpenAI (requires your own key).

## Docs

- [Security model](security.md) — threat model, hardening inventory, known gaps
- [Smoke test checklist](smoke-test-checklist.md) — runtime verification before tagging a release
- [Release notes](release-notes/)

## Install

Download from the [latest release](https://github.com/danielvictorino/HyperMail/releases/latest):

- **NSIS installer** — `HyperMail-*-win-x64.exe`
- **Portable** — `HyperMail-*-portable-x64.exe`
- **Checksums** — `SHA256SUMS.txt`

Verify:

```powershell
Get-FileHash HyperMail-*.exe -Algorithm SHA256
```

## For contributors

See [AGENTS.md](https://github.com/danielvictorino/HyperMail/blob/main/AGENTS.md) for the agent-oriented briefing (environment, primary commands, layout, conventions).

Quickstart:

```bash
git clone https://github.com/danielvictorino/HyperMail.git
cd HyperMail
cp .env.example .env
npm install
npm run dev
```

Full verification:

```bash
npm run verify
```

## License

Proprietary — see [LICENSE](https://github.com/danielvictorino/HyperMail/blob/main/LICENSE). Viewing source is permitted for evaluation. Redistribution or modification requires written permission from Daniel Victorino.
