"use client";

import React, { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NextVideoInfo {
  _id: string;
  videotitle: string;
  videochanel: string;
  thumbnailpath?: string;
  filepath: string;
}

interface AutoplayOverlayProps {
  nextVideo: NextVideoInfo | null;
  onPlayNext: () => void;
  onCancel: () => void;
}

export default function AutoplayOverlay({
  nextVideo,
  onPlayNext,
  onCancel,
}: AutoplayOverlayProps) {
  const [countdown, setCountdown] = useState(5);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";

  useEffect(() => {
    if (!nextVideo) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onPlayNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [nextVideo, onPlayNext]);

  if (!nextVideo) return null;

  const thumbUrl = nextVideo.thumbnailpath
    ? `${backendUrl}/${nextVideo.thumbnailpath.replace(/^\/+/, "")}`
    : "";

  const progressPercentage = ((5 - countdown) / 5) * 100;

  return (
    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center flex flex-col items-center gap-4">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
          Up next in {countdown}s
        </p>

        {/* Next Video Card Preview */}
        <div className="relative w-48 aspect-video bg-black rounded-xl overflow-hidden shadow-md border border-zinc-700">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={nextVideo.videotitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-xs text-zinc-400">
              Next Video
            </div>
          )}

          {/* Circular Countdown Gauge */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-zinc-700"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-red-600 transition-all duration-1000 ease-linear"
                  strokeDasharray={`${progressPercentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-white font-bold text-sm">{countdown}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1 max-w-xs">
          <h4 className="text-white font-semibold text-sm line-clamp-1">
            {nextVideo.videotitle}
          </h4>
          <p className="text-zinc-400 text-xs">{nextVideo.videochanel}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          <Button
            onClick={onPlayNext}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Play Now
          </Button>
        </div>
      </div>
    </div>
  );
}
