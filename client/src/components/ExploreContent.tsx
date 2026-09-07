"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
    Flame,
    Music,
    Gamepad2,
    Newspaper,
    Trophy,
    GraduationCap,
    Clapperboard,
    Sparkles,
    TrendingUp,
    Play,
    Eye,
    Clock,
    RefreshCw,
    Compass,
    Film,
} from "lucide-react";
import VideoCard, { Video } from "./VideoCard";
import axiosInstance from "@/lib/AxiosInstance";
import { formatDistanceToNow } from "date-fns";
import { Button } from "./ui/button";

interface DestinationCard {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
}

const DESTINATIONS: DestinationCard[] = [
    {
        id: "Trending",
        title: "Trending",
        description: "What's viral & popular now",
        icon: Flame,
    },
    {
        id: "Music",
        title: "Music",
        description: "Top hits, songs & beats",
        icon: Music,
    },
    {
        id: "Gaming",
        title: "Gaming",
        description: "Streams, gameplays & guides",
        icon: Gamepad2,
    },
    {
        id: "News",
        title: "News",
        description: "Breaking updates & world events",
        icon: Newspaper,
    },
    {
        id: "Sports",
        title: "Sports",
        description: "Matches, highlights & fitness",
        icon: Trophy,
    },
    {
        id: "Learning",
        title: "Courses & Learning",
        description: "Code, science & tutorials",
        icon: GraduationCap,
    },
    {
        id: "Movies",
        title: "Movies & Shows",
        description: "Trailers, scenes & cinema",
        icon: Clapperboard,
    },
    {
        id: "Fashion",
        title: "Fashion & Beauty",
        description: "Style, trends & makeover",
        icon: Sparkles,
    },
];

// Keywords helper for categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    music: [
        "music",
        "song",
        "audio",
        "soundtrack",
        "concert",
        "beat",
        "album",
        "remix",
        "sing",
        "band",
        "pop",
        "hip hop",
        "rock",
        "melody",
        "rap",
        "lofi",
        "acoustic",
    ],
    gaming: [
        "game",
        "gaming",
        "gameplay",
        "walkthrough",
        "stream",
        "play",
        "rpg",
        "fps",
        "esports",
        "minecraft",
        "gta",
        "fortnite",
        "valorant",
        "pubg",
        "roblox",
        "pc",
        "console",
    ],
    news: [
        "news",
        "breaking",
        "update",
        "report",
        "today",
        "politics",
        "world",
        "daily",
        "press",
        "bulletin",
        "headline",
        "current affairs",
        "journalism",
    ],
    sports: [
        "sport",
        "sports",
        "match",
        "game",
        "football",
        "soccer",
        "cricket",
        "basketball",
        "goal",
        "highlights",
        "athlete",
        "fitness",
        "workout",
        "gym",
        "ipl",
        "fifa",
        "tennis",
        "wrestling",
        "racing",
    ],
    learning: [
        "education",
        "learn",
        "learning",
        "how to",
        "tutorial",
        "course",
        "guide",
        "code",
        "programming",
        "study",
        "tips",
        "science",
        "technology",
        "tech",
        "coding",
        "lecture",
        "class",
        "development",
        "ai",
        "machine learning",
        "python",
        "javascript",
        "react",
        "software",
    ],
    movies: [
        "movie",
        "movies",
        "film",
        "trailer",
        "cinema",
        "documentary",
        "teaser",
        "scene",
        "series",
        "episode",
        "entertainment",
        "action",
        "drama",
        "show",
        "hollywood",
        "bollywood",
        "short film",
        "cinematic",
        "comedy",
    ],
    fashion: [
        "fashion",
        "style",
        "outfit",
        "makeup",
        "beauty",
        "clothing",
        "trend",
        "haul",
        "lookbook",
        "lifestyle",
        "skincare",
        "grooming",
        "model",
        "vogue",
        "cosmetics",
    ],
};

