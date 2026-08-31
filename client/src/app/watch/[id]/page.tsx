"use client";

import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/VideoPlayer";
import { Video } from "@/components/VideoCard";
import axiosInstance from "@/lib/AxiosInstance";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";

const WatchPage = () => {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTheaterMode, setIsTheaterMode] = useState(false);

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

    // Calculate the next related video for autoplay and skip
    const nextVideo = useMemo(() => {
        if (!allVideos || allVideos.length === 0) return null;
        const otherVideos = allVideos.filter((v) => v._id !== id);
        if (otherVideos.length === 0) return null;

        const currentCats = (currentVideo?.category || "")
            .toLowerCase()
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);

        // Prioritize same category, then same channel
        const matchedCategory = otherVideos.find((v) => {
            const vCats = (v.category || "").toLowerCase().split(",").map((c) => c.trim());
            return currentCats.some((c) => vCats.includes(c));
        });
        if (matchedCategory) return matchedCategory;

        const matchedChannel = otherVideos.find(
            (v) => currentVideo?.videochanel && v.videochanel?.toLowerCase() === currentVideo.videochanel?.toLowerCase()
        );
        if (matchedChannel) return matchedChannel;

        return otherVideos[0];
    }, [allVideos, id, currentVideo]);

    const handlePlayNext = () => {
        if (nextVideo) {
            router.push(`/watch/${nextVideo._id}`);
        }
    };

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
        <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-200">
            <div className={`mx-auto p-4 md:p-6 transition-all duration-300 ${isTheaterMode ? "max-w-[1600px]" : "max-w-7xl"}`}>
                {isTheaterMode ? (
                    /* Theater Mode Layout: Full width player on top */
                    <div className="space-y-6">
                        <div className="w-full max-h-[80vh] flex items-center justify-center bg-black rounded-2xl overflow-hidden shadow-2xl">
                            <div className="w-full aspect-video max-h-[80vh]">
                                <Videopplayer
                                    video={currentVideo}
                                    nextVideo={nextVideo}
                                    onPlayNext={handlePlayNext}
                                    isTheater={isTheaterMode}
                                    onToggleTheater={() => setIsTheaterMode((prev) => !prev)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
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
                ) : (
                    /* Normal Layout: 2/3 column player with sidebar on right */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <Videopplayer
                                video={currentVideo}
                                nextVideo={nextVideo}
                                onPlayNext={handlePlayNext}
                                isTheater={isTheaterMode}
                                onToggleTheater={() => setIsTheaterMode((prev) => !prev)}
                            />
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
                )}
            </div>
        </div>
    );
};

export default WatchPage;