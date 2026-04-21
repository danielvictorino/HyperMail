# HyperMail

## Step 15 Status

Complete.

Step 15 hardens the packaged desktop runtime instead of adding more mailbox surface:

- packaged Gmail smoke-test diagnostics through persistent main logs and local crash dumps
- optional remote crash upload wiring through Electron crash reporting
- Windows auto-update infrastructure with generic-provider metadata and runtime controls
- right-rail release ops for logs, updater state, and packaged runtime visibility

## Step 15 Files

Release runtime contracts and config:

- `src/shared/contracts.ts`
- `electron/runtime/runtime-config.ts`
- `.env.example`
- `tsconfig.electron.json`

Crash logging and updater services:

- `electron/observability/app-observability.ts`
- `electron/updater/auto-update-service.ts`
- `electron/main.ts`
- `electron/preload.ts`

Renderer release ops wiring:

- `src/renderer/state/session-store.ts`
- `src/renderer/hooks/use-auth-session.ts`
- `src/renderer/components/mail/context-rail.tsx`
- `src/renderer/App.tsx`

Packaging and docs:

- `package.json`
- `README.md`
- `docs/release-smoke-test.md`
- `docs/distribution-playbook.md`

## Step 15 Architecture Decisions

### 1. Packaged Debugging Must Work Without A Dev Console

- HyperMail now writes persistent Electron logs into the user-data logs directory and stores crash dumps locally.
- Renderer runtime errors are forwarded through preload to the main-process log.
- This makes packaged Gmail smoke tests debuggable without needing a repo checkout or dev server.

### 2. Crash Upload Is Optional, Local Capture Is Not

- The crash reporter is always armed in packaged builds, but remote upload is only enabled when `HYPERMAIL_CRASH_REPORT_URL` exists.
- That keeps the production path ready without forcing backend infrastructure into the release flow.
- Internal testing can still rely on local Crashpad artifacts.

### 3. Auto-Update Should Be Configured, Not Assumed

- The app only enables runtime update checks when `HYPERMAIL_UPDATES_URL` is configured.
- Windows release builds now emit `latest.yml` next to the NSIS installer and blockmap, which is the metadata required by the generic provider flow.
- The runtime updater is explicit and manual-first: check, download, then restart to install.

### 4. Release Controls Belong In The Existing Right Rail

- Instead of inventing a separate settings surface, packaged diagnostics now live beside runtime config and sync telemetry.
- That keeps smoke-test operators in one place while preserving the minimal desktop shell.

## Step 15 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
npm run package:dir
npm run dist
```

Results:

- renderer and Electron TypeScript checks passed
- all 43 tests still passed
- production renderer and Electron bundles passed
- unpacked Windows build still succeeded into `release\win-unpacked`
- release artifacts still built successfully
- `release\latest.yml` is now generated for the Windows update flow

## Step 15 Demo Plan

1. Put a packaged `.env` in `%APPDATA%\HyperMail\.env`.
2. Add `GOOGLE_OAUTH_CLIENT_ID`.
3. Optionally add `HYPERMAIL_UPDATES_URL` and `HYPERMAIL_CRASH_REPORT_URL`.
4. Launch `release\win-unpacked\HyperMail.exe` or the portable build.
5. Open the new `Release ops` card in the right rail.
6. Use `Open logs folder`, then confirm `main.log` and the crash-dumps directory exist.
7. If updates are configured, run `Check for updates`.
8. Run the Gmail smoke test end-to-end and use the log folder if anything fails.

## Step 15 Notes

- I still did not execute a real packaged Gmail sign-in flow myself because that requires your account session on this machine.
- The updater flow is Windows NSIS only for now, which matches the current desktop release target.
- The next sensible step is your requested one: run a real packaged Gmail smoke test and fix whatever falls out of it.

## Step 14 Status

Complete.

Step 14 finishes the desktop distribution handoff instead of adding more product surface:

- real HyperMail brand assets for the app shell, favicon, and Windows packaging
- installer-ready packaging config for both NSIS and portable distribution
- Windows app identity wiring in Electron
- release documentation for internal rollout and artifact handling

## Step 14 Files

Brand assets and generation:

- `scripts/build-brand-assets.ps1`
- `build/icon.ico`
- `build/icon.png`
- `public/hypermail-mark.svg`
- `public/favicon.ico`
- `public/icon.png`

Shell and packaging:

- `electron/main.ts`
- `src/renderer/components/mail/mail-sidebar.tsx`
- `index.html`
- `package.json`

Docs:

- `README.md`
- `docs/release-smoke-test.md`
- `docs/distribution-playbook.md`

## Step 14 Architecture Decisions

### 1. Brand Assets Should Be Regenerable, Not Opaque

- HyperMail now includes a PowerShell generator that creates the Windows `.ico` and raster assets from a single brand shape.
- That keeps the release process maintainable without hand-editing binary icon files.
- The source-of-truth visual mark remains simple enough to evolve later.

### 2. Distribution Should Support Two Internal Modes

- The build now produces both an NSIS installer and a portable executable.
- The installer is better for normal team rollout and shortcut creation.
- The portable build is better for quick internal evaluation and low-friction testing.

### 3. Desktop Identity Matters In Production

- Electron now sets a Windows app user model ID and uses the packaged icon for the app window.
- The renderer also uses the same brand mark for the sidebar and favicon assets.
- This makes the packaged app feel like a product, not just a dev shell.

### 4. Signing Remains Explicitly Deferred

- HyperMail still builds unsigned Windows artifacts.
- That is acceptable for internal distribution right now, but SmartScreen friction should be expected.
- The distribution playbook now documents the path to code signing later.

## Step 14 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run package:dir
npm run dist
```

Results:

- renderer and Electron TypeScript checks passed
- all 43 tests passed
- unpacked Windows build still succeeded into `release\win-unpacked`
- installer artifact built successfully: `release\HyperMail-0.1.0-win-x64.exe`
- portable artifact built successfully: `release\HyperMail-0.1.0-portable-x64.exe`

## Step 14 Demo Plan

1. Run `release\win-unpacked\HyperMail.exe` and confirm the branded app icon appears.
2. Open the right rail and confirm runtime config is still resolved from the packaged path.
3. Launch `release\HyperMail-0.1.0-portable-x64.exe` and confirm it behaves the same way.
4. Run the NSIS installer and confirm it allows install-directory selection and creates shortcuts.
5. Use the packaged build to run the existing Gmail smoke test end-to-end.

## Step 14 Notes

- The `dist` build initially failed inside the sandbox with a `spawn EPERM`; rerunning it outside the sandbox succeeded.
- I still did not run a live Gmail packaged smoke test myself because that requires your real account session on this machine.
- The next sensible step is the actual internal release check: run the packaged Gmail flow, then either keep polishing edge cases or start daily-driving it.

## Step 13 Status

Complete.

Step 13 closes the final Gmail-first release gaps instead of widening product scope:

- desktop-native export for cached attachments through the OS save dialog
- cached attachment reuse instead of unnecessary re-downloads
- Gmail sync cleanup for stale cached attachments when threads or messages disappear
- broader incremental-sync recovery when Gmail history is no longer usable
- clearer sync telemetry when HyperMail falls back to a full Gmail refresh

