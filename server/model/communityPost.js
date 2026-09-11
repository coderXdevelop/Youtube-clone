import mongoose from "mongoose";

const postCommentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    userName: {
        type: String,
        default: "Viewer",
    },
    userImage: {
        type: String,
        default: "",
    },
    text: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const communityPostSchema = new mongoose.Schema(
    {
        channelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        authorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        authorName: {
            type: String,
            default: "Channel Creator",
        },
        authorImage: {
            type: String,
            default: "",
        },
        content: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            default: "",
        },
        tag: {
            type: String,
            default: "Announcement",
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        dislikes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        allowComments: {
            type: Boolean,
            default: true,
        },
        comments: [postCommentSchema],
    },
    {
        timestamps: true,
    }
);

communityPostSchema.index({ channelId: 1, createdAt: -1 });

const CommunityPost = mongoose.model("CommunityPost", communityPostSchema);

export default CommunityPost;
