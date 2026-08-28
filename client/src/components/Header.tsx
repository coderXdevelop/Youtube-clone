"use client";

import { Bell, Menu, Mic, Search, User, VideoIcon, ShieldCheck, Sun, Moon } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useRouter } from "next/navigation";
import { useEnvironment } from "@/lib/EnvironmentContext";
import { cn } from "@/lib/utils";
import Channeldialogue from "./ChannelDialog";
import { useUser } from "@/lib/AuthContext";

interface HeaderProps {
    toggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    const { user, logout, handlegooglesignin } = useUser();
    const { theme, setThemePreference, toggleSidebar: envToggleSidebar } = useEnvironment();
    const isLight = theme === "light";

    const onToggle = toggleSidebar || envToggleSidebar;

    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogueOpen, setIsDialogueOpen] = useState(false);
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleKeypress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch(e);
        }
    };

    return (
        <header
            className={cn(
                "sticky top-0 z-40 flex items-center justify-between px-2 sm:px-4 py-2 border-b transition-colors",
                isLight
                    ? "bg-white/95 text-gray-900 border-gray-200 backdrop-blur-md"
                    : "bg-neutral-900/95 text-white border-neutral-800 backdrop-blur-md"
            )}
        >
            {/* Left Section */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className={cn("h-9 w-9", isLight ? "text-gray-900 hover:bg-gray-100" : "text-white hover:bg-neutral-800")}
                    aria-label="Toggle Navigation Menu"
                >
                    <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
                <Link href="/" className="flex items-center gap-1.5 select-none group">
                    <div className="bg-red-600 p-1 sm:p-1.5 rounded-lg flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="w-4 h-4 sm:w-5 sm:h-5">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                    </div>
                    <span className="text-base sm:text-xl font-bold tracking-tight hidden sm:inline">YourTube</span>
                    <span className="text-[10px] sm:text-xs text-gray-400 font-semibold hidden md:inline">IN</span>
                </Link>
            </div>

            {/* Middle Section (Search) */}
            <form
                onSubmit={handleSearch}
                className="flex items-center gap-1.5 sm:gap-2 flex-1 max-w-xl mx-2 sm:mx-6"
            >
                <div className="flex flex-1 min-w-0">
                    <Input
                        type="search"
                        placeholder="Search videos, channels..."
                        value={searchQuery}
                        onKeyPress={handleKeypress}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="rounded-l-full border-r-0 focus-visible:ring-0 bg-transparent text-xs sm:text-sm h-8 sm:h-10 text-gray-900 dark:text-white placeholder:text-gray-400 border-gray-300 dark:border-neutral-700"
                    />
                    <Button
                        type="submit"
                        className={cn(
                            "rounded-r-full px-3 sm:px-5 h-8 sm:h-10 border border-l-0 shrink-0",
                            isLight
                                ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                                : "bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700"
                        )}
                    >
                        <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "rounded-full h-8 w-8 sm:h-10 sm:w-10 hover:bg-gray-100 dark:hover:bg-neutral-800 hidden sm:inline-flex shrink-0",
                        isLight ? "text-gray-700" : "text-white"
                    )}
                >
                    <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
            </form>

            {/* Right Section */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {user ? (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8 sm:h-9 sm:w-9 hidden md:inline-flex", isLight ? "text-gray-800 hover:bg-gray-100" : "text-white hover:bg-neutral-800")}
                            onClick={() => setIsDialogueOpen(true)}
                            title="Create"
                        >
                            <VideoIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8 sm:h-9 sm:w-9 hidden md:inline-flex", isLight ? "text-gray-800 hover:bg-gray-100" : "text-white hover:bg-neutral-800")}
                            title="Notifications"
                        >
                            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 dark:hover:ring-neutral-700 transition-all outline-none cursor-pointer">
                                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                                    <AvatarImage src={user.image} />
                                    <AvatarFallback className="text-xs sm:text-sm font-semibold">{user.name?.[0] || "U"}</AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-60" align="end">
                                <div className="px-3 py-2 border-b border-gray-100 dark:border-neutral-800">
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.name || "User"}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                </div>
                                {user?.channelname ? (
                                    <DropdownMenuItem>
                                        <Link href={`/channel/${user?._id}`} className="w-full">Your channel</Link>
                                    </DropdownMenuItem>
                                ) : (
                                    <div className="px-2 py-1.5">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={() => setIsDialogueOpen(true)}
                                        >
                                            Create Channel
                                        </Button>
                                    </div>
                                )}
                                <DropdownMenuItem>
                                    <Link href="/history" className="w-full">History</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Link href="/liked" className="w-full">Liked videos</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Link href="/watch-later" className="w-full">Watch later</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Link href="/downloads" className="w-full">Downloads</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Link href="/subscriptions" className="flex items-center gap-2 w-full">
                                        Subscriptions & Plans
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Link href="/security" className="flex items-center gap-2 w-full font-medium text-indigo-600 dark:text-indigo-400">
                                        <ShieldCheck className="w-4 h-4" />
                                        Security & Sessions
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => setThemePreference(theme === "dark" ? "light" : "dark", user?._id)}
                                    className="cursor-pointer"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="flex items-center gap-2 text-xs">
                                            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-purple-500" />}
                                            Theme: <span className="capitalize font-semibold">{theme}</span>
                                        </span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 dark:text-red-400 text-xs">
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                ) : (
                    <Button
                        size="sm"
                        className="flex items-center gap-1.5 text-xs h-8 sm:h-9 px-2.5 sm:px-3.5"
                        onClick={handlegooglesignin}
                    >
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>Sign in</span>
                    </Button>
                )}
            </div>

            {/* Channel Dialogue */}
            <Channeldialogue
                isopen={isDialogueOpen}
                onclose={() => setIsDialogueOpen(false)}
                mode="create"
            />
        </header>
    );
};

export default Header;