## Step 13 Files

Attachment export and cache handling:

- `electron/mail/attachment-export.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `src/shared/contracts.ts`
- `src/renderer/offline/attachments/attachment-cache.ts`
- `src/renderer/hooks/use-mailbox-lab.ts`
- `src/renderer/components/mail/thread-view.tsx`

Gmail sync recovery and cleanup:

- `src/shared/mail/gmail-sync-recovery.ts`
- `src/shared/mail/gmail-sync-recovery.test.ts`
- `electron/gmail/google-mail-service.ts`
- `src/renderer/offline/sync/gmail-sync.ts`
- `src/renderer/offline/sync/gmail-sync.test.ts`
- `src/renderer/components/mail/context-rail.tsx`

Docs:

- `README.md`
- `docs/release-smoke-test.md`

## Step 13 Architecture Decisions

### 1. Cached Attachments Become Portable Desktop Files

- HyperMail now treats a cached attachment as something the user can export, not just count.
- The renderer keeps IndexedDB as the offline cache, then hands the cached payload to Electron for the actual save dialog and file write.
- This keeps offline behavior intact while preserving native desktop UX.

### 2. Attachment Cache Must Shrink With The Mailbox

- Gmail sync now deletes cached attachments when their parent thread or message disappears from the refreshed mailbox state.
- This prevents stale bytes from surviving in IndexedDB after Gmail deletes or replaces a message set.
- Cache state on still-valid attachments is still preserved locally.

### 3. Gmail History Gaps Should Recover, Not Just Error

- Incremental sync now explicitly detects history-gap style Gmail failures and falls back to a full refresh.
- The fallback is narrow to `/history` failures, so unrelated Gmail errors still surface normally.
- The right rail now shows when the last sync recovered from a history gap.

### 4. Release Polish Stays Gmail-First

- This step does not add new providers or UI modules.
- It sharpens the behavior the team will actually use in production: Gmail sync, offline attachments, and packaged desktop runtime stability.

## Step 13 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
npm run package:dir
```

Results:

- new Gmail sync recovery tests passed
- Gmail sync cache-cleanup tests passed
- TypeScript typecheck passed across renderer and Electron
- renderer production build passed
- Electron bundle build passed
- unpacked Windows desktop package still builds successfully into `release\win-unpacked`

## Step 13 Demo Plan

1. Start with `npm run dev` or launch the unpacked desktop build.
2. Open a thread with an attachment.
3. Click the attachment once to cache it locally.
4. Click it again and confirm HyperMail opens the native save dialog and exports the cached file.
5. Connect Gmail and let the mailbox sync normally.
6. Use `Sync now` after reconnecting from offline mode and confirm the right rail still reports clean sync telemetry.
7. If Gmail history has rolled forward and incremental sync can no longer continue, confirm the app recovers with a full refresh instead of getting stuck on a raw history error.

## Step 13 Notes

- I did not run a real-account packaged smoke test myself because that requires your Gmail session on this machine.
- The smoke-test checklist now explicitly includes attachment export and Gmail sync recovery checks.
- The next sensible step is a true production handoff: one real Gmail packaged smoke test, app icon/signing polish, and then installer/distribution work.

## Step 12 Status

Complete.

Step 12 hardens the Gmail-first desktop release path instead of adding new product surface:

- packaged runtime config loading with a real user-data `.env` path
- explicit runtime config visibility in the right rail
- clearer missing-config errors for Gmail OAuth and OpenAI
- packaging script for unpacked desktop verification
- updated README and a release smoke-test checklist

## Step 12 Files

Runtime config and contracts:

- `src/shared/runtime/runtime-config-paths.ts`
- `src/shared/runtime/runtime-config-paths.test.ts`
- `src/shared/contracts.ts`
- `electron/runtime/runtime-config.ts`

Electron shell wiring:

- `electron/main.ts`
- `electron/preload.ts`
- `electron/ai/openai-mail-assistant.ts`

Renderer visibility:

- `src/renderer/state/session-store.ts`
- `src/renderer/hooks/use-auth-session.ts`
- `src/renderer/components/mail/context-rail.tsx`
- `src/renderer/App.tsx`

Packaging and docs:

- `package.json`
- `README.md`
- `docs/release-smoke-test.md`

## Step 12 Architecture Decisions

### 1. Runtime Config Must Work In Packaged Desktop Builds

- Development can keep reading from the repo-root `.env`.
- Packaged builds now prefer `%APPDATA%\\HyperMail\\.env`.
- This avoids the common Electron failure mode where a built app silently loses access to repo-local environment files.

### 2. Config Readiness Is A Product Surface

- HyperMail now exposes runtime config state in the right rail.
- Gmail OAuth, OpenAI readiness, and the active config path are visible without opening logs.
- This keeps setup failures diagnosable by operators and testers.

### 3. Missing Secrets Fail Clearly

- Gmail and OpenAI runtime checks now point to the exact preferred config path.
- The app no longer relies on generic boot-time dotenv assumptions.
- That makes packaged smoke tests much faster to debug.

### 4. Release Hardening Stops Short Of Installer Work

- This step validates the unpacked desktop artifact first.
- That is the right trade because config, auth, cache, and offline behavior are the real product risks.
- Installer signing and distribution can come after the app itself is stable in packaged form.

## Step 12 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
npm run package:dir
```

Results:

- runtime config path tests passed
- TypeScript typecheck passed across renderer and Electron
- existing Gmail sync, AI, queue, outbox, and search tests still passed
- renderer production build passed
- Electron bundle build passed
- unpacked Windows desktop package now builds successfully into `release\win-unpacked`

## Step 12 Demo Plan

1. Start in development with `npm run dev`.
2. Confirm the right rail now shows the runtime config card with readiness state and config path.
3. Remove or rename `.env` temporarily and confirm the app points to the preferred config path in the error state.
4. Restore `.env`, reconnect Gmail, and confirm the readiness card flips back to ready.
5. Build an unpacked desktop artifact with `npm run package:dir`.
6. Place a `.env` file in `%APPDATA%\\HyperMail\\.env`.
7. Launch the packaged executable and run the smoke-test checklist in `docs/release-smoke-test.md`.

## Step 12 Notes

- This step is intentionally still Gmail-first. Outlook remains deferred because the team uses Gmail and the Gmail path is the product-critical one to finish.
- The new runtime config summary gives the renderer enough visibility for setup diagnostics without exposing secrets.
- Windows unpacked packaging now skips executable signing/resource editing for the smoke-test build path via `signAndEditExecutable: false`, which removes an unnecessary local privilege dependency during release verification.
- The next sensible step is a final release pass: attachment export polish, sync recovery edge cases, and packaged smoke-test execution against a real Gmail account.

## Step 11 Status

Complete.

Step 11 closes the main Gmail-first offline gap after read and compose:

- local mailbox search over the cached thread and message corpus
- global search results across the full Dexie-backed working set, not just the active split
- search field embedded into the inbox list surface
- keyboard focus on `/` with escape-to-clear behavior
- local ranking tuned toward subject and sender matches before body text noise

## Step 11 Files

Search runtime and state:

- `src/renderer/lib/mailbox-search.ts`
- `src/renderer/lib/mailbox-search.test.ts`
- `src/renderer/state/inbox-ui-store.ts`
- `src/renderer/hooks/use-mailbox-lab.ts`

Shell and list UI:

- `src/renderer/hooks/use-keyboard-engine.ts`
- `src/renderer/components/mail/virtual-thread-list.tsx`
- `src/renderer/components/mail/mail-sidebar.tsx`
- `src/renderer/App.tsx`

## Step 11 Architecture Decisions

### 1. Search Stays On The Local Snapshot Path

- HyperMail already loads the mailbox from IndexedDB and replays modifiers locally.
- Search now runs against that same local projection instead of introducing a second indexing subsystem.
- This keeps the read path coherent and preserves the local-first latency target.

### 2. Search Is Global Across Cached Mail

- When the user types into the inbox search field, results are pulled from the full local mailbox cache.
- Search is not constrained to the currently selected split.
- This matches the “find mail fast” expectation better than section-scoped filtering.

### 3. Ranking Favors High-Signal Fields

- Subject and participant matches score above snippet and body-only matches.
- Multi-token queries require all tokens to match somewhere in the local thread corpus.
- Recent threads still break ties after relevance scoring.

### 4. Keyboard Search Is A First-Class Primitive

- `/` focuses the search field from anywhere in the main shell.
- `Escape` clears search when active.
- The sidebar now exposes search as a real shortcut, not an implied affordance.

## Step 11 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
```

