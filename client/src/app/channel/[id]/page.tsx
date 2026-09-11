"use client";

import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import ChannelCommunity from "@/components/ChannelCommunity";
import ChannelPlaylists from "@/components/ChannelPlaylists";
import { Video } from "@/components/VideoCard";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/AxiosInstance";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
    Play,
    Eye,
    Calendar,
    Mail,
    ShieldCheck,
    Globe,
    Film,
    Users,
    Sparkles,
    MessageSquare,
    ListVideo,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChannelProfile {
    _id?: string;
    name?: string;
    channelname?: string;
    description?: string;
    discription?: string;
    image?: string;
    email?: string;
    subscribersCount?: number;
    joinedon?: string | Date;
}

const ChannelPage = () => {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { user } = useUser();

    const [fetchedChannel, setFetchedChannel] = useState<ChannelProfile | null>(null);
    const [channelVideos, setChannelVideos] = useState<Video[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(true);
    const [refreshIndex, setRefreshIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<string>("videos");
    const [showUploader, setShowUploader] = useState<boolean>(false);

    const isChannelOwner = Boolean(user && user._id === id);
    const channel = isChannelOwner ? user : (fetchedChannel || { _id: id, channelname: "Channel", name: "Channel" });

    // Fetch channel details if viewing another user's channel
    useEffect(() => {
        let ignore = false;
        if (id && (!user || user._id !== id)) {
            axiosInstance
                .get(`/api/user/profile/${id}`)
                .then((res) => {
                    if (!ignore && res.data) {
                        setFetchedChannel(res.data);
                    }
                })
                .catch(() => {
                    if (!ignore) {
                        setFetchedChannel({ _id: id, channelname: "Channel", name: "Channel" });
                    }
                });
        }
        return () => {
            ignore = true;
        };
    }, [id, user]);

    // Fetch only this channel's videos
    useEffect(() => {
        let ignore = false;
        if (id) {
            axiosInstance
                .get("/api/video/getall")
                .then((res) => {
                    if (!ignore && Array.isArray(res.data)) {
                        const channelName = channel?.channelname || user?.channelname || "";
                        const userName = channel?.name || user?.name || "";

                        const filtered = res.data.filter((v: Video) => {
                            const matchUploader = v.uploader === id;
                            const matchChannelName =
                                channelName &&
                                v.videochanel &&
                                v.videochanel.toLowerCase() === channelName.toLowerCase();
                            const matchName =
                                userName &&
                                v.videochanel &&
                                v.videochanel.toLowerCase() === userName.toLowerCase();

                            return matchUploader || matchChannelName || matchName;
                        });
                        setChannelVideos(filtered);
                    }
                })
                .catch((err) => {
                    console.error("Error fetching channel videos:", err);
                })
                .finally(() => {
                    if (!ignore) setLoadingVideos(false);
                });
        }
        return () => {
            ignore = true;
        };
    }, [id, channel?.channelname, channel?.name, user?.channelname, user?.name, refreshIndex]);

    const handleUploadSuccess = () => {
        setRefreshIndex((prev) => prev + 1);
        setShowUploader(false);
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!user) return;
        try {
            await axiosInstance.delete(`/api/video/${videoId}?userId=${user._id}`, {
                data: { userId: user._id },
            });
            setChannelVideos((prev) => prev.filter((v) => v._id !== videoId));
        } catch (error) {
            console.error("Failed to delete video:", error);
        }
    };

    const totalViews = useMemo(() => {
        return channelVideos.reduce((acc, v) => acc + (v.views || 0), 0);
    }, [channelVideos]);

    // Top featured video for the channel home tab
    const featuredVideo = channelVideos.length > 0 ? channelVideos[0] : null;

    const joinedDateFormatted = channel?.joinedon
        ? new Date(channel.joinedon).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
          })
        : "Recently joined";

    return (
        <div className="flex-1 min-h-screen bg-white dark:bg-zinc-950 pb-16">
            <div className="max-w-7xl mx-auto">
                {/* Channel Header Banner & Identity */}
                <ChannelHeader
                    channel={channel}
                    user={user}
                    videoCount={channelVideos.length}
                    totalViews={totalViews}
                    onOpenUpload={isChannelOwner ? () => setShowUploader(!showUploader) : undefined}
                />

                {/* Sticky Tab Navigation Bar */}
                <Channeltabs
                    userId={id}
                    activeTab={activeTab}
                    onTabChange={(tabId) => setActiveTab(tabId)}
                />

                {/* Collapsible Video Uploader Section for Channel Owner */}
                {isChannelOwner && showUploader && (
                    <div className="px-4 sm:px-6 md:px-8 pt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="relative">
                            <button
                                onClick={() => setShowUploader(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 cursor-pointer z-10"
                                title="Close uploader"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <VideoUploader
                                channelId={id}
                                channelName={channel?.channelname || user?.channelname || user?.name || "My Channel"}
                                onUploadSuccess={handleUploadSuccess}
                            />
                        </div>
                    </div>
                )}

                {/* Main Tab Content */}
                <div className="px-4 sm:px-6 md:px-8 pt-6">
                    {loadingVideos ? (
                        <div className="py-24 text-center">
                            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Loading channel content...
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* HOME TAB: Featured Spotlight Video + Videos Grid */}
                            {activeTab === "home" && (
                                <div className="space-y-8">
                                    {featuredVideo && (
                                         <div className="bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-pink-50/10 dark:from-zinc-900/90 dark:via-zinc-900/60 dark:to-zinc-900/30 border border-gray-200/80 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-7 shadow-xs">
                                             <div className="flex items-center gap-2 mb-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                 <Sparkles className="w-4 h-4" />
                                                 <span>Featured Spotlight Video</span>
                                             </div>

                                             <div className="flex flex-col lg:flex-row gap-6 items-start">
                                                 {/* Thumbnail preview with Play Trigger */}
                                                 <div
                                                     onClick={() => router.push(`/watch/${featuredVideo._id}`)}
                                                     className="relative w-full lg:w-96 aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-zinc-900 to-black cursor-pointer group shrink-0 shadow-md flex items-center justify-center"
                                                 >
                                                     {featuredVideo.thumbnailpath ? (
                                                         // eslint-disable-next-line @next/next/no-img-element
                                                         <img
                                                             src={featuredVideo.thumbnailpath}
                                                             alt=""
                                                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                             onError={(e) => {
                                                                 (e.target as HTMLElement).style.display = "none";
                                                             }}
                                                         />
                                                     ) : (
                                                         <Film className="w-12 h-12 text-indigo-400/40" />
                                                     )}
                                                     <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                                                         <div className="w-13 h-13 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                                             <Play className="w-6 h-6 fill-white ml-0.5" />
                                                         </div>
                                                     </div>
                                                 </div>

                                                 {/* Spotlight Meta */}
                                                 <div className="flex-1 space-y-3">
                                                     <h3
                                                         onClick={() => router.push(`/watch/${featuredVideo._id}`)}
                                                         className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-2 transition-colors leading-snug"
                                                     >
                                                         {featuredVideo.videotitle}
                                                     </h3>
                                                     <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                         <span>{(featuredVideo.views || 0).toLocaleString()} views</span>
                                                         <span>•</span>
                                                         <span>
                                                             {featuredVideo.createdAt
                                                                 ? new Date(featuredVideo.createdAt).toLocaleDateString("en-US", {
                                                                       month: "short",
                                                                       day: "numeric",
                                                                       year: "numeric",
                                                                   })
                                                                 : "Recently published"}
                                                         </span>
                                                     </div>
                                                     <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                                                         {featuredVideo.videodescription ||
                                                             featuredVideo.description ||
                                                             "Watch the latest content from this creator."}
                                                     </p>
                                                     <div className="pt-1">
                                                         <Button
                                                             onClick={() => router.push(`/watch/${featuredVideo._id}`)}
                                                             className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs px-5 py-2.5 flex items-center gap-2 cursor-pointer shadow-xs"
                                                         >
                                                             <Play className="w-3.5 h-3.5 fill-white" />
                                                             <span>Watch Now</span>
                                                         </Button>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                    )}

                                    {/* Video Grid for Home */}
                                    <div className="space-y-4">
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            Latest Uploads
                                        </h2>
                                        <ChannelVideos
                                            videos={channelVideos}
                                            isOwner={isChannelOwner}
                                            onDeleteVideo={handleDeleteVideo}
                                            onOpenUpload={isChannelOwner ? () => setShowUploader(true) : undefined}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* VIDEOS TAB */}
                            {activeTab === "videos" && (
                                <ChannelVideos
                                    videos={channelVideos}
                                    isOwner={isChannelOwner}
                                    onDeleteVideo={handleDeleteVideo}
                                    onOpenUpload={isChannelOwner ? () => setShowUploader(true) : undefined}
                                />
                            )}

                            {/* PLAYLISTS TAB */}
                            {activeTab === "playlists" && (
                                <ChannelPlaylists
                                    channelId={id}
                                    channelName={channel?.channelname || user?.channelname || user?.name || "My Channel"}
                                    isOwner={isChannelOwner}
                                    allVideos={channelVideos}
                                />
                            )}

                            {/* COMMUNITY TAB */}
                            {activeTab === "community" && (
                                <ChannelCommunity
                                    channelId={id}
                                    channelName={channel?.channelname || user?.channelname || user?.name || "My Channel"}
                                    isOwner={isChannelOwner}
                                />
                            )}

                            {/* ABOUT TAB */}
                            {activeTab === "about" && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl">
                                    {/* Bio / Description Card */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="bg-gray-50/70 dark:bg-zinc-900/60 border border-gray-200/80 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-4">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                About the Channel
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                {channel?.description ||
                                                    channel?.discription ||
                                                    "No description provided for this channel yet."}
                                            </p>
                                        </div>

                                        {/* Contact & Details */}
                                        <div className="bg-gray-50/70 dark:bg-zinc-900/60 border border-gray-200/80 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-4">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                Details
                                            </h3>
                                            <div className="space-y-3 text-sm">
                                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                                    <Mail className="w-4 h-4 text-gray-400" />
                                                    <span className="text-xs font-semibold text-gray-500">Business Inquiries:</span>
                                                    <span className="font-medium text-xs">{channel?.email || "Private"}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                                    <Globe className="w-4 h-4 text-gray-400" />
                                                    <span className="text-xs font-semibold text-gray-500">Location:</span>
                                                    <span className="font-medium text-xs">India</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Column */}
                                    <div className="space-y-4">
                                        <div className="bg-gray-50/70 dark:bg-zinc-900/60 border border-gray-200/80 dark:border-zinc-800/80 rounded-3xl p-6 space-y-5">
                                            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                                                Stats & Highlights
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Joined Platform</p>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{joinedDateFormatted}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                                        <Eye className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Total Video Views</p>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{totalViews.toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl">
                                                        <Film className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Total Uploads</p>
                                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{channelVideos.length} videos</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Creator Status</p>
                                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Verified Platform Creator</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChannelPage;