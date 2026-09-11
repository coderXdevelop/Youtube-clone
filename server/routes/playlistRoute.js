import express from "express";
import {
    createPlaylist,
    getChannelPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
} from "../controller/playlistController.js";

const router = express.Router();

router.post("/create", createPlaylist);
router.get("/channel/:channelId", getChannelPlaylists);
router.get("/:playlistId", getPlaylistById);
router.post("/:playlistId/add-video", addVideoToPlaylist);
router.post("/:playlistId/remove-video", removeVideoFromPlaylist);
router.delete("/:playlistId", deletePlaylist);

export default router;