Results:

- TypeScript typecheck passed across renderer and Electron
- new mailbox-search tests passed
- existing Gmail sync, modifier, outbox, and command tests still passed
- renderer production build passed
- Electron bundle build passed

## Step 11 Demo Plan

1. Start the app with `npm run dev`.
2. Press `/` anywhere in the shell.
3. Search for a sender, subject fragment, or phrase from a thread body.
4. Confirm the results come from the local cache even with `Simulate offline` enabled.
5. Press `Escape` to clear the search and return to the active split.
6. Try the demo digest thread and a few Gmail-backed threads to confirm search cuts across archived and active mail that already exists locally.

## Step 10 Status

Complete.

Step 10 finishes another Gmail-only gap instead of widening provider scope:

- RFC-aware unsubscribe parsing from Gmail `List-Unsubscribe` headers
- queued unsubscribe as a first-class modifier using the same `modify()` + `persist()` pattern
- remote Gmail execution for one-click HTTP POST, HTTP GET, and `mailto:` unsubscribe flows
- local archive-on-unsubscribe behavior so low-value threads leave the working set immediately
- keyboard, command palette, and thread UI support for unsubscribe on `U`
- seeded demo coverage for unsubscribe without requiring a live Gmail account

## Step 10 Files

Shared mail model and Gmail parsing:

- `src/shared/mail/models.ts`
- `src/shared/contracts.ts`
- `src/shared/mail/google-transformers.ts`
- `src/shared/mail/google-transformers.test.ts`

Queue and persistence runtime:

- `src/renderer/offline/modifiers/thread-modifier.ts`
- `src/renderer/offline/modifiers/modifier-factory.ts`
- `src/renderer/offline/modifiers/unsubscribe-thread-modifier.ts`
- `src/renderer/offline/queue/mail-gateway.ts`
- `src/renderer/offline/queue/demo-mail-gateway.ts`
- `src/renderer/offline/queue/provider-mail-gateway.ts`
- `src/renderer/offline/sync/gmail-sync.ts`
- `electron/gmail/google-mail-service.ts`
- `electron/main.ts`
- `electron/preload.ts`

Mailbox UI and demo coverage:

- `src/renderer/hooks/use-mailbox-lab.ts`
- `src/renderer/hooks/use-keyboard-engine.ts`
- `src/renderer/hooks/use-command-palette.ts`
- `src/renderer/lib/command-palette.ts`
- `src/renderer/components/mail/thread-view.tsx`
- `src/renderer/components/mail/virtual-thread-list.tsx`
- `src/renderer/components/mail/mail-sidebar.tsx`
- `src/renderer/offline/demo/seed-mailbox.ts`
- `src/renderer/App.tsx`

Tests:

- `src/renderer/lib/mailbox-view.test.ts`
- `src/renderer/offline/modifiers/modifier-factory.test.ts`
- `src/renderer/offline/queue/modifier-queue-engine.test.ts`
- `src/renderer/offline/outbox/outbox-engine.test.ts`
- `src/renderer/offline/sync/gmail-sync.test.ts`

## Step 10 Architecture Decisions

### 1. Unsubscribe Uses The Existing Modifier Pattern

- Unsubscribe is modeled as a real queued modifier, not a side-effect-only button.
- `modify()` archives the thread locally, clears snooze, and marks the thread as unsubscribed immediately.
- `persist()` executes the provider-specific unsubscribe path and then archives the Gmail thread remotely.

### 2. Gmail Parsing Follows The Standard Headers

- HyperMail now parses `List-Unsubscribe` and `List-Unsubscribe-Post` from inbound Gmail messages.
- If RFC 8058 one-click is present, HyperMail prefers the HTTPS POST endpoint.
- Otherwise it falls back to the first supported URL or `mailto:` target in the header sequence.

### 3. Local Intent Survives Sync

- Gmail sync now preserves local unsubscribe state the same way it already preserved active snoozes.
- If a fresh sync snapshot does not include unsubscribe metadata, HyperMail keeps the previously known descriptor.
- That keeps queued local intent stable while Gmail sync continues refreshing the base cache.

### 4. Gmail-Only Finish Pass Means No New Provider Surface

- Microsoft groundwork remains in the repo, but this step does not expand it.
- The product surface stays Gmail-first, matching the team’s actual usage.
- Finishing the Gmail path is a better trade than widening incomplete provider coverage.

