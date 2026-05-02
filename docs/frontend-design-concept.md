# HyperMail Frontend Design Concept

Generated during the Step 4/5 design-system tranche as an implementation brief for
the desktop app shell, right rail, AI settings, and composer detail surfaces.

## Concept Direction

HyperMail should read as a quiet, high-density desktop triage console rather than a
marketing dashboard. The primary screen is a three-column app:

```text
┌───────────────┬────────────────────────────────────────┬────────────────┐
│ account rail  │ product header                         │ context rail   │
│ nav + keys    ├──────────────┬─────────────────────────┤ tabs           │
│               │ thread list  │ selected thread         │ brief/intel    │
│               │ search rows  │ actions + messages      │ system/AI      │
└───────────────┴──────────────┴─────────────────────────┴────────────────┘
```

The top header must carry the selected account and the current primary action. The
right rail should use tabs for focused modes instead of a single disclosure.

## Token System

```text
color
  background      graphite black      rgb(7 10 11)
  panel           deep graphite       rgb(14 17 19)
  panel strong    raised graphite     rgb(19 23 26)
  surface         zinc graphite       rgb(24 29 32)
  border          slate line          rgb(148 163 184 / alpha)
  foreground      off-white           rgb(238 242 244)
  muted           cool zinc           rgb(139 151 160)
  accent          teal                rgb(45 212 191)
  semantic        green / amber / red / sky

shape
  panel radius    8px
  control radius  8px
  row radius      8px

density
  compact rail    12px row x, 9px row y, 10px section gap
  list row        12-16px x, 9-12px y
  toolbar button  36px height
```

## Component Families

- Panels: `hm-panel`, `hm-panel-strong`, `hm-section`, `hm-rail-section`.
- Lists: `hm-list-surface`, `hm-list-row`, `hm-list-row-selected`.
- Inputs: `hm-input-shell` with explicit typography and focus state.
- Tabs: `hm-tab`, `hm-tab-active`, `role=tablist`, `role=tab`.
- Buttons: rounded 8px, no negative tracking, explicit `primary`, `secondary`,
  and `ghost` variants.
- Rail sections: tab-scoped cards with compact metrics, not nested card stacks.

## Implementation Notes

- Header account context moves into the main header while the sidebar keeps the
  richer account/nav control surface.
- Primary action is `Reply` when a thread is selected and `Command` when no thread
  is selected.
- Right rail tabs are `Brief`, `Intel`, `System`, and `AI`.
- Source-map and component-test guards remain the required safety base before
  deeper `useMailboxLab` refactoring.
