'use client'
import Link from "next/link";
import { Home, Compass, PlaySquare, Clock, ThumbsUp, User } from "lucide-react";
import { Button } from "./ui/button";
import React, { useState } from "react";
import Channeldialogue from "./ChannelDialog";

// Fake user for now — replace with backend later
const user: {
    _id: string;
    name: string;
    email: string;
    image: string;
    channelname: string;
} | null = {
    _id: "1",
    name: "John Doe",
    email: "john@example.com",
    image: "https://github.com/shadcn.png?height=32&width=32",
    channelname: "", // empty means no channel yet
};

const Sidebar = () => {
    const [isDialogueOpen, setIsDialogueOpen] = useState(false);

    return (
        <>
            <aside className="w-56 h-[calc(100vh-3.5rem)] bg-white flex flex-col py-2 px-3 select-none flex-shrink-0">
                {/* Top Section */}
                <nav className="flex flex-col gap-0.5">
                    <Link
                        href="/"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 rounded-xl text-gray-800 text-sm font-normal"
                    >
                        <Home className="w-5 h-5 text-gray-700" />
                        <span>Home</span>
                    </Link>
                    <Link
                        href="/explore"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 rounded-xl text-gray-800 text-sm font-normal"
                    >
                        <Compass className="w-5 h-5 text-gray-700" />
                        <span>Explore</span>
                    </Link>
                    <Link
                        href="/subscriptions"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 rounded-xl text-gray-800 text-sm font-normal"
                    >
                        <PlaySquare className="w-5 h-5 text-gray-700" />
                        <span>Subscriptions</span>
                    </Link>
                </nav>

                <hr className="my-3 border-gray-200" />

                {/* Library Section */}
                <nav className="flex flex-col gap-0.5">
                    <Link
                        href="/history"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 rounded-xl text-gray-800 text-sm font-normal"
                    >
                        <Clock className="w-5 h-5 text-gray-700" />
                        <span>History</span>
                    </Link>
                    <Link
                        href="/liked"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 rounded-xl text-gray-800 text-sm font-normal"
                    >
                        <ThumbsUp className="w-5 h-5 text-gray-700" />
                        <span>Liked videos</span>
                    </Link>
                    <Link
                        href="/watch-later"
                        className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 rounded-xl text-gray-800 text-sm font-normal"
                    >
                        <Clock className="w-5 h-5 text-gray-700" />
                        <span>Watch later</span>
                    </Link>

                    {user?.channelname ? (
                        // ✅ Show "Your channel" if channel exists
                        <Link
                            href={`/channel/${user._id}`}
                            className="flex items-center gap-5 px-3 py-2 hover:bg-gray-100 rounded-xl text-gray-800 text-sm font-normal"
                        >
                            <User className="w-5 h-5 text-gray-700" />
                            <span>Your channel</span>
                        </Link>
                    ) : (
                        // ✅ Show "Create Channel" if no channel
                        <Button
                            variant="secondary"
                            size="sm"
                            className="flex items-center gap-5 px-3 py-2 rounded-xl text-gray-800 text-sm font-normal justify-start"
                            onClick={() => setIsDialogueOpen(true)}
                        >
                            <User className="w-5 h-5 text-gray-700" />
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
