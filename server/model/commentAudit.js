import mongoose from "mongoose";

const commentAuditSchema = new mongoose.Schema(
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
        userid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        username: {
            type: String,
            default: "Anonymous",
        },
        action: {
            type: String,
            enum: ["created", "edited", "deleted", "soft_deleted", "moderation_action", "reported"],
            required: true,
        },
        previousbody: {
            type: String,
            default: "",
        },
        newbody: {
            type: String,
            default: "",
        },
        details: {
            type: String,
            default: "",
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

const CommentAudit = mongoose.model("CommentAudit", commentAuditSchema);
export default CommentAudit;
