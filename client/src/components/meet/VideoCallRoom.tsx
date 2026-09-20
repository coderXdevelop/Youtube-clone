"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
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
    Shield,
    Circle,
    Square,
    Paperclip,
    Send,
    UserX,
    VolumeX,
    SwitchCamera,
    ShieldAlert,
    AlertTriangle,
    RefreshCw,
    X,
    Pin,
    PinOff,
    Maximize2,
    Minimize2,
    LayoutGrid,
    Tv,
    Presentation,
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
    mediaError?: string | null;
    isMobile?: boolean;
    supportsScreenShare?: boolean;
    facingMode?: "user" | "environment";
    onRetryMediaPermissions?: () => void;
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
    mediaError,
    isMobile = false,
    supportsScreenShare,
    facingMode = "user",
    onRetryMediaPermissions,
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
    
    // Check if device/browser supports screen sharing
    const canShareScreen = typeof supportsScreenShare === "boolean"
        ? supportsScreenShare
        : (!isMobile && typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia));

    // Layout and Pinning state
    const [pinnedSocketId, setPinnedSocketId] = useState<string | null>(null);
    const [layoutMode, setLayoutMode] = useState<"grid" | "spotlight">("grid");
    const [isSelfFloating, setIsSelfFloating] = useState(false);

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

    const [dismissMediaError, setDismissMediaError] = useState(false);

    // Reset dismiss status if mediaError changes
    useEffect(() => {
        if (mediaError) {
            setDismissMediaError(false);
        }
    }, [mediaError]);

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

    // Unread messages indicator logic
    useEffect(() => {
        if (activeDrawer !== "chat" && chatMessages.length > 0) {
            setUnreadCount((prev) => prev + 1);
        } else if (activeDrawer === "chat") {
            setUnreadCount(0);
        }
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, activeDrawer]);

    // Participants list array
    const participantList = useMemo(() => Array.from(participants.values()), [participants]);

    // Auto-detect presenting participant
    const screenShareParticipant = useMemo(() => {
        if (isScreenSharing) return { socketId: mySocketId, name: "You (Screen)", isLocal: true };
        const presenter = participantList.find((p) => p.isScreenSharing);
        if (presenter) return { socketId: presenter.socketId, name: presenter.name, isLocal: false };
        return null;
    }, [isScreenSharing, mySocketId, participantList]);

    // Auto-pin presenter if no manual pin
    useEffect(() => {
        if (screenShareParticipant && !pinnedSocketId) {
            setPinnedSocketId(screenShareParticipant.socketId);
            setLayoutMode("spotlight");
        }
    }, [screenShareParticipant, pinnedSocketId]);

    // If pinned socket leaves room, reset pin
    useEffect(() => {
        if (pinnedSocketId && pinnedSocketId !== mySocketId && !participants.has(pinnedSocketId)) {
            setPinnedSocketId(null);
            setLayoutMode("grid");
        }
    }, [pinnedSocketId, participants, mySocketId]);

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

    // Handle pin toggle
    const handlePinToggle = (socketId: string) => {
        if (pinnedSocketId === socketId) {
            setPinnedSocketId(null);
            setLayoutMode("grid");
        } else {
            setPinnedSocketId(socketId);
            setLayoutMode("spotlight");
        }
    };

    // Determine current pinned participant object
    const pinnedParticipant = useMemo(() => {
        if (!pinnedSocketId) return null;
        if (pinnedSocketId === mySocketId) {
            return {
                isLocal: true,
                socketId: mySocketId,
                name: user?.name || "You",
                avatar: user?.image,
                isMuted,
                isCameraOff,
                isHandRaised,
                isScreenSharing,
                isHost,
                isCoHost,
            };
        }
        const found = participants.get(pinnedSocketId);
        if (found) {
            return {
                ...found,
                isLocal: false,
            };
        }
        return null;
    }, [pinnedSocketId, mySocketId, user, isMuted, isCameraOff, isHandRaised, isScreenSharing, isHost, isCoHost, participants]);

    // Active spotlight mode check
    const isSpotlightActive = layoutMode === "spotlight" && pinnedSocketId !== null && pinnedParticipant !== null;

    // Calculate grid classes based on visible tiles count
    const totalGridTiles = participantList.length + (isSelfFloating ? 0 : 1);

    const getGridClasses = () => {
        if (totalGridTiles <= 1) {
            return "grid-cols-1 max-w-4xl";
        }
        if (totalGridTiles === 2) {
            return "grid-cols-1 md:grid-cols-2 max-w-6xl";
        }
        if (totalGridTiles <= 4) {
            return "grid-cols-1 sm:grid-cols-2 max-w-6xl";
        }
        if (totalGridTiles <= 6) {
            return "grid-cols-2 sm:grid-cols-3 max-w-7xl";
        }
        if (totalGridTiles <= 9) {
            return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 max-w-7xl";
        }
        return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-7xl";
    };

    return (
        <div className="h-screen w-screen bg-neutral-950 text-white flex flex-col overflow-hidden select-none relative font-sans">
            {/* Top Navigation Header */}
            <header className="h-14 bg-neutral-900/95 border-b border-neutral-800/80 px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 backdrop-blur-md">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="bg-red-600 p-1.5 rounded-xl flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xs sm:text-sm font-bold truncate max-w-[140px] sm:max-w-xs">{meetingTitle}</h1>
                        <p className="text-[10px] text-neutral-400 font-mono hidden sm:block">Room: {roomId}</p>
                    </div>
                    {roomSettings.isLocked && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-md font-semibold shrink-0">
                            <Lock className="w-3 h-3" /> Locked
                        </span>
                    )}
                </div>

                {/* Center / Right controls */}
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    {/* Layout Switcher (Grid vs Spotlight/Stage) */}
                    <div className="flex items-center bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-700/60">
                        <button
                            type="button"
                            onClick={() => {
                                setLayoutMode("grid");
                                setPinnedSocketId(null);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                                !isSpotlightActive
                                    ? "bg-neutral-700 text-white shadow-sm"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                            title="Grid View (All participants)"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Grid</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (isSpotlightActive) {
                                    setLayoutMode("grid");
                                    setPinnedSocketId(null);
                                } else {
                                    // Pin first remote participant or self
                                    const targetId = participantList[0]?.socketId || mySocketId;
                                    setPinnedSocketId(targetId);
                                    setLayoutMode("spotlight");
                                }
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                                isSpotlightActive
                                    ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                            title={isSpotlightActive ? "Unpin Focus" : "Spotlight / Pin Stage View"}
                        >
                            {isSpotlightActive ? <PinOff className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
                            <span className="hidden md:inline">{isSpotlightActive ? "Pinned" : "Stage"}</span>
                        </button>
                    </div>

                    {/* Connection Quality */}
                    <div className="hidden md:flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-800/60 px-2.5 py-1 rounded-full border border-neutral-700/60">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                connectionQuality === "Good"
                                    ? "bg-emerald-500"
                                    : connectionQuality === "Fair"
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                            }`}
                        />
                        <span className="hidden lg:inline">{connectionQuality}</span>
                    </div>

                    {/* Timer */}
                    <div className="text-xs font-mono bg-neutral-800/90 px-2.5 py-1 rounded-full font-semibold text-neutral-200 border border-neutral-700/40">
                        {formatTime(durationSeconds)}
                    </div>

                    {/* Copy Link Button */}
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={copyLink}
                        className="h-8 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer border border-neutral-700/50"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{copied ? "Copied" : "Invite"}</span>
                    </Button>
                </div>
            </header>

            {/* In-Call Media Error / Fallback Notification Banner */}
            {mediaError && !dismissMediaError && (
                <div className="bg-amber-950/90 border-b border-amber-800 px-4 py-2 flex items-center justify-between gap-3 text-xs text-amber-200 z-20 shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{mediaError}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {onRetryMediaPermissions && (
                            <button
                                type="button"
                                onClick={onRetryMediaPermissions}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-medium transition cursor-pointer"
                            >
                                <RefreshCw className="w-3 h-3" />
                                <span>Retry Access</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setDismissMediaError(true)}
                            className="p-1 hover:bg-amber-800/40 rounded text-amber-400 hover:text-amber-200 transition cursor-pointer"
                            title="Dismiss notification"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Main Stage & Layout Area */}
            <div className="flex-1 flex overflow-hidden relative">
                <main className="flex-1 p-2 sm:p-4 overflow-hidden flex flex-col items-center justify-center min-h-0 relative">
                    
                    {/* MODE 1: SPOTLIGHT / PINNED STAGE VIEW */}
                    {isSpotlightActive ? (
                        <div className="w-full h-full flex flex-col sm:flex-row gap-3 min-h-0 items-stretch justify-center max-w-[1600px] mx-auto">
                            {/* Main Stage (Large Video Tile) */}
                            <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center relative bg-neutral-950/60 rounded-2xl overflow-hidden p-1">
                                {pinnedParticipant.isLocal ? (
                                    <LocalVideoTile
                                        user={user}
                                        localStream={localStream}
                                        screenStream={screenStream}
                                        isMuted={isMuted}
                                        isCameraOff={isCameraOff}
                                        isScreenSharing={isScreenSharing}
                                        isHandRaised={isHandRaised}
                                        isSpeaking={speakingSockets.has(mySocketId)}
                                        isPinned={true}
                                        onPinToggle={() => handlePinToggle(mySocketId)}
                                        facingMode={facingMode}
                                        isHost={isHost}
                                        isCoHost={isCoHost}
                                        isStage={true}
                                    />
                                ) : (
                                    <RemoteVideoTile
                                        participant={participants.get(pinnedSocketId)!}
                                        isSpeaking={speakingSockets.has(pinnedSocketId)}
                                        isPinned={true}
                                        onPinToggle={() => handlePinToggle(pinnedSocketId)}
                                        isStage={true}
                                    />
                                )}

                                {/* Pinned Indicator Overlay Pill on Stage */}
                                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-neutral-950/80 backdrop-blur-md border border-neutral-700/80 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                                    <Pin className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                                    <span className="text-neutral-200">
                                        Pinned: <strong className="text-white">{pinnedParticipant.name}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPinnedSocketId(null);
                                            setLayoutMode("grid");
                                        }}
                                        className="ml-1 text-neutral-400 hover:text-white p-0.5 rounded transition cursor-pointer"
                                        title="Unpin"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Filmstrip (Sidebar on desktop, bottom strip on mobile) */}
                            <div className="w-full sm:w-60 md:w-72 lg:w-80 shrink-0 flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto p-1 max-h-40 sm:max-h-full scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                                {/* Local user tile if not pinned and not floating */}
                                {!pinnedParticipant.isLocal && !isSelfFloating && (
                                    <div className="w-48 sm:w-full aspect-video shrink-0">
                                        <LocalVideoTile
                                            user={user}
                                            localStream={localStream}
                                            screenStream={screenStream}
                                            isMuted={isMuted}
                                            isCameraOff={isCameraOff}
                                            isScreenSharing={isScreenSharing}
                                            isHandRaised={isHandRaised}
                                            isSpeaking={speakingSockets.has(mySocketId)}
                                            isPinned={false}
                                            onPinToggle={() => handlePinToggle(mySocketId)}
                                            facingMode={facingMode}
                                            isHost={isHost}
                                            isCoHost={isCoHost}
                                            isFilmstrip={true}
                                        />
                                    </div>
                                )}

                                {/* Other participants in filmstrip */}
                                {participantList
                                    .filter((p) => p.socketId !== pinnedSocketId)
                                    .map((p) => (
                                        <div key={p.socketId} className="w-48 sm:w-full aspect-video shrink-0">
                                            <RemoteVideoTile
                                                participant={p}
                                                isSpeaking={speakingSockets.has(p.socketId)}
                                                isPinned={false}
                                                onPinToggle={() => handlePinToggle(p.socketId)}
                                                isFilmstrip={true}
                                            />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ) : (
                        /* MODE 2: DYNAMIC GRID VIEW (Google Meet & Teams Style) */
                        <div className="w-full h-full overflow-y-auto flex items-center justify-center p-1">
                            <div
                                className={`w-full h-full grid gap-2.5 sm:gap-4 items-center justify-center mx-auto auto-rows-fr ${getGridClasses()}`}
                            >
                                {/* Local User Tile (if not floating PiP) */}
                                {!isSelfFloating && (
                                    <LocalVideoTile
                                        user={user}
                                        localStream={localStream}
                                        screenStream={screenStream}
                                        isMuted={isMuted}
                                        isCameraOff={isCameraOff}
                                        isScreenSharing={isScreenSharing}
                                        isHandRaised={isHandRaised}
                                        isSpeaking={speakingSockets.has(mySocketId)}
                                        isPinned={false}
                                        onPinToggle={() => handlePinToggle(mySocketId)}
                                        facingMode={facingMode}
                                        isHost={isHost}
                                        isCoHost={isCoHost}
                                        onToggleFloat={() => setIsSelfFloating(true)}
                                    />
                                )}

                                {/* Remote Participant Tiles */}
                                {participantList.map((p) => (
                                    <RemoteVideoTile
                                        key={p.socketId}
                                        participant={p}
                                        isSpeaking={speakingSockets.has(p.socketId)}
                                        isPinned={false}
                                        onPinToggle={() => handlePinToggle(p.socketId)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Floating Picture-in-Picture Self View (When self is popped out) */}
                    {isSelfFloating && (
                        <div className="fixed sm:absolute bottom-20 right-4 w-44 sm:w-60 aspect-video z-20 shadow-2xl rounded-2xl overflow-hidden border-2 border-neutral-700/80 bg-neutral-900 group">
                            <LocalVideoTile
                                user={user}
                                localStream={localStream}
                                screenStream={screenStream}
                                isMuted={isMuted}
                                isCameraOff={isCameraOff}
                                isScreenSharing={isScreenSharing}
                                isHandRaised={isHandRaised}
                                isSpeaking={speakingSockets.has(mySocketId)}
                                isPinned={false}
                                onPinToggle={() => handlePinToggle(mySocketId)}
                                facingMode={facingMode}
                                isHost={isHost}
                                isCoHost={isCoHost}
                                isFloating={true}
                                onToggleFloat={() => setIsSelfFloating(false)}
                            />
                        </div>
                    )}
                </main>

                {/* Right Drawer: Participants or Chat — overlays on mobile, sidebar on desktop */}
                {activeDrawer && (
                    <aside className="absolute sm:relative inset-0 sm:inset-auto w-full sm:w-80 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col shrink-0 z-20 animate-in slide-in-from-right duration-200">
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
                                                onClick={() =>
                                                    onSendHostControl(
                                                        roomSettings.allowedAudio === false
                                                            ? "toggle-audio-permission"
                                                            : "mute-all"
                                                    )
                                                }
                                                className="h-8 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[11px]"
                                            >
                                                {roomSettings.allowedAudio === false ? "Allow Unmute (All)" : "Mute All"}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onSendHostControl("toggle-lock")}
                                                className="h-8 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[11px]"
                                            >
                                                {roomSettings.isLocked ? "Unlock Meeting" : "Lock Meeting"}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onSendHostControl("toggle-screenshare-permission")}
                                                className="h-8 border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-[11px]"
                                            >
                                                {roomSettings.allowedScreenShare ? "Disable Share" : "Enable Share"}
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

                                {/* You Tile in Drawer */}
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
                                        <button
                                            type="button"
                                            onClick={() => handlePinToggle(mySocketId)}
                                            className={`p-1.5 rounded-lg hover:bg-neutral-800 transition ${
                                                pinnedSocketId === mySocketId ? "text-red-500" : "text-neutral-400"
                                            }`}
                                            title={pinnedSocketId === mySocketId ? "Unpin" : "Pin"}
                                        >
                                            <Pin className="w-3.5 h-3.5" />
                                        </button>
                                        {isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                                        {isCameraOff ? <VideoOff className="w-4 h-4 text-red-500" /> : <Video className="w-4 h-4 text-emerald-400" />}
                                    </div>
                                </div>

                                {/* Remote Participants in Drawer */}
                                {participantList.map((p) => (
                                    <div
                                        key={p.socketId}
                                        className="flex items-center justify-between p-2.5 bg-neutral-950/60 border border-neutral-800 rounded-xl"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarImage src={p.avatar} />
                                                <AvatarFallback>{p.name?.[0] || "P"}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{p.name}</p>
                                                <span className="text-[10px] text-neutral-400 font-medium">
                                                    {p.isHost ? "Host" : p.isCoHost ? "Co-Host" : "Participant"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handlePinToggle(p.socketId)}
                                                className={`p-1.5 rounded-lg hover:bg-neutral-800 transition ${
                                                    pinnedSocketId === p.socketId ? "text-red-500" : "text-neutral-400"
                                                }`}
                                                title={pinnedSocketId === p.socketId ? "Unpin" : "Pin to stage"}
                                            >
                                                <Pin className="w-3.5 h-3.5" />
                                            </button>
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

            {/* Bottom Controls Toolbar — 2 rows on mobile, 1 row on sm+ */}
            <footer className="bg-neutral-900/95 border-t border-neutral-800/80 shrink-0 z-30 px-2 sm:px-4 backdrop-blur-md">
                {/* Mobile: Row 1 — primary call controls */}
                <div className="flex sm:hidden items-center justify-between py-2 gap-1">
                    {/* Left: Record */}
                    <div className="flex items-center">
                        {isRecording ? (
                            <div className="flex items-center gap-1 bg-red-950/80 border border-red-800 text-red-300 px-2 py-1.5 rounded-full text-xs font-semibold animate-pulse">
                                <Circle className="w-3 h-3 fill-red-500 text-red-500" />
                                <span>{formatTime(recordingTime)}</span>
                                <button onClick={stopRecording} className="ml-1 text-white">
                                    <Square className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <Button
                                variant="secondary"
                                size="icon"
                                onClick={startRecording}
                                className="h-9 w-9 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full cursor-pointer"
                                title="Record"
                            >
                                <Circle className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                            </Button>
                        )}
                    </div>

                    {/* Center: Mic / Cam / SwitchCam / Hand */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant={isMuted ? "destructive" : "secondary"}
                            size="icon"
                            onClick={() => onToggleMute()}
                            className="rounded-full h-10 w-10 cursor-pointer shadow-md"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                        <Button
                            variant={isCameraOff ? "destructive" : "secondary"}
                            size="icon"
                            onClick={() => onToggleCamera()}
                            className="rounded-full h-10 w-10 cursor-pointer shadow-md"
                            title={isCameraOff ? "Camera On" : "Camera Off"}
                        >
                            {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                        </Button>
                        {isMobile && (
                            <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => onSwitchCamera()}
                                className="rounded-full h-10 w-10 bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
                                title="Switch Front/Rear Camera"
                            >
                                <SwitchCamera className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant={isHandRaised ? "default" : "secondary"}
                            size="icon"
                            onClick={() => onToggleRaiseHand()}
                            className={`rounded-full h-10 w-10 cursor-pointer ${
                                isHandRaised ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-neutral-800 hover:bg-neutral-700 text-white"
                            }`}
                            title={isHandRaised ? "Lower Hand" : "Raise Hand"}
                        >
                            <Hand className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Right: Leave */}
                    {isHost ? (
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => onSendHostControl("end-call")}
                            className="h-10 w-10 rounded-full bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-lg shadow-red-600/30"
                            title="End for All"
                        >
                            <PhoneOff className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={onLeaveCall}
                            className="h-10 w-10 rounded-full bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-lg shadow-red-600/30"
                            title="Leave"
                        >
                            <PhoneOff className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                {/* Mobile: Row 2 — chat + participants always visible */}
                <div className="flex sm:hidden items-center justify-center gap-4 pb-2 border-t border-neutral-800 pt-1.5">
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

                    {canShareScreen && (
                        <Button
                            variant={isScreenSharing ? "default" : "ghost"}
                            size="icon"
                            onClick={onToggleScreenShare}
                            className={`rounded-full h-10 w-10 cursor-pointer ${
                                isScreenSharing ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                            }`}
                            title={isScreenSharing ? "Stop Share" : "Share Screen"}
                        >
                            <ScreenShare className="w-5 h-5" />
                        </Button>
                    )}
                </div>

                {/* Desktop / Tablet: single-row layout */}
                <div className="hidden sm:flex h-16 items-center justify-between">
                    {/* Left: Record & Mode Info */}
                    <div className="flex items-center gap-2">
                        {isRecording ? (
                            <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-800 text-red-300 px-3 py-1.5 rounded-full text-xs font-semibold animate-pulse">
                                <Circle className="w-3 h-3 fill-red-500 text-red-500" />
                                <span>REC {formatTime(recordingTime)}</span>
                                <Button variant="ghost" size="sm" onClick={stopRecording} className="h-5 px-1 text-white hover:text-red-200">
                                    <Square className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => startRecording()}
                                className="h-9 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl flex items-center gap-1.5 cursor-pointer border border-neutral-700/50"
                                title="Start Call Recording"
                            >
                                <Circle className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                                <span>Record</span>
                            </Button>
                        )}
                    </div>

                    {/* Center: all primary call controls */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant={isMuted ? "destructive" : "secondary"}
                            size="icon"
                            onClick={() => onToggleMute()}
                            className="rounded-full h-11 w-11 cursor-pointer transition-transform hover:scale-105 shadow-md"
                            title={isMuted ? "Unmute Mic" : "Mute Mic"}
                        >
                            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </Button>
                        <Button
                            variant={isCameraOff ? "destructive" : "secondary"}
                            size="icon"
                            onClick={() => onToggleCamera()}
                            className="rounded-full h-11 w-11 cursor-pointer transition-transform hover:scale-105 shadow-md"
                            title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                        >
                            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        </Button>
                        {isMobile && (
                            <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => onSwitchCamera()}
                                className="rounded-full h-11 w-11 bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer transition-transform hover:scale-105"
                                title="Switch Front/Rear Camera"
                            >
                                <SwitchCamera className="w-5 h-5" />
                            </Button>
                        )}
                        {canShareScreen && (
                            <Button
                                variant={isScreenSharing ? "default" : "secondary"}
                                size="icon"
                                onClick={() => onToggleScreenShare()}
                                className={`rounded-full h-11 w-11 cursor-pointer transition-transform hover:scale-105 ${
                                    isScreenSharing ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20" : "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700/50"
                                }`}
                                title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                            >
                                <ScreenShare className="w-5 h-5" />
                            </Button>
                        )}
                        <Button
                            variant={isHandRaised ? "default" : "secondary"}
                            size="icon"
                            onClick={() => onToggleRaiseHand()}
                            className={`rounded-full h-11 w-11 cursor-pointer transition-transform hover:scale-105 ${
                                isHandRaised ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20" : "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700/50"
                            }`}
                            title={isHandRaised ? "Lower Hand" : "Raise Hand"}
                        >
                            <Hand className="w-5 h-5" />
                        </Button>
                        {isHost ? (
                            <div className="flex items-center gap-1.5 ml-1">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => onSendHostControl("end-call")}
                                    className="h-10 w-10 sm:w-auto sm:px-4 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 cursor-pointer"
                                >
                                    <PhoneOff className="w-4 h-4" />
                                    <span className="hidden sm:inline ml-1.5">End Call</span>
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="destructive"
                                size="icon"
                                onClick={onLeaveCall}
                                className="h-10 w-10 sm:w-auto sm:px-4 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 cursor-pointer ml-1"
                            >
                                <PhoneOff className="w-4 h-4" />
                                <span className="hidden sm:inline ml-1.5">Leave</span>
                            </Button>
                        )}
                    </div>

                    {/* Right: Participants + Chat */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant={activeDrawer === "participants" ? "default" : "ghost"}
                            size="icon"
                            onClick={() => setActiveDrawer(activeDrawer === "participants" ? null : "participants")}
                            className="rounded-full h-10 w-10 text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer relative border border-transparent hover:border-neutral-700"
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
                            className="rounded-full h-10 w-10 text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer relative border border-transparent hover:border-neutral-700"
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
                </div>
            </footer>

            {/* Global Dedicated Audio Sinks for all remote participants */}
            <div className="sr-only" aria-hidden="true">
                {participantList.map((p) => (
                    <ParticipantAudio key={`audio-${p.socketId}`} participant={p} />
                ))}
            </div>
        </div>
    );
};

// ==========================================
// Sub-components: Local & Remote Video Tiles
// ==========================================

interface LocalVideoTileProps {
    user: any;
    localStream: MediaStream | null;
    screenStream: MediaStream | null;
    isMuted: boolean;
    isCameraOff: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
    isSpeaking: boolean;
    isPinned: boolean;
    onPinToggle: () => void;
    facingMode?: "user" | "environment";
    isHost?: boolean;
    isCoHost?: boolean;
    isStage?: boolean;
    isFilmstrip?: boolean;
    isFloating?: boolean;
    onToggleFloat?: () => void;
}

const LocalVideoTile: React.FC<LocalVideoTileProps> = ({
    user,
    localStream,
    screenStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    isSpeaking,
    isPinned,
    onPinToggle,
    facingMode = "user",
    isHost,
    isCoHost,
    isStage = false,
    isFilmstrip = false,
    isFloating = false,
    onToggleFloat,
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const nextStream = screenStream || localStream;
        if (nextStream) {
            if (video.srcObject !== nextStream) {
                video.srcObject = nextStream;
            }
            if (!isCameraOff) {
                video.play().catch(() => {});
            }
        } else {
            video.srcObject = null;
        }
    }, [localStream, screenStream, isCameraOff]);

    const handleToggleFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.().catch(() => {});
        } else {
            document.exitFullscreen?.().catch(() => {});
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full bg-neutral-900 rounded-2xl overflow-hidden border-2 transition-all duration-200 group flex items-center justify-center ${
                isStage ? "max-h-[82vh] aspect-video" : isFilmstrip ? "aspect-video" : "aspect-video max-h-[82vh]"
            } ${
                isSpeaking
                    ? "border-emerald-500 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/50"
                    : isPinned
                    ? "border-red-500/80 shadow-md shadow-red-500/20"
                    : "border-neutral-800/90 hover:border-neutral-700"
            }`}
        >
            {/* Local Video Stream */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full ${isScreenSharing ? "object-contain bg-black" : "object-cover"} ${
                    isScreenSharing || facingMode === "environment" ? "" : "-scale-x-100"
                } ${isCameraOff ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100 block"}`}
            />

            {/* Camera Off Avatar Overlay */}
            {isCameraOff && (
                <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-neutral-900 to-neutral-950">
                    <div className="relative">
                        <Avatar className={`${isFilmstrip || isFloating ? "h-10 w-10" : "h-16 w-16 sm:h-20 sm:w-20"} border-2 border-neutral-700 shadow-xl`}>
                            <AvatarImage src={user?.image} />
                            <AvatarFallback className="bg-neutral-800 text-lg sm:text-2xl font-bold text-neutral-300">
                                {user?.name?.[0] || "U"}
                            </AvatarFallback>
                        </Avatar>
                        {isSpeaking && (
                            <span className="absolute -inset-1 rounded-full border-2 border-emerald-500 animate-ping opacity-60" />
                        )}
                    </div>
                    {!isFilmstrip && !isFloating && (
                        <span className="text-xs font-semibold text-neutral-400">You (Camera Off)</span>
                    )}
                </div>
            )}

            {/* Hover Action Overlay Toolbar */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-neutral-950/70 backdrop-blur-md p-1 rounded-xl border border-neutral-800">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onPinToggle();
                    }}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isPinned ? "bg-red-600 text-white" : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                    }`}
                    title={isPinned ? "Unpin screen" : "Pin screen"}
                >
                    {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>

                {onToggleFloat && !isFilmstrip && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFloat();
                        }}
                        className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                        title={isFloating ? "Embed in grid" : "Float PiP"}
                    >
                        {isFloating ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                    title="Fullscreen"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Bottom Status / Name Badge */}
            <div className="absolute bottom-2 left-2 bg-neutral-950/85 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-2 border border-neutral-800/80 shadow-md z-10 max-w-[85%]">
                <span className="truncate text-white">
                    {user?.name || "You"} {isHost ? "(Host)" : isCoHost ? "(Co-Host)" : "(You)"}
                </span>

                {/* Speaking audio wave indicator */}
                {isSpeaking && !isMuted ? (
                    <div className="flex items-end gap-0.5 h-3" title="Speaking">
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_300ms] h-2" />
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-2.5" />
                    </div>
                ) : isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-500 shrink-0" />
                ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}

                {isHandRaised && <Hand className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 animate-bounce" />}
                {isScreenSharing && <Presentation className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            </div>
        </div>
    );
};

interface RemoteVideoTileProps {
    participant: Participant;
    isSpeaking: boolean;
    isPinned: boolean;
    onPinToggle: () => void;
    isStage?: boolean;
    isFilmstrip?: boolean;
}

const RemoteVideoTile: React.FC<RemoteVideoTileProps> = ({
    participant,
    isSpeaking,
    isPinned,
    onPinToggle,
    isStage = false,
    isFilmstrip = false,
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (participant.stream) {
            const video = videoRef.current;
            if (video) {
                if (video.srcObject !== participant.stream) {
                    video.srcObject = participant.stream;
                }
                if (!participant.isCameraOff) {
                    video.play().catch((e) => {
                        console.debug("Remote video play caught:", e);
                    });
                }
            }
        }
    }, [participant.stream, participant.isCameraOff]);

    const showAvatar = participant.isCameraOff || !participant.stream;

    const handleToggleFullscreen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen?.().catch(() => {});
        } else {
            document.exitFullscreen?.().catch(() => {});
        }
    };

    return (
        <div
            ref={containerRef}
            onClick={onPinToggle}
            className={`relative w-full h-full bg-neutral-900 rounded-2xl overflow-hidden border-2 transition-all duration-200 cursor-pointer group flex items-center justify-center ${
                isStage ? "max-h-[82vh] aspect-video" : isFilmstrip ? "aspect-video" : "aspect-video max-h-[82vh]"
            } ${
                isSpeaking
                    ? "border-emerald-500 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/50"
                    : isPinned
                    ? "border-red-500/80 shadow-md shadow-red-500/20"
                    : "border-neutral-800/90 hover:border-neutral-700"
            }`}
        >
            {/* Video Frame */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full ${participant.isScreenSharing ? "object-contain bg-black" : "object-cover"} ${
                    showAvatar ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100 block"
                }`}
            />

            {/* Avatar overlay for Camera Off */}
            {showAvatar && (
                <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-neutral-900 to-neutral-950">
                    <div className="relative">
                        <Avatar className={`${isFilmstrip ? "h-10 w-10" : "h-16 w-16 sm:h-20 sm:w-20"} border-2 border-neutral-700 shadow-xl`}>
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback className="bg-neutral-800 text-lg sm:text-2xl font-bold text-neutral-300">
                                {participant.name?.[0] || "P"}
                            </AvatarFallback>
                        </Avatar>
                        {isSpeaking && (
                            <span className="absolute -inset-1 rounded-full border-2 border-emerald-500 animate-ping opacity-60" />
                        )}
                    </div>
                    {!isFilmstrip && (
                        <span className="text-xs font-semibold text-neutral-400">
                            {participant.name} {participant.isCameraOff ? "(Camera Off)" : ""}
                        </span>
                    )}
                </div>
            )}

            {/* Hover Action Overlay Toolbar */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-neutral-950/70 backdrop-blur-md p-1 rounded-xl border border-neutral-800">
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onPinToggle();
                    }}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                        isPinned ? "bg-red-600 text-white" : "text-neutral-300 hover:text-white hover:bg-neutral-800"
                    }`}
                    title={isPinned ? "Unpin screen" : "Pin screen to stage"}
                >
                    {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
                <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                    title="Fullscreen"
                >
                    <Maximize2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Bottom Status / Name Badge */}
            <div className="absolute bottom-2 left-2 bg-neutral-950/85 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-2 border border-neutral-800/80 shadow-md z-10 max-w-[85%]">
                <span className="truncate text-white max-w-[140px] sm:max-w-[200px]">
                    {participant.name} {participant.isHost ? "(Host)" : participant.isCoHost ? "(Co-Host)" : ""}
                </span>

                {/* Speaking audio wave indicator */}
                {isSpeaking && !participant.isMuted ? (
                    <div className="flex items-end gap-0.5 h-3" title="Speaking">
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_100ms] h-full" />
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_300ms] h-2" />
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_infinite_200ms] h-2.5" />
                    </div>
                ) : participant.isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-red-500 shrink-0" />
                ) : (
                    <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}

                {participant.isHandRaised && (
                    <Hand className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 animate-bounce" />
                )}
                {participant.isScreenSharing && <Presentation className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            </div>
        </div>
    );
};

// Background Audio Sink for Remote Participants
const ParticipantAudio: React.FC<{ participant: Participant }> = ({ participant }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (participant.stream) {
            if (audio.srcObject !== participant.stream) {
                audio.srcObject = participant.stream;
            }
            audio.volume = 1.0;

            const playAudio = () => {
                audio.play().catch((e) => {
                    console.debug(`[Audio] Autoplay blocked for participant ${participant.name}:`, e);
                    const unlockAudio = () => {
                        audio.play().catch(() => {});
                        window.removeEventListener("click", unlockAudio);
                        window.removeEventListener("keydown", unlockAudio);
                        window.removeEventListener("touchstart", unlockAudio);
                    };
                    window.addEventListener("click", unlockAudio, { once: true });
                    window.addEventListener("keydown", unlockAudio, { once: true });
                    window.addEventListener("touchstart", unlockAudio, { once: true });
                });
            };

            playAudio();

            const stream = participant.stream;
            const handleTrackAdded = () => {
                playAudio();
            };
            stream.addEventListener("addtrack", handleTrackAdded);
            return () => {
                stream.removeEventListener("addtrack", handleTrackAdded);
            };
        } else {
            audio.srcObject = null;
        }
    }, [participant.stream, participant.name]);

    return (
        <audio
            ref={audioRef}
            autoPlay
            playsInline
        />
    );
};