## Step 10 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
```

Results:

- TypeScript typecheck passed across renderer and Electron
- Gmail transformer, modifier queue, outbox, and sync tests all passed
- renderer production build passed
- Electron bundle build passed

## Step 10 Demo Plan

1. Start the app with `npm run dev`.
2. Stay in the demo mailbox or connect Gmail.
3. Select a thread with unsubscribe support and press `U`.
4. Confirm the thread archives immediately and shows as unsubscribed.
5. Open `Cmd/Ctrl + K` and try `unsubscribe`, or search for the sender name plus `unsubscribe`.
6. Toggle `Simulate offline`, unsubscribe another eligible thread, then resume online and run `Sync now`.
7. Confirm the queued unsubscribe drains and the thread stays archived.

## Step 10 Notes

- One-click unsubscribe uses an HTTPS POST with `List-Unsubscribe=One-Click` and does not follow redirects.
- `mailto:` unsubscribe is sent through the existing Gmail send path so it stays inside the secure Electron boundary.
- Outlook/Graph work is intentionally deferred until the Gmail path feels finished and sharp.

## Step 9 Status

Complete.

Step 9 adds the next real workflow layer without breaking the local-first architecture:

- natural-language snooze as a first-class local modifier
- a dedicated `Snoozed` mailbox section with keyboard and palette support
- Gmail sync merge preservation for local-only snooze state
- provider-aware auth/session contracts instead of Gmail-only assumptions
- Microsoft OAuth desktop scaffolding in Electron, ready for later Graph sync work

## Step 9 Files

Snooze model, queue, and sync:

- `src/shared/mail/models.ts`
- `src/renderer/offline/db/hypermail-db.ts`
- `src/renderer/offline/modifiers/set-thread-snoozed-modifier.ts`
- `src/renderer/offline/modifiers/modifier-factory.ts`
- `src/renderer/offline/queue/mail-gateway.ts`
- `src/renderer/offline/queue/demo-mail-gateway.ts`
- `src/renderer/offline/queue/provider-mail-gateway.ts`
- `src/renderer/offline/sync/gmail-sync.ts`

Mailbox UI and interactions:

- `src/renderer/lib/mailbox-view.ts`
- `src/renderer/lib/send-later.ts`
- `src/renderer/hooks/use-mailbox-lab.ts`
- `src/renderer/hooks/use-command-palette.ts`
- `src/renderer/hooks/use-keyboard-engine.ts`
- `src/renderer/state/inbox-ui-store.ts`
- `src/renderer/components/mail/mail-sidebar.tsx`
- `src/renderer/components/mail/virtual-thread-list.tsx`
- `src/renderer/components/mail/thread-view.tsx`
- `src/renderer/App.tsx`

Provider groundwork:

- `src/shared/contracts.ts`
- `src/shared/auth/google-pkce.ts`
- `src/shared/mail/provider-ids.ts`
- `electron/oauth/token-store.ts`
- `electron/oauth/google-oauth.ts`
- `electron/oauth/microsoft-oauth.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `.env.example`

Tests:

- `src/renderer/lib/mailbox-view.test.ts`
- `src/renderer/offline/modifiers/modifier-factory.test.ts`
- `src/renderer/offline/queue/modifier-queue-engine.test.ts`
- `src/renderer/offline/outbox/outbox-engine.test.ts`
- `src/renderer/offline/sync/gmail-sync.test.ts`

## Step 9 Architecture Decisions

### 1. Snooze Uses The Same Modifier Pattern As Archive And Star

- Snooze is not a separate UI-only filter.
- It is now a persisted modifier record with `modify()` and `persist()` behavior, so optimistic replay stays deterministic.
- The provider gateway currently persists snooze locally, which keeps the user experience instant while the remote provider-specific implementation is still pending.

### 2. Gmail Sync Preserves Local-Only Intent

- Gmail thread modify is label-based, and this step does not fake a remote snooze.
- When Gmail sync refreshes a thread, HyperMail now preserves an active local `snoozedUntil` value instead of overwriting it.
- That keeps the offline-first promise intact.

### 3. Provider Boundaries Are Now Explicit

- Auth contracts, token storage, and Electron IPC are now provider-aware.
- Google remains the only mailbox sync provider in the product surface.
- Microsoft sign-in is scaffolded behind the runtime boundary so Graph sync can plug in later without redoing the session model.

### 4. Keyboard And Palette Stay First-Class

- `Z` now snoozes or unsnoozes the selected thread.
- The command palette supports explicit snooze actions and schedule phrases such as `snooze tomorrow 8am`.
- The mailbox navigation now includes a dedicated `Snoozed` section on `6`, with `Archive` moved to `7`.

## Step 9 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
```

Results:

- typecheck passed across renderer and Electron
- mailbox, queue, outbox, Gmail sync, and modifier tests all passed
- renderer production build passed
- Electron bundle build passed

## Step 9 Demo Plan

1. Start the app with `npm run dev`.
2. Select a thread and press `Z` to snooze it to tomorrow morning.
3. Open the `Snoozed` section with `6` and confirm the thread moves there immediately.
4. Use `Cmd/Ctrl+K` and try `snooze tomorrow 8am` on the current thread.
5. Toggle `Simulate offline`, snooze or unsnooze another thread, then resume online and run `Sync now`.
6. Confirm the queued modifier drains and the snooze state stays intact.
7. Optionally add `MICROSOFT_OAUTH_CLIENT_ID` to `.env` to verify the new auth boundary is wired, while keeping Gmail as the only synced mailbox for now.

## Step 9 Notes

- Microsoft auth is scaffolded, not fully productized. Outlook/Graph mailbox sync is still the next provider step.
- Snooze currently persists through the provider gateway as a local-first operation, which is the correct tradeoff until a provider-specific remote implementation is added.
- The env template now includes `MICROSOFT_OAUTH_CLIENT_ID`.

## Step 8 Status

Complete.

Step 8 polishes the product surface instead of adding bloat:

- natural-language send later on top of the existing outbox engine
- Inbox Zero daily artwork for empty splits
- richer dark shell styling and typography tuning
- local performance instrumentation in the right rail
- smarter automatic split assignment for direct, action-oriented Gmail threads

## Step 8 Files

Scheduling and tests:

- `src/renderer/lib/send-later.ts`
- `src/renderer/lib/send-later.test.ts`
- `src/renderer/components/mail/thread-composer.tsx`
- `src/renderer/components/mail/thread-view.tsx`
- `src/renderer/hooks/use-mailbox-lab.ts`

Inbox Zero and shell polish:

- `src/renderer/components/mail/inbox-zero-artwork.tsx`
- `src/renderer/components/mail/virtual-thread-list.tsx`
- `src/renderer/components/mail/mail-sidebar.tsx`
- `src/renderer/components/shell/app-shell.tsx`
- `src/renderer/components/ui/card.tsx`
- `src/renderer/index.css`
- `src/renderer/App.tsx`

Performance and split behavior:

- `src/shared/mail/models.ts`
- `src/renderer/offline/db/load-inbox-snapshot.ts`
- `src/renderer/components/mail/context-rail.tsx`
- `src/shared/mail/google-transformers.ts`
- `src/shared/mail/google-transformers.test.ts`

## Step 8 Architecture Decisions

### 1. Send Later Reuses The Existing Outbox

- No second scheduling subsystem was introduced.
- The composer now parses phrases like `tomorrow 8am`, `in 2h`, and `fri 9:30am`.
- Parsed timestamps flow into the same `sendAt` field the outbox engine already understands.

### 2. Inbox Zero Is Treated As A Reward State

- Empty splits now show a date-seeded generative artwork instead of generic blank-state text.
- The artwork is deterministic per day and section, so the state feels intentional without needing remote assets.

### 3. Performance Metrics Stay Local

- IndexedDB snapshot load time and mailbox counts are computed as part of snapshot assembly.
- The right rail now exposes those numbers so “fast” is inspectable instead of implied.

### 4. Split Inbox Gets Smarter Without More User Work

- Gmail threads without explicit `VIP` or `IMPORTANT` labels now get a small local heuristic pass.
- Direct, action-oriented threads with urgency or collaboration signals move into `important` automatically.
- Explicit Gmail labels still win.

## Step 8 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
```

