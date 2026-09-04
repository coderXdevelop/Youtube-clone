"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    ScreenShare,
    Hand,
    PhoneOff,
    Users,
    MessageSquare,
    Copy,
    Check,
    Lock,
    Unlock,
    Shield,
    Circle,
    Square,
    Paperclip,
    Smile,
    Send,
    UserX,
    VolumeX,
    SwitchCamera,
    ShieldAlert,
    X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Participant, ChatMessage, RoomSettings } from "../../hooks/useWebRTC";
import { useMediaRecorder } from "../../hooks/useMediaRecorder";
import axios from "axios";

interface VideoCallRoomProps {
    roomId: string;
    meetingTitle?: string;
    user: any;
    localStream: MediaStream | null;
    screenStream: MediaStream | null;
    participants: Map<string, Participant>;
    isMuted: boolean;
    isCameraOff: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
    isHost: boolean;
    isCoHost: boolean;
    roomSettings: RoomSettings;
    chatMessages: ChatMessage[];
    connectionQuality: "Good" | "Fair" | "Poor";
    speakingSockets: Set<string>;
    mySocketId: string;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onSwitchCamera: () => void;
    onToggleScreenShare: () => void;
    onToggleRaiseHand: () => void;
    onSendChatMessage: (text: string, emoji?: string, attachment?: any) => void;
    onSendHostControl: (action: string, targetSocketId?: string) => void;
    onLeaveCall: () => void;
}

