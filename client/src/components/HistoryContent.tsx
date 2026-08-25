"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

interface HistoryItem {
  _id: string;
  createdAt: string;
  videoid: {
    _id: string;
    videotitle: string;
    videochanel: string;
    views: number;
    createdAt: string;
    filepath: string;
    thumbnailpath?: string;
  };
}

export default function HistoryContent() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadHistory = async () => {
      try {
        const historyData = await axiosInstance.get(`/api/history/${user._id}`);
        if (isMounted && Array.isArray(historyData.data)) {
          setHistory(historyData.data);
        }
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      await axiosInstance.delete(`/api/history/${historyId}`);
      setHistory((prev) => prev.filter((item) => item._id !== historyId));
    } catch (error) {
      console.error("Error removing from history:", error);
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;
    try {
      await axiosInstance.delete(`/api/history/clear/${user._id}`);
      setHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Please sign in to view your watch history.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-500 py-6">Loading history...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No watch history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{history.length} videos</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearHistory}
          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          Clear all history
        </Button>
      </div>

      <div className="space-y-4">
        {history.map((item) => {
          const videoObj = item.videoid;
          if (!videoObj) return null;

          const thumbUrl = videoObj.thumbnailpath
            ? `${backendUrl}/${videoObj.thumbnailpath.replace(/^\/+/, "")}`
            : "";
          const videoSrc = `${backendUrl}/${videoObj.filepath || ""}#t=0.5`;

          return (
            <div key={item._id} className="flex gap-4 group items-start">
              <Link href={`/watch/${videoObj._id}`} className="shrink-0">
                <div className="relative w-40 aspect-video bg-black/90 rounded-xl overflow-hidden shadow-sm">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={videoObj.videotitle}
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
              </Link>

              <div className="flex-1 min-w-0 space-y-1">
                <Link href={`/watch/${videoObj._id}`}>
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-gray-900 dark:text-gray-100">
                    {videoObj.videotitle}
                  </h3>
                </Link>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {videoObj.videochanel}
                </p>
                <p className="text-xs text-gray-500">
                  {(videoObj.views || 0).toLocaleString()} views •{" "}
                  {videoObj.createdAt ? formatDistanceToNow(new Date(videoObj.createdAt)) : ""} ago
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Watched {formatDistanceToNow(new Date(item.createdAt))} ago
                </p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer outline-none">
                  <MoreVertical className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs">
                  <DropdownMenuItem
                    onClick={() => handleRemoveFromHistory(item._id)}
                    className="flex items-center gap-2 text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Remove from watch history
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </div>
  );
}