"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface Participant {
    socketId: string;
    userId: string;
    name: string;
    avatar: string;
    isMuted: boolean;
    isCameraOff: boolean;
    isScreenSharing: boolean;
    isHandRaised: boolean;
    isHost: boolean;
    isCoHost: boolean;
    stream?: MediaStream;
}

export interface ChatMessage {
    id: string;
    senderSocketId: string;
    senderName: string;
    senderAvatar: string;
    text: string;
    emoji?: string;
    attachment?: {
        url: string;
        name: string;
        size: number;
        type: string;
    };
    timestamp: string;
}

export interface RoomSettings {
    isLocked: boolean;
    allowedScreenShare: boolean;
    allowedChat: boolean;
}

interface UseWebRTCOptions {
    roomId: string;
    user: any;
    passcode?: string;
    onKicked?: (message: string) => void;
    onCallEnded?: () => void;
}

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

export function useWebRTC({ roomId, user, passcode, onKicked, onCallEnded }: UseWebRTCOptions) {
    const socketRef = useRef<Socket | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const audioAnalysersRef = useRef<Map<string, { analyser: AnalyserNode; dataArray: Uint8Array }>>(new Map());

    const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
    const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [availableAudioDevices, setAvailableAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
    const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");

    const [isHost, setIsHost] = useState(false);
    const [isCoHost, setIsCoHost] = useState(false);
    const [roomSettings, setRoomSettings] = useState<RoomSettings>({
        isLocked: false,
        allowedScreenShare: true,
        allowedChat: true,
    });
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [connectionQuality, setConnectionQuality] = useState<"Good" | "Fair" | "Poor">("Good");
    const [speakingSockets, setSpeakingSockets] = useState<Set<string>>(new Set());
    const [joinError, setJoinError] = useState<string | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    const [mySocketId, setMySocketId] = useState<string>("");

    // Backend Socket URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

    // Enumerate media input devices
    const enumerateDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter((d) => d.kind === "videoinput");
            const audioInputs = devices.filter((d) => d.kind === "audioinput");
            setAvailableVideoDevices(videoInputs);
            setAvailableAudioDevices(audioInputs);
            if (videoInputs.length && !selectedVideoDevice) setSelectedVideoDevice(videoInputs[0].deviceId);
            if (audioInputs.length && !selectedAudioDevice) setSelectedAudioDevice(audioInputs[0].deviceId);
        } catch (err) {
            console.error("Error enumerating devices:", err);
        }
    }, [selectedAudioDevice, selectedVideoDevice]);

    // Initialize local media stream
    const initLocalStream = useCallback(
        async (customVideoDeviceId?: string, customAudioDeviceId?: string, customFacingMode?: "user" | "environment") => {
            try {
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach((t) => t.stop());
                }

                const constraints: MediaStreamConstraints = {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        deviceId: customAudioDeviceId ? { ideal: customAudioDeviceId } : undefined,
                    },
                    video: {
                        facingMode: customFacingMode || facingMode,
                        deviceId: customVideoDeviceId ? { ideal: customVideoDeviceId } : undefined,
                    },
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                localStreamRef.current = stream;
                setLocalStream(stream);

                // Update tracks in existing peer connections
                peerConnectionsRef.current.forEach((pc) => {
                    const senders = pc.getSenders();
                    stream.getTracks().forEach((track) => {
                        const sender = senders.find((s) => s.track?.kind === track.kind);
                        if (sender) {
                            sender.replaceTrack(track);
                        }
                    });
                });

                await enumerateDevices();
                return stream;
            } catch (err: any) {
                console.warn("Constrained getUserMedia failed, attempting basic video+audio fallback:", err);
                try {
                    const basicStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: { echoCancellation: true, noiseSuppression: true },
                    });
                    localStreamRef.current = basicStream;
                    setLocalStream(basicStream);
                    setIsCameraOff(false);
                    await enumerateDevices();
                    return basicStream;
                } catch (basicErr) {
                    console.warn("Video source unreadable or in use by another app, falling back to audio-only mode:", basicErr);
                    try {
                        const audioStream = await navigator.mediaDevices.getUserMedia({
                            audio: { echoCancellation: true, noiseSuppression: true },
                            video: false,
                        });
                        localStreamRef.current = audioStream;
                        setLocalStream(audioStream);
                        setIsCameraOff(true);
                        return audioStream;
                    } catch (audioErr) {
                        console.error("Camera and Microphone permission denied:", audioErr);
                        setIsCameraOff(true);
                        setIsMuted(true);
                        return null;
                    }
                }
            }
        },
        [facingMode, enumerateDevices]
    );

    // Automatically initialize local stream on hook mount for pre-join lobby preview
    useEffect(() => {
        initLocalStream();
    }, [initLocalStream]);
    useEffect(() => {
        if (!localStream) return;
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioSource = audioContext.createMediaStreamSource(localStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            audioSource.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const interval = setInterval(() => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const average = sum / dataArray.length;

                setSpeakingSockets((prev) => {
                    const next = new Set(prev);
                    if (average > 25 && !isMuted) {
                        next.add(mySocketId);
                    } else {
                        next.delete(mySocketId);
                    }
                    return next;
                });
            }, 200);

            return () => {
                clearInterval(interval);
                audioContext.close();
            };
        } catch (e) {
            console.error("Audio Context setup error:", e);
        }
    }, [localStream, isMuted, mySocketId]);

    // Create RTCPeerConnection for target peer socket
    const createPeerConnection = useCallback(
        (targetSocketId: string, socket: Socket) => {
            if (peerConnectionsRef.current.has(targetSocketId)) {
                return peerConnectionsRef.current.get(targetSocketId)!;
            }

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionsRef.current.set(targetSocketId, pc);

            // Add local stream tracks to PC
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => {
                    pc.addTrack(track, localStreamRef.current!);
                });
            }

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("ice-candidate", {
                        targetSocketId,
                        candidate: event.candidate,
                    });
                }
            };

            // Handle incoming remote track
            pc.ontrack = (event) => {
                const remoteStream = event.streams[0];
                setParticipants((prev) => {
                    const next = new Map(prev);
                    const existing = next.get(targetSocketId);
                    if (existing) {
                        next.set(targetSocketId, { ...existing, stream: remoteStream });
                    }
                    return next;
                });
            };

            // Monitor connection stats
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                    setConnectionQuality("Poor");
                } else if (pc.connectionState === "connected") {
                    setConnectionQuality("Good");
                }
            };

            return pc;
        },
        []
    );

    // Join room function
    const joinRoom = useCallback(async () => {
        if (!user) return;
        const socket = io(backendUrl, {
            transports: ["websocket", "polling"],
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on("connect", async () => {
            setMySocketId(socket.id!);
            if (!localStreamRef.current) {
                await initLocalStream();
            }

            socket.emit("join-room", {
                roomId,
                user,
                passcode,
            });
        });

        socket.on("room-joined", async ({ yourSocketId, isHost: hostStatus, isCoHost: coHostStatus, settings, existingParticipants }) => {
            setIsJoined(true);
            setIsHost(hostStatus);
            setIsCoHost(coHostStatus);
            setRoomSettings(settings);
            setMySocketId(yourSocketId);

            const map = new Map<string, Participant>();
            existingParticipants.forEach((p: Participant) => {
                map.set(p.socketId, p);
            });
            setParticipants(map);

            // Initiate WebRTC offers to existing participants
            existingParticipants.forEach(async (p: Participant) => {
                const pc = createPeerConnection(p.socketId, socket);
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit("webrtc-offer", { targetSocketId: p.socketId, offer });
                } catch (err) {
                    console.error("Error creating peer offer:", err);
                }
            });
        });

        socket.on("user-joined", (p: Participant) => {
            setParticipants((prev) => {
                const next = new Map(prev);
                next.set(p.socketId, p);
                return next;
            });
        });

        socket.on("webrtc-offer", async ({ senderSocketId, offer }) => {
            const pc = createPeerConnection(senderSocketId, socket);
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("webrtc-answer", { targetSocketId: senderSocketId, answer });
            } catch (err) {
                console.error("Error handling WebRTC offer:", err);
            }
        });

        socket.on("webrtc-answer", async ({ senderSocketId, answer }) => {
            const pc = peerConnectionsRef.current.get(senderSocketId);
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (err) {
                    console.error("Error setting remote description from answer:", err);
                }
            }
        });

        socket.on("ice-candidate", async ({ senderSocketId, candidate }) => {
            const pc = peerConnectionsRef.current.get(senderSocketId);
            if (pc) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("Error adding ICE candidate:", err);
                }
            }
        });

        socket.on("participant-updated", (updatedP: Participant) => {
            setParticipants((prev) => {
                const next = new Map(prev);
                const existing = next.get(updatedP.socketId);
                if (existing) {
                    next.set(updatedP.socketId, { ...existing, ...updatedP, stream: existing.stream });
                }
                return next;
            });
        });

        socket.on("user-left", ({ socketId }) => {
            setParticipants((prev) => {
                const next = new Map(prev);
                next.delete(socketId);
                return next;
            });

            const pc = peerConnectionsRef.current.get(socketId);
            if (pc) {
                pc.close();
                peerConnectionsRef.current.delete(socketId);
            }
        });

        socket.on("chat-message-received", (msg: ChatMessage) => {
            setChatMessages((prev) => [...prev, msg]);
        });

        socket.on("room-settings-updated", (settings: RoomSettings) => {
            setRoomSettings(settings);
        });

        socket.on("force-mute", () => {
            toggleMute(true);
        });

        socket.on("force-kicked", ({ message }) => {
            if (onKicked) onKicked(message || "You were removed from the meeting.");
            leaveRoom();
        });

        socket.on("call-ended-by-host", () => {
            if (onCallEnded) onCallEnded();
            leaveRoom();
        });

        socket.on("join-error", ({ message }) => {
            setJoinError(message);
        });

        return socket;
    }, [backendUrl, roomId, user, passcode, initLocalStream, createPeerConnection, onKicked, onCallEnded]);

    // Leave room cleanup
    const leaveRoom = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.emit("leave-room");
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
        }

        setLocalStream(null);
        setScreenStream(null);
        setIsJoined(false);
    }, []);

    // Toggle Audio Mute
    const toggleMute = useCallback(async (forceVal?: boolean) => {
        const newMutedState = forceVal !== undefined ? forceVal : !isMuted;
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            if (audioTracks.length > 0 && audioTracks[0].readyState === "live") {
                audioTracks.forEach((track) => {
                    track.enabled = !newMutedState;
                });
                setIsMuted(newMutedState);
            } else {
                if (!newMutedState) {
                    await initLocalStream(selectedVideoDevice, selectedAudioDevice);
                    setIsMuted(false);
                } else {
                    setIsMuted(true);
                }
            }
        } else {
            if (!newMutedState) {
                await initLocalStream(selectedVideoDevice, selectedAudioDevice);
                setIsMuted(false);
            } else {
                setIsMuted(true);
            }
        }

        if (socketRef.current && roomId) {
            socketRef.current.emit("toggle-audio", { roomId, isMuted: newMutedState });
        }
    }, [isMuted, roomId, initLocalStream, selectedVideoDevice, selectedAudioDevice]);

    // Toggle Camera On/Off
    const toggleCamera = useCallback(async (forceVal?: boolean) => {
        const newCamState = forceVal !== undefined ? forceVal : !isCameraOff;
        if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            if (videoTracks.length > 0 && videoTracks[0].readyState === "live") {
                videoTracks.forEach((track) => {
                    track.enabled = !newCamState;
                });
                setIsCameraOff(newCamState);
            } else {
                if (!newCamState) {
                    await initLocalStream(selectedVideoDevice, selectedAudioDevice);
                    setIsCameraOff(false);
                } else {
                    setIsCameraOff(true);
                }
            }
        } else {
            if (!newCamState) {
                await initLocalStream(selectedVideoDevice, selectedAudioDevice);
                setIsCameraOff(false);
            } else {
                setIsCameraOff(true);
            }
        }

        if (socketRef.current && roomId) {
            socketRef.current.emit("toggle-video", { roomId, isCameraOff: newCamState });
        }
    }, [isCameraOff, roomId, initLocalStream, selectedVideoDevice, selectedAudioDevice]);

    // Switch Camera (Front/Rear on Mobile)
    const switchCamera = useCallback(async () => {
        const nextMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(nextMode);
        await initLocalStream(undefined, undefined, nextMode);
    }, [facingMode, initLocalStream]);

    // Toggle Screen Share
    const toggleScreenShare = useCallback(async () => {
        if (!roomSettings.allowedScreenShare && !isHost && !isCoHost) {
            alert("Screen sharing is currently disabled by the host.");
            return;
        }

        if (isScreenSharing) {
            // Stop screen sharing
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((t) => t.stop());
                screenStreamRef.current = null;
            }
            setScreenStream(null);
            setIsScreenSharing(false);

            // Restore video track to peer connections
            if (localStreamRef.current) {
                const videoTrack = localStreamRef.current.getVideoTracks()[0];
                if (videoTrack) {
                    peerConnectionsRef.current.forEach((pc) => {
                        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
                        if (sender) sender.replaceTrack(videoTrack);
                    });
                }
            }
            if (socketRef.current) {
                socketRef.current.emit("toggle-screenshare", { roomId, isScreenSharing: false });
            }
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                screenStreamRef.current = stream;
                setScreenStream(stream);
                setIsScreenSharing(true);

                const screenTrack = stream.getVideoTracks()[0];

                // Replace video track in peer connections with screen share track
                peerConnectionsRef.current.forEach((pc) => {
                    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
                    if (sender) sender.replaceTrack(screenTrack);
                });

                screenTrack.onended = () => {
                    setIsScreenSharing(false);
                    setScreenStream(null);
                    if (localStreamRef.current) {
                        const videoTrack = localStreamRef.current.getVideoTracks()[0];
                        if (videoTrack) {
                            peerConnectionsRef.current.forEach((pc) => {
                                const sender = pc.getSenders().find((s) => s.track?.kind === "video");
                                if (sender) sender.replaceTrack(videoTrack);
                            });
                        }
                    }
                    if (socketRef.current) {
                        socketRef.current.emit("toggle-screenshare", { roomId, isScreenSharing: false });
                    }
                };

                if (socketRef.current) {
                    socketRef.current.emit("toggle-screenshare", { roomId, isScreenSharing: true });
                }
            } catch (err) {
                console.error("Screen share error:", err);
            }
        }
    }, [isScreenSharing, roomSettings.allowedScreenShare, isHost, isCoHost, roomId]);

    // Toggle Raise Hand
    const toggleRaiseHand = useCallback(() => {
        const nextHand = !isHandRaised;
        setIsHandRaised(nextHand);
        if (socketRef.current) {
            socketRef.current.emit("raise-hand", { roomId, isHandRaised: nextHand });
        }
    }, [isHandRaised, roomId]);

    // Send Chat Message
    const sendChatMessage = useCallback(
        (text: string, emoji?: string, attachment?: any) => {
            if (socketRef.current) {
                socketRef.current.emit("send-chat-message", { roomId, text, emoji, attachment });
            }
        },
        [roomId]
    );

    // Host Controls
    const sendHostControl = useCallback(
        (action: string, targetSocketId?: string) => {
            if (socketRef.current && (isHost || isCoHost)) {
                socketRef.current.emit("host-control", { roomId, action, targetSocketId });
            }
        },
        [isHost, isCoHost, roomId]
    );

    const selectVideoDevice = useCallback(
        async (deviceId: string) => {
            setSelectedVideoDevice(deviceId);
            await initLocalStream(deviceId, selectedAudioDevice);
        },
        [selectedAudioDevice, initLocalStream]
    );

    const selectAudioDevice = useCallback(
        async (deviceId: string) => {
            setSelectedAudioDevice(deviceId);
            await initLocalStream(selectedVideoDevice, deviceId);
        },
        [selectedVideoDevice, initLocalStream]
    );

    return {
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
        joinError,
        isJoined,
        mySocketId,
        availableVideoDevices,
        availableAudioDevices,
        selectedVideoDevice,
        selectedAudioDevice,
        setSelectedVideoDevice: selectVideoDevice,
        setSelectedAudioDevice: selectAudioDevice,
        initLocalStream,
        joinRoom,
        leaveRoom,
        toggleMute,
        toggleCamera,
        switchCamera,
        toggleScreenShare,
        toggleRaiseHand,
        sendChatMessage,
        sendHostControl,
    };
}
