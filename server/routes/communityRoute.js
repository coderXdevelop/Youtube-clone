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

const router = express.Router();

router.post("/create", createPost);
router.get("/channel/:channelId", getChannelPosts);
router.post("/react/:postId", toggleReaction);
router.post("/toggle-comments/:postId", toggleCommentsBlocked);
router.post("/comment/:postId", addPostComment);
router.delete("/comment/:postId/:commentId", deletePostComment);
router.delete("/:postId", deletePost);

export default router;
