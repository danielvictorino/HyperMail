# HyperMail Security Model

Last updated: 2026-04-23 (v0.1.4)

## Threat model

HyperMail is a local desktop Electron app that holds long-lived OAuth refresh tokens for the user's Gmail (and Microsoft) mailbox. The dominant threats we mitigate:

1. **Compromised web content rendered inside the renderer** — a malicious email body or a hijacked third-party resource attempting script execution or data exfiltration.
2. **Compromised IPC payloads** — a bug or malicious page attempting to invoke main-process handlers with malformed input to crash the app or trigger unintended server calls.
3. **Navigation / URL handling** — malicious mail links (`javascript:`, `file:`) that could open local resources or execute script.
4. **Token theft via local file read** — access tokens and AI provider secrets must never land in plaintext on disk; refresh tokens and OpenAI/Anthropic keys live in OS keychain via keytar.

We explicitly do **not** target defense against a local attacker with code execution inside the user's OS session.

## Hardening in place

### Electron window
`electron/main.ts` `createMainWindow`:
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`.
- Navigation: `setWindowOpenHandler` + `will-navigate` use `isAllowedExternalUrl` (https/mailto only).

### Content-Security-Policy
- Meta tag in `index.html` for a defense-in-depth baseline (applies under file:// loads).
- Runtime header via `session.defaultSession.webRequest.onHeadersReceived` in `installContentSecurityPolicy`.
- Policy: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com https://gmail.googleapis.com https://graph.microsoft.com https://login.microsoftonline.com https://api.openai.com https://api.anthropic.com http://127.0.0.1:11434 http://localhost:11434; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'none'`.
- In dev the policy adds `unsafe-eval` and the Vite dev origin for HMR. This is removed in production bundles.

### IPC boundary
- All mutating main-process handlers (10 channels) validate input via zod schemas in `src/shared/ipc-contracts.ts`.
- Validation errors surface as `IpcValidationError` and never reach domain code.
- URLs inside unsubscribe payloads must be `https:` or `mailto:` — `javascript:`, `file:`, `http:` are rejected.

### OAuth
- PKCE S256 for the Google authorization code flow.
- `state` is generated per-sign-in and verified on callback before exchanging the code.
- Refresh uses a single-flight lock (by refresh token) to prevent refresh storms.
- Transient refresh errors (5xx / 429 / 400 with unknown code / network) retry with jittered exponential backoff (1s / 2s / 4s).
- Only terminal OAuth errors (`invalid_grant`, `invalid_client`, `unauthorized_client`, `invalid_request`, `unsupported_grant_type`, `invalid_scope`) clear the stored session — a transient network failure does not log the user out.
- Tokens are stored via `keytar` in the OS credential manager. Access tokens expire on Google's schedule; the local store is not intended to outlive a refresh cycle.

### AI providers
- OpenAI and Anthropic requests originate from the Electron main process, not the renderer.
- OpenAI and Anthropic API keys are stored via `keytar` and can also be bootstrapped from `.env`.
- Provider selection, fallback routing, model ids, presets, and Ollama base URL are stored in a local app-owned settings file under Electron `userData`.
- Ollama requests default to `http://127.0.0.1:11434` and can be redirected to another `http` or `https` endpoint from the in-app AI settings panel.

### Gmail API
- `gmailJson` and `gmailModify` retry on 429 / 5xx / fetch TypeError / network error codes with `Retry-After` honored.
- `GmailApiError` classifies 4xx (401/403/404) as non-transient — no retries, surface to the user.

### Auto-update
- Disabled unless `HYPERMAIL_UPDATES_URL` is set **and** the app is packaged **and** the platform is Windows.
- Channel read from `HYPERMAIL_UPDATE_CHANNEL` (defaults to `latest`). Use a staging channel during QA.

## What's *not* yet hardened

- Source maps are `"hidden"` in prod. If you ship the `dist/` directory to an update server, do **not** also ship the `.map` files. Upload them to the crash reporter instead.
- Packaged release smoke testing now exists in CI, but it only validates Windows startup and the observability log line. It does not exercise OAuth, Gmail sync, or updater install/restart flows.
- `exactOptionalPropertyTypes` is not enabled because it tends to cascade; revisit when we add a contracts audit task.

## Reporting

Report suspected vulnerabilities via GitHub's [private security advisory flow](https://github.com/danielvictorino/HyperMail/security/advisories/new). See [`SECURITY.md`](../SECURITY.md) at the repo root for scope, severity expectations, and sanitization guidance. Do not post proof-of-concept email payloads in public channels — sanitize before sharing.
