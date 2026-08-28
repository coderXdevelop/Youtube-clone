"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";

import { getMediaUrl } from "@/lib/playerUtils";

export interface Video {
  _id: string;
  videotitle: string;
  filepath: string;
  videochanel: string;
  views: number;
  createdAt: string;
  uploader?: string;
  description?: string;
  videodescription?: string;
  category?: string;
  thumbnailpath?: string;
  Like?: number;
  Dislike?: number;
}

export interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  const thumbUrl = getMediaUrl(video?.thumbnailpath);
  const videoSrc = `${getMediaUrl(video?.filepath)}#t=0.5`;

  return (
    <Link href={`/watch/${video?._id}`} className="group block">
      <div className="space-y-3">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black/90 shadow-sm">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={video?.videotitle || "Video thumbnail"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <video
              src={videoSrc}
              preload="metadata"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          )}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
            Video
          </div>
        </div>

        <div className="flex gap-3">
          <Avatar className="w-9 h-9 shrink-0 ring-1 ring-black/5">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
              {video?.videochanel ? video.videochanel[0]?.toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug">
              {video?.videotitle}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium truncate">{video?.videochanel}</p>
            <p className="text-xs text-gray-500">
              {(video?.views ?? 0).toLocaleString()} views •{" "}
              {video?.createdAt ? formatDistanceToNow(new Date(video.createdAt)) : ""} ago
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
