"use client"
import React, { useEffect, useState } from "react";
import VideoCard, { Video } from "./VideoCard";
import axiosInstance from "@/lib/AxiosInstance";

const Videogrid = () => {
    const [videos, setvideo] = useState<Video[]>([]);
    const [loading, setloading] = useState(true);
    useEffect(() => {
        const fetchvideo = async () => {
            try {
                const res = await axiosInstance.get("/api/video/getall");
                setvideo(res.data);
            } catch (error) {
                console.log(error);
            } finally {
                setloading(false);
            }
        };
        fetchvideo();
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
                <>Loading..</>
            ) : (
                videos.map((video) => <VideoCard key={video._id} video={video} />)
            )}
        </div>
    );
};

export default Videogrid;