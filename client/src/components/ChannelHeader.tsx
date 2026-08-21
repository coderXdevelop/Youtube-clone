"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";

interface ChannelHeaderProps {
    channel: {
        _id: string;
        channelname: string;
        description?: string;
    };
    user?: {
        _id: string;
        name: string;
    };
}

const ChannelHeader: React.FC<ChannelHeaderProps> = ({ channel, user }) => {
    const [isSubscribed, setIsSubscribed] = useState(false);

    const handleSubscribe = () => {
        // For now, just toggle state. Later, call backend API here.
        setIsSubscribed(!isSubscribed);
    };

    return (
        <div className="w-full">
            {/* Banner */}
            <div className="relative h-32 md:h-48 lg:h-64 bg-gradient-to-r from-blue-400 to-purple-500 overflow-hidden"></div>

            {/* Channel Info */}
            <div className="px-4 py-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <Avatar className="w-20 h-20 md:w-32 md:h-32">
                        <AvatarFallback className="text-2xl">
                            {channel?.channelname?.[0]}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                        <h1 className="text-2xl md:text-4xl font-bold">
                            {channel?.channelname}
                        </h1>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span>@{channel?.channelname.toLowerCase().replace(/\s+/g, "")}</span>
                        </div>
                        {channel?.description && (
                            <p className="text-sm text-gray-700 max-w-2xl">
                                {channel.description}
                            </p>
                        )}
                    </div>

                    {user && user._id !== channel._id && (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSubscribe}
                                variant={isSubscribed ? "outline" : "default"}
                                className={
                                    isSubscribed ? "bg-gray-100" : "bg-red-600 hover:bg-red-700"
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
