# Changelog

All notable changes to Real Live are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Mobile camera flip: on coarse-pointer devices the Camera control toggles
  strictly between the front and the rear camera — first visit lands on
  the rear, the flipped side is remembered across sessions.
- The preview mirror now follows the camera side (mirrored on the front
  camera, straight on the rear) on every switch, with the manual override
  still available afterwards.

### Changed

- The default constraint chain softly prefers the remembered camera side
  (`facingMode` ideal) instead of hard-pinning the front camera, so
  desktop behaviour is unchanged when only one camera exists.
- New glossary defining the camera vocabulary (facing, flip, cycle,
  mirror) used across the codebase and docs.

## [0.2.0] - 2026-09-12

### Added

- Camera switching: cycles between available video inputs, refreshed on
  `devicechange` hot-plug events; disabled with a clear tooltip when only
  one camera exists.
- Snapshot: captures the current frame (mirror-aware) to a timestamped PNG
  download with a shutter-flash effect.
- Auto-hiding chrome: brand, status, and controls fade out after 3s of
  inactivity while live and reappear on pointer movement or keyboard
  activity; focus always reveals them; the cursor hides with them.
- Status chip now shows the stream frame rate next to the resolution.
- Double-click the video to toggle fullscreen.
- Browser tab title reflects stream state (`Live · Real Live`).
- PWA manifest, Open Graph image, Apple touch icon, and a multi-size
  RL favicon.
- Documentation set: design system spec, contributing guide, changelog,
  MIT license.

### Changed

- `useCamera` accepts a pinned device id and exposes the enumerated device
  list plus the active device.
- Loading overlay opens with the RL brand mark.

## [0.1.0] - 2026-09-12

### Added

- Initial release: fullscreen live camera monitor built on Next.js 16,
  React 19, and Tailwind CSS v4.
- `useCamera` hook adapted from RetroCam: multi-constraint fallback chain,
  `NotReadableError` retry with backoff, secure-context detection, friendly
  error mapping, and full track cleanup on unmount.
- Mirror toggle (`M`) and fullscreen toggle (`F`) with keyboard shortcuts,
  visible focus rings, 44px touch targets, and `aria-live` announcements.
- Design tokens from the shared design system mapped to Tailwind `@theme`.
- RL monogram logo and favicon.
