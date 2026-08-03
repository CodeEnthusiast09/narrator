---
name: Narrator
description: Your personal PDF audiobook reader
colors:
  canvas: "#0f0f0f"
  surface: "#1a1a1a"
  raised: "#242424"
  border: "#2a2a2a"
  fg: "#e4e4e7"
  muted: "#90909a"
  accent: "#f2b866"
  accent-dim: "#b45309"
  error: "#f87171"
typography:
  display:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
  title:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.625"
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.1em"
rounded:
  base: "4px"
  lg: "8px"
  xl: "12px"
  "2xl": "16px"
  full: "9999px"
spacing:
  wrapper: "1rem"
  wrapper-md: "1.7rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.canvas}"
    typography: "{typography.title}"
    rounded: "{rounded.xl}"
    padding: "12px 32px"
  pill-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "8px 0"
  pill-unselected:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "8px 0"
  fab-play:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.full}"
    height: "64px"
    width: "64px"
  sheet-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "24px"
---

# Design System: Narrator

## Overview

**Creative North Star: "The Night Cockpit"**

Narrator gets used in the dark, half-listening, at the end of a day — not stared at. The interface takes its cue from an instrument panel: near-black chrome, one signal color, every control sized for a thumb and a glance rather than a stare. But it stays intimate rather than clinical — this is a small warm light held in a dark room, not a piece of hardware. The explicit anti-reference is the corporate dashboard: no cool blue-on-white chrome, no data-density-for-its-own-sake, no sterile precision without warmth.

There is exactly one accent color, and it means one thing everywhere it appears: active, selected, or currently being spoken. Depth comes from three flat tonal layers, never gradients or blur — the single exception is book cover art, which is allowed to be decorative because it is the one place in the app meant to feel like an object rather than a control. Typography stays disciplined: the words being read are the only thing that gets visual size; every button, label, and header around them stays small and quiet.

**Key Characteristics:**
- Near-black canvas with three discrete tonal steps of elevation, no gradients except book covers
- One signal color (Warm Amber) marks everything active, selected, or speaking
- System type only — no custom webfont, load-light and native-feeling by design
- The bottom sheet is the only secondary-surface pattern; no centered modals, no extra routes
- Reading content is the only thing that gets size; UI chrome stays at 12–14px

## Colors

A near-total dark palette — three steps of near-black plus a single warm amber signal color — with color reserved almost entirely for meaning, not decoration.

### Primary
- **Warm Amber** (`#f2b866`): the one accent. Marks the active playback state, the selected item in every pill control (speed, pitch, sleep timer, voice), primary CTA fills, and the currently-spoken sentence in the reading pane. Chosen to actually deliver on the north star's "small warm light in the dark" promise — the system's original accent was a cool periwinkle-blue that contradicted its own stated intent; this corrects it to the amber/warm-light family every other night-reading tool converges on for the same reason (protecting night vision, feeling like a lamp rather than a screen).
- **Burnt Amber** (`#b45309`, `accent-dim`): defined in the theme as the accent's deep/pressed counterpart. Not yet wired to any component — reserved for a future pressed or deep-emphasis state rather than proven in the shipped UI.

### Neutral
- **Ink Black** (`#0f0f0f`, `canvas`): the base page background — the darkest surface in the app.
- **Charcoal Panel** (`#1a1a1a`, `surface`): one step up from canvas. Used for the control bar and every bottom sheet.
- **Graphite Fill** (`#242424`, `raised`): the press/active fill for outlined and ghost buttons — the third and lightest of the three tonal layers.
- **Hairline Graphite** (`#2a2a2a`, `border`): the single border color and weight (1px) used everywhere a hairline separator is needed.
- **Moonlight White** (`#e4e4e7`, `fg`): primary text and active icon color.
- **Dusk Gray** (`#90909a`, `muted`): secondary text, inactive icons, and unselected pill labels.

### Status (single semantic color)
- **Warm Red** (`#f87171`, `error`): the only error/failure color in the system, currently used for the PDF-import error message.

### Named Rules
**The One Signal Rule.** Warm Amber is the only color in the entire system that communicates state. If something is accent-colored, it is telling you it's active, selected, or speaking — never decoration.

