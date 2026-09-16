import express from "express";
import {
    createPost,
    getChannelPosts,
    toggleReaction,
    toggleCommentsBlocked,
    addPostComment,
    deletePostComment,
    deletePost,
} from "../controller/communityController.js";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", requireAuth, createPost);
router.get("/channel/:channelId", optionalAuth, getChannelPosts);
router.post("/react/:postId", requireAuth, toggleReaction);
router.post("/toggle-comments/:postId", requireAuth, toggleCommentsBlocked);
router.post("/comment/:postId", requireAuth, addPostComment);
router.delete("/comment/:postId/:commentId", requireAuth, deletePostComment);
router.delete("/:postId", requireAuth, deletePost);

export default router;
