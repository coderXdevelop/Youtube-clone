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
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("videofiles", videochema);