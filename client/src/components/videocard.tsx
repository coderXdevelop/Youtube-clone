'use client'
import React from "react";
import Link from "next/link";

type VideoCardProps = {
  id: string;       // unique video id
  title: string;
  channel: string;
  views: string;
  timeAgo: string;
};

const VideoCard = ({ id, title, channel, views, timeAgo }: VideoCardProps) => {
  return (
    <Link href={`/watch/${id}`} className="block">
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md cursor-pointer">
        {/* Fake thumbnail */}
        <div className="w-full h-40 bg-gray-300 rounded-t-lg flex items-center justify-center text-gray-700 text-sm">
          Thumbnail for {title}
        </div>

        {/* Info */}
        <div className="p-3 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-xs text-white">
            {channel[0]}
          </div>
          <div>
            <h3 className="text-sm font-semibold line-clamp-2">{title}</h3>
            <p className="text-xs text-gray-600">{channel}</p>
            <p className="text-xs text-gray-600">
              {views} • {timeAgo}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;
