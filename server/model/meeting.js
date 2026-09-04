import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        hostId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            default: "Video Meeting",
        },
        passcode: {
            type: String,
            default: "",
        },
        isLocked: {
            type: Boolean,
            default: false,
        },
        allowedScreenShare: {
            type: Boolean,
            default: true,
        },
        allowedChat: {
            type: Boolean,
            default: true,
        },
        coHosts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        participants: [
            {
                userId: String,
                name: String,
                avatar: String,
                joinedAt: { type: Date, default: Date.now },
                leftAt: Date,
            },
        ],
        status: {
            type: String,
            enum: ["active", "ended"],
            default: "active",
        },
        maxParticipants: {
            type: Number,
            default: 25,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);
