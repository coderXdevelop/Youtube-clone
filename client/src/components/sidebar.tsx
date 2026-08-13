'use client'
import Link from "next/link";
import { Home, Compass, PlaySquare, Clock, ThumbsUp, ListVideo } from "lucide-react";

const Sidebar = () => {
    return (
        <aside className="w-60 h-screen border-r bg-white flex flex-col py-4">
            {/* Top Section */}
            <nav className="flex flex-col gap-2">
                <Link href="/home" className="flex items-center gap-4 px-4 py-2 hover:bg-gray-100 rounded-md">
                    <Home className="w-5 h-5" />
                    <span>Home</span>
                </Link>
                <Link href="/explore" className="flex items-center gap-4 px-4 py-2 hover:bg-gray-100 rounded-md">
                    <Compass className="w-5 h-5" />
                    <span>Explore</span>
                </Link>
                <Link href="/subscriptions" className="flex items-center gap-4 px-4 py-2 hover:bg-gray-100 rounded-md">
                    <PlaySquare className="w-5 h-5" />
                    <span>Subscriptions</span>
                </Link>
            </nav>

            <hr className="my-4" />

            {/* Library Section */}
            <nav className="flex flex-col gap-2">
                <Link href="/library" className="flex items-center gap-4 px-4 py-2 hover:bg-gray-100 rounded-md">
                    <ListVideo className="w-5 h-5" />
                    <span>Library</span>
                </Link>
                <Link href="/history" className="flex items-center gap-4 px-4 py-2 hover:bg-gray-100 rounded-md">
                    <Clock className="w-5 h-5" />
                    <span>History</span>
                </Link>
                <Link href="/liked" className="flex items-center gap-4 px-4 py-2 hover:bg-gray-100 rounded-md">
                    <ThumbsUp className="w-5 h-5" />
                    <span>Liked videos</span>
                </Link>
            </nav>
        </aside>
    );
};

export default Sidebar;
