---
name: Food Stand in a Park
description: A warm, dependable community food-rescue app that hands surplus food to the neighbors who need it.
colors:
  brand-primary: "#15803d"
  brand-deep: "#166534"
  brand-mid: "#16a34a"
  brand-bright: "#22c55e"
  brand-tint: "#dcfce7"
  brand-wash: "#f0fdf4"
  accent: "#f59e0b"
  ink: "#111827"
  body: "#4b5563"
  muted: "#6b7280"
  border: "#e5e7eb"
  border-strong: "#d1d5db"
  surface: "#ffffff"
  danger: "#dc2626"
  status-open-bg: "#dbeafe"
  status-open-ink: "#1e40af"
  status-claimed-bg: "#fef3c7"
  status-claimed-ink: "#92400e"
  status-cancelled-bg: "#e5e7eb"
  status-cancelled-ink: "#374151"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  lg: "0.5rem"
  xl: "0.75rem"
  x2l: "1rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "2rem"
  section: "5rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1rem"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 1rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 0.75rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.body}"
    rounded: "{rounded.xl}"
    padding: "1.25rem"
  badge:
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.625rem"
---

# Design System: Food Stand in a Park

## 1. Overview

**Creative North Star: "The Reliable Handoff"**

Everything here points at one feeling: a donation, a shift, a delivery — handed off cleanly, nothing dropped. The interface earns trust by making state obvious and follow-through certain. A donor should never wonder whether their pickup was received; a volunteer should read the map and know instantly what's claimable; an admin should see the whole network's status without hunting. The visual system is in service of that certainty, not decoration on top of it.

The register is product-first: design *serves* the task on the app surfaces (donor form, volunteer dashboard, admin), and *is* the pitch on the public landing page. Across both, warmth is carried by plain language, generous spacing, and honest impact numbers — never by ornament. The palette is a grounded community green with a single amber accent; the type is one dependable sans doing all the work. Components are grounded and reassuring: solid fills, clear affordances, generous tap targets, so nothing on screen is ambiguous.

This system explicitly rejects two things. It is **not the generic charity template** — no stock-photo smiling volunteers, no alarm-red "DONATE NOW," no guilt-driven urgency; trust is built by clarity, not pressure. And it is **not corporate SaaS** — no cold blue-gradient heroes, no hero-metric dashboards, no venture-funded gloss. This is a community tool that should feel human and local.

**Key Characteristics:**
- Certainty of state above all — every pickup's status is unmistakable
- One grounded green + one amber accent; the accent is rare on purpose
- A single system sans across headings, body, labels, and data
- Flat by default; depth is a light shadow on genuine surfaces, never decoration
- Grounded, tactile components with generous tap targets
- Mobile-first and resilient on older, low-bandwidth devices

## 2. Colors

A grounded community green carries identity and every primary action; a single warm amber marks the "in-progress" moment; everything else is honest neutral so the green and the status colors read clearly.

### Primary
- **Trail Green** (`#15803d`, `brand-primary`): The voice of the brand and every primary action — solid button fills, active links, key iconography. This is what "go" looks like.
- **Deep Pine** (`#166534`, `brand-deep`): The pressed/hover state of primary green, and the darker end of green-on-green gradients on the landing CTA band.
- **Field Green** (`#16a34a`, `brand-mid`): Focus-ring green and mid-weight accents (spinner, active outlines).
- **Sprout** (`#22c55e`, `brand-bright`): The lightest committed green; sparing use for lively touches, never body text.

### Secondary
- **Harvest Amber** (`#f59e0b`, `accent`): The single accent, reserved for the "claimed / in-progress" moment and small warm highlights. Decorative or state only — **never** body text (fails contrast on white).

### Neutral
- **Ink** (`#111827`, `ink`): Headings and primary text on light surfaces.
- **Body Slate** (`#4b5563`, `body`): Default body copy on white (≈7:1). The floor for running text.
- **Muted Slate** (`#6b7280`, `muted`): Secondary/supporting text and captions (≈4.8:1). Do not go lighter for text.
- **Hairline** (`#e5e7eb`, `border`) / **Edge** (`#d1d5db`, `border-strong`): Dividers and input/card borders.
- **Surface White** (`#ffffff`, `surface`): The body and card background. The canvas is genuinely white — warmth comes from tone and copy, not a tinted paper.

