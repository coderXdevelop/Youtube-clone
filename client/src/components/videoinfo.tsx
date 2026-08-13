// src/components/VideoInfo.tsx
"use client";

import React from "react";
import Image from "next/image";

interface VideoInfoProps {
  title: string;
  channelName: string;
  channelAvatar?: string;
  views: number;
  uploadedAt: string;   // e.g. "2 days ago"
  description?: string;
}

const VideoInfo: React.FC<VideoInfoProps> = ({
  title,
  channelName,
  channelAvatar,
  views,
  uploadedAt,
  description,
}) => {
  return (
    <div className="mt-4 px-2">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center mt-2">
        {channelAvatar && (
          <Image
            src={channelAvatar}
            alt={channelName}
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
        <div className="ml-2">
          <p className="font-medium">{channelName}</p>
          <p className="text-sm text-gray-500">
            {views.toLocaleString()} views • {uploadedAt}
          </p>
        </div>
      </div>
      {description && (
        <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">
          {description}
        </p>
      )}
    </div>
  );
};

export default VideoInfo;
