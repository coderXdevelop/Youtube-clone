"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
    Download,
    Play,
    Trash2,
    Crown,
    Zap,
    Clock,
    HardDrive,
    Sparkles,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/AxiosInstance";
import { useUser } from "@/lib/AuthContext";
import { getMediaUrl } from "@/lib/playerUtils";
import DownloadQuotaModal from "./DownloadQuotaModal";

interface DownloadedVideoItem {
    _id: string;
    userid: string;
    videoid: {
        _id: string;
        videotitle: string;
        videochanel: string;
        views: number;
        category?: string;
        thumbnailpath?: string;
        filepath?: string;
    } | string;
    videotitle: string;
    thumbnailpath?: string;
    filepath?: string;
    filesize: string;
    downloadtimestamp: string;
    subscriptionplan: string;
    status: string;
}

interface QuotaData {
    plan: string;
    limit: number;
    usedToday: number;
    remainingQuota: number;
    nextResetTime?: string;
}

export default function DownloadsContent() {
    const [downloads, setDownloads] = useState<DownloadedVideoItem[]>([]);
    const [quota, setQuota] = useState<QuotaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
    const { user } = useUser();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "";

    const loadData = async () => {
        if (!user?._id) return;
        setLoading(true);
        try {
            const [historyRes, quotaRes] = await Promise.all([
                axiosInstance.get(`/api/download/history/${user._id}`),
                axiosInstance.get(`/api/download/quota/${user._id}`),
            ]);

            if (Array.isArray(historyRes.data)) {
                setDownloads(historyRes.data);
            }
            if (quotaRes.data) {
                setQuota(quotaRes.data);
            }
        } catch (error) {
            console.error("Error loading downloads data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?._id) {
            loadData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleDeleteRecord = async (recordId: string) => {
        if (!user?._id) return;
        try {
            await axiosInstance.delete(`/api/download/${recordId}?userId=${user._id}`);
            setDownloads((prev) => prev.filter((item) => item._id !== recordId));
        } catch (error) {
            console.error("Error deleting download record:", error);
        }
    };

    const handleDownloadAgain = (videoId: string) => {
        if (!videoId || !user?._id) return;
        window.location.href = `${backendUrl}/api/download/file/${videoId}?userId=${user._id}`;
    };

    const formatFileSize = (bytesStr: string) => {
        const bytes = parseInt(bytesStr, 10);
        if (isNaN(bytes) || bytes === 0) return "Unknown size";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    if (!user) {
        return (
            <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <Download className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Sign in to view your downloads</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Track your downloaded videos, manage daily quotas, and download videos for offline playback.
                </p>
            </div>
        );
    }

    if (loading) {
        return <div className="text-sm text-gray-500 py-12 text-center">Loading downloads library...</div>;
    }

    const planBadgeColors: Record<string, string> = {
        Free: "bg-zinc-800 text-zinc-300 border-zinc-700",
        Bronze: "bg-zinc-800 text-zinc-200 border-zinc-700",
        Silver: "bg-zinc-800 text-zinc-200 border-zinc-700",
        Gold: "bg-white text-zinc-950 font-bold border-white",
    };

    return (
        <div className="space-y-6">
            {/* Header: Title & Subscription Quota Banner */}
            <div className="bg-zinc-900 border border-zinc-800 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-zinc-200 border border-white/10 backdrop-blur-sm">
                                <Download className="w-3.5 h-3.5 text-zinc-300" />
                                Downloads Library
                            </span>
                            {quota && (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${planBadgeColors[quota.plan] || planBadgeColors.Free}`}>
                                    <Crown className="w-3.5 h-3.5" />
                                    {quota.plan} Plan
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Offline Video Downloads
                        </h1>
                        <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
                            Access your downloaded videos, re-download within 24 hours for free, and manage your daily quota.
                        </p>
                    </div>

                    {/* Quota Progress Card */}
                    {quota && (
                        <div className="bg-zinc-800/80 backdrop-blur-md p-4 rounded-xl border border-zinc-700 min-w-[240px] space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-medium">
                                <span className="text-zinc-300">Daily Quota:</span>
                                <span className="font-bold text-white">
                                    {quota.usedToday} / {quota.limit} Used
                                </span>
                            </div>

                            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-white h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min(100, (quota.usedToday / Math.max(1, quota.limit)) * 100)}%`,
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
                                <span className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-zinc-300" />
                                    {quota.remainingQuota} remaining today
                                </span>
                                {quota.plan === "Free" && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-6 px-2 text-[11px] bg-white text-zinc-950 hover:bg-zinc-200 font-bold cursor-pointer"
                                        onClick={() => setIsQuotaModalOpen(true)}
                                    >
                                        Upgrade
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Downloads List */}
            {downloads.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800 text-gray-400 flex items-center justify-center mx-auto">
                        <HardDrive className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">No Downloads Yet</h3>
                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                            When you download videos from the video watch page, they will appear here with full playback and download records.
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 py-2 transition-colors"
                    >
                        Browse Videos
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Downloaded Videos ({downloads.length})
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadData}
                            className="h-7 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            Refresh
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {downloads.map((item) => {
                            const videoObj = typeof item.videoid === "object" && item.videoid !== null ? item.videoid : null;
                            const videoId = videoObj?._id || String(item.videoid || "");
                            const videoTitle = item.videotitle || videoObj?.videotitle || "Video";
                            const channel = videoObj?.videochanel || "Channel";
                            const thumbnail = item.thumbnailpath || videoObj?.thumbnailpath || "";
                            const thumbUrl = getMediaUrl(thumbnail) || "/placeholder.svg";

                            return (
                                <div
                                    key={item._id}
                                    className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Thumbnail & Play Overlay */}
                                        <div className="relative aspect-video bg-black/90 overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={thumbUrl}
                                                alt={videoTitle}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <Link
                                                href={`/watch/${videoId}`}
                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                                    <Play className="w-5 h-5 ml-0.5 fill-gray-900" />
                                                </div>
                                            </Link>
                                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-semibold text-white">
                                                {formatFileSize(item.filesize)}
                                            </span>
                                        </div>

                                        {/* Metadata */}
                                        <div className="p-4 space-y-2">
                                            <Link
                                                href={`/watch/${videoId}`}
                                                className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            >
                                                {videoTitle}
                                            </Link>

                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>{channel}</span>
                                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Downloaded
                                                </span>
                                            </div>

                                            <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(item.downloadtimestamp))} ago
                                                </span>
                                                <span className="font-medium text-gray-500 dark:text-gray-400">
                                                    Plan: {item.subscriptionplan}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="p-3 bg-gray-50 dark:bg-zinc-800/40 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDownloadAgain(videoId)}
                                            className="h-8 text-xs flex-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                        >
                                            <Download className="w-3.5 h-3.5 mr-1" />
                                            Download File
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDeleteRecord(item._id)}
                                            className="h-8 px-2 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                            title="Remove from downloads"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quota Modal */}
            {quota && (
                <DownloadQuotaModal
                    isOpen={isQuotaModalOpen}
                    onClose={() => setIsQuotaModalOpen(false)}
                    plan={quota.plan}
                    limit={quota.limit}
                    usedToday={quota.usedToday}
                    nextResetTime={quota.nextResetTime}
                />
            )}
        </div>
    );
}
