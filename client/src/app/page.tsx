"use client";

import { useState } from "react";
import VideoGrid from "@/components/VideoGrid";
import CategoryTabs from "@/components/Category-tab";

export default function Home() {
    const [selectedCategory, setSelectedCategory] = useState<string>("All");

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <CategoryTabs
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
            />
            <div className="flex-1 p-2 sm:p-4">
                <VideoGrid
                    selectedCategory={selectedCategory}
                    onResetCategory={() => setSelectedCategory("All")}
                />
            </div>
        </div>
    );
}
