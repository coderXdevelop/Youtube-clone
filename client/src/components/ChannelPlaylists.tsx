"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ListVideo,
    Plus,
    Play,
    Trash2,
    Check,
    Loader2,
    Film,
    Sparkles,
    FolderPlus,
    X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import { Video } from "./VideoCard";

interface CustomPlaylist {
    _id: string;
    title: string;
    description: string;
    category: string;
    isCustom: boolean;
    videosCount: number;
    thumbnail: string;
    videos: Video[];
    createdAt?: string;
}

interface CategoryPlaylist {
    _id: string;
    title: string;
    description: string;
    category: string;
    isCustom: boolean;
    videosCount: number;
    thumbnail: string;
    videos: Video[];
}

interface ChannelPlaylistsProps {
    channelId: string;
    channelName: string;
    isOwner: boolean;
    allVideos: Video[];
}

export default function ChannelPlaylists({
    channelId,
    channelName,
    isOwner,
    allVideos,
}: ChannelPlaylistsProps) {
    const { user } = useUser();
    const router = useRouter();

    const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>([]);
    const [categoryPlaylists, setCategoryPlaylists] = useState<CategoryPlaylist[]>([]);
    const [loading, setLoading] = useState(true);

    // Active filter tab: "all" | "custom" | "category"
    const [playlistFilter, setPlaylistFilter] = useState<"all" | "custom" | "category">("all");

    // Create playlist modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Selected playlist for detailed drawer view
    const [activePlaylistDrawer, setActivePlaylistDrawer] = useState<
        CustomPlaylist | CategoryPlaylist | null
    >(null);

    const fetchPlaylists = async () => {
        try {
            const res = await axiosInstance.get(`/api/playlist/channel/${channelId}`);
            if (res.data?.success) {
                setCustomPlaylists(res.data.customPlaylists || []);
                setCategoryPlaylists(res.data.categoryPlaylists || []);
            }
        } catch (error) {
            console.error("Error fetching playlists:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaylists();
    }, [channelId]);

    const handleCreatePlaylist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !user?._id) return;

        setIsSubmitting(true);
        try {
            const res = await axiosInstance.post("/api/playlist/create", {
                channelId,
                userId: user._id,
                title: newTitle.trim(),
                description: newDescription.trim(),
                videos: selectedVideoIds,
            });

            if (res.data?.success && res.data.playlist) {
                const created = {
                    ...res.data.playlist,
                    videosCount: res.data.playlist.videos?.length || 0,
                    thumbnail: res.data.playlist.videos?.[0]?.thumbnailpath || "",
                };
                setCustomPlaylists((prev) => [created, ...prev]);
                setIsCreateModalOpen(false);
                setNewTitle("");
                setNewDescription("");
                setSelectedVideoIds([]);
            }
        } catch (error) {
            console.error("Failed to create playlist:", error);
            alert("Failed to create playlist. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePlaylist = async (playlistId: string) => {
        if (!user?._id || !isOwner) return;
        if (!confirm("Are you sure you want to delete this playlist?")) return;

        try {
            const res = await axiosInstance.delete(`/api/playlist/${playlistId}`, {
                data: { userId: user._id },
            });

            if (res.data?.success) {
                setCustomPlaylists((prev) => prev.filter((p) => p._id !== playlistId));
                if (activePlaylistDrawer?._id === playlistId) {
                    setActivePlaylistDrawer(null);
                }
            }
        } catch (error) {
            console.error("Failed to delete playlist:", error);
        }
    };

    const toggleVideoSelection = (videoId: string) => {
        setSelectedVideoIds((prev) =>
            prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
        );
    };

    const displayedPlaylists = [
        ...(playlistFilter === "all" || playlistFilter === "custom" ? customPlaylists : []),
        ...(playlistFilter === "all" || playlistFilter === "category" ? categoryPlaylists : []),
    ];

    return (
        <div className="space-y-6">
            {/* Header & Controls Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800/60">
                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setPlaylistFilter("all")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            playlistFilter === "all"
                                ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                    >
                        All Playlists ({customPlaylists.length + categoryPlaylists.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => setPlaylistFilter("custom")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            playlistFilter === "custom"
                                ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Custom ({customPlaylists.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setPlaylistFilter("category")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            playlistFilter === "category"
                                ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Category Collections ({categoryPlaylists.length})</span>
                    </button>
                </div>

                {/* Create Custom Playlist Button (Owner Only) */}
                {isOwner && (
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl px-4 py-2 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Custom Playlist</span>
                    </Button>
                )}
            </div>

            {/* Playlists Grid */}
            {loading ? (
                <div className="py-20 text-center text-sm text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading playlists...</span>
                </div>
            ) : displayedPlaylists.length === 0 ? (
                <div className="text-center py-20 px-4 rounded-3xl bg-gray-50/50 dark:bg-zinc-900/40 border border-gray-200/80 dark:border-zinc-800/80 shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
                        <ListVideo className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                        No playlists found
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                        {isOwner
                            ? "Create custom playlists to organize your videos into engaging watchable series."
                            : "This creator hasn't published any playlists yet."}
                    </p>
                    {isOwner && (
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl px-5 py-2 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            <span>Create First Playlist</span>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {displayedPlaylists.map((playlist) => {
                        const firstVideo = playlist.videos?.[0];
                        const thumbnailSrc =
                            playlist.thumbnail ||
                            firstVideo?.thumbnailpath ||
                            "/placeholder.jpg";

                        return (
                            <div
                                key={playlist._id}
                                className="group relative bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer"
                                onClick={() => setActivePlaylistDrawer(playlist)}
                            >
                                {/* Playlist Thumbnail & Overlay Count Badge */}
                                <div className="relative aspect-video bg-black/80 overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={thumbnailSrc}
                                        alt={playlist.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-y-0 right-0 w-2/5 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1 p-2">
                                        <ListVideo className="w-6 h-6" />
                                        <span className="text-xs font-bold">
                                            {playlist.videosCount} {playlist.videosCount === 1 ? "video" : "videos"}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-2 left-2">
                                        {playlist.isCustom ? (
                                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                                                Custom
                                            </span>
                                        ) : (
                                            <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                                                {playlist.category}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Playlist Metadata */}
                                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1 transition-colors">
                                            {playlist.title}
                                        </h4>
                                        {playlist.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                                {playlist.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800 text-[11px] text-gray-500">
                                        <span>Click to view all videos</span>
                                        {isOwner && playlist.isCustom && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeletePlaylist(playlist._id);
                                                }}
                                                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                                title="Delete custom playlist"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Custom Playlist Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <FolderPlus className="w-5 h-5 text-indigo-600" />
                            <span>Create Custom Playlist</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Give your playlist a title, description, and select the uploaded videos to include.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreatePlaylist} className="space-y-4 pt-2">
                        <div>
                            <Label htmlFor="playlistTitle" className="text-xs font-semibold">
                                Playlist Title (required)
                            </Label>
                            <Input
                                id="playlistTitle"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="e.g. Masterclass Series, Best of 2026..."
                                required
                                className="mt-1 text-sm bg-gray-50 dark:bg-zinc-800"
                            />
                        </div>

                        <div>
                            <Label htmlFor="playlistDesc" className="text-xs font-semibold">
                                Description
                            </Label>
                            <Textarea
                                id="playlistDesc"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="What is this playlist about?"
                                rows={2}
                                className="mt-1 text-xs bg-gray-50 dark:bg-zinc-800 resize-none"
                            />
                        </div>

                        {/* Video Checklist from Channel Uploads */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">
                                    Select Uploaded Videos ({selectedVideoIds.length} selected)
                                </Label>
                            </div>

                            {allVideos.length === 0 ? (
                                <p className="text-xs text-gray-500 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                    No videos uploaded on this channel yet. You can create the playlist now and add videos later.
                                </p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-gray-50 dark:bg-zinc-800/60 rounded-xl border border-gray-200 dark:border-zinc-700">
                                    {allVideos.map((video) => {
                                        const isSelected = selectedVideoIds.includes(video._id);
                                        return (
                                            <div
                                                key={video._id}
                                                onClick={() => toggleVideoSelection(video._id)}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800"
                                                        : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                                                }`}
                                            >
                                                <div
                                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                                        isSelected
                                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                                            : "border-gray-300 dark:border-zinc-600"
                                                    }`}
                                                >
                                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                </div>

                                                <div className="w-10 h-6 bg-black/60 rounded overflow-hidden shrink-0">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={video.thumbnailpath || "/placeholder.jpg"}
                                                        alt={video.videotitle}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                                        {video.videotitle}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-2 flex justify-between sm:justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !newTitle.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5"
                            >
                                {isSubmitting ? "Creating..." : "Save Playlist"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Playlist Detail Preview Modal / Drawer */}
            <Dialog
                open={Boolean(activePlaylistDrawer)}
                onOpenChange={(open) => !open && setActivePlaylistDrawer(null)}
            >
                <DialogContent className="sm:max-w-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <ListVideo className="w-5 h-5 text-indigo-600" />
                            <span>{activePlaylistDrawer?.title}</span>
                        </DialogTitle>
                        {activePlaylistDrawer?.description && (
                            <DialogDescription className="text-xs text-gray-500">
                                {activePlaylistDrawer.description}
                            </DialogDescription>
                        )}
                    </DialogHeader>

                    {/* Playlist Video Items */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
                        {(!activePlaylistDrawer?.videos || activePlaylistDrawer.videos.length === 0) ? (
                            <div className="text-center py-10 text-sm text-gray-500">
                                No videos in this playlist yet.
                            </div>
                        ) : (
                            activePlaylistDrawer.videos.map((vid, idx) => (
                                <div
                                    key={vid._id || idx}
                                    onClick={() => {
                                        router.push(`/watch/${vid._id}`);
                                    }}
                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 hover:bg-indigo-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors border border-gray-100 dark:border-zinc-700/60 group"
                                >
                                    <span className="text-xs font-bold text-gray-400 w-5 text-center">
                                        {idx + 1}
                                    </span>

                                    <div className="relative w-24 aspect-video bg-black/80 rounded-lg overflow-hidden shrink-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={vid.thumbnailpath || "/placeholder.jpg"}
                                            alt={vid.videotitle}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play className="w-4 h-4 fill-white text-white" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {vid.videotitle}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            {(vid.views || 0).toLocaleString()} views
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setActivePlaylistDrawer(null)}
                            className="text-xs"
                        >
                            Close
                        </Button>
                        {activePlaylistDrawer?.videos && activePlaylistDrawer.videos.length > 0 && (
                            <Button
                                onClick={() => {
                                    router.push(`/watch/${activePlaylistDrawer.videos[0]._id}`);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-2 rounded-xl"
                            >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Play All Videos</span>
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
