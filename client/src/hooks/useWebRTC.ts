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
    allowedAudio?: boolean;
}

interface UseWebRTCOptions {
    roomId: string;
    user: any;
    passcode?: string;
    onKicked?: (message: string) => void;
    onCallEnded?: () => void;
}

// STUN + Open Relay TURN — enables cross-network connections (mobile ↔ desktop, different carriers)
// Open Relay is free for development; replace with paid credentials for production.
const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:openrelay.metered.ca:80" },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
    ],
};

export function useWebRTC({ roomId, user, passcode, onKicked, onCallEnded }: UseWebRTCOptions) {
    const socketRef = useRef<Socket | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const audioAnalysersRef = useRef<Map<string, { analyser: AnalyserNode; dataArray: Uint8Array }>>(new Map());
    // Track reconnect attempts for mobile network drops
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 3;
    const isReconnectingRef = useRef(false);

    const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const isMutedRef = useRef(false);
    const isCameraOffRef = useRef(false);
    const streamInitPromiseRef = useRef<Promise<MediaStream | null> | null>(null);
    const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [availableAudioDevices, setAvailableAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
    const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");

    // Detect mobile devices (phones/tablets with front/rear cameras)
    useEffect(() => {
        if (typeof window !== "undefined" && typeof navigator !== "undefined") {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || "";
            const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
            const isTouchScreen = Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth <= 1024);
            setIsMobile(isMobileUA || isTouchScreen);
        }
    }, []);

    const [isHost, setIsHost] = useState(false);
    const [isCoHost, setIsCoHost] = useState(false);
    const [roomSettings, setRoomSettings] = useState<RoomSettings>({
        isLocked: false,
        allowedScreenShare: true,
        allowedChat: true,
        allowedAudio: true,
    });
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [connectionQuality, setConnectionQuality] = useState<"Good" | "Fair" | "Poor">("Good");
    const [speakingSockets, setSpeakingSockets] = useState<Set<string>>(new Set());
    const [joinError, setJoinError] = useState<string | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    const [mySocketId, setMySocketId] = useState<string>("");

    const [mediaError, setMediaError] = useState<string | null>(null);
    const [mediaPermissionState, setMediaPermissionState] = useState<{
        camera: "granted" | "denied" | "prompt" | "unavailable";
        audio: "granted" | "denied" | "prompt" | "unavailable";
    }>({ camera: "prompt", audio: "prompt" });

    // Backend Socket URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

    // Validate secure context and MediaDevices API availability
    const checkMediaSupport = useCallback(() => {
        if (typeof window === "undefined") return { supported: false, message: "Server-side environment." };
        if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
            return {
                supported: false,
                message: "Camera and Microphone access requires a secure context (HTTPS or localhost). Please switch to HTTPS.",
            };
        }
        if (!navigator?.mediaDevices?.getUserMedia) {
            return {
                supported: false,
                message: "Your browser does not support media device capture (getUserMedia is unavailable).",
            };
        }
        return { supported: true, message: "" };
    }, []);

    // Format user-friendly media error message
    const parseMediaError = useCallback((err: any): string => {
        const errorName = err?.name || err?.message || "";
        if (errorName.includes("NotAllowedError") || errorName.includes("PermissionDeniedError")) {
            return "Camera or microphone permission was denied. Please click the lock or camera icon in your browser address bar to allow access.";
        }
        if (errorName.includes("NotFoundError") || errorName.includes("DevicesNotFoundError")) {
            return "No camera or microphone hardware was found on this device.";
        }
        if (errorName.includes("NotReadableError") || errorName.includes("TrackStartError")) {
            return "Camera or microphone is already in use by another application or browser tab.";
        }
        if (errorName.includes("OverconstrainedError")) {
            return "The requested camera or microphone settings are not supported by your hardware.";
        }
        if (errorName.includes("SecurityError")) {
            return "Media access blocked due to insecure HTTP context. Please use HTTPS.";
        }
        return err?.message || "Failed to access media devices.";
    }, []);

    // Enumerate media input devices
    const enumerateDevices = useCallback(async () => {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
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
            if (streamInitPromiseRef.current) {
                return await streamInitPromiseRef.current;
            }

            const initPromise = (async () => {
                const support = checkMediaSupport();
                if (!support.supported) {
                    setMediaError(support.message);
                    setMediaPermissionState({ camera: "unavailable", audio: "unavailable" });
                    return null;
                }

                try {
                    if (localStreamRef.current) {
                        localStreamRef.current.getTracks().forEach((t) => t.stop());
                    }

                    const targetFacing = customFacingMode || facingMode;
                    const constraints: MediaStreamConstraints = {
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            // @ts-ignore — Chrome-specific constraint for stronger AEC
                            googEchoCancellation: true,
                            // @ts-ignore
                            googAutoGainControl: true,
                            // @ts-ignore
                            googNoiseSuppression: true,
                            deviceId: customAudioDeviceId ? { ideal: customAudioDeviceId } : (selectedAudioDevice ? { ideal: selectedAudioDevice } : undefined),
                        },
                        video: customVideoDeviceId
                            ? { deviceId: { ideal: customVideoDeviceId } }
                            : { facingMode: { ideal: targetFacing } },
                    };

                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    // Apply current mute and camera off preferences to newly acquired tracks
                    stream.getAudioTracks().forEach((t) => { t.enabled = !isMutedRef.current; });
                    stream.getVideoTracks().forEach((t) => { t.enabled = !isCameraOffRef.current; });

                    localStreamRef.current = stream;
                    setLocalStream(stream);
                    setMediaError(null);
                    setMediaPermissionState({ camera: "granted", audio: "granted" });

                    // Update tracks in existing peer connections
                    peerConnectionsRef.current.forEach((pc) => {
                        const transceivers = pc.getTransceivers();
                        const audioTransceiver = transceivers.find((t) => t.receiver.track.kind === "audio");
                        const videoTransceiver = transceivers.find((t) => t.receiver.track.kind === "video");

                        const audioTrack = stream.getAudioTracks()[0];
                        const videoTrack = stream.getVideoTracks()[0];

                        if (audioTrack) {
                            if (audioTransceiver) {
                                audioTransceiver.sender.replaceTrack(audioTrack).catch((e) => console.debug("Audio replaceTrack caught:", e));
                            } else {
                                pc.addTrack(audioTrack, stream);
                            }
                        }

                        if (videoTrack) {
                            if (videoTransceiver) {
                                videoTransceiver.sender.replaceTrack(videoTrack).catch((e) => console.debug("Video replaceTrack caught:", e));
                            } else {
                                pc.addTrack(videoTrack, stream);
                            }
                        }
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

                        basicStream.getAudioTracks().forEach((t) => { t.enabled = !isMutedRef.current; });
                        basicStream.getVideoTracks().forEach((t) => { t.enabled = !isCameraOffRef.current; });

                        localStreamRef.current = basicStream;
                        setLocalStream(basicStream);
                        setMediaError(null);
                        setMediaPermissionState({ camera: "granted", audio: "granted" });

                        peerConnectionsRef.current.forEach((pc) => {
                            const transceivers = pc.getTransceivers();
                            const audioTransceiver = transceivers.find((t) => t.receiver.track.kind === "audio");
                            const videoTransceiver = transceivers.find((t) => t.receiver.track.kind === "video");

                            const audioTrack = basicStream.getAudioTracks()[0];
                            const videoTrack = basicStream.getVideoTracks()[0];

                            if (audioTrack) {
                                if (audioTransceiver) {
                                    audioTransceiver.sender.replaceTrack(audioTrack).catch((e) => console.debug("Audio replaceTrack caught:", e));
                                } else {
                                    pc.addTrack(audioTrack, basicStream);
                                }
                            }

                            if (videoTrack) {
                                if (videoTransceiver) {
                                    videoTransceiver.sender.replaceTrack(videoTrack).catch((e) => console.debug("Video replaceTrack caught:", e));
                                } else {
                                    pc.addTrack(videoTrack, basicStream);
                                }
                            }
                        });

                        await enumerateDevices();
                        return basicStream;
                    } catch (basicErr) {
                        console.warn("Video source unreadable, falling back to audio-only mode:", basicErr);
                        try {
                            const audioStream = await navigator.mediaDevices.getUserMedia({
                                audio: { echoCancellation: true, noiseSuppression: true },
                                video: false,
                            });

                            audioStream.getAudioTracks().forEach((t) => { t.enabled = !isMutedRef.current; });

                            localStreamRef.current = audioStream;
                            setLocalStream(audioStream);
                            setIsCameraOff(true);
                            isCameraOffRef.current = true;
                            setMediaError("Camera is unavailable. Running in audio-only mode.");
                            setMediaPermissionState({ camera: "denied", audio: "granted" });

                            peerConnectionsRef.current.forEach((pc) => {
                                const transceivers = pc.getTransceivers();
                                const audioTransceiver = transceivers.find((t) => t.receiver.track.kind === "audio");
                                const audioTrack = audioStream.getAudioTracks()[0];

                                if (audioTrack) {
                                    if (audioTransceiver) {
                                        audioTransceiver.sender.replaceTrack(audioTrack).catch((e) => console.debug("Audio replaceTrack caught:", e));
                                    } else {
                                        pc.addTrack(audioTrack, audioStream);
                                    }
                                }
                            });

                            await enumerateDevices();
                            return audioStream;
                        } catch (audioErr: any) {
                            console.error("Camera and Microphone permission denied:", audioErr);
                            const userFriendlyMsg = parseMediaError(audioErr);
                            setMediaError(userFriendlyMsg);
                            setMediaPermissionState({ camera: "denied", audio: "denied" });
                            setIsCameraOff(true);
                            isCameraOffRef.current = true;
                            setIsMuted(true);
                            isMutedRef.current = true;
                            return null;
                        }
                    }
                } finally {
                    streamInitPromiseRef.current = null;
                }
            })();

            streamInitPromiseRef.current = initPromise;
            return await initPromise;
        },
        [facingMode, enumerateDevices, checkMediaSupport, parseMediaError, selectedAudioDevice]
    );

    // Initialize local stream once on hook mount
    useEffect(() => {
        initLocalStream();
    }, []);

    useEffect(() => {
        if (!localStream) return;
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length === 0) return;

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
                const isSpeakingNow = average > 25 && !isMutedRef.current;

                setSpeakingSockets((prev) => {
                    const next = new Set(prev);
                    const wasSpeaking = next.has(mySocketId);
                    if (isSpeakingNow !== wasSpeaking) {
                        if (isSpeakingNow) {
                            next.add(mySocketId);
                        } else {
                            next.delete(mySocketId);
                        }
                        if (socketRef.current && roomId) {
                            socketRef.current.emit("speaking-change", { roomId, isSpeaking: isSpeakingNow });
                        }
                    }
                    return next;
                });
            }, 200);

            return () => {
                clearInterval(interval);
                audioContext.close().catch(() => {});
            };
        } catch (e) {
            console.error("Audio Context setup error:", e);
        }
    }, [localStream, mySocketId, roomId]);

    // Process queued ICE candidates for a peer
    const processPendingIceCandidates = useCallback(async (targetSocketId: string, pc: RTCPeerConnection) => {
        const candidates = pendingIceCandidatesRef.current.get(targetSocketId);
        if (candidates && candidates.length > 0) {
            pendingIceCandidatesRef.current.delete(targetSocketId);
            for (const candidate of candidates) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("Error adding queued ICE candidate:", err);
                }
            }
        }
    }, []);

    // Create RTCPeerConnection for target peer socket
    const createPeerConnection = useCallback(
        (targetSocketId: string, socket: Socket, forceRecreate: boolean = false) => {
            const existingPc = peerConnectionsRef.current.get(targetSocketId);
            if (existingPc) {
                // Reuse healthy connection unless caller demands a fresh one
                const isDead = existingPc.connectionState === 'closed' || existingPc.connectionState === 'failed';
                if (!forceRecreate && !isDead) {
                    return existingPc;
                }
                // Tear down stale / dead connection before creating a fresh one
                console.log(`[WebRTC] Recreating peer connection for ${targetSocketId} (force=${forceRecreate}, state=${existingPc.connectionState})`);
                try { existingPc.close(); } catch (_) {}
                peerConnectionsRef.current.delete(targetSocketId);
                pendingIceCandidatesRef.current.delete(targetSocketId);
            }

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionsRef.current.set(targetSocketId, pc);

            const stream = localStreamRef.current;
            const audioTrack = stream?.getAudioTracks()[0];
            const videoTrack = stream?.getVideoTracks()[0];

            // Always add audio transceiver/track first, video transceiver/track second
            if (audioTrack && stream) {
                pc.addTrack(audioTrack, stream);
            } else {
                try {
                    pc.addTransceiver("audio", { direction: "sendrecv" });
                } catch (e) {}
            }

            if (videoTrack && stream) {
                pc.addTrack(videoTrack, stream);
            } else {
                try {
                    pc.addTransceiver("video", { direction: "sendrecv" });
                } catch (e) {}
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

            // Handle incoming remote track (both audio and video)
            pc.ontrack = (event) => {
                const incomingTrack = event.track;
                const remoteMediaStream = (event.streams && event.streams[0]) ? event.streams[0] : null;

                setParticipants((prev) => {
                    const next = new Map(prev);
                    const existing = next.get(targetSocketId);
                    
                    let streamToBind: MediaStream;
                    if (remoteMediaStream) {
                        streamToBind = remoteMediaStream;
                    } else if (existing?.stream) {
                        streamToBind = existing.stream;
                        if (!streamToBind.getTracks().some((t) => t.id === incomingTrack.id)) {
                            streamToBind.addTrack(incomingTrack);
                        }
                    } else {
                        streamToBind = new MediaStream([incomingTrack]);
                    }

                    if (existing) {
                        next.set(targetSocketId, { ...existing, stream: streamToBind });
                    } else {
                        next.set(targetSocketId, {
                            socketId: targetSocketId,
                            userId: targetSocketId,
                            name: "Participant",
                            avatar: "",
                            isMuted: false,
                            isCameraOff: false,
                            isScreenSharing: false,
                            isHandRaised: false,
                            isHost: false,
                            isCoHost: false,
                            stream: streamToBind,
                        });
                    }
                    return next;
                });
            };

            // Monitor connection state — attempt ICE restart on failure
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === "failed") {
                    setConnectionQuality("Poor");
                    try {
                        pc.restartIce();
                        pc.createOffer({ iceRestart: true }).then((offer) => {
                            return pc.setLocalDescription(offer);
                        }).then(() => {
                            socket.emit("webrtc-offer", {
                                targetSocketId,
                                offer: pc.localDescription,
                            });
                        }).catch((err) => console.warn("ICE restart offer failed:", err));
                    } catch (err) {
                        console.warn("ICE restart not supported:", err);
                    }
                } else if (pc.connectionState === "disconnected") {
                    setConnectionQuality("Fair");
                } else if (pc.connectionState === "connected") {
                    setConnectionQuality("Good");
                }
            };


            return pc;
        },
        []
    );

    // Leave room cleanup
    const leaveRoom = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.emit("leave-room");
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        peerConnectionsRef.current.forEach((pc) => pc.close());
        peerConnectionsRef.current.clear();
        pendingIceCandidatesRef.current.clear();

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
        const targetMutedState = typeof forceVal === "boolean" ? forceVal : !isMutedRef.current;

        // Prevent participant from unmuting if the host has muted all and locked unmute
        if (!targetMutedState && roomSettings.allowedAudio === false && !isHost && !isCoHost) {
            alert("The host has muted all participants. Unmuting is currently locked by the host.");
            return;
        }

        isMutedRef.current = targetMutedState;
        setIsMuted(targetMutedState);

        const currentStream = localStreamRef.current;
        const audioTracks = currentStream ? currentStream.getAudioTracks() : [];

        if (audioTracks.length > 0) {
            audioTracks.forEach((track) => {
                track.enabled = !targetMutedState;
            });
        } else if (!targetMutedState && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
            // No audio track existed (e.g. initial failure), dynamically request microphone access
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        deviceId: selectedAudioDevice ? { ideal: selectedAudioDevice } : undefined,
                    },
                    video: false,
                });
                const newAudioTrack = audioStream.getAudioTracks()[0];
                if (newAudioTrack) {
                    newAudioTrack.enabled = true;
                    if (localStreamRef.current) {
                        localStreamRef.current.addTrack(newAudioTrack);
                        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                    } else {
                        localStreamRef.current = audioStream;
                        setLocalStream(audioStream);
                    }

                    peerConnectionsRef.current.forEach((pc) => {
                        const senders = pc.getSenders();
                        const audioSender = senders.find((s) => s.track?.kind === "audio");
                        if (audioSender) {
                            audioSender.replaceTrack(newAudioTrack);
                        } else {
                            pc.addTrack(newAudioTrack, localStreamRef.current!);
                        }
                    });
                }
            } catch (err) {
                console.error("Failed to dynamically acquire audio track on unmute:", err);
            }
        }

        peerConnectionsRef.current.forEach((pc) => {
            pc.getSenders().forEach((sender) => {
                if (sender.track?.kind === "audio") {
                    sender.track.enabled = !targetMutedState;
                }
            });
        });

        if (socketRef.current && roomId) {
            socketRef.current.emit("toggle-audio", { roomId, isMuted: targetMutedState });
        }
    }, [roomId, selectedAudioDevice, roomSettings.allowedAudio, isHost, isCoHost]);

    const passcodeRef = useRef<string | undefined>(passcode);

    useEffect(() => {
        if (passcode !== undefined) {
            passcodeRef.current = passcode;
        }
    }, [passcode]);

    // Join room function
    const joinRoom = useCallback(async (passcodeParam?: string) => {
        if (!user) return;
        if (typeof passcodeParam === "string") {
            passcodeRef.current = passcodeParam;
        }
        reconnectAttemptsRef.current = 0;
        isReconnectingRef.current = false;
        setJoinError(null);

        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        const socket = io(backendUrl, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
            reconnectionDelay: 1500,
        });

        socketRef.current = socket;

        socket.on("connect", async () => {
            setMySocketId(socket.id!);
            reconnectAttemptsRef.current = 0;
            // Clean up any existing peer connections on fresh socket connection
            peerConnectionsRef.current.forEach((pc) => pc.close());
            peerConnectionsRef.current.clear();
            pendingIceCandidatesRef.current.clear();

            if (!localStreamRef.current) {
                await initLocalStream();
            }
            const currentPass = (passcodeRef.current !== undefined ? passcodeRef.current : passcode)?.trim();
            socket.emit("join-room", {
                roomId,
                user,
                passcode: currentPass,
            });
        });

        socket.on("room-joined", async ({ yourSocketId, isHost: hostStatus, isCoHost: coHostStatus, settings, existingParticipants }) => {
            setIsJoined(true);
            setIsHost(hostStatus);
            setIsCoHost(coHostStatus);
            setRoomSettings(settings);
            setMySocketId(yourSocketId);

            setParticipants((prev) => {
                const map = new Map<string, Participant>();
                existingParticipants.forEach((p: Participant) => {
                    const existing = prev.get(p.socketId);
                    map.set(p.socketId, { ...p, stream: existing?.stream });
                });
                return map;
            });

            // Ensure local stream is ready before creating offers
            if (!localStreamRef.current) {
                await initLocalStream();
            }

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
                const existing = next.get(p.socketId);
                next.set(p.socketId, { ...p, stream: existing?.stream });
                return next;
            });
        });

        socket.on("webrtc-offer", async ({ senderSocketId, offer }) => {
            // Ensure local tracks are acquired before creating answer
            if (!localStreamRef.current) {
                await initLocalStream();
            }
            // Force-recreate the PC so we always answer with a clean connection
            // that has the current local audio+video tracks attached.
            // This prevents the bug where a stale PC (created before the
            // local stream was ready) has no audio track, causing one-way audio.
            const pc = createPeerConnection(senderSocketId, socket, true);
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                await processPendingIceCandidates(senderSocketId, pc);
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
                    await processPendingIceCandidates(senderSocketId, pc);
                } catch (err) {
                    console.error("Error setting remote description from answer:", err);
                }
            }
        });

        socket.on("ice-candidate", async ({ senderSocketId, candidate }) => {
            const pc = peerConnectionsRef.current.get(senderSocketId);
            if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("Error adding ICE candidate:", err);
                }
            } else {
                // Queue candidate until setRemoteDescription is complete
                const queue = pendingIceCandidatesRef.current.get(senderSocketId) || [];
                queue.push(candidate);
                pendingIceCandidatesRef.current.set(senderSocketId, queue);
            }
        });

        socket.on("participant-speaking", ({ socketId, isSpeaking }: { socketId: string; isSpeaking: boolean }) => {
            setSpeakingSockets((prev) => {
                const next = new Set(prev);
                if (isSpeaking) {
                    next.add(socketId);
                } else {
                    next.delete(socketId);
                }
                return next;
            });
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

            setSpeakingSockets((prev) => {
                const next = new Set(prev);
                next.delete(socketId);
                return next;
            });

            const pc = peerConnectionsRef.current.get(socketId);
            if (pc) {
                pc.close();
                peerConnectionsRef.current.delete(socketId);
            }
            pendingIceCandidatesRef.current.delete(socketId);
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

        socket.on("action-error", ({ message }: { message: string }) => {
            alert(message || "Action not permitted");
        });

        socket.on("join-error", ({ message }) => {
            setJoinError(message);
        });

        return socket;
    }, [backendUrl, roomId, user, passcode, initLocalStream, createPeerConnection, processPendingIceCandidates, onKicked, onCallEnded, leaveRoom, toggleMute]);

    // Toggle Camera On/Off
    const toggleCamera = useCallback(async (forceVal?: boolean) => {
        const targetCameraOffState = typeof forceVal === "boolean" ? forceVal : !isCameraOffRef.current;
        isCameraOffRef.current = targetCameraOffState;
        setIsCameraOff(targetCameraOffState);

        const currentStream = localStreamRef.current;
        const videoTracks = currentStream ? currentStream.getVideoTracks() : [];

        if (videoTracks.length > 0) {
            videoTracks.forEach((track) => {
                track.enabled = !targetCameraOffState;
            });
        } else if (!targetCameraOffState && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
            // No video track existed (e.g. fallback to audio-only on initial join), dynamically request camera access
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode,
                        deviceId: selectedVideoDevice ? { ideal: selectedVideoDevice } : undefined,
                    },
                    audio: false,
                });
                const newVideoTrack = videoStream.getVideoTracks()[0];
                if (newVideoTrack) {
                    newVideoTrack.enabled = true;
                    if (localStreamRef.current) {
                        localStreamRef.current.addTrack(newVideoTrack);
                        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                    } else {
                        localStreamRef.current = videoStream;
                        setLocalStream(videoStream);
                    }

                    peerConnectionsRef.current.forEach((pc) => {
                        const senders = pc.getSenders();
                        const videoSender = senders.find((s) => s.track?.kind === "video");
                        if (videoSender) {
                            videoSender.replaceTrack(newVideoTrack);
                        } else {
                            pc.addTrack(newVideoTrack, localStreamRef.current!);
                        }
                    });
                    setMediaError(null);
                    setMediaPermissionState((prev) => ({ ...prev, camera: "granted" }));
                }
            } catch (err: any) {
                console.error("Failed to dynamically acquire video track on camera toggle:", err);
                const userFriendlyMsg = parseMediaError(err);
                setMediaError(userFriendlyMsg);
                isCameraOffRef.current = true;
                setIsCameraOff(true);
                return;
            }
        }

        peerConnectionsRef.current.forEach((pc) => {
            pc.getSenders().forEach((sender) => {
                if (sender.track?.kind === "video") {
                    sender.track.enabled = !targetCameraOffState;
                }
            });
        });

        if (socketRef.current && roomId) {
            socketRef.current.emit("toggle-video", { roomId, isCameraOff: targetCameraOffState });
        }
    }, [roomId, facingMode, selectedVideoDevice, parseMediaError]);

    // Switch Camera (Front/Rear on Mobile)
    const switchCamera = useCallback(async () => {
        const nextMode = facingMode === "user" ? "environment" : "user";
        setFacingMode(nextMode);
        setSelectedVideoDevice("");
        await initLocalStream(undefined, selectedAudioDevice, nextMode);
    }, [facingMode, selectedAudioDevice, initLocalStream]);

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
            if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
                alert("Screen sharing is not supported by your current browser or mobile device.");
                return;
            }
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
            } catch (err: any) {
                console.error("Screen share error:", err);
                if (err?.name !== "NotAllowedError" && err?.name !== "AbortError") {
                    alert("Unable to start screen sharing on this device.");
                }
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

    // Retry acquiring media permissions on user action
    const retryMediaPermissions = useCallback(async () => {
        setMediaError(null);
        return await initLocalStream(selectedVideoDevice, selectedAudioDevice, facingMode);
    }, [initLocalStream, selectedVideoDevice, selectedAudioDevice, facingMode]);

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
        mediaError,
        mediaPermissionState,
        isMobile,
        facingMode,
        availableVideoDevices,
        availableAudioDevices,
        selectedVideoDevice,
        selectedAudioDevice,
        setSelectedVideoDevice: selectVideoDevice,
        setSelectedAudioDevice: selectAudioDevice,
        initLocalStream,
        retryMediaPermissions,
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
