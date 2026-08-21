"use client";

import { useState } from "react";
import React from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import VideoPlayer from "@/components/VideoPlayer";
import VideoInfo from "@/components/VideoInfo";
import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // unwrap params with React.use()
  const { id } = React.use(params);

  const videoData = {
    src: "/assets/vdo.mp4",
    poster: "/thumbnail.jpg",
    title: "Amazing Nature Documentary",
    channelName: "Nature Channel",
    subscribersCount: "1.2M subscribers",
    channelAvatar: "",
    channelUrl: "/channel/nature",
    views: 45000,
    uploadedAt: "less than a minute ago",
    description: "Sample video description. This would contain the actual video description from the database.",
    initialLikes: 1250,
    initialDislikes: 50,
  };

  const relatedvideos = [
    {
      _id: "101",
      videotitle: "Wildlife in Africa | Official Documentary 4K",
      videochanel: "Nature Channel",
      views: 120000,
      createdAt: "2026-08-13T10:00:00.000Z",
    },
    {
      _id: "102",
      videotitle: "Ocean Wonders & Deep Sea Explorations",
      videochanel: "Nature Channel",
      views: 85000,
      createdAt: "2026-08-16T10:00:00.000Z",
    },
    {
      _id: "103",
      videotitle: "Mountain Peaks and Alpine Forests",
      videochanel: "Geographic Planet",
      views: 34000,
      createdAt: "2026-08-06T10:00:00.000Z",
    },
    {
      _id: "104",
      videotitle: "Rainforest Journey 10 Hours Relaxing Sounds",
      videochanel: "Relaxation Hub",
      views: 520000,
      createdAt: "2026-07-19T10:00:00.000Z",
    },
    {
      _id: "105",
      videotitle: "Top 10 Most Incredible Animals in 2026",
      videochanel: "Wild Facts",
      views: 94000,
      createdAt: "2026-08-17T10:00:00.000Z",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row gap-6 items-start">
            {/* Main Column: Video Player, Info, Comments */}
            <div className="flex-1 min-w-0 flex flex-col gap-2 w-full">
              <VideoPlayer src={videoData.src} poster={videoData.poster} />
              <VideoInfo
                title={videoData.title}
                channelName={videoData.channelName}
                subscribersCount={videoData.subscribersCount}
                channelAvatar={videoData.channelAvatar}
                channelUrl={videoData.channelUrl}
                views={videoData.views}
                uploadedAt={videoData.uploadedAt}
                description={videoData.description}
                initialLikes={videoData.initialLikes}
                initialDislikes={videoData.initialDislikes}
              />
              <div className="mt-4">
                <Comments videoId={id} />
              </div>
            </div>

            {/* Right Sidebar Column: Related Videos */}
            <div className="w-full lg:w-[360px] xl:w-[400px] flex-shrink-0">
              <RelatedVideos videos={relatedvideos} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
