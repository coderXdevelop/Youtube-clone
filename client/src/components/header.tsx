'use client'
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, Search, Menu, Video, Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type User = {
    name: string;
    id: number;
    avatar: string;
};

const Header = ({ toggleSidebar }: { toggleSidebar?: () => void }) => {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

    const user: User | null = {
        name: "John Doe",
        id: 23,
        avatar: "https://i.pravatar.cc/150?img=3",
    };

    return (
        <header className="flex items-center justify-between px-4 h-14 border-b border-gray-200 bg-white sticky top-0 z-50">
            {/* Left Section */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="rounded-full hover:bg-gray-100">
                    <Menu className="w-5 h-5 text-gray-700" />
                </Button>
                <Link href="/" className="flex items-center gap-1">
                    <div className="flex items-center gap-1">
                        <div className="bg-red-600 px-1.5 py-0.5 rounded-lg flex items-center justify-center">
                            <svg width="18" height="13" viewBox="0 0 24 17" fill="white">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                            </svg>
                        </div>
                        <span className="text-lg font-semibold tracking-tighter text-gray-900 flex items-center">
                            YouTube
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium self-start mt-1 ml-0.5">IN</span>
                    </div>
                </Link>
            </div>

            {/* Middle Section (Search Bar) */}
            <div className="flex items-center flex-1 max-w-2xl mx-4 justify-center">
                <div className="flex items-center flex-1 max-w-xl">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full rounded-l-full border border-r-0 border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-blue-500 h-10"
                    />
                    <button className="bg-gray-50 border border-gray-300 rounded-r-full px-5 h-10 hover:bg-gray-100 flex items-center justify-center text-gray-700">
                        <Search className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
                <button className="bg-gray-100 hover:bg-gray-200 p-2.5 rounded-full ml-3 text-gray-700 cursor-pointer flex items-center justify-center">
                    <Mic className="w-4 h-4 text-gray-700" />
                </button>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 relative">
                <button className="p-2 hover:bg-gray-100 rounded-full text-gray-700 cursor-pointer">
                    <Video className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full text-gray-700 cursor-pointer">
                    <Bell className="w-5 h-5" />
                </button>
                {user ? (
                    <div className="relative ml-1">
                        <button onClick={() => setMenuOpen(!menuOpen)} className="focus:outline-none">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="bg-purple-600 text-white font-medium text-xs">
                                    {user.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                </AvatarFallback>
                            </Avatar>
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50">
                                <ul>
                                    <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700">
                                        <Link href="/channel">Your Channel</Link>
                                    </li>
                                    <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700">
                                        <Link href="/signout">Sign out</Link>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link href="/signin">
                        <button className="px-4 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-full hover:bg-blue-50">
                            Sign in
                        </button>
                    </Link>
                )}
            </div>
        </header>
    );
};

export default Header;
