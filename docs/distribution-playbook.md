# HyperMail Distribution Playbook

## Artifact targets

- `npm run package:dir`
  - Produces `release/win-unpacked` for local smoke tests.
- `npm run dist`
  - Produces a Windows NSIS installer and a portable executable in `release/`.

## Brand assets

- Source mark: `public/hypermail-mark.svg`
- Generated Windows build assets:
  - `build/icon.ico`
  - `build/icon.png`
  - `public/favicon.ico`
  - `public/icon.png`

If the brand mark changes, regenerate the raster assets with:

```powershell
npm run build:brand
```

## Packaged runtime config

Packaged builds do not read the repo `.env` file. HyperMail expects:

- `%APPDATA%\HyperMail\.env`

Minimum packaged config:

```dotenv
GOOGLE_OAUTH_CLIENT_ID=...
OPENAI_API_KEY=...
HYPERMAIL_UPDATES_URL=https://updates.example.com/hypermail/windows
HYPERMAIL_CRASH_REPORT_URL=https://crash.example.com/hypermail
```

Optional packaged config:

```dotenv
HYPERMAIL_UPDATE_CHANNEL=latest
```

If `HYPERMAIL_UPDATES_URL` is present, the packaged app enables Windows NSIS update checks.
If `HYPERMAIL_CRASH_REPORT_URL` is absent, HyperMail still writes local crash dumps and logs for smoke-test debugging.

## Update metadata

`npm run dist` now emits Windows update metadata alongside the installer artifacts:

- `latest.yml`
- `HyperMail-<version>-win-x64.exe`
- `HyperMail-<version>-win-x64.exe.blockmap`

For the generic provider flow, upload those files to the same HTTP(S) location referenced by `HYPERMAIL_UPDATES_URL`.

## Release flow

1. Run `npm test`.
2. Run `npm run build`.
3. Run `npm run package:dir`.
4. Run `npm run dist`.
5. Launch `release/win-unpacked/HyperMail.exe`.
6. Run [release-smoke-test.md](release-smoke-test.md).
7. If the smoke test passes, distribute either:
   - the NSIS installer for normal team installs
   - the portable executable for fast internal evaluation
8. If you are using auto-update, upload `latest.yml`, the installer, and the blockmap to the update host before rolling the build out.

## Signing

Current Windows artifacts are unsigned. This is acceptable for internal distribution, but Windows SmartScreen warnings should be expected.

When you are ready to sign:

1. Obtain a code-signing certificate.
2. Configure the certificate inputs expected by `electron-builder`.
3. Remove the temporary `signAndEditExecutable: false` limitation from `package.json`.
4. Rebuild with `npm run dist`.

## Recommended internal rollout

1. Start with `win-unpacked` for the final Gmail smoke test.
2. Move the team to the portable build for low-friction evaluation.
3. Promote to the NSIS installer once the packaged Gmail flow is stable enough for wider internal use.
