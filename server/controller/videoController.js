import video from "../model/video.js";
import user from "../model/user.js";
import history from "../model/history.js";
import like from "../model/like.js";
import watchlater from "../model/watchlater.js";
import comment from "../model/comment.js";
import downloadRecord from "../model/downloadRecord.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

export const UploadVideo = async (req, res) => {
    try {
        let videoFile = null;
        let thumbnailFile = null;

        // Handle multer files (req.files as array or object, or req.file)
        if (Array.isArray(req.files)) {
            videoFile = req.files.find(
                (f) => f.fieldname === "file" || f.mimetype.startsWith("video/")
            );
            thumbnailFile = req.files.find(
                (f) => f.fieldname === "thumbnail" || f.mimetype.startsWith("image/")
            );
        } else if (req.files && typeof req.files === "object") {
            videoFile = req.files.file?.[0] || req.files.video?.[0];
            thumbnailFile = req.files.thumbnail?.[0];
        } else if (req.file) {
            videoFile = req.file;
        }

        if (!videoFile) {
            return res.status(400).json({ message: "Please upload a valid MP4 video file." });
        }

        let thumbnailPath = "";
        let thumbnailFilename = "";

        if (thumbnailFile) {
            thumbnailPath = thumbnailFile.path.replace(/\\/g, "/");
            thumbnailFilename = thumbnailFile.originalname;
        } else if (req.body.thumbnailData && typeof req.body.thumbnailData === "string" && req.body.thumbnailData.startsWith("data:image/")) {
            // Handle client-generated video frame snapshot (base64)
            try {
                const base64Data = req.body.thumbnailData.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const filename = `thumb-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
                const uploadDir = "uploads";
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const savePath = path.join(uploadDir, filename);
                fs.writeFileSync(savePath, buffer);
                thumbnailPath = `uploads/${filename}`;
                thumbnailFilename = filename;
            } catch (thumbErr) {
                console.warn("Error saving base64 thumbnail frame:", thumbErr.message);
            }
        }

        const description = req.body.videodescription || req.body.description || "";
        let categoryRaw = req.body.category || "All";
        let categoryStr = "All";

        if (Array.isArray(categoryRaw)) {
            const valid = categoryRaw.map((c) => String(c).trim()).filter(Boolean);
            categoryStr = valid.length > 0 ? valid.join(", ") : "All";
        } else if (typeof categoryRaw === "string") {
            const valid = categoryRaw
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);
            categoryStr = valid.length > 0 ? valid.join(", ") : "All";
        }

        const uploaderId = req.body.uploader || "";
        let uploaderImage = "";
        if (uploaderId && mongoose.Types.ObjectId.isValid(uploaderId)) {
            const uploaderUser = await user.findById(uploaderId);
            if (uploaderUser) {
                uploaderImage = uploaderUser.image || "";
            }
        }

        const newVideo = new video({
            videotitle: req.body.videotitle,
            videodescription: description,
            description: description,
            category: categoryStr,
            filename: videoFile.originalname,
            filepath: videoFile.path.replace(/\\/g, "/"),
            filetype: videoFile.mimetype,
            filesize: String(videoFile.size),
            videochanel: req.body.videochanel || "My Channel",
            uploader: uploaderId,
            uploaderimage: uploaderImage,
            channelimage: uploaderImage,
            thumbnailpath: thumbnailPath,
            thumbnailfilename: thumbnailFilename,
        });

        await newVideo.save();
        return res.status(201).json({
            message: "file uploaded successfully",
            video: newVideo,
        });
    } catch (error) {
        console.error("UploadVideo error:", error);
        return res.status(500).json({ message: "Something went wrong during video upload." });
    }
};

export const getallvideo = async (req, res) => {
    try {
        const files = await video.find().sort({ createdAt: -1 }).lean();

        // Enrich videos with channel/uploader profile avatar image
        const uploaderIds = files.map((f) => f.uploader).filter((id) => id && mongoose.Types.ObjectId.isValid(id));
        const channelNames = files.map((f) => f.videochanel).filter(Boolean);

        const matchingUsers = await user
            .find({
                $or: [
                    { _id: { $in: uploaderIds } },
                    { channelname: { $in: channelNames } },
                    { name: { $in: channelNames } },
                ],
            })
            .lean();

        const userMap = new Map();
        matchingUsers.forEach((u) => {
            userMap.set(String(u._id), u);
            if (u.channelname) userMap.set(u.channelname.toLowerCase(), u);
            if (u.name) userMap.set(u.name.toLowerCase(), u);
        });

        const enrichedFiles = files.map((file) => {
            const matchedUser =
                userMap.get(String(file.uploader)) ||
                userMap.get((file.videochanel || "").toLowerCase());

            const userImg = matchedUser?.image || file.uploaderimage || file.channelimage || "";
            return {
                ...file,
                uploaderimage: userImg,
                channelimage: userImg,
                userimage: userImg,
            };
        });

        return res.status(200).send(enrichedFiles);
    } catch (error) {
        console.error("getallvideo error:", error);
        return res.status(500).json({ message: "Something went wrong fetching videos." });
    }
};

/**
 * Delete a video by channel owner or admin
 * DELETE /api/video/:id
 */
export const deleteVideo = async (req, res) => {
    const { id } = req.params;
    const userId = req.body?.userId || req.query?.userId || req.headers?.["x-user-id"];

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid video ID." });
    }

    try {
        const targetVideo = await video.findById(id);
        if (!targetVideo) {
            return res.status(404).json({ message: "Video not found." });
        }

        // Authorization / Ownership check
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const requestingUser = await user.findById(userId);
            const isOwner =
                targetVideo.uploader === userId ||
                (requestingUser?.channelname &&
                    targetVideo.videochanel?.toLowerCase() === requestingUser.channelname?.toLowerCase()) ||
                (requestingUser?.name &&
                    targetVideo.videochanel?.toLowerCase() === requestingUser.name?.toLowerCase());

            const isAdmin =
                requestingUser?.user_type === "admin" ||
                requestingUser?.isadmin === true;

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: "You are not authorized to delete this video." });
            }
        }

        // 1. Clean up video file from disk if present
        if (targetVideo.filepath && fs.existsSync(targetVideo.filepath)) {
            try {
                fs.unlinkSync(targetVideo.filepath);
            } catch (fileErr) {
                console.warn("Could not delete video file from disk:", fileErr.message);
            }
        }

        // 2. Clean up thumbnail from disk if present
        if (targetVideo.thumbnailpath && fs.existsSync(targetVideo.thumbnailpath)) {
            try {
                fs.unlinkSync(targetVideo.thumbnailpath);
            } catch (thumbErr) {
                console.warn("Could not delete thumbnail file from disk:", thumbErr.message);
            }
        }

        // 3. Cascade cleanup associated records in MongoDB
        await Promise.allSettled([
            history.deleteMany({ videoid: id }),
            like.deleteMany({ videoid: id }),
            watchlater.deleteMany({ videoid: id }),
            comment.deleteMany({ videoid: id }),
            downloadRecord.deleteMany({ videoid: id }),
        ]);

        // 4. Delete the video document
        await video.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Video deleted successfully from the platform.",
            videoId: id,
        });
    } catch (error) {
        console.error("deleteVideo error:", error);
        return res.status(500).json({ message: "Failed to delete video." });
    }
};