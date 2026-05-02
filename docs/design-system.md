# HyperMail Design System

Last updated: 2026-05-02

HyperMail's UI system is code-led. The repo is the source of truth for tokens,
component primitives, behavior, and verification. Figma mirrors the repo so
future visual work has a stable reference and a shared QA target.

Figma project: [HyperMail project](https://www.figma.com/files/project/595441469)

Figma foundation file: [HyperMail Design System](https://www.figma.com/design/BmRFSlVeEDf2yJTMi4X1VI)

## Source of truth

- Design tokens live in `tailwind.config.ts` and are exposed as `--hm-*` CSS
  variables.
- Shared renderer primitives live in `src/renderer/index.css` as `.hm-*`
  classes such as `.hm-app-frame`, `.hm-panel`, `.hm-section`,
  `.hm-list-row`, `.hm-input-shell`, `.hm-command-surface`, `.hm-kbd`, and
  `.hm-density-compact`.
- Reusable UI atoms live under `src/renderer/components/ui/`; feature surfaces
  live under `src/renderer/components/mail/` and `src/renderer/components/shell/`.
- The Linear community file is component and state reference material only. Do
  not treat its variables or components as production authority for HyperMail.
- The Linear UI file is interaction and product-craft inspiration only. Do not
  import its page layouts, marketing surfaces, or generic screen frames as
  HyperMail library components.

## Figma source roles

Use the three Figma files with explicit roles:

- **HyperMail Design System**:
  `https://www.figma.com/design/BmRFSlVeEDf2yJTMi4X1VI` is canonical for
  implementation, QA, and future visual PRs.
- **Linear Design System (Community)**:
  `https://www.figma.com/design/cRbb6j0E87W44sa83Bn9SX` is source reference for
  dense dark tokens, button/input/key/sidebar/list/command/filter patterns, and
  state coverage.
- **Linear UI**: `https://www.figma.com/design/Swf6lEMOicoJLGrd0R0GRh` is a
  reference backlog for interaction polish, changelog-quality details, and
  product feel. It is not a component library.

The HyperMail file now includes `QA / Source Coverage Matrix` and
`Components / Curated State Variants` frames. These document what was adopted,
what is active in this tranche, and what is deferred.

## Brand identity

HyperMail's app mark is intentionally simpler than the in-product UI palette:
`public/hypermail-mark.svg` uses a black / near-black square field and a white
geometric `H`. The same geometry is mirrored by `scripts/build-brand-assets.ps1`
for the Windows launcher icon, favicon, sidebar, and GitHub-facing repo
surfaces.

Violet-blue remains a product command accent for focus, selection, AI, and
primary action moments. It should not return to the app logo/avatar unless the
brand system is intentionally revised.

## Token contract

The initial Figma library mirrors these repo-backed token groups:

- Color: `--hm-bg`, `--hm-panel`, `--hm-panel-strong`, `--hm-surface`,
  `--hm-surface-muted`, `--hm-border`, `--hm-foreground`, `--hm-muted`,
  `--hm-accent`, `--hm-accent-soft`, and status colors.
- Radius: `--hm-radius-panel`, `--hm-radius-control`, and `--hm-radius-row`.
- Effects: `--hm-shadow-shell`, `--hm-shadow-command`, `--hm-shadow-focus`,
  and `--hm-accent-gradient`.
- Density: `.hm-density-compact` defines row padding and section gaps. Figma
  also reserves the current triage layout targets: 220px sidebar, 56px top bar,
  36px section header, 44px thread row, and 640px command palette.
- Type: Inter is the only app font. Dense product surfaces should stay in the
  11-13px range unless a screen already uses a larger heading role.

When a visual PR needs a new repeated value, add or reuse a repo token first,
then update the Figma variables and this document in the same PR.

## Figma workflow

Use the HyperMail Figma file for future implementation work:

1. Fetch the exact node with Figma design context and a screenshot.
2. Treat generated React/Tailwind as visual reference, not final project code.
3. Rebuild with HyperMail's existing React, Tailwind, CSS variables, `.hm-*`
   primitives, and component props.
4. Prefer existing components before adding a new primitive.
5. Validate the result with local tests plus an app screenshot compared against
   the HyperMail-owned Figma screen, not directly against the original Linear
   files.

Code Connect is intentionally deferred. Do not add `figma.config.json`,
`.figma.js`, or `.figma.tsx` mappings until the HyperMail Figma components are
published in a team library and Code Connect access is confirmed.

## V1 component inventory

The Figma file contains the first repo-mirrored component set:

- Button primary and secondary
- Badge
- Input/Search
- Keyboard Hint
- Sidebar/Nav Row
- Top Bar/Control
- Thread Row
- Command Palette
- App Shell

The coverage pass adds curated state variants for the active triage surfaces:

- Button primary, secondary, and ghost states: default, hover, focus, disabled
- Search input states: default, focus, filled, disabled
- Sidebar nav row states: default, hover, active, unread
- Thread row states: default, unread, selected, hover
- Command palette rows: default, highlighted, disabled, plus empty state
- Compact filter chip and search scope primitives

Future UI work should extend this inventory by surface, not by importing large
chunks from the Linear community file. The next expected surfaces are right
rail/thread detail, composer, settings/auth, then empty/error/loading states.

## Source coverage matrix

PR #24 intentionally covers the Linear references as a curated map, not a full
port:

- **Adopted**: HyperMail repo tokens/primitives, Linear-like foundations,
  sidebar/list/command density targets, and active triage component families.
- **Added now**: state variants and compact filter/search primitives needed by
  app shell, sidebar, top bar, thread list, and command palette work.
- **Deferred**: Linear New Issue, Issue Page, Text Edit, broad dropdown/menu
  systems, marketing/pricing/blog content, and Code Connect.

For future visual PRs, capture app screenshots and compare them against the
HyperMail-owned Figma screen first. Use the Linear sources only when the
HyperMail screen is missing a specific state or craft detail.

## PR discipline

Keep visual upgrades as small GitHub PRs by surface. Each visual PR should state
which Figma node it follows, which repo tokens/classes were reused or added, and
which behavior stayed unchanged. The local gate is:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
```

Use `npm run verify` as the final combined gate when the Windows worker
environment cooperates.