Results:

- send-later parser tests passed
- Gmail transformer tests passed with the new split heuristic case
- all existing queue, sync, AI, and command palette tests still passed
- TypeScript typecheck passed
- renderer production build passed
- Electron bundle build passed

## Step 8 Demo Plan

1. Start the app with `npm run dev`.
2. Open a thread and compose a reply.
3. In the schedule field, try `tomorrow 8am`, `in 2h`, or `fri 9:30am`.
4. Click `Schedule send` and confirm the draft moves into the queued outbox path.
5. Open a split with no threads and confirm the Inbox Zero artwork appears.
6. Check the right rail and confirm local snapshot load timing and mailbox counts are visible.
7. Connect Gmail and confirm new direct action-oriented mail can land in `important` even when Gmail did not set `IMPORTANT`.

## Step 8 Notes

- The send-later parser is intentionally compact and local-first. It covers the fast, high-frequency phrases first.
- Inbox Zero artwork is generated client-side and does not depend on any external image service.
- Outlook provider work is still deferred; this step focused on polish and responsiveness, matching the original iteration plan.

## Step 7 Status

Complete.

Step 7 adds the first real HyperMail copilot layer without breaking the local-first runtime:

- Electron-side OpenAI integration through the Responses API
- local sent-mail sampling for voice matching
- structured thread summaries
- structured split-inbox suggestions
- voice-drafted replies written back into the existing local draft store
- AI actions wired into the thread view, composer, command palette, and keyboard engine
- cached AI artifacts stored locally so summaries and split suggestions survive reloads

## Step 7 Files

Shared AI contracts and prompt system:

- `src/shared/ai/mail-assistant.ts`
- `src/shared/ai/mail-assistant.test.ts`
- `src/shared/contracts.ts`

Electron AI runtime:

- `electron/ai/openai-mail-assistant.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `.env.example`

Renderer AI integration:

- `src/renderer/offline/assistant/thread-assistant-cache.ts`
- `src/renderer/hooks/use-mailbox-lab.ts`
- `src/renderer/App.tsx`
- `src/renderer/hooks/use-command-palette.ts`
- `src/renderer/hooks/use-keyboard-engine.ts`
- `src/renderer/lib/command-palette.ts`
- `src/renderer/components/mail/thread-view.tsx`
- `src/renderer/components/mail/thread-composer.tsx`
- `src/renderer/components/mail/context-rail.tsx`
- `src/renderer/components/mail/command-palette.tsx`

## Step 7 Architecture Decisions

### 1. AI Stays In Electron

- The OpenAI API key never enters the renderer.
- The renderer only sends compact thread context plus a few local voice examples through IPC.
- This keeps the trust boundary aligned with the Gmail integration.

### 2. Voice Matching Uses Local Sent Mail, Not Server Memory

- HyperMail samples the user’s own sent messages from Dexie.
- Queued, failed, and duplicate-ish messages are ignored so the few-shot context stays clean.
- This gives immediate personalization for both demo and Gmail-backed accounts.

### 3. AI Artifacts Are Cached Locally

- Thread summaries and split suggestions are stored in local metadata records.
- Generated drafts are saved into the same draft store the composer already uses.
- AI outputs therefore survive reloads and fit the offline-first mental model.

### 4. Structured Outputs Beat Free-Form Text

- Summary, split suggestion, and draft generation all use strict JSON schemas.
- The renderer receives typed data, then renders or converts it locally.
- Draft HTML is assembled in-app instead of trusting raw model HTML.

## Step 7 Prompt Engineering

Voice drafting is intentionally narrow:

- use the current thread as task context
- include up to four recent sent replies as voice examples
- instruct the model to match cadence, directness, and closing style without copying phrases
- forbid invented commitments, dates, or details
- force a typed response shape and render the final HTML locally

Core prompt structure in code:

- `buildDraftReplyInstructions()`
- `buildDraftReplyInput()`
- `buildThreadSummaryInstructions()`
- `buildSplitSuggestionInstructions()`

Runtime defaults:

- `OPENAI_MODEL=gpt-5.4-mini`
- `OPENAI_API_KEY` required to enable AI features

## Step 7 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
```

Results:

- new shared AI helper tests passed
- all existing queue, sync, command palette, and transformer tests still passed
- TypeScript typecheck passed
- renderer production build passed
- Electron bundle build passed

## Step 7 Demo Plan

1. Copy `.env.example` to `.env` if needed.
2. Add `OPENAI_API_KEY` and optionally override `OPENAI_MODEL`.
3. Start the app with `npm run dev`.
4. Open any thread and press `A` to generate a summary.
5. Press `L` to classify the thread into `VIP`, `Important`, or `Other`.
6. Apply the suggested split from the right rail.
7. Press `D` or use the `Voice Draft` action.
8. Confirm the composer opens with a generated reply already saved into the local draft store.
9. Open the command palette with `Cmd/Ctrl + K` and try `draft maya`, `summarize launch`, or `label vip`.
10. Toggle `Simulate offline` and confirm cached summaries still show while new AI generation is disabled gracefully.

## Step 7 Notes

- AI is optional. If `OPENAI_API_KEY` is missing, mail still works and the UI explains why AI is disabled.
- Summaries and split suggestions are cached locally, but new model generation still requires a live connection.
- The provider boundary is ready for a future Anthropic / Claude backend without changing renderer contracts.

## Next Step

Step 8 should polish the product feel:

- inbox zero visual state
- richer dark-theme refinement and typography tuning
- deeper performance instrumentation around sync and render paths
- more automatic split-inbox behavior on new mail
- natural-language snooze/send-later
- first pass of Outlook provider abstraction

## Desktop vs Web

For this project, desktop is the easier path and it is already the committed direction in the codebase.

Why desktop is easier here:

- secure Gmail OAuth and token refresh already live in Electron main with OS keychain storage
- local-first Dexie cache plus Electron IPC already assumes a trusted desktop shell
- Superhuman-style latency, background-ish sync behavior, and offline queuing are easier to control in a desktop runtime
- attachment caching and future file access are much cleaner in a desktop context than in a pure browser app

What would be easier about a web app instead:

- deployment and updates
- sharing URLs and multi-device access
- no desktop packaging or Electron-specific runtime concerns

What would be harder about a web app for HyperMail specifically:

- secure token handling without widening the surface area
- matching the current offline-first architecture cleanly
- attachment and richer local cache behavior
- keeping the same “premium local app” feel without reworking the shell assumptions

## Current Project Direction

The project is planned and implemented as a desktop app.

Current architecture in code:

- Electron shell
- React 19 + TypeScript renderer
- Gmail sync and mutations through secure Electron IPC
- Dexie IndexedDB local mailbox cache
- optimistic modifier queue for thread state
- separate outbox foundation for queued replies
- keyboard-first mail UI with command palette

So the practical answer is:

- easiest from scratch for broad reach: web
- easiest for this project, with the goals you set and the code already written: desktop

## Step 6 Status

Complete.

