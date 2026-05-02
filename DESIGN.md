---
name: HyperMail
description: Keyboard-first, offline-first desktop email console for Gmail and Microsoft mail.
colors:
  void-bg: "#050614"
  ink-panel: "#0b0d1a"
  raised-panel: "#101322"
  work-surface: "#171a2b"
  muted-surface: "#202438"
  foreground: "#f7f8f8"
  muted-text: "#b4bcd0"
  border-white: "#ffffff"
  command-violet: "#673fd7"
  signal-blue: "#455eb5"
  positive: "#4dab76"
  warning: "#e6a94c"
  danger: "#ef5d5d"
  info: "#63b3ed"
  vip: "#e76bb0"
  ai: "#8462f4"
typography:
  display:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "0"
  headline:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  title:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
  body:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  label:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0"
rounded:
  panel: "8px"
  control: "8px"
  row: "8px"
  tab: "6px"
  key: "5px"
spacing:
  row-x: "12px"
  row-y: "9px"
  section-gap: "10px"
  sidebar: "12px"
  panel: "14px"
components:
  button-primary:
    backgroundColor: "{colors.command-violet}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 14px"
  button-secondary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 14px"
  badge-status:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.muted-text}"
    rounded: "999px"
    padding: "4px 10px"
  input-shell:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  thread-row-selected:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.row}"
    padding: "10px 12px"
---

# Design System: HyperMail

## 1. Overview

**Creative North Star: "The Inbox Flight Deck"**

HyperMail is a dense desktop control surface for people who operate from their
inbox. The interface should feel like a quiet flight deck: dark enough for long
sessions, bright enough to read at speed, and structured enough that every
status signal has a place. The product is not trying to make email playful. It
is trying to make mail triage feel controlled.

The system uses a restrained dark palette, compact Inter typography, tight
radius values, and layered panels to separate navigation, thread work, and
context without turning the app into a pile of cards. The existing violet-blue
accent is a command signal, not a decoration. It marks focus, selection, AI
capability, and primary action only when those moments need priority.

HyperMail explicitly rejects generic SaaS hero UI, decorative card-heavy
layouts, default glassmorphism, noisy consumer-mail chrome, and vague
AI-assistant aesthetics. Future surfaces should preserve the product register:
design serves speed, trust, and local operational clarity.

**Key Characteristics:**

- Dense but calm desktop information architecture.
- Keyboard-first actions with visible shortcut affordances.
- Local-first trust signals for offline, queue, sync, and provider state.
- Restrained dark theme with violet-blue command emphasis.
- Flat tonal layering first, ambient shadow only for shell and command focus.

## 2. Colors

The palette is a night-console system: near-black violet panels, tinted neutral
text, one command accent, and small status colors for operational state.

### Primary

