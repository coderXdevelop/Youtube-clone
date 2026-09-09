"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import axiosInstance from "@/lib/AxiosInstance";

export interface CaptionCue {
  start: number;
  end: number;
  text: string;
}

export interface CaptionTrack {
  _id?: string;
  language: string;
  label: string;
  vttpath?: string;
  cues?: CaptionCue[];
  status?: string;
}

interface SubtitleRendererProps {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoTitle?: string;
  videoId?: string;
  selectedLanguage?: string;
  onAvailableTracksChange?: (tracks: CaptionTrack[]) => void;
  /** Optional sync offset in seconds (e.g. +0.25 leads by 250ms, -0.25 delays by 250ms) */
  syncOffset?: number;
}

// Exact real-time sync with user-adjustable sync offset support
const DEFAULT_SYNC_OFFSET = 0.0;

export default function SubtitleRenderer({
  enabled,
  videoRef,
  videoTitle,
  videoId,
  selectedLanguage = "en",
  onAvailableTracksChange,
  syncOffset = DEFAULT_SYNC_OFFSET,
}: SubtitleRendererProps) {
  const [currentCaption, setCurrentCaption] = useState<string>("");
  const [cues, setCues] = useState<CaptionCue[]>([]);
  const [tracks, setTracks] = useState<CaptionTrack[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [trackStatus, setTrackStatus] = useState<string>("none");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const fetchCaptions = useCallback(
    async (targetVideoId: string) => {
      if (!targetVideoId) return;

      try {
        const res = await axiosInstance.get(`/api/video/captions/${targetVideoId}`);
        const fetchedTracks: CaptionTrack[] = res.data?.captions || [];
        setTracks(fetchedTracks);

        if (onAvailableTracksChange) {
          onAvailableTracksChange(fetchedTracks);
        }

        const activeTrack =
          fetchedTracks.find(
            (t) => t.language === selectedLanguage && t.status === "completed"
          ) || fetchedTracks.find((t) => t.status === "completed");

        if (activeTrack && Array.isArray(activeTrack.cues) && activeTrack.cues.length > 0) {
          const sorted = [...activeTrack.cues].sort((a, b) => a.start - b.start);
          setCues(sorted);
          setTrackStatus("completed");
          setIsLoading(false);
          return true;
        } else {
          const pendingOrProcessing = fetchedTracks.some(
            (t) => t.status === "pending" || t.status === "processing"
          );
          if (pendingOrProcessing) {
            setTrackStatus("processing");
          } else {
            setTrackStatus("not_found");
          }
          return false;
        }
      } catch (err: any) {
        console.warn("[SubtitleRenderer] Failed to load captions:", err?.message || err);
        setTrackStatus("error");
        return false;
      }
    },
    [selectedLanguage, onAvailableTracksChange]
  );

  useEffect(() => {
    if (!videoId) return;

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 15;

    setIsLoading(true);

    const startPolling = async () => {
      const isDone = await fetchCaptions(videoId);
      if (!isMounted) return;

      if (!isDone && pollCount < maxPolls) {
        pollTimerRef.current = setTimeout(() => {
          pollCount++;
          startPolling();
        }, 3000);
      } else {
        setIsLoading(false);
      }
    };

    startPolling();

    return () => {
      isMounted = false;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [videoId, fetchCaptions]);

  // Frame-accurate synchronization loop
  useEffect(() => {
    if (!enabled) {
      setCurrentCaption("");
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const updateCaption = () => {
      const currentTime = video.currentTime;

      // 1. Check native HTML5 textTracks if active
      const nativeTracks = video.textTracks;
      if (nativeTracks && nativeTracks.length > 0) {
        for (let i = 0; i < nativeTracks.length; i++) {
          const track = nativeTracks[i];
          if (track.mode === "showing" || track.mode === "hidden") {
            const activeCues = track.activeCues;
            if (activeCues && activeCues.length > 0) {
              const cue = activeCues[0] as VTTCue;
              if (cue?.text) {
                setCurrentCaption(cue.text);
                return;
              }
            }
          }
        }
      }

      // 2. High-precision synchronized cue search
      if (cues && cues.length > 0) {
        const effectiveTime = currentTime + (syncOffset || 0);
        const matchingCue = cues.find(
          (c) => effectiveTime >= c.start && effectiveTime <= c.end
        );

        if (matchingCue && matchingCue.text) {
          setCurrentCaption(matchingCue.text);
          return;
        } else {
          setCurrentCaption("");
          return;
        }
      }

      // 3. Fallback indicators when captions are enabled
      if (trackStatus === "processing" || isLoading) {
        setCurrentCaption("[Captions auto-generating...]");
      } else {
        setCurrentCaption("");
      }
    };

    // Continuous 60fps frame loop when playing for instantaneous zero-delay caption updates
    const syncLoop = () => {
      updateCaption();
      if (video && !video.paused && !video.ended) {
        animFrameRef.current = requestAnimationFrame(syncLoop);
      }
    };

    const handlePlay = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(syncLoop);
    };

    const handlePauseOrSeek = () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      updateCaption();
    };

    // Event listeners
    video.addEventListener("play", handlePlay);
    video.addEventListener("playing", handlePlay);
    video.addEventListener("pause", handlePauseOrSeek);
    video.addEventListener("seeking", handlePauseOrSeek);
    video.addEventListener("seeked", handlePauseOrSeek);
    video.addEventListener("timeupdate", updateCaption);

    // Initial trigger
    if (!video.paused) {
      handlePlay();
    } else {
      updateCaption();
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("playing", handlePlay);
      video.removeEventListener("pause", handlePauseOrSeek);
      video.removeEventListener("seeking", handlePauseOrSeek);
      video.removeEventListener("seeked", handlePauseOrSeek);
      video.removeEventListener("timeupdate", updateCaption);
    };
  }, [enabled, videoRef, cues, trackStatus, isLoading, syncOffset]);

  if (!enabled || !currentCaption) return null;

  return (
    <div className="absolute bottom-20 md:bottom-24 left-0 right-0 flex justify-center items-center pointer-events-none z-30 px-6 transition-all duration-75">
      <div className="bg-black/90 text-white font-medium text-sm sm:text-base md:text-lg px-4 py-1.5 rounded-lg shadow-2xl backdrop-blur-md border border-white/10 text-center max-w-2xl leading-relaxed select-none tracking-wide animate-in fade-in duration-75">
        {currentCaption}
      </div>
    </div>
  );
}
