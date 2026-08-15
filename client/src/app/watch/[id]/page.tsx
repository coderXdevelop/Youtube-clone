"use client";

import { useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import VideoPlayer from "@/components/videoplayer";
import VideoInfo from "@/components/videoinfo";

export default function WatchPage({ params }: { params: { id: string } }) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Default data matching reference design
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

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-6xl">
          <div className="flex flex-col">
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
          </div>
        </main>
      </div>
    </div>
  );
}
