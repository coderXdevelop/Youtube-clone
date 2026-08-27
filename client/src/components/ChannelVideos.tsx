"use client";

import React, { useState } from "react";
import VideoCard, { Video } from "./VideoCard";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
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
}

export default function ChannelVideos({ videos, isOwner, onDeleteVideo }: ChannelVideosProps) {
    const [selectedVideoToDelete, setSelectedVideoToDelete] = useState<Video | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No videos uploaded yet.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Uploaded Videos ({videos.length})
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.map((video) => (
                    <div key={video._id} className="relative group">
                        <VideoCard video={video} />
                        {isOwner && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedVideoToDelete(video);
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 px-2.5 bg-red-600/90 hover:bg-red-700 text-white rounded-lg shadow-lg flex items-center gap-1.5 text-xs cursor-pointer z-10"
                                title="Delete this video"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                            </Button>
                        )}
                    </div>
                ))}
            </div>

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