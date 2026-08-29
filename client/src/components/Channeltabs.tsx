import React, { useState } from "react";
import { Button } from "./ui/button";

interface ChanneltabsProps {
    userId?: string;
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
}

const tabs = [
    { id: "home", label: "Home" },
    { id: "videos", label: "Videos" },
    { id: "shorts", label: "Shorts" },
    { id: "playlists", label: "Playlists" },
    { id: "community", label: "Community" },
    { id: "about", label: "About" },
];

const Channeltabs: React.FC<ChanneltabsProps> = ({ activeTab: propActiveTab, onTabChange }) => {
    const [localTab, setLocalTab] = useState("videos");
    const activeTab = propActiveTab ?? localTab;

    const handleSelect = (id: string) => {
        setLocalTab(id);
        onTabChange?.(id);
    };

    return (
        <div className="border-b px-4">
            <div className="flex gap-8 overflow-x-auto">
                {tabs.map((tab) => (
                    <Button
                        key={tab.id}
                        variant="ghost"
                        className={`px-0 py-4 border-b-2 rounded-none ${activeTab === tab.id ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                            }`}
                        onClick={() => handleSelect(tab.id)}
                    >
                        {tab.label}
                    </Button>
                ))}
            </div>
        </div>
    );
};

export default Channeltabs;