// src/components/VideoPlayer.tsx
"use client";

import React from "react";

interface VideoPlayerProps {
  src: string;          // video file URL or stream
  poster?: string;      // thumbnail image
  autoPlay?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, autoPlay }) => {
  return (
    <div className="w-full bg-black flex justify-center items-center">
      <video
        className="w-full max-h-[70vh]"
        src={src}
        poster={poster}
        controls
        autoPlay={autoPlay}
      />
    </div>
  );
};

export default VideoPlayer;