### Tertiary — Status Vocabulary
Pickup state is a first-class color system (paired always with a text label, never color alone):
- **Open** — `status-open-bg` `#dbeafe` on `status-open-ink` `#1e40af` (calm blue: available, waiting).
- **Claimed** — `status-claimed-bg` `#fef3c7` on `status-claimed-ink` `#92400e` (amber: in progress, the handoff underway).
- **Completed** — `brand-tint` `#dcfce7` on `brand-deep`-adjacent `#166534` (green: delivered, done).
- **Cancelled** — `status-cancelled-bg` `#e5e7eb` on `status-cancelled-ink` `#374151` (neutral gray: closed, no action).
- **Danger** — `danger` `#dc2626` on white for destructive actions and error alerts only.

### Named Rules
**The Rare Amber Rule.** Amber is the "in-progress" signal. It appears on claimed status and the occasional warm highlight — never as a general accent, never as text on white. Its scarcity is what makes "claimed" read at a glance.

**The Green-Means-Go Rule.** Trail Green is reserved for primary action and completed state. Don't spend it on decoration; a screen where everything is green has no primary action.

## 3. Typography

**Display / Body / Label Font:** System sans stack — `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

**Character:** One dependable, familiar sans does every job — headings, body, buttons, labels, and dashboard data. This is deliberate: a product this civic should feel legible and unremarkable in the best way, load instantly on any device (zero web-font payload), and never call attention to its typography. Hierarchy comes from weight and size, not from a second face.

### Hierarchy
- **Display** (extrabold 800, `clamp(2.25rem, 5vw, 3rem)`, line-height 1.1, tracking −0.02em): Landing hero H1 only. Ceiling is ~3rem — the page states, it doesn't shout.
- **Headline** (bold 700, 1.875rem / `text-3xl`, tracking −0.01em): Section H2s on the landing and page titles in the app.
- **Title** (semibold 600, 1.125rem / `text-lg`): Card titles, dashboard section headers, step labels.
- **Body** (regular 400, 1rem, line-height 1.6): Running copy in **Body Slate** (`#4b5563`). Cap prose at 65–75ch (`max-w-xl` on the landing).
- **Label** (medium 500, 0.875rem / `text-sm`): Form labels, button text, badges, table headers. In **Muted Slate** or **Ink** depending on emphasis.

### Named Rules
**The One-Family Rule.** Never introduce a second typeface for "personality." Hierarchy is weight (500 → 600 → 700 → 800) and size, full stop. A display serif here would read as marketing gloss the brand rejects.

**The Balanced Heading Rule.** H1–H3 use `text-wrap: balance`; long prose uses `text-wrap: pretty`. Headings must be tested at every breakpoint — no word may overflow its container on mobile.

## 4. Elevation

Flat by default. Surfaces sit on the white canvas with a hairline border and, at most, a whisper of shadow — depth signals a genuine surface (a card, an input, a floating control), never decoration. There is no glassmorphism and no heavy drop shadow anywhere; if a surface looks like it's floating dramatically, it's wrong.

### Shadow Vocabulary
- **Resting** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Cards, inputs, standing pills. Just enough to lift the surface off the page.
- **Focus ring** (`outline: 2px solid #16a34a; outline-offset: 2px`): Every keyboard-focusable element. This is the one non-negotiable "elevation": it must always be visible.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest with a hairline border. The only depth that appears is the resting shadow on true surfaces and the focus ring on interaction. No hover-lift theatrics on the app surfaces; save any motion for meaningful state.

## 5. Components

Components are **grounded and reassuring**: solid, tactile, unmistakable. You always know what's clickable, and tap targets are generous for on-the-go phone use.