Step 6 adds offline asset and delivery foundations on top of the Gmail sync runtime:

- runtime asset cache registration through a service worker where the renderer supports it
- clear fallback messaging for packaged desktop shells where renderer assets are already local
- attachment metadata extraction from Gmail threads
- local attachment caching into IndexedDB
- autosaved local reply drafts
- queued reply / send-later foundation with a dedicated outbox engine
- sync telemetry and cache visibility in the right rail

## Step 6 Files

Offline assets and cache visibility:

- `public/hypermail-sw.js`
- `src/renderer/lib/register-runtime-cache.ts`
- `src/renderer/state/runtime-cache-store.ts`

Attachments and outbox:

- `src/renderer/offline/attachments/attachment-cache.ts`
- `src/renderer/offline/outbox/draft-service.ts`
- `src/renderer/offline/outbox/outbox-engine.ts`
- `src/renderer/offline/outbox/outbox-engine.test.ts`

Model and sync extensions:

- `src/shared/mail/models.ts`
- `src/shared/mail/google-transformers.ts`
- `src/shared/mail/google-transformers.test.ts`
- `src/shared/contracts.ts`
- `src/renderer/offline/db/hypermail-db.ts`
- `src/renderer/offline/db/load-inbox-snapshot.ts`
- `src/renderer/offline/sync/gmail-sync.ts`

UI integration:

- `src/renderer/components/mail/thread-composer.tsx`
- `src/renderer/components/mail/thread-view.tsx`
- `src/renderer/components/mail/context-rail.tsx`
- `src/renderer/hooks/use-mailbox-lab.ts`
- `src/renderer/App.tsx`
- `src/renderer/main.tsx`

## Step 6 Architecture Decisions

### 1. Replies Use A Separate Outbox, Not The Modifier Queue

- Thread star/archive still use the modifier pattern.
- Reply delivery now uses a dedicated draft and outbox path because sending mail is not just a reversible thread mutation.

### 2. Attachments Are Cached As Local Assets

- Gmail sync now stores attachment metadata on messages.
- Downloaded attachments are cached into IndexedDB and their cache state survives later Gmail sync passes.

### 3. Renderer Asset Caching Is Explicit

- On `http://localhost` style renderer contexts, HyperMail registers a service worker to cache shell assets.
- On packaged `file:` desktop contexts, HyperMail reports that assets are already local instead of pretending a service worker is active.

### 4. Cache And Sync Health Are User-Visible

- The right rail now reports runtime asset cache state, attachment cache totals, draft/outbox counts, and sync timing telemetry.
- This makes offline behavior inspectable instead of hidden.

## Step 6 Verification

Executed successfully:

```powershell
npm test
npm run build
```

Results:

- outbox engine tests passed
- Gmail transformer tests still passed with attachment coverage
- Gmail sync tests still passed with cached-attachment preservation
- modifier and command palette tests still passed
- TypeScript typecheck passed as part of the production build
- renderer production build passed
- Electron bundle build passed

## Step 6 Demo Plan

1. Start the app with `npm run dev`.
2. Connect Gmail if needed and wait for the initial sync.
3. Open a thread with an attachment and click the attachment chip.
4. Confirm it changes from `Cache locally` to `Cached offline`.
5. Open `Reply`, type into the composer, close it, and reopen it.
6. Confirm the local draft restores.
7. Click `Queue send` while online and confirm the outbox count changes briefly, then clears.
8. Toggle `Simulate offline`, compose another reply, and click `Queue send`.
9. Confirm the message appears locally with queued delivery state and the outbox count increases.
10. Resume online mode and click `Sync now`.
11. Confirm the outbox drains and the right rail updates cache and sync telemetry.

## Step 6 Notes

- Send later is intentionally a one-hour scheduling foundation for now, not the final natural-language scheduler.
- The service worker is most relevant for dev and browser-hosted renderer contexts; packaged Electron assets are already local.
- Attachment caching currently stores the downloaded payload in IndexedDB and focuses on offline availability rather than native file export.

## Next Step

Step 7 should implement AI drafting:

- voice-matching prompt stack
- local sent-mail sampling for style grounding
- RAG / few-shot draft generation path
- thread summarization
- split-inbox auto-label suggestions
- command palette hooks for AI actions

## Step 5 Status

Complete.

Step 5 replaces the demo-only persistence path with real Gmail sync while keeping HyperMail local-first:

- Gmail labels, threads, and messages now sync into Dexie
- archive and star modifiers now persist against Gmail threads
- local reads still come entirely from IndexedDB plus queued modifiers
- sync uses `historyId` when available and falls back to a bounded full refresh when needed
- the queue and the Gmail sync writer share stable local IDs, so optimistic UI and remote persistence stay aligned

## Step 5 Files

Electron Gmail bridge:

- `electron/gmail/google-mail-service.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `electron/oauth/google-oauth.ts`

Shared Gmail mapping:

- `src/shared/contracts.ts`
- `src/shared/mail/google-transformers.ts`
- `src/shared/mail/google-transformers.test.ts`

Renderer sync/runtime:

- `src/renderer/offline/queue/provider-mail-gateway.ts`
- `src/renderer/offline/sync/gmail-sync.ts`
- `src/renderer/offline/sync/gmail-sync.test.ts`
- `src/renderer/offline/runtime.ts`
- `src/renderer/offline/demo/seed-mailbox.ts`
- `src/renderer/hooks/use-mailbox-lab.ts`
- `src/renderer/App.tsx`
- `src/renderer/components/mail/context-rail.tsx`

## Step 5 Architecture Decisions

### 1. Gmail Lives In Electron, Not The Renderer

- Gmail API calls happen in Electron main through secure IPC.
- Access tokens still never enter the renderer process.
- The renderer only sees normalized mailbox payloads and mutation results.

### 2. Dexie Remains The Source Of Truth For Reads

- The UI still reads from IndexedDB only.
- Gmail sync writes fresh base snapshots into Dexie, and queued modifiers continue to replay on top of that base state.

### 3. Provider Routing Preserves The Modifier Pattern

- Demo accounts still use the fake gateway.
- Google accounts route the same modifier operations to Gmail thread modify endpoints.
- No UI code needed to know which provider persisted the change.

### 4. Incremental Sync Uses Gmail History

- HyperMail stores the Gmail `historyId` in local metadata.
- When a valid `historyId` exists, sync fetches only changed threads.
- If Gmail reports the history window is no longer valid, HyperMail falls back to a bounded full resync.

## Step 5 Verification

Executed successfully:

```powershell
npm test
npm run build
```

Results:

- Gmail transformer tests passed
- Dexie Gmail sync application tests passed
- command palette and queue tests still passed
- TypeScript typecheck passed as part of the production build
- renderer production build passed
- Electron bundle build passed

## Step 5 Demo Plan

1. Start the app with `npm run dev`.
2. Connect Gmail from the sidebar if you have not already.
3. Wait for the shell badge to move from `Awaiting Gmail sync` to `Synced ...`.
4. Confirm recent Gmail threads appear in the inbox list without a page reload.
5. Star or archive a Gmail-backed thread.
6. Confirm the UI updates immediately and the queue stays visible in the right rail.
7. Toggle `Simulate offline`.
8. Star or archive another thread and confirm the action stays local and queued.
9. Resume online mode and click `Sync now`.
10. Confirm the queue drains and the Gmail-backed mailbox refreshes into Dexie.

## Step 5 Notes

- Initial sync is intentionally bounded to a recent working set so the first Gmail hydrate stays fast.
- Thread and message IDs are prefixed with the local account ID, which keeps local identity stable across cache writes and queued modifiers.
- Full send, drafts, and attachment body caching are still deferred; this step focuses on read sync and archive/star persistence.

## Next Step

Step 6 should add deeper offline behavior around assets and delivery:

- service worker for offline assets
- attachment metadata caching and download flow
- queued send/reply foundations
- reconnect handling polish
- sync performance instrumentation and cache visibility
- first pass of offline search indexing

## Step 4 Status

Complete.

Step 4 adds the Superhuman-style interaction layer on top of the Step 3 shell:

- global keyboard engine
- `Cmd/Ctrl + K` command palette
- visible shortcut hints wired to real actions
- fast section switching and thread navigation
- command search across actions, threads, sections, and system controls
- first-pass natural-language intent routing such as `reply noah` and `archive maya`

## Step 4 Files

Keyboard and palette runtime:

- `src/renderer/hooks/use-keyboard-engine.ts`
- `src/renderer/hooks/use-command-palette.ts`
- `src/renderer/state/command-palette-store.ts`
- `src/renderer/lib/command-palette.ts`
- `src/renderer/lib/command-palette.test.ts`

Shell integration:

- `src/renderer/App.tsx`
- `src/renderer/components/mail/command-palette.tsx`
- `src/renderer/components/mail/mail-sidebar.tsx`
- `src/renderer/hooks/use-mailbox-lab.ts`
- `src/renderer/state/inbox-ui-store.ts`

## Step 4 Interaction Decisions

### 1. Keyboard Is A Real Input Layer

- The app now responds to keyboard input globally instead of treating shortcuts as decorative hints.
- The engine intentionally ignores text inputs and editors so typing in the composer does not trigger mailbox actions.

### 2. Palette Commands Mirror Real State

- The command palette is not static.
- It is built from the current selected thread, the current mailbox contents, the active section model, and the current online/offline/auth state.

### 3. Current-Thread Actions Beat Search Noise

- Pure intent queries like `reply` should prefer the direct action on the selected thread before showing thread-specific variants.
- Thread-specific commands still win when the query contains identifying context like `reply noah` or `archive maya`.

### 4. Fast Search Without Premature Complexity

- Palette search uses normalized keywords, intent aliases, and deferred query updates.
- This keeps the implementation understandable while already supporting the high-frequency search patterns needed for Step 5 sync work.

## Step 4 Shortcuts

- `Cmd/Ctrl + K`: open command palette
- `1` to `6`: switch Inbox, Important, VIP, Other, Starred, Archive
- `J` / `ArrowDown`: next thread
- `K` / `ArrowUp`: previous thread
- `R`: reply to selected thread
- `S`: star or unstar selected thread
- `E`: archive or restore selected thread
- `Escape`: close the palette or composer

## Step 4 Verification

Executed successfully:

```powershell
npm test
npm run build
```

Results:

- command palette ranking tests passed
- mailbox view tests passed
- modifier and queue tests still passed
- TypeScript typecheck passed as part of the production build
- renderer production build passed
- Electron bundle build passed

## Step 4 Demo Plan

1. Start the app with `npm run dev`.
2. Press `Cmd/Ctrl + K`.
3. Search `reply`, `reply noah`, `archive maya`, `go vip`, and `offline`.
4. Confirm the top result changes based on intent plus thread context.
5. Close the palette and use `1` to `6` to move through mailbox sections.
6. Use `J` and `K` to move the thread selection.
7. Use `R`, `S`, and `E` on a selected thread.
8. Toggle offline mode from the palette and confirm the queue-aware UI still feels immediate.

## Step 4 Notes

- The palette is intentionally local-first and reads from cached state only.
- This keeps interactions effectively instant and avoids introducing network latency into the command surface.
- The next step can now wire real Gmail sync into the same modifier and command system without reworking interaction plumbing.

## Next Step

Step 5 should implement Gmail API sync:

- initial thread and message hydration
- label and archive/star persistence against Gmail
- incremental sync into Dexie
- optimistic queue replay against the real API
- local-first reads with background refresh
- stable thread identity between Gmail and local cache

## Step 3 Status

Complete.

Step 3 adds the real core mail UI on top of the Step 2 local-first runtime:

- left navigation with Split Inbox sections
- virtualized thread list
- focused thread view
- contextual right rail for sender insight, calendar, and queue state
- TipTap-based reply composer shell
- visible shortcut hints embedded into the interface

## Step 3 Files

Core UI:

- `src/renderer/App.tsx`
- `src/renderer/components/mail/mail-sidebar.tsx`
- `src/renderer/components/mail/virtual-thread-list.tsx`
- `src/renderer/components/mail/thread-view.tsx`
- `src/renderer/components/mail/context-rail.tsx`
- `src/renderer/components/mail/thread-composer.tsx`

State and view-model:

- `src/renderer/state/inbox-ui-store.ts`
- `src/renderer/hooks/use-mailbox-lab.ts`
- `src/renderer/lib/mailbox-view.ts`
- `src/renderer/lib/mailbox-view.test.ts`

## Step 3 UI Decisions

### 1. Split Inbox First

- Navigation now treats `important`, `vip`, and `other` as first-class sections.
- Counts and unread badges are computed from local IndexedDB state, not network fetches.

### 2. Virtualized Thread List

- Thread rows render through `@tanstack/react-virtual`.
- The list keeps the client responsive even once the local cache grows well beyond the seeded demo size.

### 3. Focused Reading Surface

- The center pane is now a proper single-thread reading experience.
- Action buttons are visible at the top of the thread with shortcut hints baked in.

### 4. Composer Is Lazy Loaded

- The TipTap composer is code-split and loaded only when reply is opened.
- This keeps the main shell leaner and avoids making the inbox pay the editor cost up front.

## Step 3 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
```

Results:

- TypeScript typecheck passed
- mailbox section/filter tests passed
- modifier/queue tests still passed
- production renderer build passed
- Electron bundle build passed
- composer was split into its own chunk during production build

## Step 3 Demo Plan

1. Start the app with `npm run dev`.
2. Use the left nav to move between Inbox, Important, VIP, Other, Starred, and Archive.
3. Confirm the center list feels immediate and the selected thread updates the focused reading pane.
4. Open a thread and trigger `Star` or `Archive`.
5. Confirm the state updates instantly and the right rail reflects queue state.
6. Click `Reply`.
7. Confirm the TipTap composer opens as a docked panel beneath the thread.
8. Toggle `Simulate offline`.
9. Change thread state again and confirm the UI still updates immediately while the queue remains pending.
10. Toggle back online and confirm the queue drains.

## Step 3 Notes