**The One Gradient Exception Rule.** Every surface in the app is a flat fill except book cover art, which is the sole place gradients appear — a generated per-title identity, not a decorative device.

## Typography

**Display Font:** system-ui, -apple-system, sans-serif
**Body Font:** system-ui, -apple-system, sans-serif (same stack throughout — no secondary face)

**Character:** Native, load-light, and unbranded on purpose. There is no custom webfont anywhere in the app; the OS's own system face is the typeface, which keeps the PWA fast to first paint and lets the interface feel like it belongs to the device rather than a downloaded product.

### Hierarchy
- **Display** (700, 1.875rem/30px, tracking -0.025em): the "Narrator" wordmark on the picker screen. Used exactly once — this is the app's only true hero moment.
- **Headline** (600, 1rem–1.125rem/16–18px): bottom-sheet and status titles — "Settings," "Front matter detected," "Picking up where you left off," "Finished."
- **Title** (600, 0.875rem/14px, tight leading): the compact inline book/chapter title in the player header.
- **Body** (400, dynamically sized 0.875rem–1.5rem/14–24px in five user-selectable steps, default 1rem, leading-relaxed): the page text currently being read aloud — the only content in the app the reader controls the size of.
- **Label** (500, 0.75rem/12px, tracking 0.1em, often uppercase): section micro-headers ("Recent," "Text size," "Pitch," "Sleep timer," "Voice"), the "NARRATOR" eyebrow above the book title, and most pill/button text.

### Named Rules
**The Reading Priority Rule.** Only the page text currently being read renders at adjustable body size (14–24px). Every other piece of UI text — buttons, headers, labels, chrome — stays fixed at 12–14px, so the words being read remain the visual focus of the screen.

## Layout

Single-column, full-viewport, two-screen state machine with no router: BookPicker (import + recent shelf) and Player (reading + controls) each fill the full `100dvh` viewport with no surrounding shell chrome. State, not a route, decides which one is on screen.

There are no responsive breakpoints in active use. `--breakpoint-xs` (400px) and `--breakpoint-3xl` (1536px) are declared in the theme but never referenced by a component, because the product itself targets exactly one context: a portrait Android phone running as an installed PWA. Horizontal page padding uses two custom gutter tokens (`--spacing-wrapper`: 1rem, `--spacing-wrapper-md`: 1.7rem); everything else — gaps, internal padding, margins — uses Tailwind's default 4px-based spacing scale. `env(safe-area-inset-bottom)` is respected on every control anchored to the bottom edge, since an installed PWA has no browser chrome left to absorb the gesture bar. Density is comfortable rather than dense: icon buttons keep a touch target of roughly 44px or more, and the primary transport control is a fixed 64px circle.

### Named Rules
**The One Viewport Rule.** There is exactly one screen size to design for. The two unused breakpoint tokens are a reservation, not a signal to start building responsive layout.

## Elevation & Depth

