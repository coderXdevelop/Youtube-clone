import mongoose from "mongoose";
import CommunityPost from "../model/communityPost.js";
import User from "../model/user.js";

/**
 * Create a new announcement on creator channel
 * POST /api/community/create
 */
export const createPost = async (req, res) => {
    try {
        const { channelId, content, image, tag, allowComments } = req.body;
        const requestingUserId = req.body.userId || req.headers["x-user-id"];

        if (!channelId || !content?.trim()) {
            return res.status(400).json({
                success: false,
                message: "channelId and announcement content are required.",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid channel ID.",
            });
        }

        // Ownership verification: Only channel owner can post announcements
        if (!requestingUserId || requestingUserId.toString() !== channelId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the channel owner can publish announcements.",
            });
        }

        const channelUser = await User.findById(channelId);
        if (!channelUser) {
            return res.status(404).json({
                success: false,
                message: "Channel user not found.",
            });
        }

        const newPost = await CommunityPost.create({
            channelId,
            authorId: channelId,
            authorName: channelUser.channelname || channelUser.name || "Creator",
            authorImage: channelUser.image || "",
            content: content.trim(),
            image: image || "",
            tag: tag || "Announcement",
            allowComments: allowComments !== undefined ? Boolean(allowComments) : true,
            likes: [],
            dislikes: [],
            comments: [],
        });

        return res.status(201).json({
            success: true,
            message: "Announcement published successfully.",
            post: newPost,
        });
    } catch (error) {
        console.error("createPost error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to publish announcement.",
            error: error.message,
        });
    }
};

/**
 * Get all announcements for a channel
 * GET /api/community/channel/:channelId
 */
export const getChannelPosts = async (req, res) => {
    try {
        const { channelId } = req.params;
        const currentUserId = req.query.userId || req.headers["x-user-id"];

        if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid channel ID.",
            });
        }

        const posts = await CommunityPost.find({ channelId })
            .sort({ createdAt: -1 })
            .lean();

        // Format posts with user reaction state
        const formattedPosts = posts.map((post) => {
            const isLiked = Boolean(
                currentUserId &&
                post.likes?.some((id) => id.toString() === currentUserId.toString())
            );
            const isDisliked = Boolean(
                currentUserId &&
                post.dislikes?.some((id) => id.toString() === currentUserId.toString())
            );

            return {
                ...post,
                likesCount: post.likes?.length || 0,
                dislikesCount: post.dislikes?.length || 0,
                commentsCount: post.comments?.length || 0,
                isLiked,
                isDisliked,
            };
        });

        return res.status(200).json({
            success: true,
            count: formattedPosts.length,
            posts: formattedPosts,
        });
    } catch (error) {
        console.error("getChannelPosts error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch channel announcements.",
        });
    }
};

/**
 * Toggle Reaction (Like / Dislike) on an announcement
 * POST /api/community/react/:postId
 */
export const toggleReaction = async (req, res) => {
    try {
        const { postId } = req.params;
        const { reactionType } = req.body; // 'like' or 'dislike'
        const userId = req.body.userId || req.headers["x-user-id"];

        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid post ID." });
        }

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ success: false, message: "Sign in required to react." });
        }

        const post = await CommunityPost.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        if (!Array.isArray(post.likes)) post.likes = [];
        if (!Array.isArray(post.dislikes)) post.dislikes = [];

        const userIdStr = userId.toString();
        const hasLiked = post.likes.some((id) => (id?._id || id)?.toString() === userIdStr);
        const hasDisliked = post.dislikes.some((id) => (id?._id || id)?.toString() === userIdStr);

        if (reactionType === "like") {
            if (hasLiked) {
                // Remove like
                post.likes = post.likes.filter((id) => (id?._id || id)?.toString() !== userIdStr);
            } else {
                // Add like & remove dislike
                post.likes.push(new mongoose.Types.ObjectId(userIdStr));
                post.dislikes = post.dislikes.filter((id) => (id?._id || id)?.toString() !== userIdStr);
            }
        } else if (reactionType === "dislike") {
            if (hasDisliked) {
                // Remove dislike
                post.dislikes = post.dislikes.filter((id) => (id?._id || id)?.toString() !== userIdStr);
            } else {
                // Add dislike & remove like
                post.dislikes.push(new mongoose.Types.ObjectId(userIdStr));
                post.likes = post.likes.filter((id) => (id?._id || id)?.toString() !== userIdStr);
            }
        }

        await post.save();

        const isLikedNow = post.likes.some((id) => (id?._id || id)?.toString() === userIdStr);
        const isDislikedNow = post.dislikes.some((id) => (id?._id || id)?.toString() === userIdStr);

        return res.status(200).json({
            success: true,
            likesCount: post.likes.length,
            dislikesCount: post.dislikes.length,
            isLiked: isLikedNow,
            isDisliked: isDislikedNow,
        });
    } catch (error) {
        console.error("toggleReaction error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update reaction.",
            error: error.message,
        });
    }
};

