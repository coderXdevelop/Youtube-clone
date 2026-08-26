import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/AxiosInstance";
import { Video } from "./VideoCard";
import DownloadQuotaModal from "./DownloadQuotaModal";

interface VideoInfoProps {
  video: Video;
}

const VideoInfo = ({ video }: VideoInfoProps) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaData, setQuotaData] = useState<{
    plan: string;
    limit: number;
    usedToday: number;
    nextResetTime?: string;
  } | null>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  const [prevVideoId, setPrevVideoId] = useState(video._id);

  if (video._id !== prevVideoId) {
    setPrevVideoId(video._id);
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }

  useEffect(() => {
    let isMounted = true;
    const handleviewsAndStatus = async () => {
      try {
        if (user) {
          await axiosInstance.post(`/api/history/${video._id}`, {
            userId: user?._id,
          });

          // Check if video is already liked by current user
          const likedRes = await axiosInstance.get(`/api/like/${user._id}`);
          if (isMounted && Array.isArray(likedRes.data)) {
            const isAlreadyLiked = likedRes.data.some(
              (item: { videoid?: { _id: string } | string }) =>
                (typeof item.videoid === "object" && item.videoid?._id === video._id) ||
                item.videoid === video._id
            );
            setIsLiked(isAlreadyLiked);
          }

          // Check if video is already in watch later list for current user
          const watchRes = await axiosInstance.get(`/api/watch/${user._id}`);
          if (isMounted && Array.isArray(watchRes.data)) {
            const isAlreadyWatchLater = watchRes.data.some(
              (item: { videoid?: { _id: string } | string }) =>
                (typeof item.videoid === "object" && item.videoid?._id === video._id) ||
                item.videoid === video._id
            );
            setIsWatchLater(isAlreadyWatchLater);
          }
        } else {
          await axiosInstance.post(`/api/history/views/${video?._id}`);
        }
      } catch (error) {
        console.log(error);
      }
    };
    handleviewsAndStatus();
    return () => {
      isMounted = false;
    };
  }, [user, video._id]);

  const handleLike = async () => {
    if (!user) return;

    const prevIsLiked = isLiked;
    const prevLikes = likes;

    const nextIsLiked = !prevIsLiked;
    const nextLikes = nextIsLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1);

    // ⚡ Optimistic UI update: change state immediately for zero lag
    setIsLiked(nextIsLiked);
    setlikes(nextLikes);

    if (isDisliked) {
      setIsDisliked(false);
      setDislikes((prev) => Math.max(0, prev - 1));
    }

    try {
      const res = await axiosInstance.post(`/api/like/${video._id}`, {
        userId: user?._id,
      });

      if (typeof res.data.liked === "boolean") {
        setIsLiked(res.data.liked);
      }
    } catch (error) {
      console.error("Error updating like status:", error);
      // Rollback state if server request fails
      setIsLiked(prevIsLiked);
      setlikes(prevLikes);
    }
  };

  const handleWatchLater = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/api/watch/${video._id}`, {
        userId: user?._id,
      });
      if (typeof res.data.watchlater === "boolean") {
        setIsWatchLater(res.data.watchlater);
      }
    } catch (error) {
      console.error("Error updating watch later status:", error);
    }
  };

  const handleDislike = () => {
    if (!user) return;
    if (isDisliked) {
      setIsDisliked(false);
      setDislikes((prev) => Math.max(0, prev - 1));
    } else {
      setIsDisliked(true);
      setDislikes((prev) => prev + 1);
      if (isLiked) {
        handleLike();
      }
    }
  };
  const handleDownload = async () => {
    if (!user?._id) {
      alert("Please sign in to download videos.");
      return;
    }

    setDownloading(true);
    setDownloadFeedback(null);

    try {
      // 1. Authorize download request
      const res = await axiosInstance.post("/api/download/request", {
        userId: user._id,
        videoId: video._id,
      });

      if (res.data?.success) {
        setDownloadFeedback(res.data.message || "Download started!");
        // 2. Trigger browser download
        const downloadUrl = `${backendUrl}/api/download/file/${video._id}?userId=${user._id}`;
        window.location.href = downloadUrl;
      }
    } catch (err: unknown) {
      const errorResponse = err && typeof err === "object" && "response" in err
        ? (err as { response?: { status?: number; data?: { message?: string; plan?: string; limit?: number } } }).response
        : null;

      if (errorResponse?.status === 429) {
        // Daily limit reached: Fetch latest quota and display upgrade modal
        try {
          const qRes = await axiosInstance.get(`/api/download/quota/${user._id}?videoId=${video._id}`);
          if (qRes.data) {
            setQuotaData(qRes.data);
          }
        } catch {
          // fallback quota
        }
        setQuotaModalOpen(true);
      } else {
        setDownloadFeedback(errorResponse?.data?.message || "Failed to download video.");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${isLiked ? "fill-black text-black" : ""
                  }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${isDisliked ? "fill-black text-black" : ""
                  }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full ${isWatchLater ? "text-primary" : ""
              }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full text-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className={`w-5 h-5 mr-2 ${downloading ? "animate-bounce text-indigo-600" : ""}`} />
            {downloading ? "Downloading..." : "Download"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {downloadFeedback && (
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs rounded-xl border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
          <span>{downloadFeedback}</span>
          <button
            onClick={() => setDownloadFeedback(null)}
            className="text-xs hover:underline font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>

      {/* Quota Exceeded Modal */}
      {quotaData && (
        <DownloadQuotaModal
          isOpen={quotaModalOpen}
          onClose={() => setQuotaModalOpen(false)}
          plan={quotaData.plan}
          limit={quotaData.limit}
          usedToday={quotaData.usedToday}
          nextResetTime={quotaData.nextResetTime}
        />
      )}
    </div>
  );
};

export default VideoInfo;