- The UI now looks and behaves much closer to a real Superhuman-style shell, but the keyboard engine itself is still deferred to Step 4.
- The search / command palette affordance is visible and intentionally reserved for the next step.
- The composer is a shell right now; send, send later, and AI drafting are still to come.

## Next Step

Step 4 should implement the keyboard engine and command palette:

- global shortcut registry
- command palette overlay
- action execution for reply, archive, star, section switching, and navigation
- visible command search across threads/actions
- first pass of natural-language action routing

Ready for next step?

---

## Step 2 Status

Complete.

Step 2 is now implemented in:

`C:\Users\Daniel Victorino\Vaults\daniel_victorino\Projects\HyperMail`

This step adds:

- Dexie-backed local mailbox schema
- persisted modifier records in IndexedDB
- Superhuman-style `modify()` + `persist()` split
- per-thread queue ordering
- retry with backoff
- rollback by queue removal + replay
- a seeded local inbox lab for testing offline behavior before Gmail sync exists

## Architecture Source

This step follows the core ideas from Superhuman’s offline architecture post:

- https://blog.superhuman.com/architecting-a-web-app-to-just-work-offline-part-1/

Implemented from that article:

- modifiers are created on every user action
- `modify()` is synchronous and pure
- `persist()` is asynchronous and idempotent
- queue ordering is per thread
- visible state is cached base data plus queued modifiers replayed in order
- rollback happens by removing a failed modifier and replaying the remaining queue

## Step 2 Files

Core runtime:

- `src/shared/mail/models.ts`
- `src/renderer/offline/db/hypermail-db.ts`
- `src/renderer/offline/db/load-inbox-snapshot.ts`
- `src/renderer/offline/runtime.ts`
- `src/renderer/offline/queue/modifier-queue-engine.ts`
- `src/renderer/offline/queue/demo-mail-gateway.ts`

Modifier layer:

- `src/renderer/offline/modifiers/thread-modifier.ts`
- `src/renderer/offline/modifiers/set-thread-starred-modifier.ts`
- `src/renderer/offline/modifiers/set-thread-archived-modifier.ts`
- `src/renderer/offline/modifiers/modifier-factory.ts`

UI lab:

- `src/renderer/hooks/use-mailbox-lab.ts`
- `src/renderer/components/inbox/thread-list.tsx`
- `src/renderer/components/inbox/thread-detail.tsx`
- `src/renderer/components/inbox/queue-inspector.tsx`
- `src/renderer/App.tsx`

Tests:

- `src/renderer/offline/modifiers/modifier-factory.test.ts`
- `src/renderer/offline/queue/modifier-queue-engine.test.ts`

## Step 2 Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
```

Results:

- TypeScript typecheck passed
- queue replay tests passed
- queue online/offline transition tests passed
- production renderer build passed
- Electron bundle build passed

## Step 2 Demo Plan

1. Start the app with `npm run dev`.
2. If you want, connect Gmail in the sidebar. If not, stay in the seeded demo mailbox.
3. Select a thread in the local inbox list.
4. Click `Star` or `Archive`.
5. Confirm the thread updates immediately.
6. Toggle `Simulate offline` in the right rail.
7. Click `Star` or `Archive` again.
8. Confirm the UI still updates immediately, but the queue shows pending work.
9. Toggle back online.
10. Confirm the queue drains and the base cache commits the final state.

## Step 2 Notes

- For this step, persistence uses a fake idempotent gateway so the queue can be exercised before real Gmail sync exists.
- The inbox shown here is intentionally a narrow workbench, not the final Step 3 inbox UI.
- The queue is persisted in IndexedDB, so optimistic actions survive renderer refreshes and app restarts.

## Step 1 Status

Complete. A runnable Electron + Vite + React 19 + TypeScript foundation now exists at:

`C:\Users\Daniel Victorino\Vaults\daniel_victorino\Projects\HyperMail`

This step includes:

- Electron desktop shell
- React 19 renderer with Tailwind dark UI
- Gmail OAuth2 desktop flow with PKCE
- Secure token storage via `keytar`
- IPC boundary that keeps tokens out of the renderer
- Zustand + TanStack Query foundation
- Unit tests for the critical PKCE helpers

## Exact Setup Commands

```powershell
Set-Location 'C:\Users\Daniel Victorino\Vaults\daniel_victorino\Projects\HyperMail'
Copy-Item .env.example .env
notepad .env
npm install
npm run dev
```

## Google Cloud Setup

1. Open Google Cloud Console.
2. Create or select a project for HyperMail.
3. Enable the Gmail API.
4. Configure the OAuth consent screen.
5. Add your test user email if the app is still in testing mode.
6. Create an OAuth client of type `Desktop app`.
7. Copy the generated client ID into `.env` as `GOOGLE_OAUTH_CLIENT_ID`.

Example:

```env
GOOGLE_OAUTH_CLIENT_ID=your-google-desktop-client-id.apps.googleusercontent.com
```

## Architecture Decisions In Step 1

### 1. Secure Desktop OAuth Boundary

- Google OAuth runs in Electron main, not in the renderer.
- Tokens are never exposed through `window.hypermail`.
- Refresh tokens are stored in the OS keychain through `keytar`.
- OAuth uses PKCE + a loopback callback server for a native-app flow.

### 2. Superhuman-Compatible Direction

- The renderer is already shaped for local-first reads.
- Auth is separated cleanly so Step 2 can add local entities, optimistic modifiers, and persistence queues without reworking login.
- The shell is intentionally minimal: three-column layout, visible keyboard affordance, no extra inbox logic yet.

### 3. Maintainable TypeScript Split

- `electron/` owns native capabilities.
- `src/shared/` owns cross-process contracts and pure auth helpers.
- `src/renderer/` owns UI, query orchestration, and state.

## Key Files

- `package.json`
- `electron/main.ts`
- `electron/preload.ts`
- `electron/oauth/google-oauth.ts`
- `electron/oauth/token-store.ts`
- `src/shared/contracts.ts`
- `src/shared/auth/google-pkce.ts`
- `src/renderer/App.tsx`
- `src/renderer/hooks/use-auth-session.ts`

## Verification

Executed successfully:

```powershell
npm run typecheck
npm test
npm run build
```

Results:

- TypeScript typecheck passed
- PKCE unit tests passed
- Production renderer build passed
- Electron main/preload bundle build passed

## Demo Plan

1. Start the app with `npm run dev`.
2. Confirm the HyperMail shell opens in Electron.
3. Click `Connect Gmail`.
4. Complete Google sign-in in the browser.
5. Confirm the app returns with the connected Gmail profile summary.
6. Quit and reopen the app.
7. Confirm the session restores without another login.
8. Click `Disconnect` and confirm the session clears cleanly.

## Current UI Spec

- Canvas: dark, distraction-free, three-panel shell
- Left rail: brand mark, command palette affordance, system readiness hints
- Center: primary flow surface for connect state or connected account state
- Right rail: reserved context pane for sender insights / calendar / AI
- Color system: near-black base, five muted grays, purple accent
- Typography: Inter, tight tracking, dense but readable hierarchy
