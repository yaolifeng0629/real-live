<div align="center">
  <img src="public/logo.svg" alt="Real Live logo" width="80" height="80" />
  <h1>Real Live</h1>
  <p>Fullscreen live camera monitor for the browser</p>
</div>

## Context and Goals

Real Live turns your device camera into a fullscreen live monitor. It is built
for developers and technical teams who need a zero-install way to check
themselves before a call, test a camera pipeline, or keep an eye on a scene.

- Video never leaves the device: streams stay in memory, nothing is uploaded.
- One screen, one job: the live surface owns the viewport.
- Built token-first on the shared design system (Space Grotesk, monochrome
  surfaces, 2px spacing scale).

## Tech Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4 (design tokens via `@theme`)
- lucide-react icons

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build
```

Open http://localhost:3000 and grant camera permission. The camera API
requires a secure context: HTTPS or localhost.

## Keyboard Shortcuts

| Key | Action |
| --- | ------ |
| `M` | Toggle mirror |
| `F` | Toggle fullscreen |
| `Esc` | Exit fullscreen (native) |

## Design Tokens and Foundations

Semantic tokens live in `app/globals.css` (`@theme`). Components must consume
tokens; raw hex values are reserved for the token definitions and the logo
artwork.

| Design token | CSS/Tailwind utility |
| ------------ | -------------------- |
| `font.family.primary` | `--font-sans` (Space Grotesk stack) |
| `font.size.xs..4xl` (10–15px) | `text-xs` … `text-4xl` |
| `color.text.primary #1a1a1a` | `text-primary` |
| `color.text.secondary #8a8a8a` | `text-secondary` |
| `color.surface.base #000000` | `bg-base` |
| `color.surface.raised #fafaf9` | `bg-raised` |
| `color.border.default #e6e6e2` | `border-line` |
| `space.1..8` (2–16px) | spacing utilities at 2px per unit |
| `radius.xs..2xl, step7` | `rounded-xs` … `rounded-step7` |
| `shadow.1` | `shadow-1` |

Base typography: 16px / 24px / weight 400 on `body`.

## Component Rules

### Stage (fullscreen live surface)

- Anatomy: `<video>` surface, top scrim, bottom scrim, brand chip, status chip,
  control bar, loading overlay, error overlay, screen-reader announcer.
- The video uses `object-cover` and fills `fixed inset-0`; mirror is a CSS
  transform so the stream itself is never modified.
- Scrims are functional legibility gradients derived from
  `color.surface.base` — they must stay behind all chips and overlays.

### ControlButton (chip + solid variants)

| State | Rule |
| ----- | ---- |
| Default | `text-primary` on `color.surface.raised` chip |
| Hover | `bg-primary/5` (chip) or `bg-primary/90` (solid, pressed) |
| Focus-visible | 2px `color.text.primary` outline, 2px offset, never removed |
| Active | `scale(0.97)` |
| Pressed (toggle on) | Inverted: `bg-primary text-raised`, exposed via `aria-pressed` |
| Disabled | `opacity-40`, `pointer-events-none`, excluded from controls |
| Loading | Spinner replaces icon, `aria-busy="true"`, disabled |
| Error | Handled at page level via the error overlay and `role="alert"` |

- Keyboard: Tab reaches every control; Enter/Space activates; `M`/`F` are
  global shortcuts (ignored when typing in editable targets, and when modifier
  keys are held).
- Pointer: click/tap toggles; `touch-manipulation` removes double-tap zoom.
- Touch: target height is 44px (`h-22` at the 2px spacing scale).
- Long content: labels are single words with tooltips; the error card wraps
  long messages (`max-w-180`, relaxed leading) and never clips.

### Status chip

- `Live` (pulsing `--color-status-live` dot + resolution when known),
  `Starting` (spinner), `Error` (muted dot), `Offline`.
- State changes are announced through a polite `aria-live` region.

## Accessibility Acceptance Criteria

- Focus indicators are visible on every interactive element (2px outline,
  2px offset). Pass: tab through controls and see the ring on each. Fail: any
  control without a visible ring.
- All text meets WCAG AA contrast: `#1a1a1a` on `#fafaf9` ≥ 12:1; scrim text
  uses `#fafaf9` on a ≥70% black gradient. Pass: automated contrast check on
  rendered colors. Fail: any pairing below 4.5:1 (small) / 3:1 (large).
- Control targets are ≥ 24px (actual: 44px height). Pass: measure hit area.
- State changes (starting, live, error) are announced to screen readers via
  the `role="status"` live region. Pass: NVDA/VoiceOver announces transitions.
- Video is labeled (`aria-label="Live camera preview"`) and decorative layers
  are `aria-hidden`. Pass: screen reader reads a sensible landmark tree.
- Reduced motion disables the ping/spin decorations. Pass: enable
  `prefers-reduced-motion` and observe static indicators.

## Content and Tone

- Concise, confident, implementation-focused: "Camera access denied. Allow
  camera permission in your browser settings, then retry."
- Actions are verbs, labels are unambiguous: "Retry camera", "Mirror",
  "Fullscreen".
- Error copy names the fix in the same sentence as the problem.

## Anti-Patterns (Prohibited)

- One-off hex values, spacing, or type sizes outside the token scale.
- Hidden or low-contrast focus indicators.
- Ambiguous labels ("OK", "Click here").
- Shipping interactive elements without all seven states defined.
- Uploading, recording, or persisting camera data — the stream stays local.

## QA Checklist

- [ ] `npm run lint` and `npm run build` pass with zero errors.
- [ ] Camera reaches `Live` within one permission grant on Chrome/Firefox/Safari.
- [ ] Permission-denied, no-camera, and camera-busy paths each render the error
      overlay with a working retry.
- [ ] Opening the page over plain HTTP (non-localhost) shows the secure-context
      error.
- [ ] `M` and `F` shortcuts work; Tab order is brand → status → controls.
- [ ] Fullscreen enters/exits via button, `F`, and `Esc`; state stays in sync.
- [ ] Mirror toggle flips the preview without stopping the stream.
- [ ] Layout holds from 320px wide to ultrawide; safe-area insets respected.
- [ ] Keyboard-only pass and a screen-reader pass complete without blockers.

## Privacy

Real Live runs entirely in your browser. The MediaStream is held in memory
only and every track is stopped on unmount. No video, audio, or metadata is
stored or transmitted.

## License

MIT
