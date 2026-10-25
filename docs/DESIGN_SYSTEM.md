# Real Live Design System

Implementation-ready, token-driven UI guidance for Real Live, optimized for
consistency, accessibility, and fast delivery. This document is the contract
between design and code for the Real Live surface; `app/globals.css` is the
single source of truth for the mapped values.

## 1. Context and Goals

Real Live turns the device camera into a fullscreen live monitor for
developers and technical teams. The design intent in one sentence: **a
content-first, tokenized live surface where the video owns the viewport and
every control is keyboard-first, fully stateful, and quietly out of the way.**

- Product surface: fullscreen camera monitor (web).
- Audience: developers and technical teams; density and copy stay terse.
- Platform constraints: camera requires a secure context; controls must
  survive overlaying the video in both light and dark contexts.

## 2. Design Tokens and Foundations

All tokens live in `app/globals.css` under Tailwind v4 `@theme`. Components
must consume tokens. Raw hex values are reserved for token definitions and
brand artwork only.

### Typography

| Token | Value | Utility |
| ----- | ----- | ------- |
| `font.family.primary` | Space Grotesk + CJK-aware stack | `font-sans` (body default) |
| `font.size.base` | 16px / 24px / 400 | body |
| `font.size.xs` … `font.size.4xl` | 10 / 12 / 12.5 / 13 / 13.5 / 14 / 14.5 / 15px | `text-xs` … `text-4xl` |

### Color

| Design token | Value | Utility |
| ------------ | ----- | ------- |
| `color.text.primary` | `#1a1a1a` | `text-primary` |
| `color.text.secondary` | `#8a8a8a` | `text-secondary` |
| `color.text.tertiary` | dark @ 70% (oklab) | `text-tertiary` |
| `color.text.inverse` | dark @ 65% (oklab) | `text-inverse` |
| `color.surface.base` | `#000000` | `bg-base` |
| `color.surface.muted` | `#ffffff` | `bg-muted` |
| `color.surface.raised` | `#fafaf9` | `bg-raised` |
| `color.border.default` | `#e6e6e2` | `border-line` |
| `color.border.muted` | dark @ 5% (oklab) | `border-line-muted` |
| `color.border.strong` | light gray @ 70% (oklab) | `border-line-strong` |
| `color.status.live` | `#ef4444` (functional) | `bg-status-live` |

### Spacing, Radius, Shadow, Motion