- **Command Violet** (#673fd7): Primary action, selection edge, command affordance,
  and high-value AI interaction. Use sparingly so it remains a signal.
- **Signal Blue** (#455eb5): Supporting accent in the existing command gradient
  and selected-state washes. It should not become a second competing brand color.

### Secondary

- **AI Violet** (#8462f4): AI-specific affordances where the app needs to
  distinguish generated summaries, draft assistance, or split suggestions.
- **VIP Pink** (#e76bb0): VIP classification and relationship priority. Use only
  for mailbox semantics, not decorative contrast.

### Tertiary

- **Positive Green** (#4dab76): Connected, completed, online, or successful state.
- **Warning Amber** (#e6a94c): Offline, retry, queued risk, or delayed action.
- **Danger Red** (#ef5d5d): Destructive or failed state.
- **Info Blue** (#63b3ed): Neutral live information, waiting state, and cache detail.

### Neutral

- **Void Background** (#050614): App background and outer desktop field.
- **Ink Panel** (#0b0d1a): Main shell panels and stable navigation surfaces.
- **Raised Panel** (#101322): Header, command, and stronger working surfaces.
- **Work Surface** (#171a2b): Rows, sections, and low-emphasis containers.
- **Muted Surface** (#202438): Selected rows, input wells, and hover fills.
- **Foreground** (#f7f8f8): Primary text. Do not replace with pure white.
- **Muted Text** (#b4bcd0): Secondary text in dense panels. Maintain contrast.
- **Border White** (#ffffff): Used only through alpha values for hairline borders.

### Named Rules

**The Command Accent Rule.** Violet is reserved for focus, selected state, primary
action, and AI affordance. If every panel uses violet, nothing is important.

**The Status Color Rule.** Green, amber, red, blue, pink, and AI violet belong to
mailbox or runtime semantics. Do not use them as arbitrary decoration.

## 3. Typography

**Display Font:** Inter Variable, Inter, sans-serif (with sans-serif fallback)
**Body Font:** Inter Variable, Inter, sans-serif (with sans-serif fallback)
**Label/Mono Font:** Inter Variable, Inter, sans-serif (numeric features enabled)

**Character:** The type system is compact, plainspoken, and operational. It uses
weight and density rather than expressive font pairing because the app's value
is speed and trust.

### Hierarchy

- **Display** (600, 28px, 1.15): OAuth setup and rare onboarding headlines only.
- **Headline** (600, 17px, 1.4): Thread counts, current mailbox title, and active
  workspace labels.
- **Title** (600, 15px, 1.35): Product name, account names, card titles, and
  selected-thread affordances.
- **Body** (400, 14px, 1.55): Thread snippets, descriptions, metrics, and rail
  content. Keep long prose near 65 to 75 characters when a surface allows it.
- **Label** (500, 11px, 1.2): Section labels, badges, shortcuts, timestamps, and
  compact state descriptors.

### Named Rules

**The Dense Type Rule.** Product chrome stays in the 11px to 15px range unless a
screen is onboarding or authentication. Do not use hero-scale type inside the
mail shell.

**The No Letterspacing Rule.** Letter spacing is zero by default. Avoid stretched
uppercase labels unless the surrounding UI already uses that exact pattern.

## 4. Elevation

HyperMail uses a hybrid of tonal layering, hairline borders, and selective
ambient shadow. Depth comes first from panel color and border opacity. Shadow is
reserved for the application shell, command palette, and focus rings where the
surface needs to separate from the rest of the desktop.

### Shadow Vocabulary

- **Shell Shadow** (`0 24px 80px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(255, 255, 255, 0.04) inset`):
  Use only for the outer app frame and major floating panels.
- **Command Shadow** (`0 7px 32px rgba(0, 0, 0, 0.35)`): Use for command palette
  or equivalent keyboard-first overlays.
- **Focus Shadow** (`0 0 0 1px rgb(var(--hm-accent) / 0.55), 0 0 0 4px rgb(var(--hm-accent) / 0.13)`):
  Use for visible keyboard focus and high-confidence active controls.

### Named Rules

**The Tonal Layer Rule.** Prefer panel tint and 1px alpha borders before adding
shadow. If a row needs depth, it probably needs clearer hierarchy instead.

**The Blur Discipline Rule.** Backdrop blur is allowed for the app frame,
command surface, and existing panel primitives. Do not introduce decorative
glass cards.

## 5. Components

### Buttons

Buttons are compact, direct, and keyboard-aware.

- **Shape:** Gently squared controls with an 8px radius.
- **Primary:** Command gradient from Signal Blue to Command Violet, foreground
  text, 36px default height, 14px horizontal padding, subtle inset highlight.
- **Hover / Focus:** Hover may brighten the existing gradient. Focus uses the
  dedicated focus shadow.
- **Secondary / Ghost / Tertiary:** Secondary uses low-alpha foreground fill and
  hairline border. Ghost uses transparent rest state with muted text and low
  alpha hover fill.

### Chips

Chips carry state, not decoration.

- **Style:** 999px rounded pills, 11px medium text, 1px alpha borders, and tinted
  semantic backgrounds.
- **State:** Use positive, warning, danger, info, vip, ai, or accent only when
  the chip maps to a real mailbox, runtime, provider, or queue meaning.

### Cards / Containers

Containers are working surfaces, not marketing cards.

- **Corner Style:** 8px for shell panels, rows, list surfaces, and sections.
- **Background:** Use Ink Panel, Raised Panel, Work Surface, and Muted Surface
  through alpha values to create stacked working regions.
- **Shadow Strategy:** Only the outer frame, command palette, and rare auth
  surfaces should use Shell Shadow.
- **Border:** 1px white alpha borders in the 0.08 to 0.12 range.
- **Internal Padding:** 12px to 14px in product shell surfaces; 24px only in
  authentication cards or non-repeating setup content.

### Inputs / Fields

Inputs feel embedded in the working surface.

- **Style:** 8px radius, Muted Surface background at low alpha, 1px alpha border,
  36px search height, and 12px horizontal padding.
- **Focus:** Use focus shadow or accent border shift without moving layout.
- **Error / Disabled:** Error uses Danger Red tint and border. Disabled controls
  reduce opacity and remove pointer interaction.

### Navigation

Navigation is compact and count-driven.

- Sidebar rows use 8px radius, icon plus label, count on the right, and hover
  fill before selection.
- Active navigation uses a low-alpha foreground fill with a 2px inset accent
  marker already present in the implementation.
- Context rail tabs use 6px radius, 32px height, icon plus label, and active
  foreground fill.

### Thread Rows

Thread rows are the core repeated unit.

- Use 8px row radius, 12px horizontal padding, 9px to 10px vertical padding, and
  1.5px row gap.
- Selected rows combine Muted Surface, a left inset accent marker, and a faint
  horizontal accent wash.
- Snippets stay muted and two-line clamped. State badges wrap below the snippet
  and must not resize the row unpredictably.

### Command Palette

The command palette is the signature keyboard surface.

- Use the command surface primitive, 704px max width, 9vh top offset, command
  shadow, stronger blur, 18px input text, and grouped command rows.
- Active command rows use foreground text and low-alpha foreground fill.
- Empty state copy stays direct and action-oriented.

## 6. Do's and Don'ts

### Do:

- **Do** use the existing `--hm-*` CSS variables and Tailwind token aliases
  before introducing new visual values.
- **Do** keep product shell typography compact and scannable.
- **Do** make queue, sync, offline, provider, and AI status visible when those
  states affect user trust.
- **Do** use semantic status colors only for actual mailbox or runtime meaning.
- **Do** preserve keyboard affordances with visible shortcut hints and focus
  states.

### Don't:

- **Don't** use generic SaaS hero UI with oversized marketing claims,
  decorative stat blocks, or productivity cliches.
- **Don't** create decorative card-heavy layouts where every concept is framed
  inside another box.
- **Don't** use glassmorphism as a default aesthetic. Blur must support shell
  depth or command focus.
- **Don't** add noisy consumer-mail chrome, playful gradients, social feed
  patterns, or advertising-style hierarchy.
- **Don't** use vague AI-assistant aesthetics where sparkles and purple glow
  replace clear workflow value.
- **Don't** hide queue, sync, offline, provider, or AI state when it affects
  user trust.
- **Don't** use `border-left` or `border-right` wider than 1px as a decorative
  stripe on cards, rows, callouts, or alerts.
