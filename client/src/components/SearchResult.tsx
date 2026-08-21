"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Video {
    _id: string;
    videotitle: string;
    filepath: string;
    videochanel: string;
    views: number;
    uploader: string;
    createdAt: string;
}

const SearchResult: React.FC<{ query: string }> = ({ query }) => {
    const [prevQuery, setPrevQuery] = useState(query);
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(() => Boolean(query.trim()));

    if (prevQuery !== query) {
        setPrevQuery(query);
        setLoading(Boolean(query.trim()));
        if (!query.trim()) {
            setVideos([]);
        }
    }

    useEffect(() => {
        if (!query.trim()) return;

        let isCancelled = false;

        const fetchVideos = async () => {
            // 🔧 TODO: Replace with backend API call
            // const res = await axiosInstance.get(`/video/search?q=${query}`);
            // setVideos(res.data);

            // Mock data for now
            const allVideos: Video[] = [
                {
                    _id: "1",
                    videotitle: "Amazing Nature Documentary",
                    filepath: "/videos/nature-doc.mp4",
                    videochanel: "Nature Channel",
                    views: 45000,
                    uploader: "nature_lover",
                    createdAt: new Date().toISOString(),
                },
                {
                    _id: "2",
                    videotitle: "Cooking Tutorial: Perfect Pasta",
                    filepath: "/videos/pasta-tutorial.mp4",
                    videochanel: "Chef's Kitchen",
                    views: 23000,
                    uploader: "chef_master",
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                },
            ];

            const results = allVideos.filter(
                (vid) =>
                    vid.videotitle.toLowerCase().includes(query.toLowerCase()) ||
                    vid.videochanel.toLowerCase().includes(query.toLowerCase())
            );

            if (!isCancelled) {
                setVideos(results);
                setLoading(false);
            }
        };

        fetchVideos();

        return () => {
            isCancelled = true;
        };
    }, [query]);

    if (!query.trim()) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">
                    Enter a search term to find videos and channels.
                </p>
            </div>
        );
    }

    if (loading) {
        return <div className="text-center py-12">Loading search results...</div>;
    }

    if (videos.length === 0) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold mb-2">No results found</h2>
                <p className="text-gray-600">
                    Try different keywords or remove search filters
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Video Results */}
            <div className="space-y-4">
                {videos.map((video) => (
                    <div key={video._id} className="flex gap-4 group">
                        <Link href={`/watch/${video._id}`} className="flex-shrink-0">
                            <div className="relative w-80 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                <video
                                    src={`${process.env.NEXT_PUBLIC_BACKEND_URL || ""}${video.filepath}`}
                                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
                                    10:24
                                </div>
                            </div>
                        </Link>

                        <div className="flex-1 min-w-0 py-1">
                            <Link href={`/watch/${video._id}`}>
                                <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                                    {video.videotitle}
                                </h3>
                            </Link>

                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                <span>{video.views.toLocaleString()} views</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
                            </div>

                            <Link
                                href={`/channel/${video.uploader}`}
                                className="flex items-center gap-2 mb-2 hover:text-blue-600"
                            >
                                <Avatar className="w-6 h-6">
                                    <AvatarImage src="/placeholder.svg?height=24&width=24" />
                                    <AvatarFallback className="text-xs">
                                        {video.videochanel[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-gray-600">{video.videochanel}</span>
                            </Link>

                            <p className="text-sm text-gray-700 line-clamp-2">
                                Sample video description that would show search-relevant content
                                and help users understand what the video is about before clicking.
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Load More Results */}
            <div className="text-center py-8">
                <p className="text-gray-600">
                    Showing {videos.length} results for &quot;{query}&quot;
                </p>
            </div>
        </div>
    );
};

export default SearchResult;
