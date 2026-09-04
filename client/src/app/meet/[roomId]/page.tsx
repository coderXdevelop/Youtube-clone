"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/AuthContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import { MeetingLobby } from "@/components/meet/MeetingLobby";
import { VideoCallRoom } from "@/components/meet/VideoCallRoom";
import axios from "axios";

interface MeetingRoomPageProps {
    params: Promise<{
        roomId: string;
    }>;
}

export default function MeetingRoomPage({ params }: MeetingRoomPageProps) {
    const resolvedParams = use(params);
    const roomId = resolvedParams.roomId;

    const { user } = useUser();
    const router = useRouter();

    const [meetingDetails, setMeetingDetails] = useState<any>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Fetch Meeting metadata from backend REST API
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
                const res = await axios.get(`${backendUrl}/api/meeting/details/${roomId}`);
                if (res.data?.meeting) {
                    setMeetingDetails(res.data.meeting);
                }
            } catch (err: any) {
                console.warn("Could not fetch meeting details, fallback to instant room:", err);
                // Allow dynamic join for instant room
                setMeetingDetails({
                    roomId,
                    title: "Video Call Meeting",
                    hasPasscode: false,
                });
            } finally {
                setIsLoadingDetails(false);
            }
        };

        if (roomId) fetchDetails();
    }, [roomId]);

    const handleKicked = (msg: string) => {
        alert(msg);
        router.push("/meet");
    };

    const handleCallEnded = () => {
        alert("The host has ended the meeting.");
        router.push("/meet");
    };

    const webrtc = useWebRTC({
        roomId,
        user,
        onKicked: handleKicked,
        onCallEnded: handleCallEnded,
    });

    const handleJoinWithPasscode = (passcodeInput: string) => {
        webrtc.joinRoom();
    };

    const handleLeaveCall = () => {
        webrtc.leaveRoom();
        router.push("/meet");
    };

    if (isLoadingDetails) {
        return (
            <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center font-sans">
                <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-semibold text-neutral-400">Loading meeting room details...</p>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 font-sans">
                <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md text-center flex flex-col gap-4">
                    <h2 className="text-xl font-bold text-red-500">Meeting Room Error</h2>
                    <p className="text-sm text-neutral-400">{fetchError}</p>
                    <button
                        onClick={() => router.push("/meet")}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-xl text-sm"
                    >
                        Return to Meetings
                    </button>
                </div>
            </div>
        );
    }

    if (!webrtc.isJoined) {
        return (
            <MeetingLobby
                roomId={roomId}
                meetingTitle={meetingDetails?.title || "Video Call Meeting"}
                hasPasscode={meetingDetails?.hasPasscode || false}
                user={user}
                localStream={webrtc.localStream}
                isMuted={webrtc.isMuted}
                isCameraOff={webrtc.isCameraOff}
                availableVideoDevices={webrtc.availableVideoDevices}
                availableAudioDevices={webrtc.availableAudioDevices}
                selectedVideoDevice={webrtc.selectedVideoDevice}
                selectedAudioDevice={webrtc.selectedAudioDevice}
                onSelectVideoDevice={webrtc.setSelectedVideoDevice}
                onSelectAudioDevice={webrtc.setSelectedAudioDevice}
                onToggleMute={webrtc.toggleMute}
                onToggleCamera={webrtc.toggleCamera}
                onSwitchCamera={webrtc.switchCamera}
                onJoin={handleJoinWithPasscode}
                joinError={webrtc.joinError}
            />
        );
    }

    return (
        <VideoCallRoom
            roomId={roomId}
            meetingTitle={meetingDetails?.title || "Video Call Meeting"}
            user={user}
            localStream={webrtc.localStream}
            screenStream={webrtc.screenStream}
            participants={webrtc.participants}
            isMuted={webrtc.isMuted}
            isCameraOff={webrtc.isCameraOff}
            isScreenSharing={webrtc.isScreenSharing}
            isHandRaised={webrtc.isHandRaised}
            isHost={webrtc.isHost}
            isCoHost={webrtc.isCoHost}
            roomSettings={webrtc.roomSettings}
            chatMessages={webrtc.chatMessages}
            connectionQuality={webrtc.connectionQuality}
            speakingSockets={webrtc.speakingSockets}
            mySocketId={webrtc.mySocketId}
            onToggleMute={webrtc.toggleMute}
            onToggleCamera={webrtc.toggleCamera}
            onSwitchCamera={webrtc.switchCamera}
            onToggleScreenShare={webrtc.toggleScreenShare}
            onToggleRaiseHand={webrtc.toggleRaiseHand}
            onSendChatMessage={webrtc.sendChatMessage}
            onSendHostControl={webrtc.sendHostControl}
            onLeaveCall={handleLeaveCall}
        />
    );
}
