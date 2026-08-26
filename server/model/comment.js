import mongoose from "mongoose";

const commentschema = mongoose.Schema(
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
        commentbody: { type: String, required: true },
        usercommented: { type: String, default: "Anonymous" },
        userimage: { type: String, default: "" },
        userlocation: { type: String, default: "" },
        commentedon: { type: Date, default: Date.now },
        parentcommentid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "comment",
            default: null,
        },
        replycount: { type: Number, default: 0 },
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
        likescount: { type: Number, default: 0 },
        dislikescount: { type: Number, default: 0 },
        isedited: { type: Boolean, default: false },
        editedat: { type: Date },
        originalbody: { type: String },
        edithistory: [
            {
                body: { type: String },
                editedat: { type: Date, default: Date.now },
            },
        ],
        isdeleted: { type: Boolean, default: false },
        deletedat: { type: Date, default: null },
        deletedby: { type: String, default: "" },
        reports: [
            {
                userid: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                reason: { type: String },
                details: { type: String, default: "" },
                reportedat: { type: Date, default: Date.now },
            },
        ],
        reportcount: { type: Number, default: 0 },
        moderationstatus: {
            type: String,
            enum: ["active", "flagged", "hidden", "approved"],
            default: "active",
        },
        detectedlanguage: { type: String, default: "auto" },
        translations: {
            type: Map,
            of: String,
            default: () => ({}),
        },
        version: { type: Number, default: 1 },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("comment", commentschema);