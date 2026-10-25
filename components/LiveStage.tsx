"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Camera,
  FlipHorizontal2,
  Maximize,
  Minimize,
  RotateCw,
  SwitchCamera,
  VideoOff,
} from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { RLLogo } from "@/components/RLLogo";
import { ControlButton } from "@/components/ControlButton";

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FsElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const SURFACE_CHIP =
  "inline-flex items-center rounded-step7 border border-line bg-raised/90 shadow-1 backdrop-blur";

const CONTROLS_HIDE_DELAY_MS = 3000;
const FLASH_RESET_MS = 450;

function snapshotName(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `real-live-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate(),
  )}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.png`;
}

export function LiveStage() {
  const {
    videoRef,
    status,
    error,
    settings,
    devices,
    activeDeviceId,
    facing,
    start,
    switchDevice,
    flip,
  } = useCamera();
  const stageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manual mirror override; null follows the camera side: mirrored on the
  // front camera, straight on the rear (unknown sides stay mirrored, which
  // matches the legacy default).
  const [mirrorOverride, setMirrorOverride] = useState<boolean | null>(null);
  const mirror = mirrorOverride ?? facing !== "environment";
  const toggleMirror = useCallback(() => {
    setMirrorOverride(!mirror);
  }, [mirror]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [chromeHidden, setChromeHidden] = useState(false);
  const [flash, setFlash] = useState(false);

  const showHint = useCallback((message: string) => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint(message);
    hintTimerRef.current = setTimeout(() => setHint(null), 2500);
  }, []);

  /* ---------- mobile detection ---------- */

  // useSyncExternalStore keeps hydration clean: the server snapshot is
  // false and the coarse-pointer upgrade lands on the client pass.
  const coarsePointer = useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(pointer: coarse)");
      media.addEventListener("change", onStoreChange);
      return () => media.removeEventListener("change", onStoreChange);
    },
    () =>
      window.matchMedia("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0,
    () => false,
  );

  /* ---------- fullscreen ---------- */

  const toggleFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const doc = document as FsDocument;
    const isCurrentlyFullscreen = Boolean(
      document.fullscreenElement ?? doc.webkitFullscreenElement,
    );

    if (isCurrentlyFullscreen) {
      const exit =
        document.exitFullscreen?.bind(document) ??
        doc.webkitExitFullscreen?.bind(doc);
      exit?.();
      return;
    }

    const el = stage as FsElement;
    const request =
      el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);

    if (request) {
      Promise.resolve(request()).catch(() =>
        showHint("Fullscreen is blocked in this view."),
      );
    } else {
      showHint("Fullscreen is not supported in this browser.");
    }
  }, [showHint]);

  // Keep the fullscreen button state in sync with native changes (Esc key).
  useEffect(() => {
    const sync = () =>
      setIsFullscreen(
        Boolean(
          document.fullscreenElement ??
            (document as FsDocument).webkitFullscreenElement,
        ),
      );
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  /* ---------- auto-hiding controls ---------- */

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      const active = document.activeElement;
      const focusInControls =
        Boolean(headerRef.current?.contains(active)) ||
        Boolean(footerRef.current?.contains(active));
      if (!focusInControls) setChromeHidden(true);
    }, CONTROLS_HIDE_DELAY_MS);
  }, []);

  const wakeControls = useCallback(() => {
    setChromeHidden(false);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    // Controls hide only while streaming; every other state derives visible
    // chrome at render time, so the effect only manages the hide timer.
    if (status !== "live") {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }

    // Reveal chrome for a fresh grace period whenever the stream goes live.
    const reveal = setTimeout(() => setChromeHidden(false), 0);
    scheduleHide();
    window.addEventListener("pointermove", wakeControls);
    window.addEventListener("pointerdown", wakeControls);
    window.addEventListener("keydown", wakeControls);
    return () => {
      clearTimeout(reveal);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      window.removeEventListener("pointermove", wakeControls);
      window.removeEventListener("pointerdown", wakeControls);
      window.removeEventListener("keydown", wakeControls);
    };
  }, [status, scheduleHide, wakeControls]);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  /* ---------- keyboard shortcuts ---------- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "m") {
        event.preventDefault();
        toggleMirror();
      } else if (key === "f") {
        event.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleFullscreen, toggleMirror]);

  /* ---------- snapshot ---------- */

  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      showHint("No frame to capture yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      showHint("Snapshot failed.");
      return;
    }

    // Keep the saved frame identical to what the preview shows.
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) {
        showHint("Snapshot failed.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = snapshotName(new Date());
      anchor.click();
      URL.revokeObjectURL(url);
      setFlash(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlash(false), FLASH_RESET_MS);
    }, "image/png");
  }, [mirror, showHint, videoRef]);

  /* ---------- camera switching ---------- */

  const activeIndex = devices.findIndex(
    (device) => device.deviceId === activeDeviceId,
  );
  const activeLabel = activeIndex >= 0 ? devices[activeIndex].label : null;

  const cycleCamera = useCallback(() => {
    if (devices.length < 2) return;
    const next = devices[(activeIndex + 1) % devices.length];
    switchDevice(next.deviceId);
    showHint(`Switched to ${next.label}`);
  }, [activeIndex, devices, showHint, switchDevice]);

  // Mobile: toggle strictly front <-> rear; the hook restores the previous
  // camera on failure, and the hint says which side we stayed on.
  const flipCamera = useCallback(async () => {
    const result = await flip();
    if (result.ok) {
      // Reset to the side's default: mirrored front, straight rear.
      setMirrorOverride(null);
      showHint(
        result.facing === "user"
          ? "Switched to front camera"
          : "Switched to rear camera",
      );
      return;
    }
    showHint(
      facing === "user"
        ? "Rear camera unavailable — staying on front."
        : facing === "environment"
          ? "Front camera unavailable — staying on rear."
          : "Camera switch failed — staying on current camera.",
    );
  }, [facing, flip, showHint]);

  /* ---------- derived UI state ---------- */

  const resolution =
    settings.width && settings.height
      ? `${settings.width}×${settings.height}`
      : null;
  const fps = settings.frameRate
    ? `${Math.round(settings.frameRate)} fps`
    : null;

  const isLive = status === "live";
  const controlsHidden = isLive && chromeHidden;

  const announcement =
    status === "starting"
      ? "Starting camera"
      : status === "live"
        ? `Camera is live${resolution ? ` at ${resolution}` : ""}`
        : status === "error" && error
          ? `${error.title}. ${error.message}`
          : "Camera stopped";

  // Reflect the stream state in the browser tab while users are elsewhere.
  useEffect(() => {
    document.title =
      status === "live"
        ? "Live · Real Live"
        : status === "error"
          ? "Error · Real Live"
          : "Real Live — Fullscreen Camera Monitor";
  }, [status]);

  const controlsOpacity = controlsHidden
    ? "pointer-events-none opacity-0"
    : "opacity-100";

  return (
    <div
      ref={stageRef}
      aria-label="Real Live stage"
      className={[
        "fixed inset-0 select-none overflow-hidden bg-base",
        controlsHidden ? "cursor-none" : "",
      ].join(" ")}
    >
      {/* Live video surface; double-click toggles fullscreen */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onDoubleClick={toggleFullscreen}
        aria-label="Live camera preview"
        className={[
          "absolute inset-0 h-full w-full object-cover",
          mirror ? "-scale-x-100" : "",
        ].join(" ")}
      />

      {/* Legibility scrims (functional, derived from color.surface.base) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-base/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-base/70 to-transparent"
      />

      {/* Header: brand chip + status chip */}
      <header
        ref={headerRef}
        onFocusCapture={wakeControls}
        className={[
          "absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-6 pt-[max(12px,env(safe-area-inset-top))]",
          "transition-opacity duration-300 ease-out animate-fade-in",
          controlsOpacity,
        ].join(" ")}
      >
        <div className={`${SURFACE_CHIP} gap-3 p-2`}>
          <RLLogo size={20} />
          <span className="px-2 text-lg font-medium text-primary">Real Live</span>
        </div>

        <div className={`${SURFACE_CHIP} h-14 gap-2 px-3 text-md font-medium text-primary`}>
          {isLive ? (
            <>
              <span className="relative inline-flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-live opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-status-live" />
              </span>
              <span>Live</span>
              {resolution ? (
                <span className="text-secondary" aria-hidden="true">
                  {resolution}
                </span>
              ) : null}
              {fps ? (
                <span className="text-secondary" aria-hidden="true">
                  · {fps}
                </span>
              ) : null}
            </>
          ) : status === "starting" ? (
            <>
              <span
                aria-hidden="true"
                className="size-2 animate-spin rounded-full border-2 border-primary border-t-transparent"
              />
              <span>Starting</span>
            </>
          ) : status === "error" ? (
            <>
              <span className="size-2 rounded-full bg-secondary" />
              <span>Error</span>
            </>
          ) : (
            <span className="text-secondary">Offline</span>
          )}
        </div>
      </header>

      {/* Footer: hint, control bar, shortcut hint */}
      <footer
        ref={footerRef}
        onFocusCapture={wakeControls}
        className={[
          "absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-6 pb-[max(12px,env(safe-area-inset-bottom))]",
          "transition-opacity duration-300 ease-out",
          controlsOpacity,
        ].join(" ")}
      >
        {hint ? (
          <p
            role="status"
            className={`${SURFACE_CHIP} max-w-180 truncate animate-fade-up px-3 py-1 text-sm text-primary`}
          >
            {hint}
          </p>
        ) : null}

        <div className={`${SURFACE_CHIP} gap-2 p-2`}>
          <ControlButton
            label="Mirror"
            icon={<FlipHorizontal2 />}
            onClick={toggleMirror}
            pressed={mirror}
            disabled={!isLive}
            shortcut="M"
            ariaKeyshortcuts="m"
          />
          <ControlButton
            label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            icon={isFullscreen ? <Minimize /> : <Maximize />}
            onClick={toggleFullscreen}
            disabled={!isLive}
            shortcut="F"
            ariaKeyshortcuts="f"
          />
          <ControlButton
            label="Camera"
            icon={<SwitchCamera />}
            onClick={coarsePointer ? () => void flipCamera() : cycleCamera}
            disabled={!isLive || devices.length < 2}
            tooltip={
              devices.length < 2
                ? "Switch camera (needs 2+ cameras)"
                : coarsePointer
                  ? facing
                    ? `Flip to ${facing === "user" ? "rear" : "front"} camera`
                    : "Flip camera"
                  : `Switch camera — ${activeLabel ?? "current"}`
            }
          />
          <ControlButton
            label="Snapshot"
            icon={<Camera />}
            onClick={takeSnapshot}
            disabled={!isLive}
          />
        </div>

        <p aria-hidden="true" className="text-sm text-raised/60">
          M mirror · F fullscreen · double-click video
        </p>
      </footer>

      {/* Loading state */}
      {status === "starting" ? (
        <div
          role="status"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-base/70 backdrop-blur-[2px] animate-fade-in"
        >
          <RLLogo size={28} />
          <span
            aria-hidden="true"
            className="size-16 animate-spin rounded-full border-2 border-raised/30 border-t-raised"
          />
          <p className="text-lg text-raised">Starting camera…</p>
        </div>
      ) : null}

      {/* Error state */}
      {status === "error" && error ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-base/85 p-6 backdrop-blur-sm animate-fade-in">
          <div
            role="alert"
            className="flex w-full max-w-180 flex-col items-center gap-3 rounded-2xl border border-line bg-raised p-8 text-center shadow-1"
          >
            <VideoOff size={24} aria-hidden="true" className="text-secondary" />
            <h1 className="text-2xl font-medium text-primary">{error.title}</h1>
            <p className="text-lg leading-relaxed text-secondary">{error.message}</p>
            {error.hint ? (
              <p className="text-sm text-tertiary">{error.hint}</p>
            ) : null}
            <div className="mt-2">
              <ControlButton
                variant="solid"
                label="Retry camera"
                icon={<RotateCw />}
                onClick={start}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Snapshot shutter flash */}
      {flash ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-40 animate-flash bg-raised"
        />
      ) : null}

      {/* Screen-reader announcements for state changes */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
