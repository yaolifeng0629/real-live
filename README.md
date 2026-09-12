<div align="center">
  <img src="public/logo.svg" alt="Real Live logo" width="80" height="80" />
  <h1>Real Live</h1>
  <p>Fullscreen live camera monitor for the browser</p>
  <p>
    <a href="#getting-started">Getting Started</a> ·
    <a href="#keyboard--interactions">Interactions</a> ·
    <a href="docs/DESIGN_SYSTEM.md">Design System</a> ·
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
</div>

## Context and Goals

Real Live turns your device camera into a fullscreen live monitor. It is
built for developers and technical teams who need a zero-install way to
check themselves before a call, test a camera pipeline, or keep an eye on a
scene.

- Video never leaves the device: streams stay in memory, nothing is
  uploaded, nothing is persisted.
- One screen, one job: the live surface owns the viewport; chrome fades
  away while you watch.
- Built token-first on the shared design system (Space Grotesk, monochrome
  surfaces, 2px spacing scale). See [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

## Features

- **Fullscreen live preview** — `object-cover` video that fills any screen,
  320px to ultrawide, with safe-area support.
- **Mirror toggle** — selfie-style flipping without touching the stream.
- **Snapshot** — one click saves the current frame (mirror-aware) as a
  timestamped PNG.
- **Camera switching** — cycles every video input, refreshed on hot-plug.
- **Auto-hiding chrome** — controls fade after 3s idle while live and wake
  on any input; focus always reveals them.
- **Status at a glance** — pulsing live indicator with resolution and frame
  rate; the tab title mirrors the state.
- **Resilient camera pipeline** — multi-constraint fallback chain, retry
  with backoff when the camera is busy, secure-context detection, friendly
  error cards with retry.
- **Accessible** — visible focus rings, 44px targets, `aria-live`
  announcements, `aria-keyshortcuts`, reduced-motion support.

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

## Keyboard & Interactions

| Input | Action |
| ----- | ------ |
| `M` | Toggle mirror |
| `F` | Toggle fullscreen |
| Double-click video | Toggle fullscreen |
| `Esc` | Exit fullscreen (native) |
| Mouse move / key press | Wake auto-hidden controls |
| Tab | Reach every control; hidden chrome reappears |

## Project Structure

```
real-live/
├── app/
│   ├── layout.tsx        # Space Grotesk, metadata, manifest
│   ├── page.tsx          # Renders the stage
│   ├── globals.css       # Design tokens (@theme) + global a11y rules
│   ├── manifest.ts       # PWA manifest
│   ├── icon.svg          # RL favicon (SVG)
│   ├── favicon.ico       # RL favicon (multi-size)
│   ├── apple-icon.png    # iOS home-screen icon
│   └── opengraph-image.png
├── components/
│   ├── LiveStage.tsx     # Stage: video, chrome, overlays, shortcuts
│   ├── ControlButton.tsx # Chip/solid button with full state matrix
│   └── RLLogo.tsx        # RL monogram
├── hooks/
│   └── useCamera.ts      # MediaStream lifecycle + device management
├── docs/
│   └── DESIGN_SYSTEM.md  # Tokens, component rules, a11y criteria
└── public/               # Brand assets (logo, manifest icons)
```

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| "Camera access denied" | Permission rejected | Allow the camera for this origin in browser settings, then Retry camera |
| "No camera found" | No video input | Connect a camera and retry |
| "Camera is busy" | Another app holds the device | Close the other app; the pipeline auto-retries with backoff |
| "Camera requires a secure context" | Page served over plain HTTP | Use `localhost` or HTTPS |
| Preview inside an iframe shows an error | The host iframe lacks `allow="camera"` | Open the URL in a standalone browser tab |
| Black screen with UI visible | Camera starting or no frames yet | Wait for the Live indicator; check the error overlay if it appears |

## Documentation

- [Design System](docs/DESIGN_SYSTEM.md) — tokens, component state
  matrices, accessibility acceptance criteria, QA checklist.
- [Contributing](CONTRIBUTING.md) — setup, ground rules, PR checklist.
- [Changelog](CHANGELOG.md) — release history.

## Privacy

Real Live runs entirely in your browser. The MediaStream is held in memory
only and every track is stopped on unmount. No video, audio, or metadata is
stored or transmitted.

## License

[MIT](LICENSE)
