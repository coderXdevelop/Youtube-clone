"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, SwitchCamera, Lock, ShieldAlert, Play } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface MeetingLobbyProps {
    roomId: string;
    meetingTitle?: string;
    hasPasscode?: boolean;
    user: any;
    localStream: MediaStream | null;
    isMuted: boolean;
    isCameraOff: boolean;
    availableVideoDevices: MediaDeviceInfo[];
    availableAudioDevices: MediaDeviceInfo[];
    selectedVideoDevice: string;
    selectedAudioDevice: string;
    onSelectVideoDevice: (deviceId: string) => void;
    onSelectAudioDevice: (deviceId: string) => void;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onSwitchCamera: () => void;
    onJoin: (passcode: string) => void;
    joinError?: string | null;
}

export const MeetingLobby: React.FC<MeetingLobbyProps> = ({
    roomId,
    meetingTitle = "Video Call",
    hasPasscode = false,
    user,
    localStream,
    isMuted,
    isCameraOff,
    availableVideoDevices,
    availableAudioDevices,
    selectedVideoDevice,
    selectedAudioDevice,
    onSelectVideoDevice,
    onSelectAudioDevice,
    onToggleMute,
    onToggleCamera,
    onSwitchCamera,
    onJoin,
    joinError,
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [passcode, setPasscode] = useState("");

    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
            videoRef.current.play().catch(() => {});
        }
    }, [localStream, isCameraOff]);

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none">
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Video Preview Box */}
                <div className="lg:col-span-7 flex flex-col items-center gap-4">
                    <div className="relative w-full aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl flex items-center justify-center">
                        {!isCameraOff && localStream ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover -scale-x-100"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <Avatar className="h-24 w-24 border-2 border-neutral-700 shadow-lg">
                                    <AvatarImage src={user?.image} />
                                    <AvatarFallback className="bg-neutral-800 text-2xl font-bold text-neutral-300">
                                        {user?.name?.[0] || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-neutral-400">Camera is turned off</span>
                            </div>
                        )}

                        {/* Bottom Floating Quick Toggles */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-neutral-950/80 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-800">
                            <Button
                                variant={isMuted ? "destructive" : "secondary"}
                                size="icon"
                                onClick={onToggleMute}
                                className="rounded-full h-10 w-10 cursor-pointer"
                                title={isMuted ? "Unmute Mic" : "Mute Mic"}
                            >
                                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </Button>
                            <Button
                                variant={isCameraOff ? "destructive" : "secondary"}
                                size="icon"
                                onClick={onToggleCamera}
                                className="rounded-full h-10 w-10 cursor-pointer"
                                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                            >
                                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onSwitchCamera}
                                className="rounded-full h-10 w-10 border-neutral-700 bg-neutral-800 hover:bg-neutral-700 cursor-pointer"
                                title="Switch Front/Rear Camera"
                            >
                                <SwitchCamera className="w-5 h-5 text-neutral-300" />
                            </Button>
                        </div>
                    </div>

                    {/* Hardware Selectors */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {availableVideoDevices.length > 0 && (
                            <div>
                                <label className="block text-neutral-400 mb-1 font-semibold">Camera</label>
                                <select
                                    value={selectedVideoDevice}
                                    onChange={(e) => onSelectVideoDevice(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none focus:border-red-600"
                                >
                                    {availableVideoDevices.map((dev) => (
                                        <option key={dev.deviceId} value={dev.deviceId}>
                                            {dev.label || `Camera ${dev.deviceId.slice(0, 5)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {availableAudioDevices.length > 0 && (
                            <div>
                                <label className="block text-neutral-400 mb-1 font-semibold">Microphone</label>
                                <select
                                    value={selectedAudioDevice}
                                    onChange={(e) => onSelectAudioDevice(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white outline-none focus:border-red-600"
                                >
                                    {availableAudioDevices.map((dev) => (
                                        <option key={dev.deviceId} value={dev.deviceId}>
                                            {dev.label || `Microphone ${dev.deviceId.slice(0, 5)}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Join Form Details */}
                <div className="lg:col-span-5 flex flex-col gap-5 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{meetingTitle}</h2>
                        <p className="text-xs text-neutral-400 mt-1 font-mono">Room ID: {roomId}</p>
                    </div>

                    {hasPasscode && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                Meeting Passcode Required
                            </label>
                            <Input
                                type="password"
                                placeholder="Enter passcode"
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                className="bg-neutral-950 border-neutral-800 text-white rounded-xl text-sm"
                            />
                        </div>
                    )}

                    {joinError && (
                        <div className="flex items-center gap-2 p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs">
                            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                            <span>{joinError}</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            onClick={() => onJoin(passcode)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-[1.02]"
                        >
                            <Play className="w-4 h-4 fill-white" />
                            <span>Join Meeting Now</span>
                        </Button>
                        <p className="text-[11px] text-neutral-500 text-center">
                            By joining, you agree to meeting moderation guidelines.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
