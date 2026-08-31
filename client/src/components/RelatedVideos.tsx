"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getMediaUrl } from "@/lib/playerUtils";
import { Video } from "./VideoCard";

interface RelatedVideosProps {
  videos: Video[];
  currentVideoId?: string;
  currentCategory?: string;
  currentChannel?: string;
}

export default function RelatedVideos({
  videos,
  currentVideoId,
  currentCategory,
  currentChannel,
}: RelatedVideosProps) {

  // Filter out current video
  const otherVideos = (videos || []).filter((v) => v._id !== currentVideoId);

  // Sort related videos: prioritize same category or same channel first
  const sortedVideos = [...otherVideos].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    const currentCats = (currentCategory || "")
      .toLowerCase()
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const catsA = (a.category || "").toLowerCase().split(",").map((c) => c.trim());
    const catsB = (b.category || "").toLowerCase().split(",").map((c) => c.trim());

    if (currentCats.some((c) => catsA.includes(c))) {
      scoreA += 2;
    }
    if (currentCats.some((c) => catsB.includes(c))) {
      scoreB += 2;
    }
    if (currentChannel && a.videochanel && a.videochanel.toLowerCase() === currentChannel.toLowerCase()) {
      scoreA += 1;
    }
    if (currentChannel && b.videochanel && b.videochanel.toLowerCase() === currentChannel.toLowerCase()) {
      scoreB += 1;
    }

    return scoreB - scoreA;
  });

  if (sortedVideos.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-gray-500">
        <p>No related videos found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 select-none">
      <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 hidden lg:block">
        Related Videos
      </h3>
      {sortedVideos.map((video) => {
        const thumbUrl = getMediaUrl(video.thumbnailpath);
        const videoSrc = `${getMediaUrl(video.filepath)}#t=0.5`;

        return (
          <Link
            key={video._id}
            href={`/watch/${video._id}`}
            className="flex gap-3 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800/60 transition group"
          >
            {/* Thumbnail */}
            <div className="relative w-40 aspect-video bg-black/90 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
              {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbUrl}
                  alt={video.videotitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <video
                  src={videoSrc}
                  preload="metadata"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-start py-0.5 space-y-1">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {video.videotitle}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {video.videochanel}
              </p>
              <p className="text-xs text-gray-500">
                {(video.views || 0).toLocaleString()} views •{" "}
                {video.createdAt ? formatDistanceToNow(new Date(video.createdAt)) : ""} ago
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
