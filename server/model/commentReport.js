import mongoose from "mongoose";

const commentReportSchema = new mongoose.Schema(
    {
        commentid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "comment",
            required: true,
        },
        videoid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "videofiles",
            required: true,
        },
        reportedby: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reportedbyname: {
            type: String,
            default: "Anonymous",
        },
        reason: {
            type: String,
            enum: [
                "spam",
                "harassment",
                "hate_speech",
                "misinformation",
                "malicious_links",
                "offensive",
                "other",
            ],
            required: true,
        },
        details: {
            type: String,
            default: "",
        },
        commentcontent: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["pending", "reviewed", "dismissed", "actioned"],
            default: "pending",
        },
        reviewedby: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        reviewedat: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const CommentReport = mongoose.model("CommentReport", commentReportSchema);
export default CommentReport;
