# HyperMail Release Smoke Test

## Config

1. Build an unpacked app with `npm run package:dir`.
2. Launch the app once and open the `Runtime config` card in the right rail.
3. Confirm the preferred config path is visible.
4. Place a `.env` file there with:
   - `GOOGLE_OAUTH_CLIENT_ID=...`
   - `OPENAI_API_KEY=...` if AI should be enabled
   - `HYPERMAIL_UPDATES_URL=...` if packaged update checks should be enabled
   - `HYPERMAIL_CRASH_REPORT_URL=...` if remote crash upload should be enabled
5. Relaunch the app and confirm `Gmail OAuth` shows `ready`.

## Gmail flow

1. Connect Gmail.
2. Confirm recent Gmail threads appear after initial sync.
3. Star, archive, snooze, and unsubscribe a thread.
4. Confirm each action updates immediately.
5. Open a thread with an attachment, cache it locally, then click it again.
6. Confirm HyperMail opens the native save dialog and exports the cached file.

## Offline flow

1. Toggle `Simulate offline`.
2. Search cached mail with `/`.
3. Cache an attachment while online, then export it while offline.
4. Queue another archive or unsubscribe.
5. Create a reply draft and schedule send later.
6. Resume online mode and click `Sync now`.
7. Confirm the queue drains cleanly and Gmail sync recovers if incremental history is no longer available.

## AI flow

1. Open a thread.
2. Generate a summary.
3. Generate a voice draft.
4. Confirm both work only when `OPENAI_API_KEY` is configured and the app is online.

## Packaging sanity

1. Confirm the unpacked app launches without the repo present.
2. Confirm the app icon appears in the window and packaged executable.
3. Run the portable build once and confirm it launches with the same runtime config path expectations.
4. If using the installer, confirm it allows an install directory choice and creates shortcuts.
5. Confirm the right rail still shows the runtime config summary.
6. Open the logs folder from the right rail and confirm `main.log` and the crash-dumps directory exist.
7. If `HYPERMAIL_UPDATES_URL` is configured, confirm `Check for updates` reports either `up to date` or `available`.
8. Confirm no feature depends on the dev server or repo-relative `.env` path.
