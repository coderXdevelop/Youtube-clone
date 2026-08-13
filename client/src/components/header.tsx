'use client'
import { useState } from "react";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, Search, Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type User = {
    name: string;
    id: number;
    avatar: string;
};

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

    const user: User | null = {
        name: "John Doe",
        id: 23,
        avatar: "https://i.pravatar.cc/150?img=3",
    };

    return (
        <header className="flex items-center justify-between px-4 py-2 border-b bg-white relative">
            {/* Left Section */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                    <Menu className="w-6 h-6" />
                </Button>
                <Link href="/" className="flex items-center gap-1">
                    <div className="bg-red-600 p-1 rounded">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                    </div>
                    <span className="text-xl font-medium">YouTube</span>
                    <span className="text-xs text-gray-400 ml-1">IN</span>
                </Link>
            </div>

            {/* Middle Section (Search Bar) */}
            <div className="flex items-center flex-1 max-w-xl mx-6">
                <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    className="flex-1 rounded-l-full border border-gray-300 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <button className="bg-gray-100 border border-gray-300 rounded-r-full px-4 py-2 hover:bg-gray-200">
                    <Search className="w-5 h-5 text-gray-600" />
                </button>
                <Mic className="w-5 h-5 ml-3 text-gray-600 cursor-pointer" />
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4 relative">
                {user ? (
                    <div className="relative">
                        <button onClick={() => setMenuOpen(!menuOpen)}>
                            <Avatar>
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>
                                    {user.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                </AvatarFallback>
                            </Avatar>
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg">
                                <ul className="py-2">
                                    <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                                        <Link href="/channel">Your Channel</Link>
                                    </li>
                                    <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                                        <Link href="/signout">Sign out</Link>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link href="/signin">
                        <button className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-gray-100">
                            Sign in
                        </button>
                    </Link>
                )}
            </div>
        </header>
    );
};

export default Header;
