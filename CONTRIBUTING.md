# Contributing to Real Live

Thanks for helping improve Real Live. This guide keeps contributions
consistent, accessible, and fast to review.

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Run lint and a production build before every PR
npm run lint
npm run build
```

Node.js 18.18+ is required (the project is developed on Node 22).
The camera API needs a secure context: test on `localhost` or HTTPS.

## Project Layout

```
real-live/
├── app/                  # App Router: layout, page, tokens, metadata, manifest
├── components/           # LiveStage (stage), ControlButton, RLLogo
├── hooks/                # useCamera: MediaStream lifecycle
├── public/               # Static brand assets (logo, icons)
└── docs/                 # Design system spec and architecture notes
```

## Ground Rules

1. **Tokens only.** UI code consumes semantic tokens from
   `app/globals.css` (`@theme`). Raw hex values live only in the token
   definitions and brand artwork. See `docs/DESIGN_SYSTEM.md`.
2. **Every interactive element ships all states:** default, hover,
   focus-visible, active, disabled, loading, error. PRs adding a control
   without its state matrix will be sent back.
3. **Keyboard and screen reader parity.** Every pointer interaction has a
   keyboard path; every state change is announced via the live region.
4. **Privacy is a feature.** Streams stay in memory. Do not add upload,
   recording, or persistence of camera data.
5. **Conventional commits:** `feat:`, `fix:`, `docs:`, `refactor:`,
   `chore:`.

## Pull Request Checklist

- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run build` succeeds.
- [ ] Manual pass on Chrome and at least one of Firefox/Safari.
- [ ] Permission-denied and no-camera paths still render the error overlay
      with a working retry.
- [ ] `M` / `F` shortcuts, Tab order, and focus rings verified.
- [ ] No new colors, spacing, radii, or font sizes outside the token scale.
- [ ] `CHANGELOG.md` updated under an "Unreleased" heading.
- [ ] Docs updated when behavior or the token set changes.

## Reporting Issues

Include: browser + OS, steps to reproduce, expected vs actual behavior, and
the exact error copy shown by the overlay (or a screenshot). For camera
permission problems, state what `chrome://settings/content/camera` (or the
browser equivalent) shows for this origin.

## License

By contributing, you agree your contributions are licensed under the MIT
License found in `LICENSE`.
