import mongoose from "mongoose";
import watchlater from "../model/watchlater.js";

export const handlewatchlater = async (req, res) => {
    const { userId } = req.body;
    const { videoId } = req.params;
    try {
        const exisitingwatchlater = await watchlater.findOne({
            viewer: userId,
            videoid: videoId,
        });
        if (exisitingwatchlater) {
            await watchlater.findByIdAndDelete(exisitingwatchlater._id);
            return res.status(200).json({ watchlater: false });
        } else {
            await watchlater.create({ viewer: userId, videoid: videoId });
            return res.status(200).json({ watchlater: true });
        }
    } catch (error) {
        console.error("handlewatchlater error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const getallwatchlater = async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    try {
        const watchlatervideo = await watchlater
            .find({ viewer: userId })
            .populate({
                path: "videoid",
                model: "videofiles",
            })
            .sort({ createdAt: -1 })
            .exec();
        return res.status(200).json(watchlatervideo);
    } catch (error) {
        console.error("getallwatchlater error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const deleteWatchLaterItem = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid ID" });
    }
    try {
        await watchlater.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "Removed from watch later." });
    } catch (error) {
        console.error("deleteWatchLaterItem error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const clearWatchLater = async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }
    try {
        await watchlater.deleteMany({ viewer: userId });
        return res.status(200).json({ success: true, message: "Watch later list cleared." });
    } catch (error) {
        console.error("clearWatchLater error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};