"use client";

import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/VideoPlayer";
import { Video } from "@/components/VideoCard";
import axiosInstance from "@/lib/AxiosInstance";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const WatchPage = () => {
    const params = useParams();
    const id = params?.id as string;
    const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;
        if (!id || typeof id !== "string") return;

        axiosInstance
            .get("/api/video/getall")
            .then((res) => {
                if (!ignore && Array.isArray(res.data)) {
                    const matchingVideos = res.data.filter((vid: Video) => vid._id === id);
                    setCurrentVideo(matchingVideos.length > 0 ? matchingVideos[0] : null);
                    setAllVideos(res.data);
                }
            })
            .catch((error) => {
                console.error("Error fetching watch video:", error);
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-sm text-gray-500">
                Loading video...
            </div>
        );
    }

    if (!currentVideo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-sm text-gray-600">
                Video not found
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            <div className="max-w-7xl mx-auto p-4 md:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <Videopplayer video={currentVideo} />
                        <VideoInfo video={currentVideo} />
                        <Comments
                            videoId={id}
                            videoOwnerId={currentVideo?.uploader}
                            videoChannelName={currentVideo?.videochanel}
                        />
                    </div>
                    <div className="space-y-4">
                        <RelatedVideos
                            videos={allVideos}
                            currentVideoId={id}
                            currentCategory={currentVideo.category}
                            currentChannel={currentVideo.videochanel}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WatchPage;