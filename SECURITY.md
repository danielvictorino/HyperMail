# Security Policy

## Supported versions

Only the latest released version receives security updates. See the [releases page](https://github.com/danielvictorino/HyperMail/releases) for what's current.

| Version | Supported |
|---|---|
| Latest release | Yes |
| Older releases | No |

## Reporting a vulnerability

**Do not open a public issue for security vulnerabilities.**

Please use GitHub's private security advisory flow:
[**Report a vulnerability →**](https://github.com/danielvictorino/HyperMail/security/advisories/new)

When reporting, include:

- A short description of the issue.
- A reproduction (steps, payload, environment). **Sanitize any real email content** before sharing — replace real addresses with `example.com` addresses and scrub message bodies.
- The affected version (see the "About" menu in the app or `package.json`).
- Your assessment of severity / impact.

## Response expectations

- Acknowledgement: best-effort within a few days.
- Fix timeline: depends on severity and complexity — maintainers will coordinate with the reporter.
- Coordinated disclosure: we prefer to publish a fix before public disclosure; please give us a reasonable window.

This project is maintained on a volunteer/community basis. No SLA is guaranteed, but serious issues are prioritized.

## Scope

In-scope:

- The HyperMail Electron app (main + renderer).
- OAuth flows (Google, Microsoft).
- IPC validation boundary (`src/shared/ipc-contracts.ts`, `electron/main.ts`).
- Local storage (Dexie schema, keytar usage).
- The AI provider routing (OpenAI, Anthropic, Ollama).
- Packaging / auto-update pipeline (`.github/workflows/release.yml`, `electron-updater`).

Out-of-scope:

- Third-party dependencies (report to the upstream project; we track advisories via Dependabot).
- Issues requiring local code-execution on the user's machine (documented as not in our threat model — see [`docs/security.md`](docs/security.md)).
- Gmail / Microsoft Graph API vulnerabilities (report to Google / Microsoft).

## More context

The full threat model, hardening inventory, and known gaps: [`docs/security.md`](docs/security.md).
