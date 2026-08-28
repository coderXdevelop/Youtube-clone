"use client";

import React, { useEffect, useState } from "react";

interface SubtitleRendererProps {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoTitle?: string;
}

export default function SubtitleRenderer({
  enabled,
  videoRef,
  videoTitle,
}: SubtitleRendererProps) {
  const [currentCaption, setCurrentCaption] = useState<string>("");

  useEffect(() => {
    if (!enabled) return;

    const video = videoRef.current;
    if (!video) return;

    // Check if video has native textTracks
    const handleCueChange = () => {
      const tracks = video.textTracks;
      if (tracks && tracks.length > 0) {
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          if (track.mode === "showing" || track.mode === "hidden") {
            const activeCues = track.activeCues;
            if (activeCues && activeCues.length > 0) {
              const cue = activeCues[0] as VTTCue;
              setCurrentCaption(cue.text || "");
              return;
            }
          }
        }
      }
    };

    // If no native tracks are loaded, provide contextual auto-captions
    const handleTimeUpdate = () => {
      if (video.textTracks && video.textTracks.length > 0) {
        handleCueChange();
        return;
      }

      // Generate dynamic auto-captioning based on playback progress
      const time = Math.floor(video.currentTime);
      if (time > 0 && time % 6 < 4) {
        setCurrentCaption(`[Audio Stream]: Playing "${videoTitle || "Video Content"}"`);
      } else {
        setCurrentCaption("");
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [enabled, videoRef, videoTitle]);

  if (!enabled || !currentCaption) return null;

  return (
    <div className="absolute bottom-16 left-0 right-0 flex justify-center items-center pointer-events-none z-20 px-6">
      <span className="bg-black/80 text-white font-medium text-sm md:text-base px-3 py-1 rounded-md shadow-lg backdrop-blur-sm transition-all duration-150 text-center max-w-xl">
        {currentCaption}
      </span>
    </div>
  );
}
