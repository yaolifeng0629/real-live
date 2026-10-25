import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type CameraStatus = "starting" | "live" | "error" | "idle";

/** Which side of the device a camera points at; the persisted preference unit. */
export type Facing = "user" | "environment";

export interface CameraError {
  title: string;
  message: string;
  hint?: string;
}

export interface CameraSettings {
  width?: number;
  height?: number;
  frameRate?: number;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface FlipResult {
  ok: boolean;
  /** Side ended on when ok, side stayed on when the flip failed. */
  facing: Facing | null;
}

interface UseCameraReturn {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: CameraError | null;
  settings: CameraSettings;
  devices: CameraDevice[];
  activeDeviceId: string | null;
  facing: Facing | null;
  start: () => void;
  stop: () => void;
  switchDevice: (deviceId: string) => void;
  flip: () => Promise<FlipResult>;
}

/**
 * Constraint configs tried in order, adapted from RetroCam's useCamera hook.
 * A fullscreen monitor favors the largest stable pipeline first, then falls
 * back for devices that reject ideal dimensions or facingMode. When a device
 * id is pinned, the chain prefers exact selection with graceful fallback.
 */
const DEFAULT_CHAIN = (facing: Facing): MediaStreamConstraints[] => [
  {
    video: {
      // A soft preference: desktops ignore it, mobiles honor it.
      facingMode: { ideal: facing },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  },
  { video: { facingMode: { ideal: facing } }, audio: false },
  {
    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  },
  { video: true, audio: false },
];

const PINNED_CHAIN = (deviceId: string): MediaStreamConstraints[] => [
  {
    video: {
      deviceId: { exact: deviceId },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  },
  { video: { deviceId: { ideal: deviceId } }, audio: false },
  { video: true, audio: false },
];

/**
 * Last-resort flip chain for platforms whose device labels cannot be
 * classified. No bare `video: true` rung: landing on the wrong side is
 * worse than reporting failure and restoring the previous camera.
 */
const FACING_CHAIN = (facing: Facing): MediaStreamConstraints[] => [
  {
    video: {
      facingMode: { exact: facing },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  },
  { video: { facingMode: { exact: facing } }, audio: false },
  { video: { facingMode: { ideal: facing } }, audio: false },
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

const FACING_STORAGE_KEY = "real-live:facing";

/** Only explicit flips write here; fallback landings never overwrite the choice. */
function readStoredFacing(): Facing {
  if (typeof window === "undefined") return "environment";
  try {
    return window.localStorage.getItem(FACING_STORAGE_KEY) === "user"
      ? "user"
      : "environment";
  } catch {
    // Storage can be blocked (private mode); treat as a first visit.
    return "environment";
  }
}

function storeFacing(facing: Facing): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FACING_STORAGE_KEY, facing);
  } catch {
    // Best effort: flipping still works when storage is unavailable.
  }
}

const FRONT_LABEL = /front|facetime|facing user|infrared front|前置/i;
const REAR_LABEL = /back|rear|environment|world[- ]facing|后置/i;

/**
 * Best-effort facing from an enumerated device label. Covers iOS
 * ("Front Camera"), Android Chrome ("camera2 0, facing back"), and Chinese
 * locales; anything unrecognised (desktop webcams, virtual cameras) stays
 * unknown rather than guessed.
 */
export function classifyFacing(label: string): Facing | null {
  if (!label) return null;
  if (FRONT_LABEL.test(label)) return "user";
  if (REAR_LABEL.test(label)) return "environment";
  return null;
}

function facingOfSettings(settings: MediaTrackSettings): Facing | null {
  return settings.facingMode === "user" || settings.facingMode === "environment"
    ? settings.facingMode
    : null;
}

/** Front/rear buckets, used by flip to pin a device instead of racing constraints. */
function bucketDevices(
  devices: CameraDevice[],
  known: Map<string, Facing>,
): { front: string[]; rear: string[] } {
  const front: string[] = [];
  const rear: string[] = [];
  for (const device of devices) {
    const facing = known.get(device.deviceId) ?? classifyFacing(device.label);
    if (facing === "user") front.push(device.deviceId);
    else if (facing === "environment") rear.push(device.deviceId);
  }
  return { front, rear };
}

async function listVideoDevices(): Promise<CameraDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all
    .filter((device) => device.kind === "videoinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      // Labels are empty until permission is granted; fall back to index.
      label: device.label || `Camera ${index + 1}`,
    }));
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const deviceRef = useRef<string | null>(null);
  // The hook auto-starts on mount, so the initial status is "starting".
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [error, setError] = useState<CameraError | null>(null);
  const [settings, setSettings] = useState<CameraSettings>({});
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  // Mirror of devices for callbacks that must not re-subscribe to it.
  const devicesRef = useRef<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  // Facings proven by track settings, keyed by device id.
  const [knownFacings, setKnownFacings] = useState<Map<string, Facing>>(
    () => new Map(),
  );

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
      setActiveDeviceId(null);
    }
  }, []);

  const refreshDevices = useCallback(() => {
    void listVideoDevices().then((found) => {
      if (mountedRef.current) {
        devicesRef.current = found;
        setDevices(found);
      }
    });
  }, []);

  const attachStream = useCallback(
    (mediaStream: MediaStream) => {
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
        frameRate: trackSettings.frameRate,
      });

      const deviceId = trackSettings.deviceId ?? null;
      deviceRef.current = deviceId;
      if (mountedRef.current) setActiveDeviceId(deviceId);

      // Track settings are the only facing evidence we fully trust.
      const provenFacing = facingOfSettings(trackSettings);
      if (provenFacing && deviceId) {
        setKnownFacings((prev) => {
          if (prev.get(deviceId) === provenFacing) return prev;
          const next = new Map(prev);
          next.set(deviceId, provenFacing);
          return next;
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {
          // Autoplay can reject until a user gesture; the stream stays
          // attached and playback resumes on the next visibility change.
        });
      }

      // Labels become available only after a successful getUserMedia.
      refreshDevices();
    },
    [refreshDevices],
  );

  /**
   * Walk a constraint chain (with busy-camera backoff) and return the first
   * stream it opens. Throws the last error so callers can distinguish a
   * failed attempt from a global pipeline failure.
   */
  const acquire = useCallback(
    async (chain: MediaStreamConstraints[]): Promise<MediaStream> => {
      let lastError: unknown = null;

      for (let attempt = 0; attempt <= NOT_READABLE_RETRIES; attempt++) {
        // A camera held by another process frees up asynchronously: back off,
        // then retry the whole constraint chain (bounded attempts).
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          if (!mountedRef.current) throw null;
        }

        if (
          !navigator.mediaDevices ||
          typeof navigator.mediaDevices.getUserMedia !== "function"
        ) {
          throw new DOMException(
            "mediaDevices is unavailable in insecure contexts",
            "TypeError",
          );
        }

        let permissionDenied = false;
        let cameraBusy = false;

        for (const constraints of chain) {
          if (!mountedRef.current) throw null;

          try {
            const mediaStream =
              await navigator.mediaDevices.getUserMedia(constraints);
            if (!mountedRef.current) {
              mediaStream.getTracks().forEach((track) => track.stop());
              throw null;
            }
            return mediaStream;
          } catch (err) {
            if (err === null) throw err;
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
              if (
                err.name === "NotReadableError" ||
                err.name === "TrackStartError"
              ) {
                cameraBusy = true;
                break;
              }
              // Otherwise fall through to the next, looser constraint config.
            }
          }
        }

        if (permissionDenied || !cameraBusy) break;
      }

      throw lastError;
    },
    [],
  );

  const run = useCallback(
    async (deviceId: string | null): Promise<void> => {
      const chain = deviceId
        ? PINNED_CHAIN(deviceId)
        : DEFAULT_CHAIN(readStoredFacing());
      try {
        attachStream(await acquire(chain));
      } catch (err) {
        if (!mountedRef.current) return;
        setError(toCameraError(err));
        setStatus("error");
      }
    },
    [acquire, attachStream],
  );

  /** Restart the pipeline from an event handler (e.g. the retry button). */
  const start = useCallback(() => {
    setError(null);
    setStatus("starting");
    void run(deviceRef.current);
  }, [run]);

  const switchDevice = useCallback(
    (deviceId: string) => {
      if (deviceId === deviceRef.current) return;
      setError(null);
      setStatus("starting");
      void run(deviceId);
    },
    [run],
  );

  /**
   * The side the active camera points at: proven track settings first,
   * then a label guess, else unknown. Derived (not state) so it upgrades
   * automatically when post-permission labels land.
   */
  const facing = useMemo<Facing | null>(() => {
    if (!activeDeviceId) return null;
    return (
      knownFacings.get(activeDeviceId) ??
      classifyFacing(
        devices.find((device) => device.deviceId === activeDeviceId)?.label ??
          "",
      )
    );
  }, [activeDeviceId, devices, knownFacings]);

  /**
   * Mobile camera control: toggle strictly between the front and the rear
   * camera. Prefers pinning a classified device, falls back to exact
   * facingMode when labels are uninformative. The old track is released
   * first since Android hardware admits only one open camera at a time,
   * and a failed flip restores the previous camera so the stage never
   * dies on a rejected switch.
   */
  const flip = useCallback(async (): Promise<FlipResult> => {
    const previousFacing = facing;
    const previousDeviceId = deviceRef.current;
    // Rear-first when the current side is unknown.
    const target: Facing =
      previousFacing === "environment" ? "user" : "environment";

    setError(null);
    setStatus("starting");

    const buckets = bucketDevices(devicesRef.current, knownFacings);
    const pinned =
      target === "environment" ? buckets.rear[0] : buckets.front[0];

    const chains: MediaStreamConstraints[][] = [];
    if (pinned && pinned !== previousDeviceId) chains.push(PINNED_CHAIN(pinned));
    chains.push(FACING_CHAIN(target));

    const releaseCurrent = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    let lastError: unknown = null;
    for (const chain of chains) {
      if (!mountedRef.current) return { ok: false, facing: previousFacing };
      releaseCurrent();
      try {
        const stream = await acquire(chain);
        const landedFacing = facingOfSettings(
          stream.getVideoTracks()[0]?.getSettings() ?? {},
        );
        // Discard a stream that provably landed on the wrong side; unknown
        // facings merit the benefit of the doubt.
        if (landedFacing && landedFacing !== target) {
          stream.getTracks().forEach((track) => track.stop());
          continue;
        }
        const settled = landedFacing ?? target;
        attachStream(stream);
        storeFacing(settled);
        return { ok: true, facing: settled };
      } catch (err) {
        lastError = err;
      }
    }

    // Restore the previous camera so the stage survives a failed flip.
    if (previousDeviceId && mountedRef.current) {
      try {
        const stream = await acquire(PINNED_CHAIN(previousDeviceId));
        attachStream(stream);
        return { ok: false, facing: previousFacing };
      } catch (err) {
        lastError = err ?? lastError;
      }
    }

    if (mountedRef.current) {
      setError(toCameraError(lastError));
      setStatus("error");
    }
    return { ok: false, facing: previousFacing };
  }, [acquire, attachStream, facing, knownFacings]);

  useEffect(() => {
    // Defer to a task boundary: the effect body must stay free of synchronous
    // setState, and getUserMedia only makes sense after first paint anyway.
    const timer = setTimeout(() => {
      void run(deviceRef.current);
    }, 0);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [run, stop]);

  // Keep the device list fresh on hot-plug (only meaningful post-permission).
  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    const onChange = () => refreshDevices();
    navigator.mediaDevices.addEventListener("devicechange", onChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", onChange);
    };
  }, [refreshDevices]);

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
    devices,
    activeDeviceId,
    facing,
    start,
    stop,
    switchDevice,
    flip,
  };
}
