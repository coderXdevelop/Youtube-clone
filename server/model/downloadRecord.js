import mongoose from "mongoose";

const downloadRecordSchema = new mongoose.Schema(
    {
        userid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        videoid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "videofiles",
            required: true,
        },
        videotitle: {
            type: String,
            default: "Untitled Video",
        },
        thumbnailpath: {
            type: String,
            default: "",
        },
        filepath: {
            type: String,
            default: "",
        },
        filesize: {
            type: String,
            default: "0",
        },
        downloadtimestamp: {
            type: Date,
            default: Date.now,
        },
        ipaddress: {
            type: String,
            default: "127.0.0.1",
        },
        deviceinfo: {
            type: String,
            default: "Desktop / Mobile Device",
        },
        browser: {
            type: String,
            default: "Browser",
        },
        subscriptionplan: {
            type: String,
            enum: ["Free", "Bronze", "Silver", "Gold"],
            default: "Free",
        },
        status: {
            type: String,
            enum: ["completed", "failed", "interrupted", "requested"],
            default: "completed",
        },
        cooldownuntil: {
            type: Date,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h deduplication cooldown
        },
    },
    {
        timestamps: true,
    }
);

// Index for fast quota computation per user per day
downloadRecordSchema.index({ userid: 1, downloadtimestamp: -1 });
downloadRecordSchema.index({ userid: 1, videoid: 1, cooldownuntil: -1 });

const DownloadRecord = mongoose.model("DownloadRecord", downloadRecordSchema);
export default DownloadRecord;
