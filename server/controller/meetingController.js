import Meeting from "../model/meeting.js";
import crypto from "crypto";

export const createMeeting = async (req, res) => {
    try {
        const { title, passcode, maxParticipants, userId: bodyUserId } = req.body;
        const userId = bodyUserId || req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Please sign in to create a video meeting room." });
        }

        const roomId = `room-${crypto.randomBytes(4).toString("hex")}`;

        const meeting = new Meeting({
            roomId,
            hostId: userId,
            title: title?.trim() || "Video Call Meeting",
            passcode: passcode?.trim() || "",
            maxParticipants: maxParticipants ? parseInt(maxParticipants) : 25,
            participants: [],
            status: "active",
        });

        await meeting.save();

        return res.status(201).json({
            message: "Meeting room created successfully",
            meeting: {
                roomId: meeting.roomId,
                title: meeting.title,
                hostId: meeting.hostId,
                hasPasscode: !!meeting.passcode,
                maxParticipants: meeting.maxParticipants,
                createdAt: meeting.createdAt,
            },
        });
    } catch (error) {
        console.error("Error creating meeting:", error);
        return res.status(500).json({ error: "Failed to create meeting room" });
    }
};

export const getMeetingDetails = async (req, res) => {
    try {
        const { roomId } = req.params;
        const meeting = await Meeting.findOne({ roomId }).populate("hostId", "name email image channelname");

        if (!meeting) {
            return res.status(404).json({ error: "Meeting room not found or link is invalid" });
        }

        return res.status(200).json({
            meeting: {
                roomId: meeting.roomId,
                title: meeting.title,
                hostId: meeting.hostId?._id,
                hostName: meeting.hostId?.name || "Host",
                hostAvatar: meeting.hostId?.image || "",
                hasPasscode: !!meeting.passcode,
                isLocked: meeting.isLocked,
                status: meeting.status,
                maxParticipants: meeting.maxParticipants,
                allowedScreenShare: meeting.allowedScreenShare,
                allowedChat: meeting.allowedChat,
                coHosts: meeting.coHosts,
            },
        });
    } catch (error) {
        console.error("Error fetching meeting details:", error);
        return res.status(500).json({ error: "Failed to fetch meeting room details" });
    }
};

export const getUserMeetingHistory = async (req, res) => {
    try {
        const userId = req.params?.userId || req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        const meetings = await Meeting.find({
            $or: [{ hostId: userId }, { "participants.userId": userId.toString() }],
        })
            .sort({ createdAt: -1 })
            .limit(20);

        return res.status(200).json({ meetings });
    } catch (error) {
        console.error("Error fetching meeting history:", error);
        return res.status(500).json({ error: "Failed to fetch user meeting history" });
    }
};

export const uploadMeetingFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        return res.status(200).json({
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
        });
    } catch (error) {
        console.error("Error uploading meeting file:", error);
        return res.status(500).json({ error: "File upload failed" });
    }
};
