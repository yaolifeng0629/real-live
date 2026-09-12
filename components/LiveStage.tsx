"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FlipHorizontal2, Maximize, Minimize, RotateCw, VideoOff } from "lucide-react";
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

export function LiveStage() {
  const { videoRef, status, error, settings, start } = useCamera();
  const stageRef = useRef<HTMLDivElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mirror, setMirror] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const showHint = useCallback((message: string) => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setHint(message);
    hintTimerRef.current = setTimeout(() => setHint(null), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

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

  // Keyboard-first: M mirrors, F toggles fullscreen.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
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
        setMirror((value) => !value);
      } else if (key === "f") {
        event.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleFullscreen]);

  const resolution =
    settings.width && settings.height
      ? `${settings.width}×${settings.height}`
      : null;

  const announcement =
    status === "starting"
      ? "Starting camera"
      : status === "live"
        ? `Camera is live${resolution ? ` at ${resolution}` : ""}`
        : status === "error" && error
          ? `${error.title}. ${error.message}`
          : "Camera stopped";

  return (
    <div
      ref={stageRef}
      aria-label="Real Live stage"
      className="fixed inset-0 select-none overflow-hidden bg-base"
    >
      {/* Live video surface */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
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
      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-6 pt-[max(12px,env(safe-area-inset-top))]">
        <div className={`${SURFACE_CHIP} gap-3 p-2`}>
          <RLLogo size={20} />
          <span className="px-2 text-lg font-medium text-primary">Real Live</span>
        </div>

        <div className={`${SURFACE_CHIP} h-14 gap-2 px-3 text-md font-medium text-primary`}>
          {status === "live" ? (
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

      {/* Footer: control bar + shortcut hint */}
      <footer className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-6 pb-[max(12px,env(safe-area-inset-bottom))]">
        {hint ? (
          <p
            role="status"
            className={`${SURFACE_CHIP} px-3 py-1 text-sm text-primary`}
          >
            {hint}
          </p>
        ) : null}

        <div className={`${SURFACE_CHIP} gap-2 p-2`}>
          <ControlButton
            label="Mirror"
            icon={<FlipHorizontal2 />}
            onClick={() => setMirror((value) => !value)}
            pressed={mirror}
            disabled={status !== "live"}
            shortcut="M"
          />
          <ControlButton
            label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            icon={isFullscreen ? <Minimize /> : <Maximize />}
            onClick={toggleFullscreen}
            disabled={status !== "live"}
            shortcut="F"
          />
        </div>

        <p aria-hidden="true" className="text-sm text-raised/60">
          M mirror · F fullscreen
        </p>
      </footer>

      {/* Loading state */}
      {status === "starting" ? (
        <div
          role="status"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-base/70 backdrop-blur-[2px]"
        >
          <span
            aria-hidden="true"
            className="size-16 animate-spin rounded-full border-2 border-raised/30 border-t-raised"
          />
          <p className="text-lg text-raised">Starting camera…</p>
        </div>
      ) : null}

      {/* Error state */}
      {status === "error" && error ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-base/85 p-6 backdrop-blur-sm">
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

      {/* Screen-reader announcements for state changes */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
