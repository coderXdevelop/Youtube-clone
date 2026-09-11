-import React from "react";
import {
    Home,
    Video as VideoIcon,
    Flame,
    ListVideo,
    MessageSquare,
    Info,
} from "lucide-react";

interface ChanneltabsProps {
    userId?: string;
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
}

const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "videos", label: "Videos", icon: VideoIcon },
    { id: "playlists", label: "Playlists", icon: ListVideo },
    { id: "community", label: "Community", icon: MessageSquare },
    { id: "about", label: "About", icon: Info },
];

const Channeltabs: React.FC<ChanneltabsProps> = ({ activeTab = "videos", onTabChange }) => {
    return (
        <div className="border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 sm:px-6 md:px-8">
            <div className="flex gap-1 sm:gap-4 overflow-x-auto no-scrollbar py-0.5">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange?.(tab.id)}
                            className={`relative flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer rounded-t-lg ${
                                isActive
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-zinc-900"
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`} />
                            <span>{tab.label}</span>

                            {/* Active bottom indicator line */}
                            {isActive && (
                                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Channeltabs;
