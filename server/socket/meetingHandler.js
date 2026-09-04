import Meeting from "../model/meeting.js";

const rooms = new Map();

export const setupMeetingSocket = (io) => {
    io.on("connection", (socket) => {
        let currentRoomId = null;
        let currentUserId = null;

        socket.on("join-room", async ({ roomId, user, passcode }) => {
            try {
                if (!roomId || !user) {
                    socket.emit("join-error", { message: "Invalid room or user info" });
                    return;
                }

                // Check DB meeting record
                let dbMeeting = await Meeting.findOne({ roomId });
                if (!dbMeeting) {
                    dbMeeting = new Meeting({
                        roomId,
                        hostId: user._id || user.id || "anonymous",
                        title: "Video Call Meeting",
                        status: "active",
                    });
                    await dbMeeting.save();
                }

                if (dbMeeting.passcode && dbMeeting.passcode !== passcode) {
                    socket.emit("join-error", { message: "Incorrect meeting passcode" });
                    return;
                }

                let roomState = rooms.get(roomId);
                if (!roomState) {
                    roomState = {
                        roomId,
                        hostUserId: dbMeeting.hostId?.toString() || user._id || user.id,
                        isLocked: dbMeeting.isLocked || false,
                        allowedScreenShare: dbMeeting.allowedScreenShare !== false,
                        allowedChat: dbMeeting.allowedChat !== false,
                        coHostUserIds: new Set((dbMeeting.coHosts || []).map((id) => id.toString())),
                        participants: new Map(),
                        maxParticipants: dbMeeting.maxParticipants || 25,
                    };
                    rooms.set(roomId, roomState);
                }

                const userIdStr = (user._id || user.id || socket.id).toString();
                const isHost = roomState.hostUserId === userIdStr;

                if (roomState.isLocked && !isHost && !roomState.coHostUserIds.has(userIdStr)) {
                    socket.emit("join-error", { message: "Meeting is locked by the host" });
                    return;
                }

                if (roomState.participants.size >= roomState.maxParticipants) {
                    socket.emit("join-error", { message: "Meeting has reached maximum participant capacity" });
                    return;
                }

                currentRoomId = roomId;
                currentUserId = userIdStr;

                const isCoHost = roomState.coHostUserIds.has(userIdStr);
                const participantData = {
                    socketId: socket.id,
                    userId: userIdStr,
                    name: user.name || user.channelname || "Guest",
                    avatar: user.image || "",
                    isMuted: false,
                    isCameraOff: false,
                    isScreenSharing: false,
                    isHandRaised: false,
                    isHost,
                    isCoHost,
                };

                roomState.participants.set(socket.id, participantData);
                socket.join(roomId);

                // Collect existing participants array
                const existingParticipants = Array.from(roomState.participants.values()).filter(
                    (p) => p.socketId !== socket.id
                );

                socket.emit("room-joined", {
                    roomId,
                    yourSocketId: socket.id,
                    isHost,
                    isCoHost,
                    settings: {
                        isLocked: roomState.isLocked,
                        allowedScreenShare: roomState.allowedScreenShare,
                        allowedChat: roomState.allowedChat,
                    },
                    existingParticipants,
                });

                socket.to(roomId).emit("user-joined", participantData);
            } catch (err) {
                console.error("Error in join-room handler:", err);
                socket.emit("join-error", { message: "Internal server error joining meeting" });
            }
        });

        // WebRTC Signaling
        socket.on("webrtc-offer", ({ targetSocketId, offer }) => {
            io.to(targetSocketId).emit("webrtc-offer", {
                senderSocketId: socket.id,
                offer,
            });
        });

        socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
            io.to(targetSocketId).emit("webrtc-answer", {
                senderSocketId: socket.id,
                answer,
            });
        });

        socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
            io.to(targetSocketId).emit("ice-candidate", {
                senderSocketId: socket.id,
                candidate,
            });
        });

        // Status Toggles
        socket.on("toggle-audio", ({ roomId, isMuted }) => {
            const roomState = rooms.get(roomId);
            if (roomState && roomState.participants.has(socket.id)) {
                const participant = roomState.participants.get(socket.id);
                participant.isMuted = isMuted;
                io.to(roomId).emit("participant-updated", participant);
            }
        });

        socket.on("toggle-video", ({ roomId, isCameraOff }) => {
            const roomState = rooms.get(roomId);
            if (roomState && roomState.participants.has(socket.id)) {
                const participant = roomState.participants.get(socket.id);
                participant.isCameraOff = isCameraOff;
                io.to(roomId).emit("participant-updated", participant);
            }
        });

        socket.on("toggle-screenshare", ({ roomId, isScreenSharing }) => {
            const roomState = rooms.get(roomId);
            if (roomState && roomState.participants.has(socket.id)) {
                const participant = roomState.participants.get(socket.id);
                participant.isScreenSharing = isScreenSharing;
                io.to(roomId).emit("participant-updated", participant);
            }
        });

        socket.on("raise-hand", ({ roomId, isHandRaised }) => {
            const roomState = rooms.get(roomId);
            if (roomState && roomState.participants.has(socket.id)) {
                const participant = roomState.participants.get(socket.id);
                participant.isHandRaised = isHandRaised;
                io.to(roomId).emit("participant-updated", participant);
            }
        });

        // In-call Chat
        socket.on("send-chat-message", ({ roomId, text, emoji, attachment }) => {
            const roomState = rooms.get(roomId);
            if (!roomState) return;

            const participant = roomState.participants.get(socket.id);
            if (!participant) return;

            if (!roomState.allowedChat && !participant.isHost && !participant.isCoHost) {
                socket.emit("action-error", { message: "Chat is disabled by the host" });
                return;
            }

            const chatMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                senderSocketId: socket.id,
                senderName: participant.name,
                senderAvatar: participant.avatar,
                text,
                emoji,
                attachment,
                timestamp: new Date().toISOString(),
            };

            io.to(roomId).emit("chat-message-received", chatMessage);
        });

        // Moderation Controls
        socket.on("host-control", ({ roomId, action, targetSocketId }) => {
            const roomState = rooms.get(roomId);
            if (!roomState) return;

            const sender = roomState.participants.get(socket.id);
            if (!sender || (!sender.isHost && !sender.isCoHost)) {
                socket.emit("action-error", { message: "You do not have host moderation privileges" });
                return;
            }

            if (action === "mute-participant" && targetSocketId) {
                const target = roomState.participants.get(targetSocketId);
                if (target) {
                    target.isMuted = true;
                    io.to(targetSocketId).emit("force-mute");
                    io.to(roomId).emit("participant-updated", target);
                }
            } else if (action === "mute-all") {
                roomState.participants.forEach((p, sId) => {
                    if (!p.isHost && !p.isCoHost) {
                        p.isMuted = true;
                        io.to(sId).emit("force-mute");
                        io.to(roomId).emit("participant-updated", p);
                    }
                });
            } else if (action === "remove-participant" && targetSocketId) {
                const target = roomState.participants.get(targetSocketId);
                if (target) {
                    io.to(targetSocketId).emit("force-kicked", { message: "You were removed by the host" });
                    roomState.participants.delete(targetSocketId);
                    io.to(roomId).emit("user-left", { socketId: targetSocketId, name: target.name });
                }
            } else if (action === "toggle-lock") {
                roomState.isLocked = !roomState.isLocked;
                io.to(roomId).emit("room-settings-updated", {
                    isLocked: roomState.isLocked,
                    allowedScreenShare: roomState.allowedScreenShare,
                    allowedChat: roomState.allowedChat,
                });
            } else if (action === "toggle-screenshare-permission") {
                roomState.allowedScreenShare = !roomState.allowedScreenShare;
                io.to(roomId).emit("room-settings-updated", {
                    isLocked: roomState.isLocked,
                    allowedScreenShare: roomState.allowedScreenShare,
                    allowedChat: roomState.allowedChat,
                });
            } else if (action === "toggle-chat-permission") {
                roomState.allowedChat = !roomState.allowedChat;
                io.to(roomId).emit("room-settings-updated", {
                    isLocked: roomState.isLocked,
                    allowedScreenShare: roomState.allowedScreenShare,
                    allowedChat: roomState.allowedChat,
                });
            } else if (action === "assign-cohost" && targetSocketId) {
                const target = roomState.participants.get(targetSocketId);
                if (target) {
                    target.isCoHost = !target.isCoHost;
                    if (target.isCoHost) {
                        roomState.coHostUserIds.add(target.userId);
                    } else {
                        roomState.coHostUserIds.delete(target.userId);
                    }
                    io.to(roomId).emit("participant-updated", target);
                }
            } else if (action === "end-call") {
                io.to(roomId).emit("call-ended-by-host");
                rooms.delete(roomId);
            }
        });

        // Disconnect handling
        const handleDisconnect = () => {
            if (!currentRoomId) return;

            const roomState = rooms.get(currentRoomId);
            if (roomState) {
                const participant = roomState.participants.get(socket.id);
                roomState.participants.delete(socket.id);

                if (participant) {
                    io.to(currentRoomId).emit("user-left", {
                        socketId: socket.id,
                        userId: participant.userId,
                        name: participant.name,
                    });
                }

                if (roomState.participants.size === 0) {
                    rooms.delete(currentRoomId);
                }
            }
        };

        socket.on("leave-room", () => {
            if (currentRoomId) {
                socket.leave(currentRoomId);
                handleDisconnect();
                currentRoomId = null;
            }
        });

        socket.on("disconnect", () => {
            handleDisconnect();
        });
    });
};
