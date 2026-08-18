import React, { useState } from "react";
import { Button } from "./ui/button";
//import DownloadHistory from "./DownloadHistory";

const tabs = [
    { id: "home", label: "Home" },
    { id: "videos", label: "Videos" },
    { id: "shorts", label: "Shorts" },
    { id: "playlists", label: "Playlists" },
    { id: "community", label: "Community" },
    { id: "about", label: "About" },
    { id: "downloads", label: "Downloads" }, // ✅ Added downloads tab
];

const Channeltabs = ({ userId }: { userId: string }) => {
    const [activeTab, setActiveTab] = useState("videos");

    return (
        <div>
            {/* Tab buttons */}
            <div className="border-b px-4">
                <div className="flex gap-8 overflow-x-auto">
                    {tabs.map((tab) => (
                        <Button
                            key={tab.id}
                            variant="ghost"
                            className={`px-0 py-4 border-b-2 rounded-none ${activeTab === tab.id
                                ? "border-black text-black"
                                : "border-transparent text-gray-600 hover:text-black"
                                }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className="p-4">
                {activeTab === "home" && <div>🏠 Home content</div>}
                {activeTab === "videos" && <div>🎬 Videos list</div>}
                {activeTab === "shorts" && <div>📱 Shorts feed</div>}
                {activeTab === "playlists" && <div>🎶 Playlists</div>}
                {activeTab === "community" && <div>💬 Community posts</div>}
                {activeTab === "about" && <div>ℹ️ About channel</div>}
                {/*activeTab === "downloads" && <DownloadHistory userId={userId} /> */}
            </div>
        </div>
    );
};

export default Channeltabs;
