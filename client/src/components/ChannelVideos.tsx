"use client";

import React, { useMemo, useState } from "react";
import VideoCard, { Video } from "./VideoCard";
import {
    Trash2,
    AlertTriangle,
    Loader2,
    Search,
    SlidersHorizontal,
    Video as VideoIcon,
    Upload,
    Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";

interface ChannelVideosProps {
    videos: Video[];
    isOwner?: boolean;
    onDeleteVideo?: (videoId: string) => Promise<void> | void;
    onOpenUpload?: () => void;
}

export default function ChannelVideos({
    videos,
    isOwner,
    onDeleteVideo,
    onOpenUpload,
}: ChannelVideosProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"latest" | "popular" | "oldest">("latest");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [selectedVideoToDelete, setSelectedVideoToDelete] = useState<Video | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Extract unique categories from videos
    const categories = useMemo(() => {
        const catSet = new Set<string>(["All"]);
        videos.forEach((v) => {
            if (v.category) {
                v.category
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean)
                    .forEach((c) => catSet.add(c));
            }
        });
        return Array.from(catSet);
    }, [videos]);

    // Filter and sort videos
    const processedVideos = useMemo(() => {
        let result = [...videos];

        // Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                (v) =>
                    v.videotitle?.toLowerCase().includes(q) ||
                    v.videodescription?.toLowerCase().includes(q) ||
                    v.description?.toLowerCase().includes(q) ||
                    v.category?.toLowerCase().includes(q)
            );
        }

        // Category Filter
        if (selectedCategory !== "All") {
            result = result.filter((v) =>
                v.category?.toLowerCase().includes(selectedCategory.toLowerCase())
            );
        }

        // Sorting
        if (sortBy === "latest") {
            result.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
        } else if (sortBy === "popular") {
            result.sort((a, b) => (b.views || 0) - (a.views || 0));
        } else if (sortBy === "oldest") {
            result.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateA - dateB;
            });
        }

        return result;
    }, [videos, searchQuery, selectedCategory, sortBy]);

    const handleConfirmDelete = async () => {
        if (!selectedVideoToDelete || !onDeleteVideo) return;
        try {
            setIsDeleting(true);
            await onDeleteVideo(selectedVideoToDelete._id);
            setSelectedVideoToDelete(null);
        } catch (error) {
            console.error("Error during video deletion:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!videos || videos.length === 0) {
        return (
            <div className="text-center py-20 px-4 rounded-3xl bg-gray-50/50 dark:bg-zinc-900/40 border border-gray-200/80 dark:border-zinc-800/80 my-4 max-w-2xl mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-indigo-50/50 dark:ring-indigo-950/20">
                    <VideoIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1.5">
                    No videos published yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                    {isOwner
                        ? "Start sharing your creative stories, tutorials, and moments with the world."
                        : "This creator hasn't published any videos yet. Check back soon!"}
                </p>
                {isOwner && onOpenUpload && (
                    <Button
                        onClick={onOpenUpload}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-xl shadow-sm cursor-pointer inline-flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Upload First Video</span>
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Controls Bar: Sort, Category Chips & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800/60">
                {/* Sort Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setSortBy("latest")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            sortBy === "latest"
                                ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                    >
                        Latest
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortBy("popular")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            sortBy === "popular"
                                ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                    >
                        <Sparkles className="w-3 h-3" />
                        <span>Popular</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortBy("oldest")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            sortBy === "oldest"
                                ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                    >
                        Oldest
                    </button>
                </div>

                {/* Search in Channel */}
                <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search channel videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 focus-visible:ring-indigo-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Category Filter Chips if multiple categories exist */}
            {categories.length > 2 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                                selectedCategory === cat
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 dark:bg-zinc-800/70 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}

            {/* Results Count / Filter Alert */}
            {searchQuery && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    Showing {processedVideos.length} result{processedVideos.length === 1 ? "" : "s"} for &quot;{searchQuery}&quot;
                </div>
            )}

            {/* Video Cards Grid */}
            {processedVideos.length === 0 ? (
                <div className="text-center py-16 text-sm text-gray-500 dark:text-gray-400">
                    No videos match your filter criteria.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                    {processedVideos.map((video) => (
                        <div key={video._id} className="relative group flex flex-col">
                            <VideoCard video={video} />
                            {isOwner && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedVideoToDelete(video);
                                    }}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg flex items-center justify-center cursor-pointer z-20"
                                    title="Delete video"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={Boolean(selectedVideoToDelete)}
                onOpenChange={(open) => !open && setSelectedVideoToDelete(null)}
            >
                <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-6">
                    <DialogHeader className="space-y-2">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            Delete Video Permanently?
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-gray-900 dark:text-gray-200">
                                &quot;{selectedVideoToDelete?.videotitle}&quot;
                            </span>
                            ? This action cannot be undone and will remove the video and its watch history from the platform.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedVideoToDelete(null)}
                            disabled={isDeleting}
                            className="border-gray-200 dark:border-zinc-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Delete Video
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}