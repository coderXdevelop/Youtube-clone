import mongoose from "mongoose";

const videochema = mongoose.Schema(
    {
        videotitle: {
            type: String,
            required: true,
        },
        filename: {
            type: String,
            required: true,
        },
        filetype: {
            type: String,
            required: true,
        },
        filepath: {
            type: String,
            required: true,
        },
        filesize: {
            type: String,
            required: true,
        },
        videochanel: {
            type: String,
            required: true,
        },
        videodescription: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        category: {
            type: String,
            default: "All",
        },
        thumbnailpath: {
            type: String,
            default: "",
        },
        thumbnailfilename: {
            type: String,
            default: "",
        },
        Like: {
            type: Number,
            default: 0,
        },
        Dislike: {
            type: Number,
            default: 0,
        },
        views: {
            type: Number,
            default: 0,
        },
        uploader: {
            type: String,
            default: "",
        },
        uploaderimage: {
            type: String,
            default: "",
        },
        channelimage: {
            type: String,
            default: "",
        },
        accesslevel: {
            type: String,
            enum: ["free", "bronze", "silver", "gold"],
            default: "free",
        },
        ispremium: {
            type: Boolean,
            default: false,
        },
        previewduration: {
            type: Number,
            default: 60, // 60 seconds free preview for premium videos
        },
        qualityvariants: [
            {
                quality: { type: String, required: true }, // e.g., "360p", "480p", "720p", "1080p", "1440p", "4k"
                filepath: { type: String, required: true },
                filesize: { type: String, default: "" },
                resolution: { type: String, default: "" },
            },
        ],
        hlspath: {
            type: String,
            default: "",
        },
        hlsstatus: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
        availablequalities: [
            {
                type: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("videofiles", videochema);