| Group | Rule |
| ----- | ---- |
| Spacing | `--spacing: 2px`, so utilities map 1:1 to `space.1..8` (2–16px). No one-off margins. |
| Radius | `rounded-xs` 10 · `rounded-sm` 12 · `rounded-md` 16 · `rounded-lg` 18 · `rounded-xl` 20 · `rounded-2xl` 28 · `rounded-step7` 50px |
| Shadow | `shadow-1` only (the design system's single elevation). |
| Motion | `animate-fade-in` 0.25s, `animate-fade-up` 0.3s, `animate-flash` 0.4s. Decorative only; `prefers-reduced-motion` collapses all durations. |

## 3. Component Rules

### 3.1 Stage (fullscreen live surface)

Anatomy: `<video>` surface → legibility scrims → header (brand chip + status
chip) → footer (hint, control bar, shortcut hint) → loading overlay → error
overlay → shutter flash → screen-reader announcer.

- The video fills `fixed inset-0` with `object-cover`; mirror is a CSS
  transform (`-scale-x-100`) so the stream is never modified.
- Scrims are functional gradients from `color.surface.base` at 70%; they sit
  at z-10, below all chips (z-20) and overlays (z-30). Content must keep ≥
  4.5:1 contrast over them.
- Double-clicking the video toggles fullscreen (pointer path for the `F`
  shortcut).
- Responsive: `object-cover` crops gracefully from 320px to ultrawide;
  safe-area insets wrap header/footer padding for notched devices; the
  control bar wraps chips on narrow screens via `flex-wrap` spacing.

### 3.2 ControlButton (chip and solid variants)

Anatomy: icon (16px) + label. Height 44px (`h-22` at the 2px scale) — meets
WCAG 2.5.8 target size with margin.

| State | Chip | Solid |
| ----- | ---- | ----- |
| Default | `text-primary` on raised | `bg-primary text-raised` |
| Hover | `bg-primary/5` | `bg-primary/90` |
| Focus-visible | 2px `outline-primary`, 2px offset | same |
| Active | `scale(0.97)` | same |
| Pressed (toggle on) | inverted `bg-primary text-raised` + `aria-pressed` | — |
| Disabled | `opacity-40`, `pointer-events-none` | same |
| Loading | spinner replaces icon, `aria-busy` | same |
| Error | delegated to the page-level error overlay | same |

- Keyboard: Tab reachable; Enter/Space activates; single-key shortcuts are
  declared with `aria-keyshortcuts` and mirrored in the tooltip.
- Pointer: click/tap; `touch-manipulation` suppresses double-tap zoom.
- Long content: labels stay single-word; contextual detail goes in the
  tooltip (e.g. the active camera name on the Camera control).

### 3.3 Chrome auto-hide

- While `live`, chrome fades out after 3s without pointer/keyboard activity
  (300ms opacity ease) and the cursor hides with it.
- Any `pointermove`, `pointerdown`, or `keydown` wakes the chrome; focusing
  any control via keyboard forces it visible and pauses hiding while focus
  remains inside header/footer.
- Hidden chrome keeps `pointer-events-none` but stays focusable so Tab
  always reveals it; nothing is ever unreachable.
- In every other status (`starting`, `error`, `idle`) chrome is always
  visible.

### 3.4 Status chip

- States: `Live` (pulsing `--color-status-live` dot + resolution + fps),
  `Starting` (spinner), `Error` (muted dot), `Offline`.
- All state changes announce through the polite `aria-live` region; the
  browser tab title mirrors the status.

### 3.5 Loading overlay

- Brand mark + 32px spinner + "Starting camera…" copy on a 70%
  `color.surface.base` scrim. `role="status"`.

### 3.6 Error overlay

- `role="alert"` card on `color.surface.raised`: icon, 14px title, 13px
  message, optional technical hint in `text-tertiary`, solid Retry button.
- Copy pairs problem + fix in one sentence (see §5). Long messages wrap at
  `max-w-180` with relaxed leading; overflow must never clip.

### 3.7 Snapshot

- Captures the visible frame (mirror-aware) to a timestamped PNG download.
- Feedback: 0.4s shutter flash (`animate-flash`); failure surfaces as a
  transient hint chip, never a modal.

### 3.8 Camera switching

- Desktop: the Camera control cycles enumerated video inputs; the tooltip
  names the active device; switching shows a transient hint chip.
- Mobile (coarse pointer): the same control flips strictly between the
  front and the rear camera — never a rotation through individual devices,
  and multi-module rear setups choose the first (main) rear camera.
- The first visit prefers the rear camera via an ideal `facingMode`; the
  flipped side is persisted and preferred on later visits. Fallback
  landings never overwrite a stored preference.
- The preview mirror follows the side — on for front, off for rear — and
  resets on every flip; the manual Mirror control can still override.
- A failed flip restores the previous camera and reports the outcome via a
  transient hint chip, never a modal or the error overlay.
- Disabled with an explanatory tooltip when fewer than two cameras exist.
- Device list refreshes on `devicechange` (hot-plug).

## 4. Accessibility Requirements and Acceptance Criteria

All criteria are testable in implementation. WCAG 2.2 AA is the floor.

| # | Criterion | Pass | Fail |
| - | --------- | ---- | ---- |
| A1 | Focus visible | Tab through all controls; every one shows a 2px ring at 2px offset | any control without a ring |
| A2 | Contrast | `#1a1a1a`/`#fafaf9` ≥ 12:1; scrim text `#fafaf9` over ≥70% black ≥ 7:1; `#8a8a8a` used only ≥ 13px on raised | any pairing < 4.5:1 |
| A3 | Target size | Control hit areas ≥ 44px tall | any control < 24px |
| A4 | Keyboard parity | Every pointer action (mirror, fullscreen, snapshot, camera switch, retry) has a keyboard path | any pointer-only action |
| A5 | Announcements | `role="status"` announces starting → live → error transitions | silent state change |
| A6 | Hidden chrome safety | With chrome hidden, Tab still reaches controls and reveals them | focus lands on invisible controls with no reveal |
| A7 | Reduced motion | With `prefers-reduced-motion`, ping/flash/fade are instant and static | continuous animation remains |
| A8 | Labeling | Video is labeled; decorative layers are `aria-hidden`; toggles expose `aria-pressed`; shortcuts expose `aria-keyshortcuts` | ambiguous or missing labels |

## 5. Content and Tone Standards

Concise, confident, implementation-focused. Actions are verbs; error copy
pairs the problem with the fix in one sentence.

| Do | Avoid |
| -- | ----- |
| "Camera access denied. Allow camera permission in your browser settings, then retry." | "Something went wrong." |
| "Another app is using the camera. Close it and retry." | "Error 0x80004005." |
| "Open this page over HTTPS or localhost to use the camera." | "Insecure context." (jargon-only) |
| "Retry camera", "Mirror", "Fullscreen", "Snapshot" | "OK", "Click here", "Submit" |

## 6. Anti-Patterns (Prohibited)

- One-off hex values, spacing, radii, or type sizes outside the token scale.
- Hidden or low-contrast focus indicators; focus traps.
- Shipping a control without its full state matrix.
- Modals for transient feedback (use the hint chip).
- Auto-uploading, recording, or persisting camera data.
- Controls that hide permanently, or focus landing on invisible elements.
- Low-contrast text over video without the functional scrim.

## 7. QA Checklist

- [ ] `npm run lint` and `npm run build` pass with zero errors.
- [ ] Camera reaches `Live` within one permission grant on Chrome/Firefox/Safari.
- [ ] Permission-denied, no-camera, camera-busy, and insecure-context paths
      each render the error overlay with a working retry.
- [ ] `M` and `F` shortcuts work; Tab order is brand → status → controls;
      hidden chrome reappears on any input.
- [ ] Fullscreen enters/exits via button, `F`, double-click, and `Esc`;
      button state stays in sync.
- [ ] Mirror toggle flips preview and saved snapshots identically.
- [ ] Snapshot downloads a correctly named PNG; flash fires once.
- [ ] Camera switch cycles devices and names them in hints/tooltips.
- [ ] Chrome hides after 3s idle while live (cursor included) and never
      hides during `starting`/`error`.
- [ ] Layout holds 320px → ultrawide; safe-area insets respected.
- [ ] Keyboard-only pass and screen-reader pass complete without blockers.
