"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import VideoGrid from "@/components/VideoGrid";
import CategoryTabs from "@/components/Category-tab";

export default function Home() {
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-zinc-950">
            <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <div className="flex flex-1 overflow-hidden">
                {sidebarOpen && <Sidebar />}
                <div className="flex-1 flex flex-col overflow-y-auto">
                    <CategoryTabs
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                    />
                    <div className="flex-1">
                        <VideoGrid
                            selectedCategory={selectedCategory}
                            onResetCategory={() => setSelectedCategory("All")}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
