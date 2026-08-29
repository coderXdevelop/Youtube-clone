"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useEffect, useState } from "react";
import axiosInstance from "@/lib/AxiosInstance";
import { Video } from "./VideoCard";
import { getMediaUrl } from "@/lib/playerUtils";

interface SearchResultProps {
  query: string;
}

const SearchResult = ({ query }: SearchResultProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const trimmedQuery = query.trim().toLowerCase();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";

  useEffect(() => {
    let ignore = false;
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/api/video/getall");
        if (!ignore && Array.isArray(res.data)) {
          setVideos(res.data);
        }
      } catch (error) {
        console.error("Error fetching search videos:", error);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchVideos();
    return () => {
      ignore = true;
    };
  }, []);

  if (!trimmedQuery) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto py-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-80 aspect-video bg-gray-200 dark:bg-zinc-800 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 py-2">
              <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const matchingVideos = videos.filter((vid) => {
    const title = (vid.videotitle || "").toLowerCase();
    const channel = (vid.videochanel || "").toLowerCase();
    const category = (vid.category || "").toLowerCase();
    const desc = (vid.videodescription || vid.description || "").toLowerCase();

    return (
      title.includes(trimmedQuery) ||
      channel.includes(trimmedQuery) ||
      category.includes(trimmedQuery) ||
      desc.includes(trimmedQuery)
    );
  });

  if (matchingVideos.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          No results found
        </h2>
        <p className="text-sm text-gray-500">
          Try different keywords or check spelling
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Video Results */}
      <div className="space-y-4">
        {matchingVideos.map((item: Video) => {
          const thumbUrl = getMediaUrl(item.thumbnailpath);
          const videoSrc = `${getMediaUrl(item.filepath)}#t=0.5`;

            const channelImg = item?.channelimage || item?.uploaderimage || item?.userimage || "";
            const channelImgUrl = channelImg ? getMediaUrl(channelImg) : "";

            return (
              <div key={item._id} className="flex flex-col sm:flex-row gap-4 group">
                <Link href={`/watch/${item._id}`} className="shrink-0">
                  <div className="relative w-full sm:w-80 aspect-video bg-black/90 rounded-xl overflow-hidden shadow-sm">
                    {thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl}
                        alt={item.videotitle}
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
                </Link>

                <div className="flex-1 min-w-0 py-1 space-y-1.5">
                  <Link href={`/watch/${item._id}`}>
                    <h3 className="font-semibold text-base sm:text-lg line-clamp-2 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {item.videotitle}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{(item.views || 0).toLocaleString()} views</span>
                    <span>•</span>
                    <span>
                      {item.createdAt ? formatDistanceToNow(new Date(item.createdAt)) : ""} ago
                    </span>
                  </div>

                  <Link
                    href={item.uploader ? `/channel/${item.uploader}` : "#"}
                    className="flex items-center gap-2 py-0.5 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <Avatar className="w-6 h-6 shrink-0">
                      {channelImgUrl && (
                        <AvatarImage src={channelImgUrl} alt={item.videochanel || "Channel"} />
                      )}
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                        {item.videochanel ? item.videochanel[0]?.toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {item.videochanel}
                    </span>
                  </Link>

                {(item.videodescription || item.description) && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {item.videodescription || item.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Results Count Footer */}
      <div className="text-center py-6 border-t border-gray-100 dark:border-zinc-800">
        <p className="text-xs text-gray-500">
          Showing {matchingVideos.length} {matchingVideos.length === 1 ? "result" : "results"} for &quot;{query}&quot;
        </p>
      </div>
    </div>
  );
};

export default SearchResult;