Flat by default. Depth comes from three discrete tonal steps (Ink Black → Charcoal Panel → Graphite Fill), never from blur or gradient. `shadow-lg` (Tailwind's default: `0 10px 15px -3px rgb(0 0 0/0.1), 0 4px 6px -4px rgb(0 0 0/0.1)`) is reserved for the handful of elements that genuinely float above the layout: the circular play/pause button, book cover art, and the install-prompt banner. Anything docked to a screen edge — the bottom sheets, the control bar — gets a hairline `border-t` instead; the seam reads as "attached," not "hovering."

### Shadow Vocabulary
- **Float** (`box-shadow: 0 10px 15px -3px rgb(0 0 0/0.1), 0 4px 6px -4px rgb(0 0 0/0.1)`): the play button, book covers, the install banner. Nothing else.

### Named Rules
**The Anchored vs. Floating Rule.** Anything docked to a screen edge gets a 1px border, never a shadow. Shadow is reserved for the small set of elements that genuinely float free of the layout.

## Shapes

Corner radius scales with a component's size and role rather than applying uniformly: 4px (`rounded`) on the smallest interactive elements (front-matter checkboxes), 8px (`rounded-lg`) on pill/segment controls, 12px (`rounded-xl`) on square action buttons and book cover art, 16px (`rounded-2xl`) on cards and the top corners of bottom sheets, and a full circle on the primary transport button and small icon badges.

Borders are a single hairline weight and color throughout (1px, Hairline Graphite). The only time a border changes color is to mark an active or in-progress state — the dropzone border and a checked checkbox both switch to the accent. There are no double borders and no dashed borders except the import dropzone's idle state, which uses a dashed border deliberately as a "drop something here" affordance.

## Components

### Buttons
- **Shape:** 12px radius (`rounded-xl`) on square buttons, 8px (`rounded-lg`) on pill/segment buttons, full circle on the primary transport control.
- **Primary (filled):** Warm Amber background, Ink Black text, semibold — the one confirmable action in any sheet (Skip selected, Continue, Close) and the "selected" state of every pill control.
- **Hover / Focus:** no hover state (touch-first, no mouse target); press dims the fill to 80% opacity (`active:bg-accent/80`).
- **Secondary / Outlined:** transparent fill, 1px Hairline Graphite border, Moonlight White text — the non-destructive alternative action (Keep all, Start over) and the font-size stepper. Press fills with Graphite Fill.
- **Ghost (icon-only):** no fill, no border, Dusk Gray icon that brightens to Moonlight White on press — every header/nav icon (close, prev/next page, settings gear, dismiss banner).
- **Primary Transport (FAB):** 64px filled circle, Warm Amber background, `shadow-lg` — the only button that combines fill and shadow, and the single largest control on screen.

### Segmented Pills (signature component)
- **Style:** a `flex-1` row sharing one 8px-radius group; unselected pills are transparent with Dusk Gray text, the selected pill fills Warm Amber with Ink Black text.
- **Used for:** playback speed, pitch, sleep timer duration, and voice selection. Every "pick one of N" decision in the app uses this exact pattern — never a dropdown, never a radio list.

### Cards / Containers (book covers)
- **Corner Style:** 12px (`rounded-xl`), clipped (`overflow-hidden`).
- **Background:** the only gradients in the system — a deterministic two-stop `linear-gradient(145deg, …)` hashed from the book's title, drawn from a curated set of 8 color pairs spanning indigo/violet, cyan/teal, emerald/teal, rose/pink, and amber/orange.
- **Shadow:** Float (see Elevation & Depth) — covers are the one element in the UI meant to feel like a physical object.
- **Overlay chrome:** a translucent white book-glyph watermark, a `black/40` circular remove button in the top-right corner, and a 4px progress track (`black/30` base, `white/70` fill) along the bottom edge.

### Sheets (signature component)
- **Style:** Charcoal Panel background, `rounded-t-2xl`, hairline `border-t`, slides up from the bottom edge, 24px internal padding, scrolls internally past 75–80% viewport height.
- **Used for:** every secondary decision in the app — Settings, front-matter review, resume confirmation, and the completion screen all share this exact chrome. Blocking states (front-matter, resume, done) sit on a `black/70` backdrop; the dismissible Settings sheet has no backdrop tint, just a transparent tap-catcher.

### Iconography
- **Style:** Heroicons-style 24×24 SVGs. Outline icons (1.5–2px stroke, round caps) handle wayfinding and chrome (close, prev/next, settings gear, install icon). Solid/filled icons are reserved for state (play/pause, a confirmed checkmark) or ambient decoration (the book glyph on cover art).

## Do's and Don'ts

### Do:
- **Do** keep Warm Amber as the only color that means "active, selected, or speaking" — wherever it appears, it's marking state, not decorating.
- **Do** use the bottom-sheet pattern for any new secondary surface.
- **Do** keep interactive chrome (buttons, labels, section headers) at 12–14px; reserve size for the reading content itself.
- **Do** respect `env(safe-area-inset-bottom)` on anything anchored to the bottom edge.

### Don't:
- **Don't** add a shadow to anything anchored to a screen edge — a hairline border is the correct treatment there.
- **Don't** introduce a second accent color, or a gradient anywhere outside book cover art.
- **Don't** add a custom webfont; the system-ui stack is a deliberate, load-light choice for an offline-first PWA.
- **Don't** design for a breakpoint. This ships to one viewport: a portrait Android phone in an installed PWA shell.
