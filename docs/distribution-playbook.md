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
Windows update builds must be code signed; release packaging fails before artifact creation when signing credentials are missing.
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
3. Confirm `CSC_LINK` and `CSC_KEY_PASSWORD` or `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` are configured.
4. Run `npm run package:dir`.
5. Run `npm run dist`.
6. Launch `release/win-unpacked/HyperMail.exe`.
7. Run [release-smoke-test.md](release-smoke-test.md).
8. If the smoke test passes, distribute either:
   - the NSIS installer for normal team installs
   - the portable executable for fast internal evaluation
9. If you are using auto-update, upload `latest.yml`, the installer, and the blockmap to the update host before rolling the build out.

## Signing

Windows artifacts must be signed before release packaging or auto-update distribution. Unsigned Windows update builds are blocked.

1. Obtain a code-signing certificate.
2. Configure the certificate inputs expected by `electron-builder`.
3. Set `CSC_LINK` and `CSC_KEY_PASSWORD`, or `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD`.
4. Rebuild with `npm run dist`.

## Recommended internal rollout

1. Start with `win-unpacked` for the final Gmail smoke test.
2. Move the team to the portable build for low-friction evaluation.
3. Promote to the NSIS installer once the packaged Gmail flow is stable enough for wider internal use.
