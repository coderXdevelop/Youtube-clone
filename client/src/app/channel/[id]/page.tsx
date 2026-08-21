"use client";

import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { Video } from "@/components/VideoCard";
import { notFound, useParams } from "next/navigation";
import React from "react";

const ChannelPage: React.FC = () => {
    const params = useParams();
    const id = (params?.id as string) || "";

    const user = {
        _id: "user_23",
        name: "John Doe",
    };

    const channel = {
        _id: id || "channel_1",
        channelname: "John's Channel",
        description: "Welcome to my channel! I upload nature and cooking videos.",
    };

    if (!channel) {
        return notFound();
    }

    const videos: Video[] = [
        {
            _id: "1",
            videotitle: "Amazing Nature Documentary",
            filepath: "/videos/nature-doc.mp4",
            videochanel: channel.channelname,
            views: 45000,
            createdAt: "2026-08-18T10:00:00.000Z",
        },
        {
            _id: "2",
            videotitle: "Cooking Tutorial: Perfect Pasta",
            filepath: "/videos/pasta-tutorial.mp4",
            videochanel: channel.channelname,
            views: 23000,
            createdAt: "2026-08-17T10:00:00.000Z",
        },
    ];

    return (
        <div className="flex-1 min-h-screen bg-white">
            <div className="max-w-full mx-auto">
                <ChannelHeader channel={channel} user={user} />
                <Channeltabs userId={id} />

                <div className="px-4 pb-8">
                    <VideoUploader channelId={id} channelName={channel.channelname} />
                </div>

                <div className="px-4 pb-8">
                    <ChannelVideos videos={videos} />
                </div>
            </div>
        </div>
    );
};

export default ChannelPage;
