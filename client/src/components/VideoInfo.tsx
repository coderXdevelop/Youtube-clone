import React, { useEffect, useState, useRef } from "react";
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
  Copy,
  Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/AxiosInstance";
import { Video } from "./VideoCard";
import DownloadQuotaModal from "./DownloadQuotaModal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatSubscriberCount } from "@/lib/utils";
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
  const trackedHistoryRef = useRef<string | null>(null);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [subscribing, setSubscribing] = useState(false);

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

  // Fetch live channel subscription status & subscriber count
  useEffect(() => {
    let isMounted = true;
    const fetchSubscriptionStatus = async () => {
      const uploaderId = video?.uploader;
      if (!uploaderId) return;

      try {
        const query = user?._id ? `?userId=${user._id}` : "";
        const res = await axiosInstance.get(`/api/channel-subscription/status/${uploaderId}${query}`);
        if (isMounted && res.data?.success) {
          setIsSubscribed(Boolean(res.data.isSubscribed));
          if (typeof res.data.subscriberCount === "number") {
            setSubscriberCount(res.data.subscriberCount);
          }
        }
      } catch (err) {
        console.error("Error fetching channel subscription status:", err);
      }
    };

    fetchSubscriptionStatus();
    return () => {
      isMounted = false;
    };
  }, [video?.uploader, video?._id, user?._id]);

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
        const currentKey = `${user?._id || "guest"}_${video._id}`;
        const shouldTrackHistory = trackedHistoryRef.current !== currentKey;
        if (shouldTrackHistory) {
          trackedHistoryRef.current = currentKey;
        }

        if (user) {
          if (shouldTrackHistory) {
            await axiosInstance.post(`/api/history/${video._id}`, {
              userId: user?._id,
            });
          }

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
        } else if (shouldTrackHistory) {
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleSubscribe = async () => {
    if (!user?._id) {
      alert("Please sign in to subscribe to channels.");
      return;
    }

    const targetChannelId = video?.uploader;
    if (!targetChannelId) {
      alert("Channel details unavailable.");
      return;
    }

    if (user._id === targetChannelId) {
      return;
    }

    const prevSubscribed = isSubscribed;
    const prevCount = subscriberCount;

    const nextSubscribed = !prevSubscribed;
    const nextCount = nextSubscribed ? prevCount + 1 : Math.max(0, prevCount - 1);

    // Optimistic UI update
    setIsSubscribed(nextSubscribed);
    setSubscriberCount(nextCount);
    setSubscribing(true);

    try {
      const res = await axiosInstance.post(`/api/channel-subscription/toggle/${targetChannelId}`, {
        subscriberId: user._id,
      });

      if (res.data?.success) {
        setIsSubscribed(Boolean(res.data.isSubscribed));
        if (typeof res.data.subscriberCount === "number") {
          setSubscriberCount(res.data.subscriberCount);
        }
      }
    } catch (error) {
      console.error("Error subscribing to channel:", error);
      // Revert optimistic update on failure
      setIsSubscribed(prevSubscribed);
      setSubscriberCount(prevCount);
    } finally {
      setSubscribing(false);
    }
  };

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
          <Link
            href={video?.uploader ? `/channel/${video.uploader}` : "#"}
            className="shrink-0 transition-opacity hover:opacity-85"
          >
            <Avatar className="w-10 h-10 shrink-0">
              {channelImgUrl && (
                <AvatarImage src={channelImgUrl} alt={video.videochanel || "Channel avatar"} />
              )}
              <AvatarFallback className="font-semibold">{video.videochanel ? video.videochanel[0]?.toUpperCase() : "C"}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link
              href={video?.uploader ? `/channel/${video.uploader}` : "#"}
              className="hover:underline"
            >
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{video.videochanel}</h3>
            </Link>
            <p className="text-xs text-gray-500">{formatSubscriberCount(subscriberCount)}</p>
          </div>

          {!isOwner && (
            <Button
              size="sm"
              disabled={subscribing}
              onClick={handleSubscribe}
              variant={isSubscribed ? "outline" : "default"}
              className={`ml-2 rounded-full px-4 text-xs font-semibold transition-all ${
                isSubscribed
                  ? "bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-700"
                  : "bg-red-600 hover:bg-red-700 text-white shadow-xs"
              }`}
            >
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </Button>
          )}
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
            className="bg-gray-100 dark:bg-zinc-800 rounded-full h-8 sm:h-9 text-xs px-3 shrink-0 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-700 cursor-pointer"
            onClick={() => setShareDialogOpen(true)}
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

      {/* Share Video Modal Popup */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="w-full max-w-md sm:max-w-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-5 sm:p-6 overflow-hidden">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Share className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Share</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
              Share this video with friends, social networks, or copy the link below.
            </DialogDescription>
          </DialogHeader>

          {/* Social Quick Share Icons */}
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `${video.videotitle} - ${typeof window !== "undefined" ? window.location.href : ""}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group shrink-0"
            >
              <div className="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center justify-center border border-emerald-500/20">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.541 1.944.827 2.795.827h.001c3.182 0 5.768-2.586 5.768-5.766 0-3.18-2.586-5.714-5.769-5.714zm3.376 8.214c-.149.418-.756.777-1.047.827-.27.047-.618.068-1.782-.416-1.488-.62-2.443-2.128-2.518-2.228-.074-.1-6.04-8.038.599-8.914.07-.095.155-.145.24-.145.085 0 .17.002.245.006.182.008.283.02.409.32.158.377.54 1.317.587 1.413.048.096.08.209.016.335-.064.127-.096.206-.191.317-.095.112-.2.25-.286.336-.095.096-.195.2-.084.391.111.191.494.814 1.06 1.318.73.65 1.346.852 1.537.947.191.096.303.08.415-.048.112-.127.478-.557.606-.748.127-.191.255-.159.43-.095.176.064 1.114.525 1.305.621.191.095.318.143.366.223.048.079.048.461-.101.879z"/>
                </svg>
              </div>
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">WhatsApp</span>
            </a>

            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.href : ""
              )}&text=${encodeURIComponent(video.videotitle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group shrink-0"
            >
              <div className="w-11 h-11 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all flex items-center justify-center border border-sky-500/20">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">X / Twitter</span>
            </a>

            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.href : ""
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group shrink-0"
            >
              <div className="w-11 h-11 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center border border-blue-600/20">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.056-2.797 2.684v1.287h4.004l-.538 3.667h-3.466v7.98c5.44-.755 9.61-5.412 9.61-11.053 0-6.195-5.025-11.22-11.22-11.22C5.025.418 0 5.443 0 11.638c0 5.641 4.17 10.298 9.101 11.053z"/>
                </svg>
              </div>
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Facebook</span>
            </a>

            <a
              href={`mailto:?subject=${encodeURIComponent(video.videotitle)}&body=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.href : ""
              )}`}
              className="flex flex-col items-center gap-1.5 group shrink-0"
            >
              <div className="w-11 h-11 rounded-full bg-gray-500/10 text-gray-700 dark:text-gray-300 group-hover:bg-gray-600 group-hover:text-white transition-all flex items-center justify-center border border-gray-500/20">
                <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Email</span>
            </a>
          </div>

          <hr className="my-1 border-gray-200 dark:border-zinc-800" />

          {/* Copy Link Input Bar */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between gap-2 p-1.5 pl-3.5 bg-gray-100 dark:bg-zinc-800/90 border border-gray-300 dark:border-zinc-700 rounded-xl w-full min-w-0">
              <span className="text-xs text-gray-800 dark:text-gray-200 font-mono truncate select-all flex-1 min-w-0 pr-2">
                {typeof window !== "undefined" ? window.location.href : ""}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleCopyLink}
                className={`rounded-lg px-4 h-8 text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  copied
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>

            {copied && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 animate-in fade-in duration-150 pl-1">
                <Check className="w-3.5 h-3.5" />
                <span>Link copied to clipboard</span>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoInfo;