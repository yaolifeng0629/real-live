import { RefObject, useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "starting" | "live" | "error" | "idle";

export interface CameraError {
  title: string;
  message: string;
  hint?: string;
}

export interface CameraSettings {
  width?: number;
  height?: number;
}

interface UseCameraReturn {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: CameraError | null;
  settings: CameraSettings;
  start: () => void;
  stop: () => void;
}

/**
 * Constraint configs tried in order, adapted from RetroCam's useCamera hook.
 * A fullscreen monitor favors the largest stable pipeline first, then falls
 * back for devices that reject ideal dimensions or facingMode.
 */
const CONSTRAINT_CHAIN: MediaStreamConstraints[] = [
  {
    video: {
      facingMode: "user",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  },
  {
    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  },
  { video: { facingMode: "user" }, audio: false },
  { video: true, audio: false },
];

const NOT_READABLE_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function toCameraError(err: unknown): CameraError {
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return {
        title: "Camera access denied",
        message: "Allow camera permission in your browser settings, then retry.",
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        title: "No camera found",
        message: "Connect a camera to this device and retry.",
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        title: "Camera is busy",
        message: "Another app is using the camera. Close it and retry.",
      };
    case "OverconstrainedError":
      return {
        title: "Camera not supported",
        message: "This device rejected every video configuration we tried.",
      };
    case "SecurityError":
      return {
        title: "Camera blocked",
        message: "Camera access is blocked by browser security settings.",
      };
    case "AbortError":
      return {
        title: "Camera request aborted",
        message: "The camera request was interrupted. Retry to continue.",
      };
    case "TypeError":
      return {
        title: "Camera requires a secure context",
        message: "Open this page over HTTPS or localhost to use the camera.",
        hint: "mediaDevices API is unavailable in insecure contexts.",
      };
    default:
      return {
        title: "Camera unavailable",
        message: name ? `Camera error: ${name}.` : "An unknown camera error occurred.",
      };
  }
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  // The hook auto-starts on mount, so the initial status is "starting".
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [error, setError] = useState<CameraError | null>(null);
  const [settings, setSettings] = useState<CameraSettings>({});

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (mountedRef.current) {
      setStatus("idle");
      setSettings({});
    }
  }, []);

  const attachStream = useCallback((mediaStream: MediaStream) => {
    // Release any previous stream before adopting the new one.
    if (streamRef.current && streamRef.current.id !== mediaStream.id) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    streamRef.current = mediaStream;
    setError(null);
    setStatus("live");

    const [track] = mediaStream.getVideoTracks();
    const trackSettings = track?.getSettings() ?? {};
    setSettings({
      width: trackSettings.width,
      height: trackSettings.height,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => {
        // Autoplay can reject until a user gesture; the stream stays attached
        // and playback resumes on the next visibility change.
      });
    }
  }, []);

  const run = useCallback(async (): Promise<void> => {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= NOT_READABLE_RETRIES; attempt++) {
      // A camera held by another process frees up asynchronously: back off,
      // then retry the whole constraint chain (bounded attempts).
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        if (!mountedRef.current) return;
      }

      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        lastError = new DOMException(
          "mediaDevices is unavailable in insecure contexts",
          "TypeError",
        );
        break;
      }

      let permissionDenied = false;
      let cameraBusy = false;

      for (const constraints of CONSTRAINT_CHAIN) {
        if (!mountedRef.current) return;

        try {
          const mediaStream =
            await navigator.mediaDevices.getUserMedia(constraints);
          if (!mountedRef.current) {
            mediaStream.getTracks().forEach((track) => track.stop());
            return;
          }
          attachStream(mediaStream);
          return;
        } catch (err) {
          lastError = err;
          if (err instanceof DOMException) {
            // Permission errors are terminal: retrying only re-prompts noise.
            if (
              err.name === "NotAllowedError" ||
              err.name === "PermissionDeniedError"
            ) {
              permissionDenied = true;
              break;
            }
            // The device exists but is locked: retry the chain after backoff.
            if (err.name === "NotReadableError" || err.name === "TrackStartError") {
              cameraBusy = true;
              break;
            }
            // Otherwise fall through to the next, looser constraint config.
          }
        }
      }

      if (permissionDenied || !cameraBusy) break;
    }

    if (!mountedRef.current) return;
    setError(toCameraError(lastError));
    setStatus("error");
  }, [attachStream]);

  /** Restart the pipeline from an event handler (e.g. the retry button). */
  const start = useCallback(() => {
    setError(null);
    setStatus("starting");
    void run();
  }, [run]);

  useEffect(() => {
    // Defer to a task boundary: the effect body must stay free of synchronous
    // setState, and getUserMedia only makes sense after first paint anyway.
    const timer = setTimeout(() => {
      void run();
    }, 0);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [run, stop]);

  // Some browsers pause the video element when the tab is backgrounded.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        videoRef.current?.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return {
    videoRef,
    status,
    error,
    settings,
    start,
    stop,
  };
}
