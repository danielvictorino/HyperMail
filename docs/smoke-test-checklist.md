# HyperMail Smoke Test Checklist

Run this before tagging a release. Build an unpacked app first:

```bash
npm run verify          # typecheck + test + build
npm run package:dir     # unpacked Electron app under release/
```

Launch the unpacked `HyperMail.exe`. Use DevTools (Ctrl+Shift+I) to watch the console.

## B2 — Runtime smoke

- [ ] **Fresh install + OAuth**: first launch → `GOOGLE_OAUTH_CLIENT_ID` picked up from `%APPDATA%\HyperMail\.env` → "Sign in with Google" opens the system browser → callback returns success → mailbox syncs ≤ 60 threads.
- [ ] **Offline mode**: disable network → archive + snooze + label changes → enqueue optimistically, no errors → reconnect → modifier queue flushes, no duplicate writes observed in Gmail web UI.
- [ ] **Token expiry**: edit the stored session's `expiresAt` to `Date.now() - 1` (or wait 1h) → first Gmail call triggers silent refresh → no user-visible interruption.
- [ ] **Large mailbox**: switch to an account with 10k+ threads → scroll through the virtualized list → median frame time under ~16 ms (DevTools Performance tab). `ThreadRow` memoization should mean scroll does not re-render adjacent rows.
- [ ] **Attachment download + cached offline open**: open a thread with an attachment → download → go offline → reopen attachment from cache → opens successfully.
- [ ] **AI summary + voice draft**: with `OPENAI_API_KEY` set, press `a` on a selected thread (summary), `d` (voice draft), `l` (split). Each completes and updates the side panel. Without the key, these should no-op cleanly — no crash.
- [ ] **Auto-update (staging)**: point `HYPERMAIL_UPDATES_URL` at a staging manifest and `HYPERMAIL_UPDATE_CHANNEL=beta` → "Check for updates" → differential download → install on restart.
- [ ] **Crash reporter**: force a main-process throw (e.g., temporarily `throw new Error("smoke")` in a handler) → verify a crash dump lands in `logs/` and the configured `HYPERMAIL_CRASH_REPORT_URL` receives a POST. Revert the throw before shipping.
- [ ] **External-URL guard**: create a draft HTML with `<a href="file:///C:/Windows/System32">click</a>` and `<a href="javascript:alert(1)">click</a>` → click both → neither should open.
- [ ] **CSP**: walk the entire UI (inbox, compose, settings, palette) with DevTools console open → zero CSP violations.

## B3 — Security probes

- [ ] **IPC fuzz** (from DevTools console):
  ```js
  // Expect each to throw an IpcValidationError surfaced as a rejection
  await window.hypermail.mail.syncGmailMailbox({});
  await window.hypermail.mail.setThreadStarred({ accountId: ["x"], threadId: "t", starred: 1, idempotencyKey: "k" });
  await window.hypermail.mail.unsubscribeGmailThread({ accountId: "a", threadId: "t", idempotencyKey: "k", unsubscribe: { method: "http-get", endpoint: "javascript:alert(1)", oneClick: true, sourceMessageId: "m" }});
  ```
- [ ] **Renderer XSS**: render an email body containing `<script>window.__pwn=true</script>` and `<img src=x onerror=alert(1)>` → neither fires. `window.__pwn` remains undefined. CSP blocks any inline execution.
- [ ] **OAuth state tampering**: start sign-in → copy the redirect URL from the auth page → tamper with the `state` parameter before the browser redirects (edit in DevTools network tab or paste a modified URL into the address bar) → HyperMail rejects the callback with "OAuth callback was invalid."

## B4 — Regression gate

- [ ] `npm run verify` green
- [ ] No TypeScript errors, no failing tests, no CSP violations, no IPC validation crashes
- [ ] `docs/security.md` reviewed if any hardening changed

When all boxes are checked, tag:

```bash
git tag v0.1.1-hardened
git push origin v0.1.1-hardened
```
