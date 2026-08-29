import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { getMediaUrl } from "@/lib/playerUtils";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/AxiosInstance";
import { Video } from "./VideoCard";
import DownloadQuotaModal from "./DownloadQuotaModal";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

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

  const initialImg = video?.channelimage || video?.uploaderimage || video?.userimage || "";
  const [channelImg, setChannelImg] = useState<string>(initialImg);

  useEffect(() => {
    const currentImg = video?.channelimage || video?.uploaderimage || video?.userimage;
    if (currentImg) {
      setChannelImg(currentImg);
      return;
    }
    if (video.uploader) {
      axiosInstance.get(`/api/user/getuserprofile/${video.uploader}`)
        .then(res => {
          if (res.data?.image) {
            setChannelImg(res.data.image);
          }
        })
        .catch(() => {});
    }
  }, [video]);

  const channelImgUrl = channelImg ? getMediaUrl(channelImg) : "";

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

  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = Boolean(
    user &&
      (video.uploader === user._id ||
        (user.channelname &&
          video.videochanel?.toLowerCase() === user.channelname?.toLowerCase()) ||
        (user.name &&
          video.videochanel?.toLowerCase() === user.name?.toLowerCase()))
  );

  const handleDeleteVideo = async () => {
    if (!user) return;
    try {
      setIsDeleting(true);
      await axiosInstance.delete(`/api/video/${video._id}?userId=${user._id}`, {
        data: { userId: user._id },
      });
      router.push(user.channelname ? `/channel/${user._id}` : "/");
    } catch (error) {
      console.error("Failed to delete video:", error);
      alert("Failed to delete video. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{video.videotitle}</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 shrink-0">
          <Avatar className="w-10 h-10 shrink-0">
            {channelImgUrl && (
              <AvatarImage src={channelImgUrl} alt={video.videochanel || "Channel avatar"} />
            )}
            <AvatarFallback className="font-semibold">{video.videochanel ? video.videochanel[0]?.toUpperCase() : "C"}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{video.videochanel}</h3>
            <p className="text-xs text-gray-500">1.2M subscribers</p>
          </div>
          <Button size="sm" className="ml-2 rounded-full px-4 text-xs font-semibold">Subscribe</Button>
        </div>

        {/* Action Buttons with smooth touch scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 max-w-full">
          <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-full shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full h-8 sm:h-9 text-xs px-3"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-4 h-4 mr-1.5 ${isLiked ? "fill-black text-black dark:fill-white dark:text-white" : ""
                  }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-5 bg-gray-300 dark:bg-zinc-700" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full h-8 sm:h-9 text-xs px-3"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-4 h-4 mr-1.5 ${isDisliked ? "fill-black text-black dark:fill-white dark:text-white" : ""
                  }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 dark:bg-zinc-800 rounded-full h-8 sm:h-9 text-xs px-3 shrink-0 ${isWatchLater ? "text-primary font-semibold" : ""
              }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-4 h-4 mr-1.5" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 dark:bg-zinc-800 rounded-full h-8 sm:h-9 text-xs px-3 shrink-0"
          >
            <Share className="w-4 h-4 mr-1.5" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 dark:bg-zinc-800 rounded-full h-8 sm:h-9 text-xs px-3 shrink-0 text-gray-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className={`w-4 h-4 mr-1.5 ${downloading ? "animate-bounce text-indigo-600" : ""}`} />
            {downloading ? "Downloading..." : "Download"}
          </Button>

          {isOwner && (
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white rounded-full h-8 sm:h-9 text-xs px-3 flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Video</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 dark:bg-zinc-800 rounded-full h-8 w-8 sm:h-9 sm:w-9 shrink-0"
          >
            <MoreHorizontal className="w-4 h-4" />
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
      <div className="bg-gray-100 dark:bg-zinc-900 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm text-gray-800 dark:text-gray-200 ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            {video.videodescription || video.description || "No description provided for this video."}
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

      {/* Owner Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
          <DialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Delete Video Permanently?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete &quot;{video.videotitle}&quot;? This will delete the video file and its history from the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteVideo}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Video
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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