/**
 * Toggle Comment Blocking on an announcement (Channel Owner only)
 * POST /api/community/toggle-comments/:postId
 */
export const toggleCommentsBlocked = async (req, res) => {
    try {
        const { postId } = req.params;
        const requestingUserId = req.body.userId || req.headers["x-user-id"];
        const explicitState = req.body.allowComments;

        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid post ID." });
        }

        const post = await CommunityPost.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        // Authorization: Only channel owner can block/unblock comments
        if (!requestingUserId || post.channelId.toString() !== requestingUserId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the channel owner can toggle comments on this announcement.",
            });
        }

        post.allowComments = explicitState !== undefined ? Boolean(explicitState) : !post.allowComments;
        await post.save();

        return res.status(200).json({
            success: true,
            allowComments: post.allowComments,
            message: post.allowComments
                ? "Comments enabled for this announcement."
                : "Comments blocked for this announcement.",
        });
    } catch (error) {
        console.error("toggleCommentsBlocked error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update comment settings.",
        });
    }
};

/**
 * Add a comment to an announcement
 * POST /api/community/comment/:postId
 */
export const addPostComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { text, userName, userImage } = req.body;
        const userId = req.body.userId || req.headers["x-user-id"];

        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid post ID." });
        }

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ success: false, message: "Sign in required to comment." });
        }

        if (!text?.trim()) {
            return res.status(400).json({ success: false, message: "Comment text is required." });
        }

        const post = await CommunityPost.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        // Check if comments are blocked
        if (post.allowComments === false) {
            return res.status(403).json({
                success: false,
                message: "Comments are disabled for this announcement.",
            });
        }

        const newComment = {
            userId,
            userName: userName || "Viewer",
            userImage: userImage || "",
            text: text.trim(),
            createdAt: new Date(),
        };

        post.comments.push(newComment);
        await post.save();

        return res.status(201).json({
            success: true,
            comment: post.comments[post.comments.length - 1],
            commentsCount: post.comments.length,
            message: "Comment posted.",
        });
    } catch (error) {
        console.error("addPostComment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to post comment.",
        });
    }
};

/**
 * Delete a comment from an announcement
 * DELETE /api/community/comment/:postId/:commentId
 */
export const deletePostComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const requestingUserId = req.body?.userId || req.headers["x-user-id"];

        if (!postId || !commentId) {
            return res.status(400).json({ success: false, message: "postId and commentId are required." });
        }

        const post = await CommunityPost.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        const targetComment = post.comments.id(commentId);
        if (!targetComment) {
            return res.status(404).json({ success: false, message: "Comment not found." });
        }

        // Authorization: Comment Author OR Channel Owner can delete
        const isAuthor = requestingUserId && targetComment.userId.toString() === requestingUserId.toString();
        const isChannelOwner = requestingUserId && post.channelId.toString() === requestingUserId.toString();

        if (!isAuthor && !isChannelOwner) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this comment.",
            });
        }

        post.comments.pull(commentId);
        await post.save();

        return res.status(200).json({
            success: true,
            message: "Comment deleted.",
            commentsCount: post.comments.length,
        });
    } catch (error) {
        console.error("deletePostComment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete comment.",
        });
    }
};

/**
 * Delete an announcement (Channel Owner only)
 * DELETE /api/community/:postId
 */
export const deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const requestingUserId = req.body?.userId || req.query?.userId || req.headers["x-user-id"];

        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid post ID." });
        }

        const post = await CommunityPost.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found." });
        }

        if (!requestingUserId || post.channelId.toString() !== requestingUserId.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only the channel owner can delete this announcement.",
            });
        }

        await CommunityPost.findByIdAndDelete(postId);

        return res.status(200).json({
            success: true,
            message: "Announcement deleted successfully.",
        });
    } catch (error) {
        console.error("deletePost error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete announcement.",
        });
    }
};
