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

interface WatchLaterItem {
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
    };
}

export default function WatchLaterContent() {
    const [watchLater, setWatchLater] = useState<WatchLaterItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useUser();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const loadWatchLater = async () => {
            try {
                const response = await axiosInstance.get(`/api/watch/${user._id}`);
                if (isMounted && Array.isArray(response.data)) {
                    setWatchLater(response.data);
                }
            } catch (error) {
                console.error("Error loading watch later videos:", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadWatchLater();

        return () => {
            isMounted = false;
        };
    }, [user]);

    const handleRemoveFromWatchLater = async (watchLaterId: string) => {
        try {
            await axiosInstance.delete(`/api/watch/${watchLaterId}`);
            setWatchLater((prev) => prev.filter((item) => item._id !== watchLaterId));
        } catch (error) {
            console.error("Error removing from watch later:", error);
        }
    };

    if (!user) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">Please sign in to view your watch later list.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="text-sm text-gray-500 py-6">Loading watch later list...</div>;
    }

    if (watchLater.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No videos in watch later list.</p>
            </div>
        );
    }

    const firstVideo = watchLater[0];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{watchLater.length} videos</p>
                {firstVideo?.videoid?._id && (
                    <Link href={`/watch/${firstVideo.videoid._id}`}>
                        <Button size="sm" className="flex items-center gap-2 text-xs">
                            <Play className="w-3.5 h-3.5 fill-current" />
                            Play all
                        </Button>
                    </Link>
                )}
            </div>

            <div className="space-y-4">
                {watchLater.map((item) => {
                    const videoObj = item.videoid;
                    if (!videoObj) return null;

                    const thumbUrl = videoObj.thumbnailpath
                        ? `${backendUrl}/${videoObj.thumbnailpath.replace(/^\/+/, "")}`
                        : "";
                    const videoSrc = `${backendUrl}/${videoObj.filepath || ""}#t=0.5`;

                    return (
                        <div key={item._id} className="flex gap-4 group items-start">
                            <Link href={`/watch/${videoObj._id}`} className="shrink-0">
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
                                <Link href={`/watch/${videoObj._id}`}>
                                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 text-gray-900 dark:text-gray-100">
                                        {videoObj.videotitle}
                                    </h3>
                                </Link>
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                    {videoObj.videochanel}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {(videoObj.views || 0).toLocaleString()} views •{" "}
                                    {videoObj.createdAt ? formatDistanceToNow(new Date(videoObj.createdAt)) : ""} ago
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Added {formatDistanceToNow(new Date(item.createdAt))} ago
                                </p>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer outline-none">
                                    <MoreVertical className="w-4 h-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                    <DropdownMenuItem
                                        onClick={() => handleRemoveFromWatchLater(item._id)}
                                        className="flex items-center gap-2 text-red-600 dark:text-red-400 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                        Remove from watch later
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