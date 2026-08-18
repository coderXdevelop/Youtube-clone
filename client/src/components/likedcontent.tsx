"use client";

import { useState } from "react";
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

const INITIAL_LIKED_VIDEOS: LikedVideoItem[] = [
    {
        _id: "like1",
        createdAt: new Date().toISOString(),
        videoid: {
            _id: "vid1",
            videotitle: "Sample Video Title",
            videochanel: "Demo Channel",
            views: 12345,
            createdAt: new Date().toISOString(),
            filepath: "video/vdo.mp4",
        },
    },
];

export default function LikedVideosContent() {
    const [likedVideos, setLikedVideos] = useState<LikedVideoItem[]>(INITIAL_LIKED_VIDEOS);
    const [loading] = useState(false);

    // Temporary stub until AuthContext is ready
    const fakeUser = {
        _id: "demo123",
        name: "Demo User",
        image: "",
    };

    const user = fakeUser;

    const handleUnlikeVideo = (_videoId: string, likedVideoId: string) => {
        if (!user) return;
        setLikedVideos((prev) => prev.filter((item) => item._id !== likedVideoId));
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
                {likedVideos.map((item) => (
                    <div key={item._id} className="flex gap-4 group">
                        <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
                            <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                                <video
                                    src={`/${item.videoid.filepath}`}
                                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                            </div>
                        </Link>

                        <div className="flex-1 min-w-0">
                            <Link href={`/watch/${item.videoid._id}`}>
                                <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 mb-1">
                                    {item.videoid.videotitle}
                                </h3>
                            </Link>
                            <p className="text-sm text-gray-600">{item.videoid.videochanel}</p>
                            <p className="text-sm text-gray-600">
                                {item.videoid.views.toLocaleString()} views •{" "}
                                {formatDistanceToNow(new Date(item.videoid.createdAt))} ago
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Liked {formatDistanceToNow(new Date(item.createdAt))} ago
                            </p>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() =>
                                        handleUnlikeVideo(item.videoid._id, item._id)
                                    }
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Remove from liked videos
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
            </div>
        </div>
    );
}
