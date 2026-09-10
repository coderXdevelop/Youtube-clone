"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import {
  Loader2,
  RotateCcw,
  Play,
  Pause,
  Lock,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  X,
} from "lucide-react";
import TimelineScrubber from "./player/TimelineScrubber";
import PlayerControls, { QualityOption } from "./player/PlayerControls";
import AutoplayOverlay, { NextVideoInfo } from "./player/AutoplayOverlay";
import DoubleClickRipple from "./player/DoubleClickRipple";
import ShortcutsModal from "./player/ShortcutsModal";
import SubtitleRenderer from "./player/SubtitleRenderer";
import {
  formatTime,
  getMediaUrl,
  notifyPlaybackStarted,
  subscribeToPlaybackChanges,
  saveLocalProgress,
  getLocalProgress,
} from "@/lib/playerUtils";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/AxiosInstance";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    thumbnailpath?: string;
    uploader?: string;
    videochanel?: string;
  };
  nextVideo?: NextVideoInfo | null;
  onPlayNext?: () => void;
  isTheater?: boolean;
  onToggleTheater?: () => void;
}

export default function VideoPlayer({
  video,
  nextVideo = null,
  onPlayNext,
  isTheater = false,
  onToggleTheater = () => {},
}: VideoPlayerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { user } = useUser();
  const rawId = React.useId();
  const instanceId = `player_${rawId.replace(/:/g, "")}`;

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState("Auto (Adaptive)");
  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(false);

  // Subscription & Restriction states
  const [playbackInfo, setPlaybackInfo] = useState<any>(null);
  const [previewExpired, setPreviewExpired] = useState(false);
  const [dailyLimitExceeded, setDailyLimitExceeded] = useState(false);
  const [qualityLockModal, setQualityLockModal] = useState<QualityOption | null>(null);
  const [watchTimeStats, setWatchTimeStats] = useState<{
    watchedSecondsToday: number;
    remainingSecondsToday: number | null;
    dailyLimitSeconds: number | null;
    isUnlimited: boolean;
  }>({
    watchedSecondsToday: 0,
    remainingSecondsToday: 3600,
    dailyLimitSeconds: 3600,
    isUnlimited: false,
  });

  // UI interaction states
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [centerRipple, setCenterRipple] = useState<"play" | "pause" | null>(null);
  const [doubleClickSide, setDoubleClickSide] = useState<"left" | "right" | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [resumeNotice, setResumeNotice] = useState<{ position: number; visible: boolean } | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [speedNotice, setSpeedNotice] = useState<string | null>(null);
  const [volumeNotice, setVolumeNotice] = useState<string | null>(null);
  const volumeNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [subtitleNotice, setSubtitleNotice] = useState<string | null>(null);
  const subtitleNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [captionSyncOffset, setCaptionSyncOffset] = useState<number>(0);

  const handleChangeSyncOffset = useCallback((newOffset: number) => {
    const clamped = Math.round(newOffset * 10) / 10;
    setCaptionSyncOffset(clamped);
    if (subtitleNoticeTimeoutRef.current) clearTimeout(subtitleNoticeTimeoutRef.current);
    const label = clamped === 0 ? "Subtitle Sync: 0.0s (Normal)" : `Subtitle Sync: ${clamped > 0 ? "+" : ""}${clamped.toFixed(1)}s`;
    setSubtitleNotice(label);
    subtitleNoticeTimeoutRef.current = setTimeout(() => setSubtitleNotice(null), 1500);
  }, []);

  const handleToggleSubtitles = useCallback(() => {
    setSubtitlesEnabled((prev) => {
      const next = !prev;
      if (subtitleNoticeTimeoutRef.current) clearTimeout(subtitleNoticeTimeoutRef.current);
      setSubtitleNotice(next ? "Subtitles (CC) ON" : "Subtitles (CC) OFF");
      subtitleNoticeTimeoutRef.current = setTimeout(() => setSubtitleNotice(null), 1500);
      return next;
    });
  }, []);

  const lastClickTimeRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // Fallback direct MP4 stream URL and thumbnail for scrubber preview
  const previewVideoSrc = video?.filepath
    ? getMediaUrl(video.filepath)
    : getMediaUrl(
        `api/video/stream/${video?._id}?quality=360p${
          user?._id ? `&userId=${user._id}` : ""
        }`
      );
  const thumbnailSrc = video?.thumbnailpath ? getMediaUrl(video.thumbnailpath) : "";

  // Fetch Playback Authorization & Quality Info from backend
  useEffect(() => {
    let isMounted = true;
    const fetchPlaybackAuth = async () => {
      if (!video?._id) return;
      try {
        const res = await axiosInstance.get(`/api/video/playback-info/${video._id}?userId=${user?._id || ""}`);
        if (!isMounted || !res.data) return;

        setPlaybackInfo(res.data);
        const autoOption: QualityOption = {
          quality: "auto",
          label: "Auto (Adaptive)",
          isAllowed: true,
          requiredPlan: "Free",
        };

        if (Array.isArray(res.data.qualities)) {
          setQualities([autoOption, ...res.data.qualities]);
        }
        if (res.data.watchTime) {
          setWatchTimeStats({
            watchedSecondsToday: res.data.watchTime.watchedSecondsToday || 0,
            remainingSecondsToday: res.data.watchTime.remainingSecondsToday,
            dailyLimitSeconds: res.data.watchTime.dailyLimitSeconds,
            isUnlimited: res.data.watchTime.isUnlimited || false,
          });
          if (res.data.watchTime.quotaExceeded) {
            setDailyLimitExceeded(true);
          }
        }
        if (res.data.access?.allowed === false && !res.data.access?.previewOnly) {
          setPreviewExpired(true);
        }
      } catch (err) {
        console.debug("Could not fetch playback authorization:", err);
      }
    };

    fetchPlaybackAuth();
    return () => {
      isMounted = false;
    };
  }, [video?._id, user?._id]);

  // Setup HLS Stream via hls.js or Native HLS
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !video?._id) return;

    setPlaybackError(null);

    const streamEndpoint =
      playbackInfo?.hlsStreamUrl ||
      playbackInfo?.streamUrl ||
      `/api/video/hls/${video._id}/master.m3u8${user?._id ? `?userId=${user._id}` : ""}`;
    const fullStreamUrl = getMediaUrl(streamEndpoint.replace(/^\/+/, ""));

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(fullStreamUrl);
      hls.attachMedia(v);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        console.log(`[HLS.js] Master playlist parsed with ${data.levels.length} quality levels.`);
        if (quality.toLowerCase().includes("auto")) {
          hls.currentLevel = -1; // Auto adaptive bitrate switching
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const currentLvl = hls.levels[data.level];
        if (currentLvl) {
          console.log(`[HLS.js] Seamlessly switched quality level: ${currentLvl.height}p (${currentLvl.bitrate} bps)`);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn("[HLS.js] Fatal stream error:", data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (data.response?.code === 403) {
                setPlaybackError("Access restricted. Your subscription plan does not permit this stream quality.");
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              v.src = getMediaUrl(`api/video/stream/${video._id}?userId=${user?._id || ""}`);
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari iOS native HLS
      v.src = fullStreamUrl;
    } else {
      // Fallback direct stream
      v.src = getMediaUrl(`api/video/stream/${video._id}?userId=${user?._id || ""}`);
    }
  }, [video?._id, playbackInfo?.hlsStreamUrl, playbackInfo?.streamUrl, user?._id]);

  // 1. Controls auto-hide timer
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      resetControlsTimer();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimer]);

  // 2. Play / Pause toggle
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused || v.ended) {
      v.play()
        .then(() => {
          setIsPlaying(true);
          setShowAutoplayOverlay(false);
          setCenterRipple("play");
          setTimeout(() => setCenterRipple(null), 500);
          notifyPlaybackStarted(video._id, instanceId);
        })
        .catch((err) => {
          console.debug("Video play interrupted/aborted:", err);
        });
    } else {
      v.pause();
      setIsPlaying(false);
      setCenterRipple("pause");
      setTimeout(() => setCenterRipple(null), 500);
    }
  }, [video._id, instanceId]);

  // 3. Single Playback Coordination (pause if another video plays in any tab)
  useEffect(() => {
    const unsubscribe = subscribeToPlaybackChanges(instanceId, () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    });
    return unsubscribe;
  }, [instanceId]);

  // 4. Seek Relative (-10s / +10s / +30s)
  const seekRelative = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    const newTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
    v.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // 5. Seek Absolute (Timeline scrubber)
  const handleSeek = useCallback((targetTime: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = targetTime;
    setCurrentTime(targetTime);
  }, []);

  // 6. Volume & Mute handling
  const volumePressTrackerRef = useRef<{ lastTime: number; direction: "up" | "down" | null; streak: number }>({
    lastTime: 0,
    direction: null,
    streak: 0,
  });

  const handleVolumeChange = useCallback((newVol: number, showNotice = false) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(1, Math.round(newVol * 100) / 100));
    v.volume = clamped;
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      v.muted = false;
      setIsMuted(false);
    }
    if (showNotice) {
      setVolumeNotice(`${Math.round(clamped * 100)}%`);
      if (volumeNoticeTimeoutRef.current) clearTimeout(volumeNoticeTimeoutRef.current);
      volumeNoticeTimeoutRef.current = setTimeout(() => setVolumeNotice(null), 1200);
    }
  }, [isMuted]);

  const adjustVolume = useCallback((direction: "up" | "down") => {
    const now = Date.now();
    const tracker = volumePressTrackerRef.current;
    const timeDiff = now - tracker.lastTime;

    // Detect rapid successive clicking (within 350ms)
    if (tracker.direction === direction && timeDiff < 350) {
      tracker.streak = Math.min(8, tracker.streak + 1);
    } else {
      tracker.streak = 0;
    }
    tracker.lastTime = now;
    tracker.direction = direction;

    // Single click increases by const 5 units (0.05).
    // Rapid successive presses accelerate exponentially (e.g. 5% -> 8% -> 12% -> 18% -> 27% -> 35%)
    const exponentialMultiplier = Math.pow(1.5, tracker.streak);
    const step = Math.min(0.35, 0.05 * exponentialMultiplier);

    const v = videoRef.current;
    const currentVol = v ? v.volume : volume;
    const targetVol = direction === "up" ? currentVol + step : currentVol - step;
    handleVolumeChange(targetVol, true);
  }, [handleVolumeChange, volume]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
    setVolumeNotice(!isMuted ? "Muted" : `${Math.round(v.volume * 100)}%`);
    if (volumeNoticeTimeoutRef.current) clearTimeout(volumeNoticeTimeoutRef.current);
    volumeNoticeTimeoutRef.current = setTimeout(() => setVolumeNotice(null), 1200);
  }, [isMuted]);

  // 7. Playback Speed Change
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;

  const enforcePlaybackRate = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.playbackRate = playbackRateRef.current;
      v.defaultPlaybackRate = playbackRateRef.current;
      v.preservesPitch = true;
    }
  }, []);

  const handleChangePlaybackRate = useCallback((rate: number) => {
    playbackRateRef.current = rate;
    const v = videoRef.current;
    if (v) {
      v.playbackRate = rate;
      v.defaultPlaybackRate = rate;
      v.preservesPitch = true;
    }
    setPlaybackRate(rate);
    setSpeedNotice(`${rate === 1 ? "Normal (1×)" : `${rate}×`}`);
    setTimeout(() => {
      setSpeedNotice(null);
    }, 1500);
  }, []);

  // Synchronize playbackRate whenever video element or rate changes
  useEffect(() => {
    enforcePlaybackRate();
  }, [playbackRate, enforcePlaybackRate]);

  // 8. Fullscreen Toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.debug("Fullscreen error:", err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // 9. Picture-in-Picture Toggle
  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (document.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (err) {
      console.debug("PiP error:", err);
    }
  }, []);

  // 10. Initial Watch Progress & Resume Loader
  useEffect(() => {
    let isMounted = true;
    const checkSavedProgress = async () => {
      // 1. Check local progress first
      const local = getLocalProgress(video._id);
      let initialPos = local ? local.position : 0;

      // 2. Fetch backend progress if user logged in
      if (user?._id) {
        try {
          const res = await axiosInstance.get(`/api/history/progress/${user._id}/${video._id}`);
          if (res.data && res.data.lastPosition > 0) {
            initialPos = Math.max(initialPos, res.data.lastPosition);
          }
        } catch (e) {
          console.debug("Could not fetch remote watch progress:", e);
        }
      }

      if (isMounted && initialPos > 5) {
        const v = videoRef.current;
        if (v) {
          v.currentTime = initialPos;
          setCurrentTime(initialPos);
        }
        setResumeNotice({ position: initialPos, visible: true });
        setTimeout(() => {
          if (isMounted) setResumeNotice((prev) => (prev ? { ...prev, visible: false } : null));
        }, 5000);
      }
    };

    checkSavedProgress();

    return () => {
      isMounted = false;
    };
  }, [video._id, user]);

  // 11. Periodic Watch Progress & Watch-Time Heartbeat (every 5 seconds during playback)
  useEffect(() => {
    if (!isPlaying || duration <= 0) return;

    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;

      const pos = v.currentTime;
      const dur = v.duration || duration;

      saveLocalProgress(video._id, pos, dur);

      if (user?._id) {
        // Save playback progress position
        axiosInstance
          .post(`/api/history/progress/${video._id}`, {
            userId: user._id,
            position: pos,
            duration: dur,
          })
          .catch(() => {});

        // Send server-side watch-time quota heartbeat
        axiosInstance
          .post("/api/video/heartbeat", {
            userId: user._id,
            videoId: video._id,
            secondsWatched: 5,
            sessionId: instanceId,
          })
          .then((hbRes) => {
            if (hbRes.data?.quotaExceeded) {
              v.pause();
              setIsPlaying(false);
              setDailyLimitExceeded(true);
            }
            if (hbRes.data?.remainingSecondsToday !== undefined) {
              setWatchTimeStats((prev) => ({
                ...prev,
                watchedSecondsToday: hbRes.data.watchedSecondsToday,
                remainingSecondsToday: hbRes.data.remainingSecondsToday,
                dailyLimitSeconds: hbRes.data.dailyLimitSeconds,
                isUnlimited: hbRes.data.isUnlimited || false,
              }));
            }
          })
          .catch(() => {});
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, duration, video._id, user, instanceId]);

  // 12. Video Event Listeners (timeupdate, progress, ended, waiting, playing)
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);

    // Free Preview cutoff check for premium / course content
    if (
      playbackInfo?.access?.previewOnly &&
      v.currentTime >= (playbackInfo?.access?.previewDuration || 60)
    ) {
      v.pause();
      setIsPlaying(false);
      setPreviewExpired(true);
    }

    // Buffering calculation
    if (v.buffered.length > 0 && v.duration > 0) {
      const bufferedEnd = v.buffered.end(v.buffered.length - 1);
      setBufferedPercent((bufferedEnd / v.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setIsBuffering(false);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setShowControls(true);

    // Save final completion progress
    if (duration > 0) {
      saveLocalProgress(video._id, duration, duration);
      if (user?._id) {
        axiosInstance
          .post(`/api/history/progress/${video._id}`, {
            userId: user._id,
            position: duration,
            duration: duration,
          })
          .catch(() => {});
      }
    }

    if (autoplayEnabled && nextVideo && onPlayNext) {
      setShowAutoplayOverlay(true);
    }
  };

  // 13. Screen Click & Double Click (10s seek forward/backward)
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore clicks on controls bar or menus
    if ((e.target as HTMLElement).closest(".player-controls-container")) return;

    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const isLeftSide = clickX < rect.width / 2;
    const timeSinceLastClick = now - lastClickTimeRef.current.time;

    if (timeSinceLastClick < 300) {
      // Double click registered
      if (isLeftSide) {
        seekRelative(-10);
        setDoubleClickSide("left");
      } else {
        seekRelative(10);
        setDoubleClickSide("right");
      }
      setTimeout(() => setDoubleClickSide(null), 500);
      lastClickTimeRef.current = { time: 0, x: 0 };
    } else {
      // Single click registered (delayed slightly to disambiguate from double click)
      lastClickTimeRef.current = { time: now, x: clickX };
      setTimeout(() => {
        if (Date.now() - lastClickTimeRef.current.time >= 280 && lastClickTimeRef.current.time !== 0) {
          togglePlay();
          lastClickTimeRef.current = { time: 0, x: 0 };
        }
      }, 290);
    }
  };

  // 14. Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never intercept when user is typing in input/textarea/editable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[role='dialog']")
      ) {
        return;
      }

      resetControlsTimer();

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          seekRelative(e.shiftKey ? -30 : -10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          seekRelative(e.shiftKey ? 30 : 10);
          break;
        case "arrowup":
          e.preventDefault();
          adjustVolume("up");
          break;
        case "arrowdown":
          e.preventDefault();
          adjustVolume("down");
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "t":
          e.preventDefault();
          onToggleTheater();
          break;
        case "i":
        case "p":
          e.preventDefault();
          togglePiP();
          break;
        case "c":
          e.preventDefault();
          handleToggleSubtitles();
          break;
        case "[":
          e.preventDefault();
          handleChangeSyncOffset(captionSyncOffset - 0.2);
          break;
        case "]":
          e.preventDefault();
          handleChangeSyncOffset(captionSyncOffset + 0.2);
          break;
        case "n":
          if (nextVideo && onPlayNext) {
            e.preventDefault();
            onPlayNext();
          }
          break;
        case "<":
        case ",":
          if (e.shiftKey) {
            e.preventDefault();
            const speeds = [0.5, 1, 1.25, 1.5, 2];
            const currentIndex = speeds.indexOf(playbackRate);
            if (currentIndex > 0) handleChangePlaybackRate(speeds[currentIndex - 1]);
          }
          break;
        case ">":
        case ".":
          if (e.shiftKey) {
            e.preventDefault();
            const speeds = [0.5, 1, 1.25, 1.5, 2];
            const currentIndex = speeds.indexOf(playbackRate);
            if (currentIndex < speeds.length - 1) handleChangePlaybackRate(speeds[currentIndex + 1]);
          }
          break;
        case "?":
          e.preventDefault();
          setIsShortcutsOpen((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    seekRelative,
    adjustVolume,
    toggleMute,
    toggleFullscreen,
    onToggleTheater,
    togglePiP,
    nextVideo,
    onPlayNext,
    playbackRate,
    handleChangePlaybackRate,
    resetControlsTimer,
  ]);

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }}
      onClick={handleScreenClick}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group select-none ${
        isFullscreen ? "rounded-none h-screen" : ""
      }`}
    >
      {/* Video Element without native browser controls */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        controls={false}
        playsInline
        onTimeUpdate={() => {
          handleTimeUpdate();
          enforcePlaybackRate();
        }}
        onPlay={enforcePlaybackRate}
        onSeeked={enforcePlaybackRate}
        onLoadedMetadata={() => {
          handleLoadedMetadata();
          setPlaybackError(null);
          enforcePlaybackRate();
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
          setPlaybackError(null);
          enforcePlaybackRate();
        }}
        onRateChange={enforcePlaybackRate}
        onPause={() => setIsPlaying(false)}
        onEnded={handleVideoEnded}
        onError={() => {
          setIsBuffering(false);
          setPlaybackError("Video could not be loaded. Please ensure the format is supported (e.g. HLS/MP4).");
        }}
      >
        Your browser does not support the video tag.
      </video>

      {/* Playback Error Overlay */}
      {playbackError && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
          <p className="text-sm md:text-base text-red-400 font-medium max-w-md">{playbackError}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPlaybackError(null);
              if (hlsRef.current) {
                hlsRef.current.startLoad();
              } else if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
            }}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition"
          >
            Retry Playback
          </button>
        </div>
      )}

      {/* Subtitles Overlay */}
      <SubtitleRenderer
        enabled={subtitlesEnabled}
        videoRef={videoRef}
        videoTitle={video?.videotitle}
        videoId={video?._id}
        syncOffset={captionSyncOffset}
      />

      {/* Double-click seek ripple */}
      <DoubleClickRipple side={doubleClickSide} />

      {/* Center Play/Pause ripple */}
      {centerRipple && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white animate-in zoom-in-50 fade-in duration-300 shadow-2xl">
            {centerRipple === "play" ? (
              <Play className="w-8 h-8 fill-current ml-1" />
            ) : (
              <Pause className="w-8 h-8 fill-current" />
            )}
          </div>
        </div>
      )}

      {/* Playback Speed HUD Notice */}
      {speedNotice && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/85 border border-zinc-700/80 backdrop-blur-md text-white font-semibold text-sm px-4 py-1.5 rounded-full shadow-2xl z-20 pointer-events-none animate-in fade-in zoom-in-90 duration-150 flex items-center gap-1.5">
          <span className="text-zinc-400 text-xs uppercase tracking-wide">Speed</span>
          <span className="text-red-500 font-bold">{speedNotice}</span>
        </div>
      )}

      {/* Volume Level HUD Notice */}
      {volumeNotice && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/85 border border-zinc-700/80 backdrop-blur-md text-white font-semibold text-sm px-4 py-1.5 rounded-full shadow-2xl z-20 pointer-events-none animate-in fade-in zoom-in-90 duration-150 flex items-center gap-2">
          <span className="text-zinc-400 text-xs uppercase tracking-wide">Volume</span>
          <span className="text-white font-bold">{volumeNotice}</span>
        </div>
      )}

      {/* Subtitles / CC HUD Notice */}
      {subtitleNotice && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/85 border border-zinc-700/80 backdrop-blur-md text-white font-semibold text-sm px-4 py-1.5 rounded-full shadow-2xl z-20 pointer-events-none animate-in fade-in zoom-in-90 duration-150 flex items-center gap-2">
          <span className="text-red-500 font-bold tracking-wider">CC</span>
          <span className="text-white font-semibold">{subtitleNotice}</span>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] pointer-events-none z-20">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        </div>
      )}

      {/* Resume from timestamp Banner */}
      {resumeNotice?.visible && (
        <div className="absolute top-4 left-4 z-30 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 text-white px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2.5 text-xs">
            <span>Resumed at {formatTime(resumeNotice.position)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSeek(0);
                setResumeNotice(null);
              }}
              className="text-red-400 hover:text-red-300 font-semibold underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Start from beginning
            </button>
          </div>
        </div>
      )}

      {/* Autoplay Countdown Overlay */}
      {showAutoplayOverlay && (
        <AutoplayOverlay
          nextVideo={nextVideo}
          onPlayNext={() => {
            setShowAutoplayOverlay(false);
            if (onPlayNext) onPlayNext();
          }}
          onCancel={() => setShowAutoplayOverlay(false)}
        />
      )}

      {/* Bottom Custom Player Controls Overlay */}
      <div
        className={`player-controls-container absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pt-6 pb-1 transition-opacity duration-300 z-30 ${
          showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Timeline Scrubber */}
        <TimelineScrubber
          currentTime={currentTime}
          duration={duration}
          buffered={bufferedPercent}
          onSeek={handleSeek}
          videoSrc={previewVideoSrc}
          thumbnailSrc={thumbnailSrc}
        />

        {/* Player Controls Bar */}
        <PlayerControls
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          currentTime={currentTime}
          duration={duration}
          onSeekRelative={seekRelative}
          onPlayNext={onPlayNext}
          hasNextVideo={!!nextVideo}
          playbackRate={playbackRate}
          onChangePlaybackRate={handleChangePlaybackRate}
          quality={quality}
          onChangeQuality={(newQ) => {
            setQuality(newQ);
            // Seamless HLS quality switching without reload or video interrupt
            if (hlsRef.current) {
              if (newQ.toLowerCase().includes("auto")) {
                hlsRef.current.currentLevel = -1; // Auto adaptive
              } else {
                const matchHeight = parseInt(newQ.replace(/[^0-9]/g, ""), 10);
                const levelIdx = hlsRef.current.levels.findIndex(
                  (lvl) =>
                    lvl.height === matchHeight ||
                    (lvl.attrs && lvl.attrs.NAME && lvl.attrs.NAME.toLowerCase().includes(newQ.toLowerCase().split(" ")[0]))
                );
                if (levelIdx !== -1) {
                  hlsRef.current.currentLevel = levelIdx;
                }
              }
            } else if (videoRef.current) {
              const prevTime = videoRef.current.currentTime;
              const wasPlaying = !videoRef.current.paused;
              videoRef.current.load();
              videoRef.current.currentTime = prevTime;
              if (wasPlaying) {
                videoRef.current.play().catch(() => {});
              }
            }
          }}
          qualities={qualities}
          onSelectLockedQuality={(item) => setQualityLockModal(item)}
          isTheater={isTheater}
          onToggleTheater={onToggleTheater}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isPiP={isPiP}
          onTogglePiP={togglePiP}
          subtitlesEnabled={subtitlesEnabled}
          onToggleSubtitles={handleToggleSubtitles}
          syncOffset={captionSyncOffset}
          onChangeSyncOffset={handleChangeSyncOffset}
          autoplayEnabled={autoplayEnabled}
          onToggleAutoplay={() => setAutoplayEnabled((prev) => !prev)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />
      </div>

      {/* 1. Free Preview Expired / Premium Content Lock Overlay */}
      {previewExpired && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-black mb-4 shadow-lg shadow-amber-500/20">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {playbackInfo?.access?.previewOnly
              ? "Free Preview Ended"
              : "Premium Subscriber Content"}
          </h3>
          <p className="text-zinc-300 text-sm max-w-md mb-6 leading-relaxed">
            {playbackInfo?.access?.message ||
              `This exclusive video requires an active ${
                playbackInfo?.access?.requiredPlan || "Bronze"
              } or higher subscription plan to continue watching.`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => router.push("/subscriptions")}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-semibold text-sm rounded-full shadow-lg transition flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade Subscription
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setPreviewExpired(false);
                handleSeek(0);
              }}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-full transition cursor-pointer"
            >
              Replay Preview
            </button>
          </div>
        </div>
      )}

      {/* 2. Daily Watch-Time Limit Reached Overlay */}
      {dailyLimitExceeded && (
        <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white mb-4 shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Daily Free Watch-Time Limit Reached
          </h3>
          <p className="text-zinc-300 text-sm max-w-md mb-6 leading-relaxed">
            You have used all {Math.round((watchTimeStats.dailyLimitSeconds || 3600) / 60)} minutes
            of free streaming for today. Upgrade to Bronze, Silver, or Gold to unlock unlimited watch time and ad-free playback.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => router.push("/subscriptions")}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold text-sm rounded-full shadow-lg transition flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Unlock Unlimited Watch-Time
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Quality Plan Lock Modal */}
      {qualityLockModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200 relative text-left">
            <button
              onClick={() => setQualityLockModal(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">
              Unlock {qualityLockModal.label}
            </h4>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Streaming in {qualityLockModal.label} is exclusive to{" "}
              <span className="text-amber-400 font-semibold">{qualityLockModal.requiredPlan}</span>{" "}
              subscribers and above. Free tier streaming is capped at 720p HD.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setQualityLockModal(null);
                  router.push("/subscriptions");
                }}
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-semibold text-xs rounded-lg shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Upgrade to {qualityLockModal.requiredPlan}
              </button>
              <button
                onClick={() => setQualityLockModal(null)}
                className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}