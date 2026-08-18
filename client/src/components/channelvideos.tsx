import React from "react";
import VideoCard, { Video } from "./videocard";

interface ChannelVideosProps {
    videos: Video[];
}

export default function ChannelVideos({ videos }: ChannelVideosProps) {
    if (!videos || videos.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">No videos uploaded yet.</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">Videos</h2>

            {/* 🔧 TODO: Replace with backend fetch logic */}
            {/* Example: fetch videos from API and pass them as props */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.map((video) => (
                    <VideoCard key={video._id} video={video} />
                ))}
            </div>
        </div>
    );
}
