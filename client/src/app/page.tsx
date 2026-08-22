'use client'
import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import VideoGrid from "@/components/VideoGrid";
import CategoryTabs from "@/components/Category-tab"

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  return (
    <div className="flex flex-col h-screen">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <CategoryTabs />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <div className="flex-1 overflow-y-auto">
          <VideoGrid />
        </div>
      </div>
    </div>
  );
}
