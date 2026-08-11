'use client'
import Image from "next/image";
import { useState } from "react";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import youtube from "../../public/assets/youtube.png";
import { Mic, Search } from "lucide-react";

type User = {
    name: string;
    id: number;
    avatar: string;
};

const Header = () => {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

    // Simulate logged-in user (set to null if not logged in)
    const user: User | null = {
        name: "John Doe",
        id: 23,
        avatar: "https://i.pravatar.cc/150?img=3",
    };
    // const user: User | null = null; // try this to simulate logged-out state

    return (
        <header className="flex items-center justify-between px-4 py-2 border-b bg-white relative">
            {/* Left Section */}
            <div className="flex items-center gap-2">
                <Image
                    src={youtube}
                    alt="YouTube Logo"
                    width={90}
                    height={20}
                    priority
                />
                <span className="font-semibold text-sm">IN</span>
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
                                        Your Channel
                                    </li>
                                    <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                                        Sign out
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <button className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-gray-100">
                        Sign in
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
