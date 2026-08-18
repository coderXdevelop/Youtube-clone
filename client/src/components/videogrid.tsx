"use client";

import React, { useEffect, useState } from "react";
import Videocard from "./videocard";
// import axiosInstance from "@/lib/axiosinstance"; // 🔧 Uncomment when backend is ready

interface Video {
    _id: string;
    videotitle: string;
    filepath: string;
    videochanel: string;
    views: number;
    createdAt: string;
}

const Videogrid: React.FC = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                // 🔧 TODO: Replace with backend API call
                // const res = await axiosInstance.get("/video/getall");
                // setVideos(res.data);

                // Temporary mock data until backend is ready:
                setVideos([
                    {
                        _id: "1",
                        videotitle: "Amazing Nature Documentary",
                        filepath: "/videos/nature-doc.mp4",
                        videochanel: "Nature Channel",
                        views: 45000,
                        createdAt: new Date().toISOString(),
                    },
                    {
                        _id: "2",
                        videotitle: "Cooking Tutorial: Perfect Pasta",
                        filepath: "/videos/pasta-tutorial.mp4",
                        videochanel: "Chef's Kitchen",
                        views: 23000,
                        createdAt: new Date(Date.now() - 86400000).toISOString(),
                    },
                ]);
            } catch (error) {
                console.error("Error fetching videos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    if (loading) {
        return <div className="text-center py-12">Loading videos...</div>;
    }

    if (videos.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">No videos available.</p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">All Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.map((video) => (
                    <Videocard key={video._id} video={video} />
                ))}
            </div>
        </div>
    );
};

export default Videogrid;
