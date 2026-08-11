import Image from "next/image";
import { Input } from "../components/ui/input";
import youtube from "../../public/assets/youtube.png";
import { Mic, Search, Sidebar } from "lucide-react";

const Header = () => {
    return (
        <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
            {/* Left Section */}
            <div className="flex items-center gap-4">
                <Sidebar className="w-6 h-6 cursor-pointer" />
                <div className="flex items-center gap-1">
                    <Image
                        src={youtube}
                        alt="YouTube Logo"
                        width={90}
                        height={20}
                        priority
                    />
                    <span className="font-semibold text-sm">IN</span>
                </div>
            </div>

            {/* Middle Section (Search Bar) */}
            <div className="flex items-center flex-1 max-w-xl mx-6">
                <Input
                    type="text"
                    placeholder="Search"
                    className="flex-1 rounded-l-full border border-gray-300 px-4 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <button className="bg-gray-100 border border-gray-300 rounded-r-full px-4 py-2 hover:bg-gray-200">
                    <Search className="w-5 h-5 text-gray-600" />
                </button>
                <Mic className="w-5 h-5 ml-3 text-gray-600 cursor-pointer" />
            </div>

            {/* Right Section (Optional future icons like profile, notifications) */}
            <div className="flex items-center gap-4">
                {/* Add profile or notification icons here if needed */}
            </div>
        </header>
    );
};

export default Header;