export default function ExploreContent() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedDestination, setSelectedDestination] = useState<string>("Trending");
    const [loading, setLoading] = useState(true);
    const videoSectionRef = useRef<HTMLDivElement>(null);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";

    const fetchVideos = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get("/api/video/getall");
            if (Array.isArray(res.data)) {
                setVideos(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch videos for explore page:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const handleSelectDestination = (destId: string) => {
        setSelectedDestination(destId);
        // Smoothly scroll down to video section
        setTimeout(() => {
            if (videoSectionRef.current) {
                videoSectionRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        }, 50);
    };

    // Filter & sort videos based on selected destination
    const getFilteredVideos = () => {
        if (selectedDestination === "Trending") {
            // Sort by views descending
            return [...videos].sort((a, b) => (b.views || 0) - (a.views || 0));
        }

        const categoryKey = selectedDestination.toLowerCase();
        const keywords = CATEGORY_KEYWORDS[categoryKey] || [categoryKey];

        return videos.filter((v) => {
            const rawCat = (v.category || "").toLowerCase();
            const title = (v.videotitle || "").toLowerCase();
            const desc = (v.description || v.videodescription || (v as any).discription || "").toLowerCase();
            const channel = (v.videochanel || "").toLowerCase();

            const videoCategories = rawCat.split(",").map((c) => c.trim()).filter(Boolean);

            // 1. Direct match on any assigned category tag
            if (
                videoCategories.some(
                    (c) => c === categoryKey || categoryKey.includes(c) || c.includes(categoryKey)
                )
            ) {
                return true;
            }

            // 2. Semantic aliases (e.g. learning <-> education / technology / science, movies <-> entertainment / cinema)
            if (
                categoryKey === "learning" &&
                videoCategories.some((c) =>
                    ["education", "technology", "science", "learning", "tech"].includes(c)
                )
            ) {
                return true;
            }
            if (
                categoryKey === "movies" &&
                videoCategories.some((c) =>
                    ["entertainment", "movies", "film", "cinema", "comedy"].includes(c)
                )
            ) {
                return true;
            }
            if (
                categoryKey === "news" &&
                videoCategories.some((c) => ["news", "politics", "world"].includes(c))
            ) {
                return true;
            }
            if (
                categoryKey === "sports" &&
                videoCategories.some((c) => ["sports", "fitness", "games"].includes(c))
            ) {
                return true;
            }

            // 3. Keyword matching across category, title, description, and channel
            return keywords.some(
                (kw) =>
                    rawCat.includes(kw) ||
                    title.includes(kw) ||
                    desc.includes(kw) ||
                    channel.includes(kw)
            );
        });
    };

    const displayVideos = getFilteredVideos();

    return (
        <div className="space-y-8">
            {/* 1. Header Banner */}
            <div className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                <div className="relative z-10 space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-zinc-200 border border-white/10 backdrop-blur-sm">
                        <Compass className="w-4 h-4 text-red-500" />
                        <span>Discover & Explore</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        Explore What&apos;s Next
                    </h1>
                    <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                        Discover top trending videos, gaming streams, latest hits, and tutorials curated across the platform.
                    </p>
                </div>
            </div>

            {/* 2. Destination Category Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 md:gap-4">
                {DESTINATIONS.map((dest) => {
                    const Icon = dest.icon;
                    const isSelected = selectedDestination === dest.id;

                    return (
                        <button
                            key={dest.id}
                            onClick={() => handleSelectDestination(dest.id)}
                            className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group relative cursor-pointer active:scale-95 ${
                                isSelected
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-md scale-[1.01]"
                                    : "bg-white dark:bg-zinc-900/90 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                                        isSelected
                                            ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${dest.id === "Trending" ? "text-red-500" : ""}`} />
                                </div>
                                {isSelected && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                )}
                            </div>
                            <div className="space-y-0.5">
                                <h3
                                    className={`font-bold text-sm leading-tight ${
                                        isSelected
                                            ? "text-white dark:text-zinc-900"
                                            : "text-zinc-900 dark:text-zinc-100"
                                    }`}
                                >
                                    {dest.title}
                                </h3>
                                <p
                                    className={`text-[11px] line-clamp-1 ${
                                        isSelected
                                            ? "text-zinc-300 dark:text-zinc-600"
                                            : "text-zinc-500 dark:text-zinc-400"
                                    }`}
                                >
                                    {dest.description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* 3. Section Title & Results Header */}
            <div
                ref={videoSectionRef}
                className="scroll-mt-24 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3"
            >
                <div className="flex items-center gap-2">
                    {selectedDestination === "Trending" ? (
                        <Flame className="w-5 h-5 text-red-500 fill-red-500" />
                    ) : (
                        <TrendingUp className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                    )}
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {selectedDestination === "Trending" ? "Trending Now" : `${selectedDestination} Videos`}
                    </h2>
                    <span className="text-xs text-gray-500 font-medium">
                        ({displayVideos.length} {displayVideos.length === 1 ? "video" : "videos"})
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchVideos}
                    disabled={loading}
                    className="h-8 px-2 text-xs text-gray-500 cursor-pointer"
                >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* 4. Videos Feed / Grid */}
            {loading ? (
                <div className="py-20 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 mx-auto animate-spin text-red-500" />
                    <p className="text-sm text-gray-500">Loading explore feed...</p>
                </div>
            ) : displayVideos.length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 space-y-3">
                    <Film className="w-12 h-12 mx-auto text-gray-400" />
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No Videos Found</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        No videos matching &quot;{selectedDestination}&quot; were found yet. Try exploring Trending or another category.
                    </p>
                    <Button
                        size="sm"
                        onClick={() => handleSelectDestination("Trending")}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    >
                        View Trending
                    </Button>
                </div>
            ) : selectedDestination === "Trending" ? (
                /* Trending List View with Rank Badges */
                <div className="space-y-4 max-w-5xl">
                    {displayVideos.map((video, index) => {
                        const thumbUrl = video.thumbnailpath
                            ? `${backendUrl}/${video.thumbnailpath.replace(/^\/+/, "")}`
                            : "/placeholder.svg";

                        return (
                            <Link
                                key={video._id}
                                href={`/watch/${video._id}`}
                                className="group flex flex-col sm:flex-row gap-4 p-3 rounded-2xl bg-white dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md transition-all"
                            >
                                {/* Thumbnail with Rank Badge */}
                                <div className="relative aspect-video sm:w-64 sm:h-36 flex-shrink-0 bg-black/90 rounded-xl overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={thumbUrl}
                                        alt={video.videotitle}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {/* Trending Rank Badge */}
                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-600/90 backdrop-blur-sm text-[11px] font-extrabold text-white shadow-md flex items-center gap-1">
                                        <Flame className="w-3 h-3 fill-white" />
                                        <span>#{index + 1}</span>
                                    </div>
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="w-10 h-10 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg">
                                            <Play className="w-4 h-4 ml-0.5 fill-gray-900" />
                                        </div>
                                    </div>
                                </div>

                                {/* Metadata */}
                                <div className="flex-1 space-y-1.5 py-1">
                                    <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
                                        {video.videotitle}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                                            {video.videochanel}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" />
                                            {video.views?.toLocaleString() || 0} views
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(video.createdAt))} ago
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 pt-1">
                                        {video.description || video.videodescription || "Explore this video on YouTube Clone. Watch in high quality with seamless playback."}
                                    </p>
                                    {video.category && (
                                        <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400">
                                            {video.category}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                /* Grid View for specific categories */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {displayVideos.map((video) => (
                        <VideoCard key={video._id} video={video} />
                    ))}
                </div>
            )}
        </div>
    );
}
