import mongoose from "mongoose";
import video from "../model/video.js";
import history from "../model/history.js";

export const handlehistory = async (req, res) => {
    const { userId } = req.body;
    const { videoId } = req.params;
    try {
        await history.create({ viewer: userId, videoid: videoId });
        await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
        return res.status(200).json({ history: true });
    } catch (error) {
        console.error("handlehistory error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const handleview = async (req, res) => {
    const { videoId } = req.params;
    try {
        await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("handleview error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const getallhistoryVideo = async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    try {
        const historyvideo = await history
            .find({ viewer: userId })
            .populate({
                path: "videoid",
                model: "videofiles",
            })
            .sort({ createdAt: -1 })
            .exec();
        return res.status(200).json(historyvideo);
    } catch (error) {
        console.error("getallhistoryVideo error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

/**
 * Clear all watch history for a user
 * DELETE /api/history/clear/:userId
 */
export const clearHistory = async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    try {
        await history.deleteMany({ viewer: userId });
        return res.status(200).json({ success: true, message: "Watch history cleared successfully." });
    } catch (error) {
        console.error("clearHistory error:", error);
        return res.status(500).json({ message: "Failed to clear history." });
    }
};

/**
 * Delete a single history record
 * DELETE /api/history/:id
 */
export const deleteHistoryItem = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid history record ID" });
    }
    try {
        await history.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "History item removed successfully." });
    } catch (error) {
        console.error("deleteHistoryItem error:", error);
        return res.status(500).json({ message: "Failed to remove history item." });
    }
};