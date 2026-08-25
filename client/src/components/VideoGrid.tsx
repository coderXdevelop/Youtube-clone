"use client";

import React, { useEffect, useState } from "react";
import VideoCard, { Video } from "./VideoCard";
import axiosInstance from "@/lib/AxiosInstance";
import { Film } from "lucide-react";
import { Button } from "./ui/button";

interface VideoGridProps {
    selectedCategory?: string;
    onResetCategory?: () => void;
}

// Category keyword mappings for smart content matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    music: ["music", "song", "audio", "soundtrack", "concert", "beat", "album", "remix", "sing", "band", "live"],
    gaming: ["game", "gaming", "gameplay", "walkthrough", "stream", "play", "playthrough", "rpg", "fps", "esports", "minecraft", "gta"],
    movies: ["movie", "film", "trailer", "cinema", "documentary", "teaser", "scene", "series", "episode"],
    news: ["news", "breaking", "update", "report", "today", "politics", "world", "daily"],
    sports: ["sport", "sports", "match", "game", "football", "soccer", "cricket", "basketball", "goal", "highlights", "tournament"],
    technology: ["tech", "technology", "code", "programming", "software", "ai", "hardware", "gadget", "tutorial", "review", "development"],
    comedy: ["comedy", "funny", "humor", "joke", "prank", "standup", "sketch", "laugh"],
    education: ["education", "learn", "how to", "tutorial", "course", "guide", "lecture", "study", "tips", "lesson"],
    science: ["science", "physics", "chemistry", "biology", "space", "astronomy", "research", "experiment", "nature"],
    travel: ["travel", "tour", "vlog", "trip", "explore", "vacation", "city", "country", "journey", "hotel"],
    food: ["food", "cooking", "recipe", "chef", "kitchen", "bake", "delicious", "eat", "street food", "restaurant"],
    fashion: ["fashion", "style", "outfit", "makeup", "beauty", "clothing", "trend", "haul", "lookbook"],
};

const Videogrid = ({ selectedCategory = "All", onResetCategory }: VideoGridProps) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;
        const fetchVideos = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get("/api/video/getall");
                if (!ignore && Array.isArray(res.data)) {
                    setVideos(res.data);
                }
            } catch (error) {
                console.error("Error fetching videos:", error);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchVideos();
        return () => {
            ignore = true;
        };
    }, []);

    // Filter videos based on selectedCategory
    const filteredVideos = videos.filter((video) => {
        if (!selectedCategory || selectedCategory.toLowerCase() === "all") {
            return true;
        }

        const categoryLower = selectedCategory.toLowerCase();
        const videoCat = (video.category || "").toLowerCase();
        const title = (video.videotitle || "").toLowerCase();
        const channel = (video.videochanel || "").toLowerCase();
        const desc = (video.description || video.videodescription || "").toLowerCase();

        // 1. Direct match on category field
        if (videoCat === categoryLower) return true;

        // 2. Direct match on title, channel name, or description
        if (title.includes(categoryLower) || channel.includes(categoryLower) || desc.includes(categoryLower)) {
            return true;
        }

        // 3. Keyword matching for the category
        const keywords = CATEGORY_KEYWORDS[categoryLower];
        if (keywords && keywords.length > 0) {
            return keywords.some((kw) => title.includes(kw) || channel.includes(kw) || desc.includes(kw));
        }

        return false;
    });

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="space-y-3 animate-pulse">
                        <div className="aspect-video bg-gray-200 dark:bg-zinc-800 rounded-lg" />
                        <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-zinc-800 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (filteredVideos.length === 0) {
        return (
            <div className="py-16 text-center space-y-3">
                <Film className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600" />
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                    No videos found in &ldquo;{selectedCategory}&rdquo;
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Try selecting a different category or view all videos.
                </p>
                {onResetCategory && selectedCategory.toLowerCase() !== "all" && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onResetCategory}
                        className="text-xs mt-2"
                    >
                        View All Videos
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {filteredVideos.map((video) => (
                <VideoCard key={video._id} video={video} />
            ))}
        </div>
    );
};

export default Videogrid;