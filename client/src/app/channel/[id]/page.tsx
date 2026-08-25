"use client";

import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { Video } from "@/components/VideoCard";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/AxiosInstance";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

interface ChannelProfile {
    _id?: string;
    name?: string;
    channelname?: string;
    description?: string;
    image?: string;
    email?: string;
}

const ChannelPage = () => {
    const params = useParams();
    const id = params?.id as string;
    const { user } = useUser();

    const [fetchedChannel, setFetchedChannel] = useState<ChannelProfile | null>(null);
    const [channelVideos, setChannelVideos] = useState<Video[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(true);
    const [refreshIndex, setRefreshIndex] = useState(0);

    const isChannelOwner = Boolean(user && user._id === id);
    const channel = isChannelOwner ? user : (fetchedChannel || { _id: id, channelname: "Channel", name: "Channel" });

    // Fetch channel details if viewing another user's channel
    useEffect(() => {
        let ignore = false;
        if (id && (!user || user._id !== id)) {
            axiosInstance
                .get(`/api/user/profile/${id}`)
                .then((res) => {
                    if (!ignore && res.data) {
                        setFetchedChannel(res.data);
                    }
                })
                .catch(() => {
                    if (!ignore) {
                        setFetchedChannel({ _id: id, channelname: "Channel", name: "Channel" });
                    }
                });
        }
        return () => {
            ignore = true;
        };
    }, [id, user]);

    // Fetch only this channel's videos
    useEffect(() => {
        let ignore = false;
        if (id) {
            axiosInstance
                .get("/api/video/getall")
                .then((res) => {
                    if (!ignore && Array.isArray(res.data)) {
                        const channelName = channel?.channelname || user?.channelname || "";
                        const userName = channel?.name || user?.name || "";

                        const filtered = res.data.filter((v: Video) => {
                            const matchUploader = v.uploader === id;
                            const matchChannelName =
                                channelName &&
                                v.videochanel &&
                                v.videochanel.toLowerCase() === channelName.toLowerCase();
                            const matchName =
                                userName &&
                                v.videochanel &&
                                v.videochanel.toLowerCase() === userName.toLowerCase();

                            return matchUploader || matchChannelName || matchName;
                        });
                        setChannelVideos(filtered);
                    }
                })
                .catch((err) => {
                    console.error("Error fetching channel videos:", err);
                })
                .finally(() => {
                    if (!ignore) setLoadingVideos(false);
                });
        }
        return () => {
            ignore = true;
        };
    }, [id, channel?.channelname, channel?.name, user?.channelname, user?.name, refreshIndex]);

    const handleUploadSuccess = () => {
        setRefreshIndex((prev) => prev + 1);
    };

    return (
        <div className="flex-1 min-h-screen bg-white dark:bg-zinc-950">
            <div className="max-w-7xl mx-auto">
                <ChannelHeader channel={channel} user={user} />
                <Channeltabs userId={id} />

                {isChannelOwner && (
                    <div className="px-4 md:px-8 pb-8">
                        <VideoUploader
                            channelId={id}
                            channelName={channel?.channelname || user?.channelname || user?.name || "My Channel"}
                            onUploadSuccess={handleUploadSuccess}
                        />
                    </div>
                )}

                <div className="px-4 md:px-8 pb-12">
                    {loadingVideos ? (
                        <div className="py-12 text-center text-sm text-gray-500">
                            Loading channel videos...
                        </div>
                    ) : (
                        <ChannelVideos videos={channelVideos} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChannelPage;