"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  RotateCcw,
  RotateCw,
  SkipForward,
  Maximize,
  Minimize,
  Tv,
  PictureInPicture,
  Subtitles,
  Settings,
  Keyboard,
  Check,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTime, formatRemainingTime } from "@/lib/playerUtils";

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  volume: number; // 0 to 1
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  currentTime: number;
  duration: number;
  onSeekRelative: (delta: number) => void;
  onPlayNext?: () => void;
  hasNextVideo: boolean;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  quality: string;
  onChangeQuality: (q: string) => void;
  isTheater: boolean;
  onToggleTheater: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isPiP: boolean;
  onTogglePiP: () => void;
  subtitlesEnabled: boolean;
  onToggleSubtitles: () => void;
  autoplayEnabled: boolean;
  onToggleAutoplay: () => void;
  onOpenShortcuts: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];
const QUALITY_OPTIONS = ["Auto (1080p)", "720p", "480p", "360p"];

export default function PlayerControls({
  isPlaying,
  onTogglePlay,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  currentTime,
  duration,
  onSeekRelative,
  onPlayNext,
  hasNextVideo,
  playbackRate,
  onChangePlaybackRate,
  quality,
  onChangeQuality,
  isTheater,
  onToggleTheater,
  isFullscreen,
  onToggleFullscreen,
  isPiP,
  onTogglePiP,
  subtitlesEnabled,
  onToggleSubtitles,
  autoplayEnabled,
  onToggleAutoplay,
  onOpenShortcuts,
}: PlayerControlsProps) {
  const [showRemaining, setShowRemaining] = useState(false);
  const [isVolumeSliderHovered, setIsVolumeSliderHovered] = useState(false);

  const effectiveVolume = isMuted ? 0 : volume;

  const renderVolumeIcon = () => {
    if (isMuted || effectiveVolume === 0) {
      return <VolumeX className="w-5 h-5 text-zinc-100" />;
    }
    if (effectiveVolume < 0.5) {
      return <Volume1 className="w-5 h-5 text-zinc-100" />;
    }
    return <Volume2 className="w-5 h-5 text-zinc-100" />;
  };

  return (
    <div className="flex items-center justify-between text-white select-none pt-1 pb-2 px-3">
      {/* Left controls: Play, Next, Rewind, FastForward, Volume, Time */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-white focus:outline-none"
          title={isPlaying ? "Pause (k / Space)" : "Play (k / Space)"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current" />
          )}
        </button>

        {/* Seek Backward 10s */}
        <button
          onClick={() => onSeekRelative(-10)}
          className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-zinc-200 hover:text-white focus:outline-none"
          title="Seek backward 10s (← / j)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Seek Forward 10s */}
        <button
          onClick={() => onSeekRelative(10)}
          className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-zinc-200 hover:text-white focus:outline-none"
          title="Seek forward 10s (→ / l)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Next Video Button */}
        {hasNextVideo && onPlayNext && (
          <button
            onClick={onPlayNext}
            className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-zinc-200 hover:text-white focus:outline-none"
            title="Next video (n / Shift+n)"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        )}

        {/* Volume Controls */}
        <div
          className="flex items-center group relative"
          onMouseEnter={() => setIsVolumeSliderHovered(true)}
          onMouseLeave={() => setIsVolumeSliderHovered(false)}
        >
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer focus:outline-none"
            title={isMuted ? "Unmute (m)" : "Mute (m)"}
          >
            {renderVolumeIcon()}
          </button>

          {/* Draggable Volume Slider */}
          <div
            className={`flex items-center transition-all duration-200 overflow-hidden ${
              isVolumeSliderHovered ? "w-20 md:w-24 opacity-100 ml-1.5" : "w-0 opacity-0"
            }`}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={effectiveVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white hover:accent-red-600 focus:outline-none"
              title={`Volume: ${Math.round(effectiveVolume * 100)}%`}
            />
          </div>
        </div>

        {/* Playback Time Display */}
        <div
          onClick={() => setShowRemaining((prev) => !prev)}
          className="text-xs font-mono font-medium text-zinc-200 cursor-pointer hover:text-white transition pl-1 select-none"
          title="Click to toggle remaining time"
        >
          <span>{formatTime(currentTime)}</span>
          <span className="text-zinc-400 mx-1">/</span>
          <span className="text-zinc-300">
            {showRemaining ? formatRemainingTime(currentTime, duration) : formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right controls: Autoplay, Subtitles, Settings, PiP, Theater, Fullscreen */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Autoplay Toggle */}
        <button
          onClick={onToggleAutoplay}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/20 transition text-xs font-medium cursor-pointer"
          title={`Autoplay is ${autoplayEnabled ? "ON" : "OFF"}`}
        >
          <span className="text-[11px] text-zinc-300">Autoplay</span>
          {autoplayEnabled ? (
            <ToggleRight className="w-5 h-5 text-red-500" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-zinc-400" />
          )}
        </button>

        {/* Subtitles / CC Toggle */}
        <button
          onClick={onToggleSubtitles}
          className={`p-1.5 rounded-full transition cursor-pointer focus:outline-none relative ${
            subtitlesEnabled
              ? "text-red-500 hover:bg-white/20"
              : "text-zinc-200 hover:text-white hover:bg-white/20"
          }`}
          title="Subtitles / Closed Captions (c)"
        >
          <Subtitles className="w-4 h-4" />
          {subtitlesEnabled && (
            <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </button>

        {/* Settings Menu Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-zinc-200 hover:text-white focus:outline-none">
            <Settings className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 bg-zinc-900/95 border-zinc-800 text-zinc-200 shadow-xl backdrop-blur-md"
          >
            {/* Playback Speed Section */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Playback Speed
              </DropdownMenuLabel>
              {SPEED_OPTIONS.map((rate) => (
                <DropdownMenuItem
                  key={rate}
                  onClick={() => onChangePlaybackRate(rate)}
                  onSelect={() => onChangePlaybackRate(rate)}
                  className="flex items-center justify-between text-xs cursor-pointer hover:bg-zinc-800"
                >
                  <span className={playbackRate === rate ? "font-bold text-white" : ""}>
                    {rate === 1 ? "Normal (1×)" : `${rate}×`}
                  </span>
                  {playbackRate === rate && <Check className="w-3.5 h-3.5 text-red-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-zinc-800" />

            {/* Quality Section */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Quality
              </DropdownMenuLabel>
              {QUALITY_OPTIONS.map((q) => (
                <DropdownMenuItem
                  key={q}
                  onClick={() => onChangeQuality(q)}
                  className="flex items-center justify-between text-xs cursor-pointer hover:bg-zinc-800"
                >
                  <span>{q}</span>
                  {quality === q && <Check className="w-3.5 h-3.5 text-red-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-zinc-800" />

            {/* Keyboard Shortcuts Trigger */}
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={onOpenShortcuts}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-zinc-800 text-zinc-300"
              >
                <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
                <span>Keyboard Shortcuts (?)</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Picture-in-Picture (PiP) */}
        <button
          onClick={onTogglePiP}
          className={`p-1.5 rounded-full transition cursor-pointer focus:outline-none ${
            isPiP
              ? "text-red-500 hover:bg-white/20"
              : "text-zinc-200 hover:text-white hover:bg-white/20"
          }`}
          title="Picture-in-Picture (i / p)"
        >
          <PictureInPicture className="w-4 h-4" />
        </button>

        {/* Theater Mode */}
        <button
          onClick={onToggleTheater}
          className={`p-1.5 rounded-full transition cursor-pointer focus:outline-none hidden sm:block ${
            isTheater
              ? "text-red-500 hover:bg-white/20"
              : "text-zinc-200 hover:text-white hover:bg-white/20"
          }`}
          title="Theater Mode (t)"
        >
          <Tv className="w-4 h-4" />
        </button>

        {/* Fullscreen Mode */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer text-zinc-200 hover:text-white focus:outline-none"
          title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
