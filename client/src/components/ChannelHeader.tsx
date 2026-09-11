import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { formatSubscriberCount } from "@/lib/utils";
import axiosInstance from "@/lib/AxiosInstance";
import {
    Edit3,
    Trash2,
    Upload,
    CheckCircle2,
    Calendar,
    Eye,
    Film,
    Bell,
    Share2,
    Check,
} from "lucide-react";
import Channeldialogue from "./ChannelDialog";
import DeleteChannelModal from "./DeleteChannelModal";

interface Channel {
    _id?: string;
    channelname?: string;
    description?: string;
    discription?: string;
    name?: string;
    email?: string;
    image?: string;
    subscribersCount?: number;
    joinedon?: string | Date;
}

interface User {
    _id?: string;
    channelname?: string;
    name?: string;
    email?: string;
    image?: string;
}

interface ChannelHeaderProps {
    channel?: Channel | null;
    user?: User | null;
    videoCount?: number;
    totalViews?: number;
    onOpenUpload?: () => void;
}

const ChannelHeader = ({
    channel,
    user,
    videoCount = 0,
    totalViews = 0,
    onOpenUpload,
}: ChannelHeaderProps) => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriberCount, setSubscriberCount] = useState<number>(0);
    const [subscribing, setSubscribing] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const channelId = channel?._id;
    const isOwner = Boolean(user && channelId && user._id === channelId);

    const displayName = channel?.channelname || channel?.name || (isOwner ? user?.name : "") || "Creator Channel";
    const avatarSrc = channel?.image || (isOwner ? user?.image : "") || "";
    const handleName = (channel?.channelname || channel?.name || user?.name || "creator")
        .toLowerCase()
        .replace(/\s+/g, "");
    const initial = (displayName?.[0] || "C").toUpperCase();
    const descriptionText = channel?.description || channel?.discription || "";

    const joinedDateStr = channel?.joinedon
        ? new Date(channel.joinedon).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
          })
        : "Recent";

    // Fetch live channel subscription status & subscriber count
    useEffect(() => {
        let isMounted = true;
        if (!channelId) return;

        const fetchStatus = async () => {
            try {
                const query = user?._id ? `?userId=${user._id}` : "";
                const res = await axiosInstance.get(`/api/channel-subscription/status/${channelId}${query}`);
                if (isMounted && res.data?.success) {
                    setIsSubscribed(Boolean(res.data.isSubscribed));
                    if (typeof res.data.subscriberCount === "number") {
                        setSubscriberCount(res.data.subscriberCount);
                    }
                }
            } catch (err) {
                console.error("Error fetching channel header subscription status:", err);
            }
        };

        fetchStatus();
        return () => {
            isMounted = false;
        };
    }, [channelId, user?._id]);

    const handleToggleSubscribe = async () => {
        if (!user?._id) {
            alert("Please sign in to subscribe to channels.");
            return;
        }

        if (!channelId || user._id === channelId) return;

        const prevSubscribed = isSubscribed;
        const prevCount = subscriberCount;

        const nextSubscribed = !prevSubscribed;
        const nextCount = nextSubscribed ? prevCount + 1 : Math.max(0, prevCount - 1);

        setIsSubscribed(nextSubscribed);
        setSubscriberCount(nextCount);
        setSubscribing(true);

        try {
            const res = await axiosInstance.post(`/api/channel-subscription/toggle/${channelId}`, {
                subscriberId: user._id,
            });

            if (res.data?.success) {
                setIsSubscribed(Boolean(res.data.isSubscribed));
                if (typeof res.data.subscriberCount === "number") {
                    setSubscriberCount(res.data.subscriberCount);
                }
            }
        } catch (error) {
            console.error("Error subscribing from channel header:", error);
            setIsSubscribed(prevSubscribed);
            setSubscriberCount(prevCount);
        } finally {
            setSubscribing(false);
        }
    };

    const handleShare = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="w-full">
            {/* Rich Hero Banner with Gradient & Modern Grid Mesh Pattern */}
            <div className="relative h-36 sm:h-48 md:h-64 lg:h-72 w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-rose-500 overflow-hidden shadow-sm">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10"></div>
                
                {/* Channel banner tag */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                        onClick={handleShare}
                        className="px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-white/20 shadow-md"
                        title="Share channel link"
                    >
                        {isCopied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Share</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Channel Info & Identity */}
            <div className="px-4 sm:px-6 md:px-8 py-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Avatar */}
                    <div className="-mt-14 sm:-mt-20 md:-mt-24 relative">
                        <Avatar className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 border-4 border-white dark:border-zinc-950 shadow-xl rounded-full ring-2 ring-black/5 dark:ring-white/10 shrink-0 bg-white dark:bg-zinc-900">
                            <AvatarImage src={avatarSrc} alt={displayName} className="object-cover" />
                            <AvatarFallback className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
                                {initial}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 min-w-0 space-y-3">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">
                                    {displayName}
                                </h1>
                                <span title="Verified Creator" className="inline-flex">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 fill-indigo-100 dark:fill-indigo-950" />
                                </span>
                            </div>

                            {/* Handle & Quick Metadata */}
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span className="font-semibold text-gray-800 dark:text-gray-200">@{handleName}</span>
                                <span>•</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {formatSubscriberCount(subscriberCount)}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                    <Film className="w-3.5 h-3.5" />
                                    {videoCount} {videoCount === 1 ? "video" : "videos"}
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        {descriptionText && (
                            <div className="max-w-3xl">
                                <p
                                    className={`text-sm text-gray-600 dark:text-gray-300 leading-relaxed ${
                                        !isDescriptionExpanded ? "line-clamp-2" : ""
                                    }`}
                                >
                                    {descriptionText}
                                </p>
                                {descriptionText.length > 120 && (
                                    <button
                                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-1 cursor-pointer"
                                    >
                                        {isDescriptionExpanded ? "Show less" : "more..."}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Channel Statistics Bar */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800/80 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-zinc-700/60">
                                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{totalViews.toLocaleString()} total views</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800/80 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-zinc-700/60">
                                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                                <span>Joined {joinedDateStr}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex flex-wrap md:flex-col lg:flex-row gap-2.5 items-center shrink-0 w-full md:w-auto pt-2 md:pt-0">
                        {isOwner ? (
                            <>
                                {onOpenUpload && (
                                    <Button
                                        onClick={onOpenUpload}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 rounded-xl shadow-sm px-4 py-2 text-xs sm:text-sm cursor-pointer transition-all"
                                    >
                                        <Upload className="w-4 h-4" />
                                        <span>Upload Video</span>
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditDialogOpen(true)}
                                    className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/90 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-700 font-medium rounded-xl px-4 py-2 text-xs sm:text-sm cursor-pointer shadow-xs"
                                >
                                    <Edit3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                    <span>Customize</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 font-medium rounded-xl px-4 py-2 text-xs sm:text-sm cursor-pointer transition-colors"
                                    title="Permanently Delete Channel"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete</span>
                                </Button>
                            </>
                        ) : (
                            channelId && (
                                <Button
                                    disabled={subscribing}
                                    onClick={handleToggleSubscribe}
                                    className={`rounded-full px-5 py-2 font-semibold text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
                                        isSubscribed
                                            ? "bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-zinc-700"
                                            : "bg-red-600 hover:bg-red-700 text-white"
                                    }`}
                                >
                                    {isSubscribed ? (
                                        <>
                                            <Bell className="w-4 h-4 text-gray-600 dark:text-gray-300 fill-current" />
                                            <span>Subscribed</span>
                                        </>
                                    ) : (
                                        <span>Subscribe</span>
                                    )}
                                </Button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Owner Dialogs */}
            {isOwner && (
                <>
                    <Channeldialogue
                        isopen={isEditDialogOpen}
                        onclose={() => setIsEditDialogOpen(false)}
                        mode="edit"
                        channeldata={{
                            name: channel?.channelname || user?.channelname || user?.name || "",
                            description: channel?.description || channel?.discription || "",
                        }}
                    />

                    <DeleteChannelModal
                        isOpen={isDeleteDialogOpen}
                        onClose={() => setIsDeleteDialogOpen(false)}
                        channelId={channelId || user?._id || ""}
                        channelName={channel?.channelname || user?.channelname || user?.name || "My Channel"}
                        userEmail={user?.email}
                    />
                </>
            )}
        </div>
    );
};

export default ChannelHeader;