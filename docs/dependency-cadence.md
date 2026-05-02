# Dependency Cadence

HyperMail keeps dependency work in small, reviewable tranches so release risk stays visible.

## Buckets

- **Routine patch/minor:** same-major updates for application libraries, types, schemas, test DOMs, PostCSS, and lint helpers. These can move together when `npm run verify` stays green and renderer behavior is unchanged.
- **Electron build chain:** `electron-builder`, packaging helpers, installer metadata, and source-map packaging checks. Keep these isolated from Electron runtime upgrades and verify with `npm run package:dir:check`.
- **Electron runtime:** Electron major upgrades and security-driven Chromium jumps. Treat these as high-blast-radius changes that require packaged startup, OAuth, Gmail sync, offline queue, and update-check smoke coverage.
- **Frontend toolchain majors:** Vite, Vitest, Tailwind, TypeScript, ESLint, and related plugin majors. Upgrade one toolchain family per branch and expect config or test-runner adjustments.
- **Release-only changes:** release-please output, changelog/version updates, installer publishing, and GitHub release assets. Keep these separate from dependency and security PRs.

## Default Gate

Run `npm ci`, `npm run verify`, `npm outdated --json`, and `npm audit --json` before opening a dependency PR. For packaging-chain changes, also run `npm run package:dir:check` and launch `release/win-unpacked/HyperMail.exe`.
