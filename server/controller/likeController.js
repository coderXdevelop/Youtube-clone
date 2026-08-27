import mongoose from "mongoose";
import video from "../model/video.js";
import like from "../model/like.js";

export const handlelike = async (req, res) => {
    const userId = req.body.userId || req.body.viewer || req.body.userid;
    const videoId = req.params.videoId || req.body.videoid || req.body.videoId;

    if (!userId || !videoId) {
        return res.status(400).json({ message: "User ID and Video ID are required." });
    }

    try {
        const exisitinglike = await like.findOne({
            viewer: userId,
            videoid: videoId,
        });

        if (exisitinglike) {
            await like.findByIdAndDelete(exisitinglike._id);
            if (mongoose.Types.ObjectId.isValid(videoId)) {
                await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
            }
            return res.status(200).json({ liked: false, success: true });
        } else {
            await like.create({ viewer: userId, videoid: videoId });
            if (mongoose.Types.ObjectId.isValid(videoId)) {
                await video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });
            }
            return res.status(200).json({ liked: true, success: true });
        }
    } catch (error) {
        console.error("handlelike error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const getallLikedVideo = async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
    }

    try {
        const likevideo = await like
            .find({ viewer: userId })
            .populate({
                path: "videoid",
                model: "videofiles",
            })
            .sort({ createdAt: -1 })
            .exec();
        return res.status(200).json(likevideo);
    } catch (error) {
        console.error("getallLikedVideo error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const deleteLikedItem = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid ID." });
    }

    try {
        const doc = await like.findByIdAndDelete(id);
        if (doc?.videoid) {
            await video.findByIdAndUpdate(doc.videoid, { $inc: { Like: -1 } });
        }
        return res.status(200).json({ success: true, message: "Removed from liked videos." });
    } catch (error) {
        console.error("deleteLikedItem error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};