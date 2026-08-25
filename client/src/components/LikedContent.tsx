"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";

interface LikedItem {
    _id: string;
    createdAt: string;
    videoid: {
        _id: string;
        videotitle: string;
        videochanel: string;
        views: number;
        createdAt: string;
        filepath: string;
        thumbnailpath?: string;
    } | string;
}

export default function LikedContent() {
    const [likedVideos, setLikedVideos] = useState<LikedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useUser();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const loadLikedVideos = async () => {
            try {
                const likedData = await axiosInstance.get(`/api/like/${user._id}`);
                if (isMounted && Array.isArray(likedData.data)) {
                    setLikedVideos(likedData.data);
                }
            } catch (error) {
                console.error("Error loading liked videos:", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadLikedVideos();

        return () => {
            isMounted = false;
        };
    }, [user]);

    const handleUnlikeVideo = async (videoId: string, likeId: string) => {
        if (!user) return;
        try {
            await axiosInstance.post("/api/like", {
                videoid: videoId,
                viewer: user._id,
            });
            setLikedVideos((prev) => prev.filter((item) => item._id !== likeId));
        } catch (error) {
            console.error("Error unliking video:", error);
        }
    };

    if (!user) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">Please sign in to view your liked videos.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="text-sm text-gray-500 py-6">Loading liked videos...</div>;
    }

    if (likedVideos.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No liked videos yet.</p>
            </div>
        );
    }

    const firstVideo = likedVideos[0];
    const firstVideoId = typeof firstVideo?.videoid === "object" ? firstVideo.videoid._id : firstVideo?.videoid;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{likedVideos.length} videos</p>
                {firstVideoId && (
                    <Link href={`/watch/${firstVideoId}`}>
                        <Button size="sm" className="flex items-center gap-2 text-xs">
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Play all
                        </Button>
                    </Link>
                )}
            </div>

            <div className="space-y-4">
                {likedVideos.map((item) => {
                    const videoObj = typeof item.videoid === "object" ? item.videoid : null;
                    const videoId = videoObj?._id || (typeof item.videoid === "string" ? item.videoid : "");

                    if (!videoObj) return null;

                    const thumbUrl = videoObj.thumbnailpath
                        ? `${backendUrl}/${videoObj.thumbnailpath.replace(/^\/+/, "")}`
                        : "";
                    const videoSrc = `${backendUrl}/${videoObj.filepath || ""}#t=0.5`;

                    return (
                        <div key={item._id} className="flex gap-4 group items-start">
                            <Link href={`/watch/${videoId}`} className="shrink-0">
                                <div className="relative w-40 aspect-video bg-black/90 rounded-xl overflow-hidden shadow-sm">
                                    {thumbUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={thumbUrl}
                                            alt={videoObj.videotitle}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        />
                                    ) : (
                                        <video
                                            src={videoSrc}
                                            preload="metadata"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        />
                                    )}
                                </div>
                            </Link>

                            <div className="flex-1 min-w-0 space-y-1">
                                <Link href={`/watch/${videoId}`}>
                                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-gray-900 dark:text-gray-100">
                                        {videoObj.videotitle || "Untitled Video"}
                                    </h3>
                                </Link>
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                    {videoObj.videochanel || "Unknown Channel"}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {(videoObj.views || 0).toLocaleString()} views •{" "}
                                    {videoObj.createdAt ? formatDistanceToNow(new Date(videoObj.createdAt)) : ""} ago
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Liked {formatDistanceToNow(new Date(item.createdAt))} ago
                                </p>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer outline-none">
                                    <MoreVertical className="w-4 h-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                    <DropdownMenuItem
                                        onClick={() => handleUnlikeVideo(videoId, item._id)}
                                        className="flex items-center gap-2 text-red-600 dark:text-red-400 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                        Remove from liked videos
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}