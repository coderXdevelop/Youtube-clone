"use client";

import Link from "next/link";
import {
    Home,
    Compass,
    PlaySquare,
    Clock,
    ThumbsUp,
    User,
    Download,
    ShieldCheck,
} from "lucide-react";
import { Button } from "./ui/button";
import React, { useState } from "react";
import Channeldialogue from "./ChannelDialog";
import { useUser } from "@/lib/AuthContext";

const Sidebar = () => {
    const [isDialogueOpen, setIsDialogueOpen] = useState(false);
    const { user } = useUser();

    return (
        <>
            <aside className="w-56 h-[calc(100vh-3.5rem)] bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 flex flex-col py-2 px-3 select-none flex-shrink-0 transition-colors">
                {/* Top Section */}
                <nav className="flex flex-col gap-0.5">
                    <Link
                        href="/"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-normal transition-colors"
                    >
                        <Home className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span>Home</span>
                    </Link>
                    <Link
                        href="/explore"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-normal transition-colors"
                    >
                        <Compass className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span>Explore</span>
                    </Link>
                    <Link
                        href="/subscriptions"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-normal transition-colors"
                    >
                        <PlaySquare className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span>Subscriptions</span>
                    </Link>
                </nav>

                <hr className="my-3 border-gray-200 dark:border-neutral-800" />

                {/* Library Section */}
                <nav className="flex flex-col gap-0.5">
                    <Link
                        href="/history"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-normal transition-colors"
                    >
                        <Clock className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span>History</span>
                    </Link>
                    <Link
                        href="/liked"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-normal transition-colors"
                    >
                        <ThumbsUp className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span>Liked videos</span>
                    </Link>
                    <Link
                        href="/watch-later"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-normal transition-colors"
                    >
                        <Clock className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span>Watch later</span>
                    </Link>
                    <Link
                        href="/downloads"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-normal transition-colors"
                    >
                        <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span>Downloads</span>
                    </Link>
                    <Link
                        href="/security"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-normal transition-colors"
                    >
                        <ShieldCheck className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                        <span>Security</span>
                    </Link>

                    {user?.channelname ? (
                        <Link
                            href={`/channel/${user._id}`}
                            className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl text-gray-800 dark:text-gray-200 text-sm font-normal transition-colors"
                        >
                            <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <span>Your channel</span>
                        </Link>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="flex items-center gap-5 px-3 py-2 rounded-xl text-gray-800 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-sm font-normal justify-start transition-colors cursor-pointer"
                            onClick={() => setIsDialogueOpen(true)}
                        >
                            <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <span>Create Channel</span>
                        </Button>
                    )}
                </nav>
            </aside>

            {/* Channel Dialogue at bottom */}
            <Channeldialogue
                isopen={isDialogueOpen}
                onclose={() => setIsDialogueOpen(false)}
                mode="create"
            />
        </>
    );
};

export default Sidebar;
