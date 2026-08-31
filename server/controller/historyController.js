import mongoose from "mongoose";
import video from "../model/video.js";
import history from "../model/history.js";

export const handlehistory = async (req, res) => {
    const { userId } = req.body;
    const { videoId } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Valid userId is required" });
    }
    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        return res.status(400).json({ message: "Valid videoId is required" });
    }

    try {
        let record = await history.findOne({ viewer: userId, videoid: videoId });
        if (record) {
            record.likedon = new Date();
            await record.save();
            // Delete any duplicate records for the same viewer and videoId if present
            await history.deleteMany({ viewer: userId, videoid: videoId, _id: { $ne: record._id } });
        } else {
            await history.create({ viewer: userId, videoid: videoId });
            await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
        }
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
        const rawHistory = await history
            .find({ viewer: userId })
            .populate({
                path: "videoid",
                model: "videofiles",
            })
            .sort({ updatedAt: -1, createdAt: -1 })
            .exec();

        // Filter out null video references and deduplicate by videoid
        const seenVideoIds = new Set();
        const historyvideo = [];

        for (const item of rawHistory) {
            if (!item.videoid) continue;
            const vId = item.videoid._id ? item.videoid._id.toString() : item.videoid.toString();
            if (!seenVideoIds.has(vId)) {
                seenVideoIds.add(vId);
                historyvideo.push(item);
            }
        }

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
        const target = await history.findById(id);
        if (target) {
            await history.deleteMany({ viewer: target.viewer, videoid: target.videoid });
        } else {
            await history.findByIdAndDelete(id);
        }
        return res.status(200).json({ success: true, message: "History item removed successfully." });
    } catch (error) {
        console.error("deleteHistoryItem error:", error);
        return res.status(500).json({ message: "Failed to remove history item." });
    }
};

/**
 * Save or update watch progress for a user on a specific video
 * POST /api/history/progress/:videoId
 * Body: { userId, position, duration }
 */
export const updateWatchProgress = async (req, res) => {
    const { videoId } = req.params;
    const { userId, position = 0, duration = 0 } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Valid userId is required" });
    }
    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        return res.status(400).json({ message: "Valid videoId is required" });
    }

    try {
        const numPosition = Number(position) || 0;
        const numDuration = Number(duration) || 0;
        const watchPercentage = numDuration > 0 ? Math.min(100, Math.round((numPosition / numDuration) * 100)) : 0;
        const isCompleted = watchPercentage >= 90;

        let record = await history.findOne({ viewer: userId, videoid: videoId });
        if (record) {
            record.lastPosition = numPosition;
            record.duration = numDuration;
            record.watchPercentage = Math.max(record.watchPercentage || 0, watchPercentage);
            record.completed = record.completed || isCompleted;
            await record.save();
        } else {
            record = await history.create({
                viewer: userId,
                videoid: videoId,
                lastPosition: numPosition,
                duration: numDuration,
                watchPercentage,
                completed: isCompleted,
            });
        }

        return res.status(200).json({
            success: true,
            progress: {
                lastPosition: record.lastPosition,
                duration: record.duration,
                watchPercentage: record.watchPercentage,
                completed: record.completed,
            },
        });
    } catch (error) {
        console.error("updateWatchProgress error:", error);
        return res.status(500).json({ message: "Failed to update watch progress" });
    }
};

/**
 * Get watch progress for a video and user
 * GET /api/history/progress/:userId/:videoId
 */
export const getWatchProgress = async (req, res) => {
    const { userId, videoId } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Valid userId is required" });
    }
    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        return res.status(400).json({ message: "Valid videoId is required" });
    }

    try {
        const record = await history.findOne({ viewer: userId, videoid: videoId });
        if (!record) {
            return res.status(200).json({
                lastPosition: 0,
                duration: 0,
                completed: false,
                watchPercentage: 0,
            });
        }

        return res.status(200).json({
            lastPosition: record.lastPosition || 0,
            duration: record.duration || 0,
            completed: !!record.completed,
            watchPercentage: record.watchPercentage || 0,
        });
    } catch (error) {
        console.error("getWatchProgress error:", error);
        return res.status(500).json({ message: "Failed to get watch progress" });
    }
};