### Buttons
- **Shape:** Gently rounded (`rounded-lg`, 8px). Consistent across all variants.
- **Primary:** Solid **Trail Green** (`#15803d`) fill, white text, semibold, `0.625rem 1rem` padding (larger `px-6 py-3` for hero/marketing CTAs). The one confident "go."
- **Hover / Focus:** Darkens to **Deep Pine** (`#166534`); focus shows the 2px green ring. `transition` on color, ~150ms.
- **Secondary:** White fill, `#d1d5db` border, Ink text, hover to `#f9fafb`. For the lower-priority choice beside a primary.
- **Danger:** Solid `#dc2626`, white text — destructive actions only (remove volunteer, cancel).
- **Disabled:** `opacity: 0.6`, `cursor: not-allowed`. Never a mystery-meat gray.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px).
- **Background:** Surface White with a `#e5e7eb` hairline border.
- **Shadow Strategy:** Resting shadow only (see Elevation). No hover-lift on app surfaces.
- **Internal Padding:** `1.25rem` (`p-5`).
- Never nest a card inside a card.

### Inputs / Fields
- **Style:** White fill, `#d1d5db` border, `rounded-lg`, `0.625rem 0.75rem` padding, resting shadow.
- **Label:** Medium 500, `#374151`, 4px above the field.
- **Focus:** Border shifts to **Field Green** (`#16a34a`) plus a soft `brand-wash` ring (`ring-2 ring-brand-100`).
- **Error:** Pair with an **Alert** (below); never rely on a red border alone.

### Badges — Status
- **Style:** Fully rounded pill (`rounded-full`), `text-xs`, `0.125rem 0.625rem` padding.
- **State:** Color pair per pickup status (Open/Claimed/Completed/Cancelled — see Colors). The text label always names the status; color reinforces, never replaces.

### Alerts
- Bordered tint block, `rounded-lg`, `text-sm`. **Error** (red tint, `role="alert"`), **Success** (green tint), **Info** (blue tint). Full borders — never a side-stripe.

### Empty States
- Dashed `#d1d5db` border, centered, `p-10`. A title plus one supporting line that *teaches the next action* ("No open pickups nearby — widen your radius"), not a dead "Nothing here."

### Navigation
- Simple top header (logo + primary links) and footer. Links in Ink, hover to Trail Green, active underlined. Mobile-first: collapses to a compact header; tap targets stay ≥44px.

## 6. Do's and Don'ts

### Do:
- **Do** lead every screen with one obvious primary action in **Trail Green** (`#15803d`).
- **Do** keep body text at **Body Slate** (`#4b5563`) or darker on white; supporting text no lighter than **Muted Slate** (`#6b7280`).
- **Do** pair every status color with a text label — never signal state by color alone (color-blind and low-vision users).
- **Do** keep the canvas genuinely white; carry warmth through copy, spacing, and the green, not a tinted paper background.
- **Do** show a visible 2px green focus ring on every interactive element, and honor `prefers-reduced-motion` on every animation.
- **Do** cap prose at 65–75ch and use `text-wrap: balance` on H1–H3.

### Don't:
- **Don't** use gradient headline text (`background-clip: text` on a gradient). The landing's current `.text-gradient` on the hero is a slop tell scheduled for rework — do not repeat it. Emphasis is weight and size, one solid color.
- **Don't** stack a tiny uppercase tracked eyebrow above every section. The current `.eyebrow` on "How it works / Who it's for / Our mission" is the AI-scaffold cadence — vary it; one deliberate kicker at most, not one per section.
- **Don't** ship identical icon + heading + text card grids repeated endlessly (the current "Who it's for" trio leans this way). Differentiate by content weight or use a non-card layout.
- **Don't** use glassmorphism, decorative blur, or heavy drop shadows. Flat by default; depth is a hairline border and a whisper of shadow.
- **Don't** use `border-left`/`border-right` greater than 1px as a colored accent stripe on cards, alerts, or list items. Use full borders or background tints.
- **Don't** drift toward the **generic charity template** (stock-photo volunteers, alarm-red donate buttons, guilt urgency) or **corporate SaaS** (blue-gradient hero, hero-metric dashboard, buzzwords). Both are named anti-references.
- **Don't** use **Harvest Amber** (`#f59e0b`) or **Sprout** (`#22c55e`) as text on white — they fail contrast. Amber is state/highlight only.
- **Don't** introduce a second typeface. One system sans, hierarchy by weight and size.
