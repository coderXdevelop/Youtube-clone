import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { formatSubscriberCount } from "@/lib/utils";
import axiosInstance from "@/lib/AxiosInstance";

interface Channel {
    _id?: string;
    channelname?: string;
    description?: string;
    name?: string;
    email?: string;
    image?: string;
    subscribersCount?: number;
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
}

const ChannelHeader = ({ channel, user }: ChannelHeaderProps) => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriberCount, setSubscriberCount] = useState<number>(0);
    const [subscribing, setSubscribing] = useState(false);

    const channelId = channel?._id;
    const isOwner = Boolean(user && channelId && user._id === channelId);

    const displayName = channel?.channelname || channel?.name || (isOwner ? user?.name : "") || "Channel";
    const avatarSrc = channel?.image || (isOwner ? user?.image : "") || "";
    const handleName = (channel?.channelname || channel?.name || user?.name || "channel")
        .toLowerCase()
        .replace(/\s+/g, "");
    const initial = (displayName?.[0] || "C").toUpperCase();

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

        // Optimistic UI update
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
            // Revert state on error
            setIsSubscribed(prevSubscribed);
            setSubscriberCount(prevCount);
        } finally {
            setSubscribing(false);
        }
    };

    return (
        <div className="w-full">
            {/* Banner */}
            <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 overflow-hidden shadow-inner"></div>

            {/* Channel Info */}
            <div className="px-4 md:px-8 py-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <Avatar className="w-20 h-20 md:w-32 md:h-32 border-4 border-white dark:border-zinc-900 shadow-lg shrink-0">
                        <AvatarImage src={avatarSrc} alt={displayName} />
                        <AvatarFallback className="text-2xl md:text-4xl font-bold bg-gradient-to-tr from-purple-600 to-indigo-600 text-white">
                            {initial}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
                            {displayName}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">@{handleName}</span>
                            <span>•</span>
                            <span className="font-medium text-gray-600 dark:text-gray-400">
                                {formatSubscriberCount(subscriberCount)}
                            </span>
                        </div>
                        {channel?.description && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 max-w-2xl whitespace-pre-wrap">
                                {channel.description}
                            </p>
                        )}
                    </div>

                    {!isOwner && channelId && (
                        <div className="flex gap-2 shrink-0">
                            <Button
                                disabled={subscribing}
                                onClick={handleToggleSubscribe}
                                variant={isSubscribed ? "outline" : "default"}
                                className={
                                    isSubscribed
                                        ? "bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-zinc-700"
                                        : "bg-red-600 hover:bg-red-700 text-white font-medium shadow-xs"
                                }
                            >
                                {isSubscribed ? "Subscribed" : "Subscribe"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChannelHeader;