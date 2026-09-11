import mongoose from "mongoose";
import Playlist from "../model/playlist.js";
import Video from "../model/video.js";
import User from "../model/user.js";

/**
 * Create a new custom playlist
 * POST /api/playlist/create
 */
export const createPlaylist = async (req, res) => {
    try {
        const { title, description, channelId, videos, category, visibility } = req.body;
        const requestingUserId = req.body.userId || req.headers["x-user-id"];

        if (!title?.trim() || !channelId) {
            return res.status(400).json({
                success: false,
                message: "Playlist title and channelId are required.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ success: false, message: "Invalid channel ID." });
        }

        if (!requestingUserId || requestingUserId.toString() !== channelId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the channel owner can create playlists.",
            });
        }

        // Validate video IDs
        const validVideoIds = Array.isArray(videos)
            ? videos.filter((id) => mongoose.Types.ObjectId.isValid(id))
            : [];

        const playlist = await Playlist.create({
            title: title.trim(),
            description: description ? description.trim() : "",
            channelId,
            videos: validVideoIds,
            category: category || "Custom",
            isCustom: true,
            visibility: visibility || "public",
        });

        const populatedPlaylist = await Playlist.findById(playlist._id).populate({
            path: "videos",
            select: "videotitle thumbnailpath views duration createdAt videochanel uploader",
        });

        return res.status(201).json({
            success: true,
            message: "Playlist created successfully.",
            playlist: populatedPlaylist,
        });
    } catch (error) {
        console.error("createPlaylist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create playlist.",
            error: error.message,
        });
    }
};

/**
 * Get all playlists for a channel (Custom + Category Default Playlists)
 * GET /api/playlist/channel/:channelId
 */
export const getChannelPlaylists = async (req, res) => {
    try {
        const { channelId } = req.params;

        if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({ success: false, message: "Invalid channel ID." });
        }

        // 1. Fetch Custom Creator Playlists
        const customPlaylists = await Playlist.find({ channelId })
            .sort({ createdAt: -1 })
            .populate({
                path: "videos",
                select: "videotitle thumbnailpath views duration createdAt videochanel category",
            })
            .lean();

        // 2. Compute Default Category Playlists from Channel Videos
        const channelUser = await User.findById(channelId);
        const channelConditions = [{ uploader: channelId }];
        if (channelUser?.channelname) {
            channelConditions.push({ videochanel: channelUser.channelname });
        }
        if (channelUser?.name) {
            channelConditions.push({ videochanel: channelUser.name });
        }

        const allChannelVideos = await Video.find({ $or: channelConditions })
            .select("videotitle thumbnailpath views duration createdAt videochanel category")
            .sort({ createdAt: -1 })
            .lean();

        // Group videos by each individual category
        const categoryMap = new Map();
        allChannelVideos.forEach((video) => {
            let catList = [];
            if (typeof video.category === "string" && video.category.trim()) {
                catList = video.category
                    .split(",")
                    .map((c) => c.trim())
                    .filter((c) => c && c.toLowerCase() !== "all");
            }
            if (catList.length === 0) {
                catList = ["General"];
            }

            // Deduplicate categories for this video
            const uniqueCats = Array.from(new Set(catList));
            uniqueCats.forEach((rawCat) => {
                const catName = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
                if (!categoryMap.has(catName)) {
                    categoryMap.set(catName, []);
                }
                categoryMap.get(catName).push(video);
            });
        });

        const categoryPlaylists = [];
        categoryMap.forEach((catVideos, catName) => {
            // Only create playlist if there is at least 1 video for this category
            if (Array.isArray(catVideos) && catVideos.length > 0) {
                categoryPlaylists.push({
                    _id: `cat_${catName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
                    title: `${catName} Collection`,
                    description: `Auto-generated playlist of all ${catName} videos uploaded by this channel.`,
                    channelId,
                    category: catName,
                    isCustom: false,
                    videosCount: catVideos.length,
                    thumbnail: catVideos[0]?.thumbnailpath || "",
                    videos: catVideos,
                });
            }
        });

        return res.status(200).json({
            success: true,
            customPlaylists: customPlaylists.map((p) => ({
                ...p,
                videosCount: p.videos?.length || 0,
                thumbnail: p.videos?.[0]?.thumbnailpath || "",
            })),
            categoryPlaylists,
            allChannelVideos,
        });
    } catch (error) {
        console.error("getChannelPlaylists error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch playlists.",
        });
    }
};

/**
 * Get a single playlist by ID
 * GET /api/playlist/:playlistId
 */
export const getPlaylistById = async (req, res) => {
    try {
        const { playlistId } = req.params;

        if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
            return res.status(400).json({ success: false, message: "Invalid playlist ID." });
        }

        const playlist = await Playlist.findById(playlistId)
            .populate({
                path: "videos",
                select: "videotitle description videodescription thumbnailpath filepath views duration createdAt videochanel uploader",
            })
            .populate("channelId", "name channelname image subscribersCount");

        if (!playlist) {
            return res.status(404).json({ success: false, message: "Playlist not found." });
        }

        return res.status(200).json({
            success: true,
            playlist,
        });
    } catch (error) {
        console.error("getPlaylistById error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch playlist.",
        });
    }
};

/**
 * Add a video to a custom playlist
 * POST /api/playlist/:playlistId/add-video
 */
export const addVideoToPlaylist = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { videoId } = req.body;
        const requestingUserId = req.body.userId || req.headers["x-user-id"];

        if (!playlistId || !videoId) {
            return res.status(400).json({ success: false, message: "playlistId and videoId are required." });
        }

        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ success: false, message: "Playlist not found." });
        }

        if (!requestingUserId || playlist.channelId.toString() !== requestingUserId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the channel owner can edit this playlist.",
            });
        }

        const videoIdObj = new mongoose.Types.ObjectId(videoId);
        if (!playlist.videos.some((id) => id.equals(videoIdObj))) {
            playlist.videos.push(videoIdObj);
            await playlist.save();
        }

        const updatedPlaylist = await Playlist.findById(playlistId).populate({
            path: "videos",
            select: "videotitle thumbnailpath views duration createdAt",
        });

        return res.status(200).json({
            success: true,
            message: "Video added to playlist.",
            playlist: updatedPlaylist,
        });
    } catch (error) {
        console.error("addVideoToPlaylist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add video to playlist.",
        });
    }
};

/**
 * Remove a video from a custom playlist
 * POST /api/playlist/:playlistId/remove-video
 */
export const removeVideoFromPlaylist = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { videoId } = req.body;
        const requestingUserId = req.body.userId || req.headers["x-user-id"];

        if (!playlistId || !videoId) {
            return res.status(400).json({ success: false, message: "playlistId and videoId are required." });
        }

        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ success: false, message: "Playlist not found." });
        }

        if (!requestingUserId || playlist.channelId.toString() !== requestingUserId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the channel owner can edit this playlist.",
            });
        }

        const videoIdObj = new mongoose.Types.ObjectId(videoId);
        playlist.videos = playlist.videos.filter((id) => !id.equals(videoIdObj));
        await playlist.save();

        const updatedPlaylist = await Playlist.findById(playlistId).populate({
            path: "videos",
            select: "videotitle thumbnailpath views duration createdAt",
        });

        return res.status(200).json({
            success: true,
            message: "Video removed from playlist.",
            playlist: updatedPlaylist,
        });
    } catch (error) {
        console.error("removeVideoFromPlaylist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to remove video from playlist.",
        });
    }
};

/**
 * Delete a custom playlist
 * DELETE /api/playlist/:playlistId
 */
export const deletePlaylist = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const requestingUserId = req.body?.userId || req.query?.userId || req.headers["x-user-id"];

        if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
            return res.status(400).json({ success: false, message: "Invalid playlist ID." });
        }

        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ success: false, message: "Playlist not found." });
        }

        if (!requestingUserId || playlist.channelId.toString() !== requestingUserId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the channel owner can delete this playlist.",
            });
        }

        await Playlist.findByIdAndDelete(playlistId);

        return res.status(200).json({
            success: true,
            message: "Playlist deleted successfully.",
        });
    } catch (error) {
        console.error("deletePlaylist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete playlist.",
        });
    }
};
