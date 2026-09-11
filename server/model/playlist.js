import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
        channelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        videos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "videofiles",
            },
        ],
        category: {
            type: String,
            default: "Custom",
        },
        isCustom: {
            type: Boolean,
            default: true,
        },
        visibility: {
            type: String,
            enum: ["public", "unlisted", "private"],
            default: "public",
        },
    },
    {
        timestamps: true,
    }
);

playlistSchema.index({ channelId: 1, createdAt: -1 });

const Playlist = mongoose.model("Playlist", playlistSchema);

export default Playlist;
