import express from "express";
import {
    createPlaylist,
    getChannelPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
} from "../controller/playlistController.js";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", requireAuth, createPlaylist);
router.get("/channel/:channelId", optionalAuth, getChannelPlaylists);
router.get("/:playlistId", optionalAuth, getPlaylistById);
router.post("/:playlistId/add-video", requireAuth, addVideoToPlaylist);
router.post("/:playlistId/remove-video", requireAuth, removeVideoFromPlaylist);
router.delete("/:playlistId", requireAuth, deletePlaylist);

export default router;
