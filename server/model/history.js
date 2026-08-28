import mongoose from "mongoose";
const historyschema = mongoose.Schema(
    {
        viewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        videoid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "videofiles",
            required: true,
        },
        likedon: { type: Date, default: Date.now },
        lastPosition: { type: Number, default: 0 },
        duration: { type: Number, default: 0 },
        completed: { type: Boolean, default: false },
        watchPercentage: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("history", historyschema);