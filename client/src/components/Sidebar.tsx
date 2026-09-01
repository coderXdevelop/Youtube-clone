"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Compass,
    PlaySquare,
    Clock,
    ThumbsUp,
    User,
    Download,
    ShieldCheck,
    X,
} from "lucide-react";
import { Button } from "./ui/button";
import React, { useState } from "react";
import Channeldialogue from "./ChannelDialog";
import { useUser } from "@/lib/AuthContext";
import { useEnvironment } from "@/lib/EnvironmentContext";
import { cn } from "@/lib/utils";

interface SidebarProps {
    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
    const [isDialogueOpen, setIsDialogueOpen] = useState(false);
    const { user } = useUser();
    const { isSidebarOpen, closeSidebar } = useEnvironment();
    const pathname = usePathname();
    const isHomePage = pathname === "/";

    if (!isHomePage) return null;

    const navItems = [
        { label: "Home", href: "/", icon: Home },
        { label: "Explore", href: "/explore", icon: Compass },
        { label: "Subscriptions", href: "/subscriptions", icon: PlaySquare },
    ];

    const libraryItems = [
        { label: "History", href: "/history", icon: Clock },
        { label: "Liked videos", href: "/liked", icon: ThumbsUp },
        { label: "Watch later", href: "/watch-later", icon: Clock },
        { label: "Downloads", href: "/downloads", icon: Download },
        { label: "Security & Sessions", href: "/security", icon: ShieldCheck },
    ];

    const renderNavLinks = (onItemClick?: () => void) => (
        <>
            {/* Top Section */}
            <nav className="flex flex-col gap-0.5">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onItemClick}
                            className={cn(
                                "flex items-center gap-4 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white font-semibold"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800/70"
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-red-600" : "text-gray-600 dark:text-gray-400")} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <hr className="my-3 border-gray-200 dark:border-neutral-800" />

            {/* Library Section */}
            <nav className="flex flex-col gap-0.5">
                <span className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">You</span>
                {libraryItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onItemClick}
                            className={cn(
                                "flex items-center gap-4 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white font-semibold"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800/70"
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400")} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}

                {user?.channelname ? (
                    <Link
                        href={`/channel/${user._id}`}
                        onClick={onItemClick}
                        className="flex items-center gap-4 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-medium transition-colors"
                    >
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span>Your channel</span>
                    </Link>
                ) : (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-4 px-3 py-2 rounded-xl text-gray-800 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-sm font-medium justify-start transition-colors cursor-pointer mt-1"
                        onClick={() => {
                            if (onItemClick) onItemClick();
                            setIsDialogueOpen(true);
                        }}
                    >
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span>Create Channel</span>
                    </Button>
                )}
            </nav>
        </>
    );

    return (
        <>
            {/* Desktop Sticky Inline Sidebar (Hidden completely when collapsed) */}
            <aside
                className={cn(
                    "hidden h-[calc(100vh-3.5rem)] bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 flex-col py-2 px-3 select-none shrink-0 transition-all duration-200 overflow-y-auto sticky top-14",
                    isSidebarOpen && "lg:flex w-56",
                    className
                )}
            >
                {renderNavLinks()}
            </aside>

            {/* Mobile / Tablet / Drawer Overlay */}
            {isSidebarOpen && (
                <div className={cn("fixed inset-0 z-50 flex select-none", className?.includes("hidden") ? "block" : "lg:hidden")}>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 transition-opacity duration-200"
                        onClick={closeSidebar}
                        aria-hidden="true"
                    />

                    {/* Drawer Content */}
                    <div className="relative w-64 max-w-[80vw] h-full bg-white dark:bg-neutral-900 p-3 shadow-2xl z-10 flex flex-col overflow-y-auto animate-in slide-in-from-left duration-200 border-r border-gray-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between pb-3 px-2 border-b border-gray-100 dark:border-neutral-800 mb-2">
                            <Link href="/" onClick={closeSidebar} className="flex items-center gap-1.5">
                                <div className="bg-red-600 p-1 rounded-lg">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                    </svg>
                                </div>
                                <span className="font-bold text-lg text-gray-900 dark:text-white">YourTube</span>
                            </Link>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={closeSidebar}
                                className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {renderNavLinks(closeSidebar)}
                    </div>
                </div>
            )}

            {/* Channel Dialogue */}
            <Channeldialogue
                isopen={isDialogueOpen}
                onclose={() => setIsDialogueOpen(false)}
                mode="create"
            />
        </>
    );
};

export default Sidebar;
