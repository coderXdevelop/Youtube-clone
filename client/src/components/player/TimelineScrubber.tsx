"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { formatTime } from "@/lib/playerUtils";

interface TimelineScrubberProps {
  currentTime: number;
  duration: number;
  buffered: number; // percentage 0-100
  onSeek: (targetTime: number) => void;
  videoSrc?: string;
  thumbnailSrc?: string;
}

export default function TimelineScrubber({
  currentTime,
  duration,
  buffered,
  onSeek,
  videoSrc,
  thumbnailSrc,
}: TimelineScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0); // 0 to 1
  const [hoverTime, setHoverTime] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const hoverPercent = hoverPosition * 100;

  const targetTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  const calculatePosition = useCallback(
    (clientX: number) => {
      if (!containerRef.current || duration <= 0) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const pos = Math.max(0, Math.min(1, clickX / rect.width));
      return pos;
    },
    [duration]
  );

  // Throttled frame seek to prevent browser decoder stalling
  const requestFrameSeek = useCallback((time: number) => {
    targetTimeRef.current = time;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

    rafIdRef.current = requestAnimationFrame(() => {
      const v = previewVideoRef.current;
      if (!v || !isFinite(time) || isSeekingRef.current) return;

      if (v.readyState >= 1) {
        try {
          isSeekingRef.current = true;
          if ("fastSeek" in v && typeof (v as any).fastSeek === "function") {
            (v as any).fastSeek(time);
          } else {
            v.currentTime = time;
          }
        } catch {
          isSeekingRef.current = false;
        }
      }
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const pos = calculatePosition(e.clientX);
      setHoverPosition(pos);
      const time = pos * duration;
      setHoverTime(time);
      requestFrameSeek(time);
    },
    [calculatePosition, duration, requestFrameSeek]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const pos = calculatePosition(e.clientX);
    onSeek(pos * duration);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
      const pos = calculatePosition(e.clientX);
      onSeek(pos * duration);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, calculatePosition, onSeek, duration, handleMouseMove]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      className="relative w-full h-4 group flex items-center cursor-pointer touch-none select-none py-1"
    >
      {/* Persistent Offscreen Video Element to keep media engine initialized */}
      {videoSrc && (
        <video
          ref={previewVideoRef}
          src={videoSrc}
          preload="auto"
          muted
          playsInline
          crossOrigin="anonymous"
          onLoadedData={() => setIsVideoLoaded(true)}
          onCanPlay={() => setIsVideoLoaded(true)}
          onSeeked={() => {
            isSeekingRef.current = false;
            // Catch up if hover position moved during seek
            const v = previewVideoRef.current;
            if (v && Math.abs(v.currentTime - targetTimeRef.current) > 0.5) {
              requestFrameSeek(targetTimeRef.current);
            }
          }}
          onError={() => {
            isSeekingRef.current = false;
          }}
          className="sr-only pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Hover Preview Tooltip & Frame Thumbnail */}
      {(isHovering || isDragging) && duration > 0 && (
        <div
          className="absolute -top-32 -translate-x-1/2 pointer-events-none flex flex-col items-center z-30 transition-transform duration-75"
          style={{
            left: `clamp(75px, ${hoverPercent}%, calc(100% - 75px))`,
          }}
        >
          {/* Frame Preview Card */}
          <div className="w-36 h-20 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-700 shadow-2xl mb-1.5 flex items-center justify-center relative">
            {/* Thumbnail Backdrop Fallback */}
            {thumbnailSrc && (
              <img
                src={thumbnailSrc}
                alt="Video thumbnail preview"
                className="absolute inset-0 w-full h-full object-cover opacity-70"
              />
            )}

            {/* Live Video Frame Preview */}
            {videoSrc && isVideoLoaded ? (
              <video
                src={videoSrc}
                preload="auto"
                muted
                playsInline
                crossOrigin="anonymous"
                className="w-full h-full object-cover relative z-10"
                ref={(el) => {
                  if (el && previewVideoRef.current && isFinite(hoverTime)) {
                    el.currentTime = hoverTime;
                  }
                }}
              />
            ) : !thumbnailSrc ? (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-xs text-white/80">
                {formatTime(hoverTime)}
              </div>
            ) : null}

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-transparent z-20" />
          </div>

          {/* Timestamp Pill */}
          <div className="bg-black/90 text-white text-[11px] font-semibold font-mono px-2.5 py-0.5 rounded-full border border-zinc-700 shadow">
            {formatTime(hoverTime)}
          </div>
        </div>
      )}

      {/* Scrubber Background Bar */}
      <div className="w-full h-1 group-hover:h-2 bg-white/25 rounded-full overflow-hidden relative transition-all duration-150">
        {/* Buffering Range */}
        <div
          className="absolute inset-y-0 left-0 bg-white/40 rounded-full transition-all duration-200"
          style={{ width: `${buffered}%` }}
        />

        {/* Hover Highlight */}
        {(isHovering || isDragging) && (
          <div
            className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
            style={{ width: `${hoverPercent}%` }}
          />
        )}

        {/* Current Progress Fill */}
        <div
          className="absolute inset-y-0 left-0 bg-red-600 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Scrubber Playhead Thumb */}
      <div
        className={`absolute -translate-x-1/2 w-3.5 h-3.5 bg-red-600 rounded-full shadow-md transition-transform duration-100 ${
          isHovering || isDragging ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
        style={{ left: `${progressPercent}%` }}
      />
    </div>
  );
}
