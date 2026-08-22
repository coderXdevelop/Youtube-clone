"use client";

import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import { useParams } from "next/navigation";
import React from "react";

const MOCK_VIDEOS = [
    {
        _id: "1",
        videotitle: "Amazing Nature Documentary",
        filename: "nature-doc.mp4",
        filetype: "video/mp4",
        filepath: "/videos/nature-doc.mp4",
        filesize: "500MB",
        videochanel: "Nature Channel",
        Like: 1250,
        views: 45000,
        uploader: "nature_lover",
        createdAt: "2026-08-22T00:00:00.000Z",
    },
    {
        _id: "2",
        videotitle: "Cooking Tutorial: Perfect Pasta",
        filename: "pasta-tutorial.mp4",
        filetype: "video/mp4",
        filepath: "/videos/pasta-tutorial.mp4",
        filesize: "300MB",
        videochanel: "Chef's Kitchen",
        Like: 890,
        views: 23000,
        uploader: "chef_master",
        createdAt: "2026-08-21T00:00:00.000Z",
    },
];

const ChannelPage = () => {
    const params = useParams();
    const id = params?.id as string;
    const { user } = useUser();
    // const user: any = {
    //   id: "1",
    //   name: "John Doe",
    //   email: "john@example.com",
    //   image: "https://github.com/shadcn.png?height=32&width=32",
    // };
    const channel = user;

    return (
        <div className="flex-1 min-h-screen bg-white">
            <div className="max-w-full mx-auto">
                <ChannelHeader channel={channel} user={user} />
                <Channeltabs userId={id} />
                <div className="px-4 pb-8">
                    <VideoUploader channelId={id} channelName={channel?.channelname} />
                </div>
                <div className="px-4 pb-8">
                    <ChannelVideos videos={MOCK_VIDEOS} />
                </div>
            </div>
        </div>
    );
};

export default ChannelPage;