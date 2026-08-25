import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

interface Channel {
    _id?: string;
    channelname?: string;
    description?: string;
    name?: string;
    email?: string;
    image?: string;
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

    const displayName = channel?.channelname || channel?.name || (channel?._id === user?._id ? user?.name : "") || "Channel";
    const avatarSrc = channel?.image || (channel?._id === user?._id ? user?.image : "") || "";
    const handleName = (channel?.channelname || channel?.name || user?.name || "channel")
        .toLowerCase()
        .replace(/\s+/g, "");
    const initial = (displayName?.[0] || "C").toUpperCase();

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
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">@{handleName}</span>
                        </div>
                        {channel?.description && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 max-w-2xl whitespace-pre-wrap">
                                {channel.description}
                            </p>
                        )}
                    </div>

                    {user && user?._id !== channel?._id && (
                        <div className="flex gap-2 shrink-0">
                            <Button
                                onClick={() => setIsSubscribed(!isSubscribed)}
                                variant={isSubscribed ? "outline" : "default"}
                                className={
                                    isSubscribed ? "bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200" : "bg-red-600 hover:bg-red-700 text-white font-medium"
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