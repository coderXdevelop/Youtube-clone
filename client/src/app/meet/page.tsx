"use client";

import React, { useState } from "react";
import { Video, Plus, LogIn, ShieldCheck, Lock, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/AuthContext";
import axios from "axios";
export default function MeetLandingPage() {
    const [joinRoomId, setJoinRoomId] = useState("");
    const [meetingTitle, setMeetingTitle] = useState("");
    const [passcode, setPasscode] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { user } = useUser();
    const router = useRouter();

    const handleCreateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            alert("Please sign in to create a video meeting.");
            return;
        }

        setIsCreating(true);
        setErrorMsg(null);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await axios.post(`${backendUrl}/api/meeting/create`, {
                title: meetingTitle || "Instant Video Meeting",
                passcode: passcode.trim(),
                userId: user._id || user.id,
            });

            if (res.data?.meeting?.roomId) {
                router.push(`/meet/${res.data.meeting.roomId}`);
            }
        } catch (err: any) {
            console.error("Create meeting error:", err);
            setErrorMsg(err.response?.data?.error || "Failed to create meeting room.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinMeeting = (e: React.FormEvent) => {
        e.preventDefault();
        let cleaned = joinRoomId.trim();
        if (!cleaned) return;

        // If user pasted a full URL
        if (cleaned.includes("/meet/")) {
            cleaned = cleaned.split("/meet/")[1];
        }

        router.push(`/meet/${cleaned}`);
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans select-none">
            <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-6xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full my-auto">
                    {/* Left Hero Text */}
                    <div className="lg:col-span-6 flex flex-col gap-6 text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/80 border border-red-800 text-red-400 text-xs font-semibold w-fit">
                            <Sparkles className="w-4 h-4 text-red-500" />
                            <span>Real-Time HD Video Calls & Meetings</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                            Connect, Collaborate & Share Streamlessly.
                        </h1>

                        <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                            Host secure 1-to-1 and group video meetings with high quality WebRTC audio & video, screen sharing, in-call chat, host moderation controls, and call recording.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                            <div className="flex items-center gap-2 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="font-semibold text-gray-300">Secure & Encrypted</span>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                                <span className="font-semibold text-gray-300">Host Moderation</span>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                                <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                                <span className="font-semibold text-gray-300">No Time Limits</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Action Box */}
                    <div className="lg:col-span-6 flex flex-col gap-6">
                        {/* Join Room Form */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <LogIn className="w-5 h-5 text-red-500" /> Join an Existing Meeting
                            </h2>
                            <form onSubmit={handleJoinMeeting} className="flex flex-col sm:flex-row gap-3">
                                <Input
                                    placeholder="Enter Room ID or paste meeting link"
                                    value={joinRoomId}
                                    onChange={(e) => setJoinRoomId(e.target.value)}
                                    className="bg-neutral-950 border-neutral-800 text-white rounded-xl text-sm flex-1"
                                />
                                <Button
                                    type="submit"
                                    disabled={!joinRoomId.trim()}
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl px-6 cursor-pointer shrink-0"
                                >
                                    Join
                                </Button>
                            </form>
                        </div>

                        {/* Create Room Form */}
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-emerald-500" /> Start a New Meeting
                            </h2>

                            <form onSubmit={handleCreateMeeting} className="flex flex-col gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                                        Meeting Title (Optional)
                                    </label>
                                    <Input
                                        placeholder="e.g., Weekly Team Sync"
                                        value={meetingTitle}
                                        onChange={(e) => setMeetingTitle(e.target.value)}
                                        className="bg-neutral-950 border-neutral-800 text-white rounded-xl text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                                        Security Passcode (Optional)
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="Require a passcode to join"
                                        value={passcode}
                                        onChange={(e) => setPasscode(e.target.value)}
                                        className="bg-neutral-950 border-neutral-800 text-white rounded-xl text-sm"
                                    />
                                </div>

                                {errorMsg && (
                                    <p className="text-xs text-red-400 bg-red-950/60 p-2.5 rounded-lg border border-red-900">
                                        {errorMsg}
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] mt-1"
                                >
                                    <Video className="w-4 h-4 fill-white" />
                                    <span>{isCreating ? "Creating Room..." : "Create Instant Meeting"}</span>
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
