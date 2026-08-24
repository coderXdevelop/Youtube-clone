"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, ThumbsUp, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/AxiosInstance";

interface LikedVideoItem {
    _id: string;
    createdAt: string;
    videoid: {
        _id: string;
        videotitle: string;
        videochanel: string;
        views: number;
        createdAt: string;
        filepath: string;
    };
}

export default function LikedVideosContent() {
    const [likedVideos, setLikedVideos] = useState<LikedVideoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useUser();

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const loadLikedVideos = async () => {
            try {
                const likedData = await axiosInstance.get(`/api/like/${user._id}`);
                if (isMounted) {
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

    const handleUnlikeVideo = async (videoId: string, likedVideoId: string) => {
        if (!user || !videoId) return;

        // ⚡ Optimistic UI update: remove item immediately for zero lag
        setLikedVideos((prev) => prev.filter((item) => item._id !== likedVideoId));

        try {
            await axiosInstance.post(`/api/like/${videoId}`, {
                userId: user._id,
            });
        } catch (error) {
            console.error("Error unliking video:", error);
            // Rollback / refetch if network request fails
            try {
                const likedData = await axiosInstance.get(`/api/like/${user._id}`);
                setLikedVideos(likedData.data);
            } catch (err) {
                console.error("Failed to restore liked videos:", err);
            }
        }
    };

    if (!user) {
        return (
            <div className="text-center py-12">
                <ThumbsUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                    Keep track of videos you like
                </h2>
                <p className="text-gray-600">Sign in to see your liked videos.</p>
            </div>
        );
    }

    if (loading) {
        return <div>Loading liked videos...</div>;
    }

    if (likedVideos.length === 0) {
        return (
            <div className="text-center py-12">
                <ThumbsUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No liked videos yet</h2>
                <p className="text-gray-600">Videos you like will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">{likedVideos.length} videos</p>
                <Button className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Play all
                </Button>
            </div>

            <div className="space-y-4">
                {likedVideos.map((item) => {
                    const videoObj = typeof item.videoid === "object" ? item.videoid : null;
                    const videoId = videoObj?._id || (typeof item.videoid === "string" ? item.videoid : "");

                    return (
                        <div key={item._id} className="flex gap-4 group">
                            <Link href={`/watch/${videoId}`} className="flex-shrink-0">
                                <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                                    <video
                                        src={`${process.env.BACKEND_URL}/${videoObj?.filepath || ""}`}
                                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                </div>
                            </Link>

                            <div className="flex-1 min-w-0">
                                <Link href={`/watch/${videoId}`}>
                                    <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                                        {videoObj?.videotitle || "Untitled Video"}
                                    </h3>
                                </Link>
                                <p className="text-sm text-gray-600">
                                    {videoObj?.videochanel || "Unknown Channel"}
                                </p>
                                <p className="text-sm text-gray-600">
                                    {(videoObj?.views || 0).toLocaleString()} views •{" "}
                                    {videoObj?.createdAt ? formatDistanceToNow(new Date(videoObj.createdAt)) : ""} ago
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Liked {formatDistanceToNow(new Date(item.createdAt))} ago
                                </p>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <MoreVertical className="w-4 h-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => handleUnlikeVideo(videoId, item._id)}
                                    >
                                        <X className="w-4 h-4 mr-2" />
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