export const VideoCallRoom: React.FC<VideoCallRoomProps> = ({
    roomId,
    meetingTitle = "Video Call",
    user,
    localStream,
    screenStream,
    participants,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    isHost,
    isCoHost,
    roomSettings,
    chatMessages,
    connectionQuality,
    speakingSockets,
    mySocketId,
    onToggleMute,
    onToggleCamera,
    onSwitchCamera,
    onToggleScreenShare,
    onToggleRaiseHand,
    onSendChatMessage,
    onSendHostControl,
    onLeaveCall,
}) => {
    const [copied, setCopied] = useState(false);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [activeDrawer, setActiveDrawer] = useState<"participants" | "chat" | null>(null);
    const [chatInputText, setChatInputText] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);
    const [spotlightSocketId, setSpotlightSocketId] = useState<string | null>(null);

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const chatEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Call Recording Hook
    const activeStreamForRecord = screenStream || localStream;
    const { isRecording, isPaused, recordingTime, startRecording, stopRecording } =
        useMediaRecorder(activeStreamForRecord);

    // Live Call Duration Timer
    useEffect(() => {
        const interval = setInterval(() => {
            setDurationSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Format duration HH:MM:SS
    const formatTime = (secs: number) => {
        const hrs = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
        return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    // Attach local stream to video element
    useEffect(() => {
        if (localVideoRef.current && (localStream || screenStream)) {
            localVideoRef.current.srcObject = screenStream || localStream;
            localVideoRef.current.play().catch(() => {});
        }
    }, [localStream, screenStream, isCameraOff]);

    // Unread messages indicator logic
    useEffect(() => {
        if (activeDrawer !== "chat" && chatMessages.length > 0) {
            setUnreadCount((prev) => prev + 1);
        } else if (activeDrawer === "chat") {
            setUnreadCount(0);
        }
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, activeDrawer]);

    // Copy Meeting Link
    const copyLink = () => {
        const url = `${window.location.origin}/meet/${roomId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Send Chat Message
    const handleSendChat = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (chatInputText.trim()) {
            onSendChatMessage(chatInputText.trim());
            setChatInputText("");
        }
    };

    // File Upload Handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await axios.post(`${backendUrl}/api/meeting/upload-attachment`, formData);
            if (res.data?.fileUrl) {
                onSendChatMessage("", undefined, {
                    url: res.data.fileUrl,
                    name: res.data.fileName,
                    size: res.data.fileSize,
                    type: res.data.fileType,
                });
            }
        } catch (err) {
            console.error("File upload error:", err);
            alert("Failed to upload file attachment.");
        }
    };

    // Participants list array
    const participantList = Array.from(participants.values());

    return (
        <div className="h-screen w-screen bg-neutral-950 text-white flex flex-col overflow-hidden select-none relative font-sans">
            {/* Top Navigation Header */}
            <header className="h-14 bg-neutral-900/90 border-b border-neutral-800 px-4 flex items-center justify-between shrink-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="bg-red-600 p-1.5 rounded-lg flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-sm sm:text-base font-bold truncate max-w-[180px] sm:max-w-xs">{meetingTitle}</h1>
                        <p className="text-[11px] text-neutral-400 font-mono hidden sm:block">Room: {roomId}</p>
                    </div>
                    {roomSettings.isLocked && (
                        <span className="flex items-center gap-1 text-[11px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-md font-semibold">
                            <Lock className="w-3 h-3" /> Locked
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Connection Quality */}
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800/60 px-3 py-1 rounded-full border border-neutral-700">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                connectionQuality === "Good"
                                    ? "bg-emerald-500"
                                    : connectionQuality === "Fair"
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                            }`}
                        />
                        <span>{connectionQuality} Connection</span>
                    </div>

                    {/* Timer */}
                    <div className="text-xs font-mono bg-neutral-800 px-3 py-1 rounded-full font-semibold text-neutral-200">
                        {formatTime(durationSeconds)}
                    </div>

                    {/* Copy Link Button */}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={copyLink}
                        className="h-8 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{copied ? "Copied" : "Invite Link"}</span>
                    </Button>
                </div>
            </header>

            {/* Main Center Video Layout */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 p-3 sm:p-4 overflow-y-auto flex items-center justify-center">
                    {/* Grid of Videos */}
                    <div
                        className={`w-full h-full grid gap-3 max-w-7xl mx-auto items-center justify-center ${
                            spotlightSocketId
                                ? "grid-cols-1"
                                : participantList.length === 0
                                ? "grid-cols-1"
                                : participantList.length === 1
                                ? "grid-cols-1 md:grid-cols-2"
                                : participantList.length <= 3
                                ? "grid-cols-1 md:grid-cols-2"
                                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                        }`}
                    >
                        {/* Local Video Tile */}
                        <div
                            onClick={() => setSpotlightSocketId(spotlightSocketId === mySocketId ? null : mySocketId)}
                            className={`relative aspect-video w-full max-h-[75vh] bg-neutral-900 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group ${
                                speakingSockets.has(mySocketId) ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-neutral-800"
                            }`}
                        >
                            {!isCameraOff && (localStream || screenStream) ? (
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${isScreenSharing ? "" : "-scale-x-100"}`}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                    <Avatar className="h-16 w-16 border-2 border-neutral-700">
                                        <AvatarImage src={user?.image} />
                                        <AvatarFallback className="bg-neutral-800 text-xl font-bold text-neutral-300">
                                            {user?.name?.[0] || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-semibold text-neutral-400">You (Camera Off)</span>
                                </div>
                            )}

                            {/* Name Badge */}
                            <div className="absolute bottom-2 left-2 bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 border border-neutral-800">
                                <span>You ({user?.name || "Host"})</span>
                                {isMuted && <MicOff className="w-3.5 h-3.5 text-red-500" />}
                                {isHandRaised && <Hand className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                            </div>
                        </div>

                        {/* Remote Participants Video Tiles */}
                        {participantList.map((p) => {
                            const isSpeaking = speakingSockets.has(p.socketId);
                            return (
                                <RemoteVideoTile
                                    key={p.socketId}
                                    participant={p}
                                    isSpeaking={isSpeaking}
                                    isSpotlight={spotlightSocketId === p.socketId}
                                    onSpotlightToggle={() =>
                                        setSpotlightSocketId(spotlightSocketId === p.socketId ? null : p.socketId)
                                    }
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Right Drawer: Participants or Chat */}
                {activeDrawer && (
                    <aside className="w-full sm:w-80 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 z-20 animate-in slide-in-from-right duration-200">
                        <div className="h-12 border-b border-neutral-800 px-4 flex items-center justify-between">
                            <h3 className="font-bold text-sm capitalize flex items-center gap-2">
                                {activeDrawer === "participants" ? (
                                    <>
                                        <Users className="w-4 h-4 text-red-500" /> Participants ({participantList.length + 1})
                                    </>
                                ) : (
                                    <>
                                        <MessageSquare className="w-4 h-4 text-red-500" /> In-Call Chat
                                    </>
                                )}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setActiveDrawer(null)}
                                className="h-7 w-7 text-neutral-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Participant List View */}
                        {activeDrawer === "participants" && (
                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                                {/* Host Actions for Room */}
                                {(isHost || isCoHost) && (
                                    <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl mb-2 flex flex-col gap-2">
                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                                            Host Controls
                                        </span>
                                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onSendHostControl("mute-all")}
                                                className="h-8 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
                                            >
                                                Mute All
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onSendHostControl("toggle-lock")}
                                                className="h-8 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
                                            >
                                                {roomSettings.isLocked ? "Unlock Meeting" : "Lock Meeting"}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onSendHostControl("toggle-screenshare-permission")}
                                                className="h-8 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[11px]"
                                            >
                                                {roomSettings.allowedScreenShare ? "Disable Screen Share" : "Enable Screen Share"}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onSendHostControl("toggle-chat-permission")}
                                                className="h-8 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[11px]"
                                            >
                                                {roomSettings.allowedChat ? "Disable Chat" : "Enable Chat"}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* You Tile */}
                                <div className="flex items-center justify-between p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                                    <div className="flex items-center gap-2.5">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user?.image} />
                                            <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-xs font-bold text-white">{user?.name || "You"}</p>
                                            <span className="text-[10px] font-semibold text-red-500">
                                                {isHost ? "Host (You)" : isCoHost ? "Co-Host (You)" : "You"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-neutral-400">
                                        {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                                        {isCameraOff ? <VideoOff className="w-4 h-4 text-red-500" /> : <Video className="w-4 h-4 text-emerald-400" />}
                                    </div>
                                </div>

                                {/* Remote Participants List */}
                                {participantList.map((p) => (
                                    <div
                                        key={p.socketId}
                                        className="flex items-center justify-between p-2.5 bg-neutral-950/60 border border-neutral-800 rounded-xl"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={p.avatar} />
                                                <AvatarFallback>{p.name?.[0] || "P"}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-xs font-bold text-white">{p.name}</p>
                                                <span className="text-[10px] text-neutral-400 font-medium">
                                                    {p.isHost ? "Host" : p.isCoHost ? "Co-Host" : "Participant"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {p.isHandRaised && <Hand className="w-4 h-4 text-amber-400 fill-amber-400" />}
                                            {p.isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-emerald-400" />}

                                            {/* Host Moderation Menu buttons */}
                                            {(isHost || isCoHost) && !p.isHost && (
                                                <div className="flex items-center gap-1 ml-1 border-l border-neutral-800 pl-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onSendHostControl("mute-participant", p.socketId)}
                                                        className="h-6 w-6 text-neutral-400 hover:text-red-400"
                                                        title="Mute user"
                                                    >
                                                        <VolumeX className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onSendHostControl("assign-cohost", p.socketId)}
                                                        className="h-6 w-6 text-neutral-400 hover:text-amber-400"
                                                        title={p.isCoHost ? "Remove Co-Host" : "Make Co-Host"}
                                                    >
                                                        <Shield className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onSendHostControl("remove-participant", p.socketId)}
                                                        className="h-6 w-6 text-neutral-400 hover:text-red-500"
                                                        title="Remove user"
                                                    >
                                                        <UserX className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Chat View */}
                        {activeDrawer === "chat" && (
                            <div className="flex-1 flex flex-col justify-between overflow-hidden">
                                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                                    {!roomSettings.allowedChat && !isHost && !isCoHost && (
                                        <div className="p-2.5 bg-amber-950/70 border border-amber-800 text-amber-300 rounded-xl text-xs flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4 shrink-0" />
                                            <span>Chat is currently disabled by host</span>
                                        </div>
                                    )}

                                    {chatMessages.length === 0 && (
                                        <p className="text-xs text-neutral-500 text-center py-8">
                                            No messages yet. Send a message to start the conversation!
                                        </p>
                                    )}

                                    {chatMessages.map((msg) => (
                                        <div key={msg.id} className="flex flex-col gap-1 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src={msg.senderAvatar} />
                                                    <AvatarFallback>{msg.senderName?.[0] || "U"}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-bold text-neutral-300">{msg.senderName}</span>
                                                <span className="text-[10px] text-neutral-500">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                            {msg.text && (
                                                <p className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-neutral-200 ml-7">
                                                    {msg.text}
                                                </p>
                                            )}
                                            {msg.emoji && <span className="text-2xl ml-7">{msg.emoji}</span>}
                                            {msg.attachment && (
                                                <a
                                                    href={msg.attachment.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-7 flex items-center gap-2 p-2 bg-neutral-950 border border-neutral-800 rounded-xl text-indigo-400 hover:underline"
                                                >
                                                    <Paperclip className="w-4 h-4 shrink-0" />
                                                    <span className="truncate max-w-[180px]">{msg.attachment.name}</span>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat Input Form */}
                                <form onSubmit={handleSendChat} className="p-3 border-t border-neutral-800 bg-neutral-950 flex flex-col gap-2">
                                    {/* Quick Emojis */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-base select-none">
                                        {["👍", "❤️", "👏", "😂", "🔥", "✋", "🎉"].map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => onSendChatMessage("", emoji)}
                                                className="hover:scale-125 transition-transform cursor-pointer"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-9 w-9 text-neutral-400 hover:text-white"
                                            title="Attach File"
                                        >
                                            <Paperclip className="w-4 h-4" />
                                        </Button>
                                        <Input
                                            placeholder="Type a message..."
                                            value={chatInputText}
                                            onChange={(e) => setChatInputText(e.target.value)}
                                            disabled={!roomSettings.allowedChat && !isHost && !isCoHost}
                                            className="bg-neutral-900 border-neutral-800 text-white rounded-xl text-xs h-9"
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={!chatInputText.trim()}
                                            className="h-9 w-9 bg-red-600 hover:bg-red-700 text-white rounded-xl shrink-0 cursor-pointer"
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </aside>
                )}
            </div>

            {/* Bottom Controls Toolbar */}
            <footer className="h-16 bg-neutral-900 border-t border-neutral-800 px-4 flex items-center justify-between shrink-0 z-30">
                {/* Left side recorder controls */}
                <div className="flex items-center gap-2">
                    {isRecording ? (
                        <div className="flex items-center gap-2 bg-red-950/80 border border-red-800 text-red-300 px-3 py-1.5 rounded-full text-xs font-semibold animate-pulse">
                            <Circle className="w-3 h-3 fill-red-500 text-red-500" />
                            <span>REC {formatTime(recordingTime)}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={stopRecording}
                                className="h-5 px-1 text-white hover:text-red-200"
                            >
                                <Square className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={startRecording}
                            className="h-9 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl flex items-center gap-1.5 cursor-pointer"
                            title="Start Call Recording"
                        >
                            <Circle className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                            <span className="hidden sm:inline">Record Call</span>
                        </Button>
                    )}
                </div>

                {/* Center Control Buttons */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                        variant={isMuted ? "destructive" : "secondary"}
                        size="icon"
                        onClick={onToggleMute}
                        className="rounded-full h-11 w-11 cursor-pointer transition-transform hover:scale-105"
                        title={isMuted ? "Unmute Mic" : "Mute Mic"}
                    >
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>

                    <Button
                        variant={isCameraOff ? "destructive" : "secondary"}
                        size="icon"
                        onClick={onToggleCamera}
                        className="rounded-full h-11 w-11 cursor-pointer transition-transform hover:scale-105"
                        title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                    >
                        {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </Button>

                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={onSwitchCamera}
                        className="rounded-full h-11 w-11 bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer transition-transform hover:scale-105 hidden sm:inline-flex"
                        title="Switch Front/Rear Camera"
                    >
                        <SwitchCamera className="w-5 h-5" />
                    </Button>

                    <Button
                        variant={isScreenSharing ? "default" : "secondary"}
                        size="icon"
                        onClick={onToggleScreenShare}
                        className={`rounded-full h-11 w-11 cursor-pointer transition-transform hover:scale-105 ${
                            isScreenSharing ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-white"
                        }`}
                        title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                    >
                        <ScreenShare className="w-5 h-5" />
                    </Button>

                    <Button
                        variant={isHandRaised ? "default" : "secondary"}
                        size="icon"
                        onClick={onToggleRaiseHand}
                        className={`rounded-full h-11 w-11 cursor-pointer transition-transform hover:scale-105 ${
                            isHandRaised ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-white"
                        }`}
                        title={isHandRaised ? "Lower Hand" : "Raise Hand"}
                    >
                        <Hand className="w-5 h-5" />
                    </Button>

                    {/* End / Leave Call Button */}
                    {isHost ? (
                        <div className="flex items-center gap-1.5 ml-2">
                            <Button
                                variant="destructive"
                                onClick={() => onSendHostControl("end-call")}
                                className="h-11 px-4 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer"
                            >
                                <PhoneOff className="w-4 h-4 mr-1.5" />
                                End for All
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="destructive"
                            onClick={onLeaveCall}
                            className="h-11 px-4 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-lg cursor-pointer ml-2"
                        >
                            <PhoneOff className="w-4 h-4 mr-1.5" />
                            Leave
                        </Button>
                    )}
                </div>

                {/* Right Side Drawers Toggles */}
                <div className="flex items-center gap-2">
                    <Button
                        variant={activeDrawer === "participants" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setActiveDrawer(activeDrawer === "participants" ? null : "participants")}
                        className="rounded-full h-10 w-10 text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer relative"
                        title="Participants"
                    >
                        <Users className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center">
                            {participantList.length + 1}
                        </span>
                    </Button>

                    <Button
                        variant={activeDrawer === "chat" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setActiveDrawer(activeDrawer === "chat" ? null : "chat")}
                        className="rounded-full h-10 w-10 text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer relative"
                        title="In-Call Chat"
                    >
                        <MessageSquare className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </Button>
                </div>
            </footer>
        </div>
    );
};

// Component for rendering remote participant video stream
const RemoteVideoTile: React.FC<{
    participant: Participant;
    isSpeaking: boolean;
    isSpotlight: boolean;
    onSpotlightToggle: () => void;
}> = ({ participant, isSpeaking, isSpotlight, onSpotlightToggle }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (videoRef.current && participant.stream) {
            videoRef.current.srcObject = participant.stream;
        }
    }, [participant.stream, participant.isCameraOff]);

    return (
        <div
            onClick={onSpotlightToggle}
            className={`relative aspect-video w-full max-h-[75vh] bg-neutral-900 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group ${
                isSpeaking ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-neutral-800"
            }`}
        >
            {!participant.isCameraOff && participant.stream ? (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Avatar className="h-16 w-16 border-2 border-neutral-700">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback className="bg-neutral-800 text-xl font-bold text-neutral-300">
                            {participant.name?.[0] || "P"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-neutral-400">{participant.name}</span>
                </div>
            )}

            {/* Name Badge */}
            <div className="absolute bottom-2 left-2 bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 border border-neutral-800">
                <span>{participant.name}</span>
                {participant.isMuted && <MicOff className="w-3.5 h-3.5 text-red-500" />}
                {participant.isHandRaised && <Hand className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
            </div>
        </div>
    );
};
