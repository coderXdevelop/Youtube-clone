/**
 * Utility functions for YouTube-style custom HTML5 video player
 */

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formatRemainingTime(currentTime: number, totalDuration: number): string {
  if (isNaN(currentTime) || isNaN(totalDuration) || totalDuration <= 0) return "-0:00";
  const remaining = Math.max(0, totalDuration - currentTime);
  return `-${formatTime(remaining)}`;
}

/**
 * Safely format and encode media/video URL to avoid broken fragments, special characters, or backslashes
 */
export function getMediaUrl(filePath?: string): string {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const cleanPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const encodedPath = cleanPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${backendUrl.replace(/\/+$/, "")}/${encodedPath}`;
}

// Single Playback Coordination across tabs & multiple video instances
const PLAYBACK_CHANNEL_NAME = "yt_clone_single_playback_channel";
const STORAGE_KEY_PLAYBACK = "yt_clone_active_playback_id";

export function notifyPlaybackStarted(videoId: string, instanceId: string) {
  try {
    if (typeof window !== "undefined") {
      const payload = JSON.stringify({ videoId, instanceId, timestamp: Date.now() });
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel(PLAYBACK_CHANNEL_NAME);
        channel.postMessage(payload);
        channel.close();
      }
      localStorage.setItem(STORAGE_KEY_PLAYBACK, payload);
    }
  } catch (e) {
    console.debug("Playback coordination notification error:", e);
  }
}

export function subscribeToPlaybackChanges(
  currentInstanceId: string,
  onAnotherPlayerStarted: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let bc: BroadcastChannel | null = null;

  const handleMessage = (data: string) => {
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed && parsed.instanceId && parsed.instanceId !== currentInstanceId) {
        onAnotherPlayerStarted();
      }
    } catch {
      // ignore
    }
  };

  try {
    if ("BroadcastChannel" in window) {
      bc = new BroadcastChannel(PLAYBACK_CHANNEL_NAME);
      bc.onmessage = (event) => handleMessage(event.data);
    }
  } catch (e) {
    console.debug("BroadcastChannel init failed:", e);
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY_PLAYBACK && event.newValue) {
      handleMessage(event.newValue);
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    if (bc) {
      bc.close();
    }
    window.removeEventListener("storage", handleStorage);
  };
}

// Local Storage Progress Persistence
const PROGRESS_KEY_PREFIX = "yt_video_progress_";

export function saveLocalProgress(videoId: string, position: number, duration: number) {
  if (!videoId || typeof window === "undefined") return;
  try {
    const data = {
      position: Math.floor(position),
      duration: Math.floor(duration),
      updatedAt: Date.now(),
    };
    localStorage.setItem(`${PROGRESS_KEY_PREFIX}${videoId}`, JSON.stringify(data));
  } catch (e) {
    console.debug("Error saving local progress:", e);
  }
}

export function getLocalProgress(videoId: string): { position: number; duration: number } | null {
  if (!videoId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PROGRESS_KEY_PREFIX}${videoId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.position === "number") {
      return parsed;
    }
  } catch (e) {
    console.debug("Error reading local progress:", e);
  }
  return null;
}
