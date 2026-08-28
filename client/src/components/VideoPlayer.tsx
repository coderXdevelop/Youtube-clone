"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, RotateCcw, Play, Pause } from "lucide-react";
import TimelineScrubber from "./player/TimelineScrubber";
import PlayerControls from "./player/PlayerControls";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const [quality, setQuality] = useState("Auto (1080p)");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(false);

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

  const lastClickTimeRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  const videoSrc = getMediaUrl(video?.filepath);

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

  // Synchronize playbackRate whenever video element or src changes
  useEffect(() => {
    enforcePlaybackRate();
  }, [playbackRate, videoSrc, enforcePlaybackRate]);

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

  // 11. Periodic Watch Progress Heartbeat (every 5 seconds during playback)
  useEffect(() => {
    if (!isPlaying || duration <= 0) return;

    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;

      const pos = v.currentTime;
      const dur = v.duration || duration;

      saveLocalProgress(video._id, pos, dur);

      if (user?._id) {
        axiosInstance
          .post(`/api/history/progress/${video._id}`, {
            userId: user._id,
            position: pos,
            duration: dur,
          })
          .catch(() => {});
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, duration, video._id, user]);

  // 12. Video Event Listeners (timeupdate, progress, ended, waiting, playing)
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);

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
          setSubtitlesEnabled((prev) => !prev);
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
      onClick={handleScreenClick}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group select-none ${
        isFullscreen ? "rounded-none h-screen" : ""
      }`}
    >
      {/* Video Element without native browser controls */}
      <video
        ref={videoRef}
        src={videoSrc}
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
          setPlaybackError("Video could not be loaded. Please ensure the format is supported (e.g. H.264/MP4).");
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
              if (videoRef.current) {
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
          videoSrc={videoSrc}
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
          onChangeQuality={setQuality}
          isTheater={isTheater}
          onToggleTheater={onToggleTheater}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isPiP={isPiP}
          onTogglePiP={togglePiP}
          subtitlesEnabled={subtitlesEnabled}
          onToggleSubtitles={() => setSubtitlesEnabled((prev) => !prev)}
          autoplayEnabled={autoplayEnabled}
          onToggleAutoplay={() => setAutoplayEnabled((prev) => !prev)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />
      </div>

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}