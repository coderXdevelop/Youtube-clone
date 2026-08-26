import comment from "../model/comment.js";
import CommentReport from "../model/commentReport.js";
import video from "../model/video.js";
import User from "../model/user.js";
import mongoose from "mongoose";
import {
    checkProfanity,
    checkSpamPattern,
    checkDuplicateComment,
    recordCommentForSpam,
    checkRateLimit,
    recordRateLimitHit,
    createCaptchaChallenge,
    verifyCaptchaToken,
} from "../utils/moderationHelper.js";
import { translateText, detectLanguageFromText, SUPPORTED_LANGUAGES } from "../utils/translateHelper.js";

const EDIT_TIME_LIMIT_MS = 15 * 60 * 1000; // 15 minutes edit window

/**
 * POST a new comment or reply
 */
export const postcomment = async (req, res) => {
    try {
        const {
            videoid,
            userid,
            commentbody,
            usercommented,
            userimage,
            userlocation,
            parentcommentid,
            captchaToken,
            captchaAnswer,
        } = req.body;

        if (!videoid || !userid || !commentbody || !commentbody.trim()) {
            return res.status(400).json({ message: "Missing required comment information." });
        }

        const trimmedBody = commentbody.trim();

        // 1. Rate limiting & Flooding check
        const rateCheck = checkRateLimit(userid);
        if (!rateCheck.allowed) {
            // Check if user solved CAPTCHA
            if (captchaToken && captchaAnswer && verifyCaptchaToken(captchaToken, captchaAnswer)) {
                // CAPTCHA solved, proceed
            } else {
                const newCaptcha = createCaptchaChallenge();
                return res.status(429).json({
                    message: rateCheck.reason,
                    requiresCaptcha: true,
                    captcha: newCaptcha,
                });
            }
        }

        // 2. Profanity and abusive language check
        const profanityCheck = checkProfanity(trimmedBody);
        if (profanityCheck.hasProfanity) {
            return res.status(400).json({
                message: profanityCheck.reason,
                blocked: true,
            });
        }

        // 3. Spam patterns, repetition, and malicious links check
        const spamCheck = checkSpamPattern(trimmedBody);
        if (spamCheck.isSpam) {
            return res.status(400).json({
                message: spamCheck.reason,
                blocked: true,
            });
        }

        // 4. Duplicate comment check
        const dupCheck = checkDuplicateComment(userid, trimmedBody);
        if (dupCheck.isDuplicate) {
            return res.status(400).json({
                message: dupCheck.reason,
                blocked: true,
            });
        }

        // 5. Detect source language
        const detectedLang = detectLanguageFromText(trimmedBody);

        // 6. Create comment instance
        const newComment = new comment({
            videoid,
            userid,
            commentbody: trimmedBody,
            originalbody: trimmedBody,
            usercommented: usercommented || "Anonymous",
            userimage: userimage || "",
            userlocation: userlocation || "",
            parentcommentid: parentcommentid && mongoose.Types.ObjectId.isValid(parentcommentid) ? parentcommentid : null,
            detectedlanguage: detectedLang,
            commentedon: new Date(),
            version: 1,
        });

        const savedComment = await newComment.save();

        // If this is a reply to a parent comment, increment the parent's replycount
        if (parentcommentid && mongoose.Types.ObjectId.isValid(parentcommentid)) {
            await comment.findByIdAndUpdate(parentcommentid, {
                $inc: { replycount: 1 },
            });
        }

        // Record for rate limiting & spam prevention
        recordRateLimitHit(userid);
        recordCommentForSpam(userid, trimmedBody);

        return res.status(200).json({
            comment: true,
            result: savedComment,
        });
    } catch (error) {
        console.error("postcomment error:", error);
        return res.status(500).json({ message: "Something went wrong posting comment." });
    }
};

/**
 * GET all comments for a video with sorting & threading
 */
export const getallcomment = async (req, res) => {
    const { videoid } = req.params;
    const { sort = "newest" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(videoid)) {
        return res.status(400).json({ message: "Invalid video ID." });
    }

    try {
        let sortCriteria = { commentedon: -1 }; // default newest
        if (sort === "oldest") {
            sortCriteria = { commentedon: 1 };
        } else if (sort === "most_liked" || sort === "top") {
            sortCriteria = { likescount: -1, commentedon: -1 };
        }

        // Fetch all non-hidden comments for this video
        let comments = await comment.find({
            videoid: videoid,
            moderationstatus: { $ne: "hidden" },
        }).sort(sortCriteria).lean();

        // If sorting by most_relevant, calculate custom engagement relevance score
        if (sort === "most_relevant") {
            comments.sort((a, b) => {
                const scoreA = (a.likescount || 0) * 2 + (a.replycount || 0) * 1.5 - (a.dislikescount || 0) - (a.reportcount || 0) * 3;
                const scoreB = (b.likescount || 0) * 2 + (b.replycount || 0) * 1.5 - (b.dislikescount || 0) - (b.reportcount || 0) * 3;
                return scoreB - scoreA;
            });
        }

        // Return comment list directly (maintaining full backward compatibility)
        return res.status(200).json(comments);
    } catch (error) {
        console.error("getallcomment error:", error);
        return res.status(500).json({ message: "Something went wrong fetching comments." });
    }
};

/**
 * EDIT comment with 15-minute time limit & concurrency protection
 */
export const editcomment = async (req, res) => {
    const { id: _id } = req.params;
    const { commentbody, userid, version } = req.body;

    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(404).json({ message: "Comment unavailable." });
    }

    if (!commentbody || !commentbody.trim()) {
        return res.status(400).json({ message: "Comment text cannot be empty." });
    }

    const trimmedBody = commentbody.trim();

    try {
        const existingComment = await comment.findById(_id);
        if (!existingComment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        // Cannot edit already deleted comment
        if (existingComment.isdeleted) {
            return res.status(400).json({ message: "Cannot edit a deleted comment." });
        }

        // Ownership verification (if userid provided)
        if (userid && existingComment.userid.toString() !== userid.toString()) {
            return res.status(403).json({ message: "You are not authorized to edit this comment." });
        }

        // 15-minute time window verification
        const commentAgeMs = Date.now() - new Date(existingComment.commentedon).getTime();
        if (commentAgeMs > EDIT_TIME_LIMIT_MS) {
            const minutesPassed = Math.floor(commentAgeMs / 60000);
            return res.status(400).json({
                message: `Editing time limit exceeded (${minutesPassed} minutes elapsed. Max edit window is 15 minutes).`,
                timeExpired: true,
            });
        }

        // Concurrency check (optimistic concurrency version control)
        if (version !== undefined && existingComment.version && version !== existingComment.version) {
            return res.status(409).json({
                message: "This comment was modified by another session. Please refresh and try again.",
                conflict: true,
                currentComment: existingComment,
            });
        }

        // Profanity & spam check on edited text
        const profanityCheck = checkProfanity(trimmedBody);
        if (profanityCheck.hasProfanity) {
            return res.status(400).json({ message: profanityCheck.reason, blocked: true });
        }
        const spamCheck = checkSpamPattern(trimmedBody);
        if (spamCheck.isSpam) {
            return res.status(400).json({ message: spamCheck.reason, blocked: true });
        }

        // Update revision history
        const historyEntry = {
            body: existingComment.commentbody,
            editedat: new Date(),
        };

        const detectedLang = detectLanguageFromText(trimmedBody);

        const updatedComment = await comment.findByIdAndUpdate(
            _id,
            {
                $set: {
                    commentbody: trimmedBody,
                    isedited: true,
                    editedat: new Date(),
                    detectedlanguage: detectedLang,
                    translations: {}, // invalidate stale translations on edit
                },
                $inc: { version: 1 },
                $push: { edithistory: historyEntry },
            },
            { new: true }
        );

        return res.status(200).json(updatedComment);
    } catch (error) {
        console.error("editcomment error:", error);
        return res.status(500).json({ message: "Something went wrong updating comment." });
    }
};

/**
 * DELETE comment with reply preservation (soft-delete if has replies)
 */
export const deletecomment = async (req, res) => {
    const { id: _id } = req.params;
    const { userid } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(404).send("comment unavailable");
    }

    try {
        const existingComment = await comment.findById(_id);
        if (!existingComment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        // Ownership verification (if userid provided)
        if (userid && existingComment.userid.toString() !== userid.toString()) {
            return res.status(403).json({ message: "You are not authorized to delete this comment." });
        }

        // Check if comment has replies
        const replyCount = await comment.countDocuments({
            parentcommentid: _id,
            isdeleted: false,
        });

        if (replyCount > 0 || existingComment.replycount > 0) {
            // Soft delete to preserve conversation tree
            await comment.findByIdAndUpdate(_id, {
                $set: {
                    isdeleted: true,
                    commentbody: "[This comment has been deleted by the author]",
                    isedited: false,
                },
            });
            return res.status(200).json({ comment: true, softDeleted: true });
        } else {
            // Hard delete
            await comment.findByIdAndDelete(_id);

            // If it was a reply, decrement parent's replycount
            if (existingComment.parentcommentid) {
                await comment.findByIdAndUpdate(existingComment.parentcommentid, {
                    $inc: { replycount: -1 },
                });
            }

            // Also clean up any associated report records
            await CommentReport.deleteMany({ commentid: _id });

            return res.status(200).json({ comment: true, softDeleted: false });
        }
    } catch (error) {
        console.error("deletecomment error:", error);
        return res.status(500).json({ message: "Something went wrong deleting comment." });
    }
};

/**
 * LIKE a comment (toggle atomic reaction)
 */
export const likecomment = async (req, res) => {
    const { id: _id } = req.params;
    const { userid } = req.body;

    if (!mongoose.Types.ObjectId.isValid(_id) || !userid) {
        return res.status(400).json({ message: "Invalid request parameters." });
    }

    try {
        const existingComment = await comment.findById(_id);
        if (!existingComment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        const userObjectId = new mongoose.Types.ObjectId(userid);
        const hasLiked = existingComment.likes?.some((id) => id.toString() === userid.toString());
        const hasDisliked = existingComment.dislikes?.some((id) => id.toString() === userid.toString());

        let updateQuery = {};

        if (hasLiked) {
            // Undo like
            updateQuery = {
                $pull: { likes: userObjectId },
                $inc: { likescount: -1 },
            };
        } else {
            // Add like and remove dislike if present
            updateQuery = {
                $addToSet: { likes: userObjectId },
                $pull: { dislikes: userObjectId },
                $inc: {
                    likescount: 1,
                    dislikescount: hasDisliked ? -1 : 0,
                },
            };
        }

        const updated = await comment.findByIdAndUpdate(_id, updateQuery, { new: true });
        return res.status(200).json({
            likescount: Math.max(0, updated.likescount || 0),
            dislikescount: Math.max(0, updated.dislikescount || 0),
            hasLiked: !hasLiked,
            hasDisliked: false,
        });
    } catch (error) {
        console.error("likecomment error:", error);
        return res.status(500).json({ message: "Something went wrong reacting to comment." });
    }
};

/**
 * DISLIKE a comment (toggle atomic reaction)
 */
export const dislikecomment = async (req, res) => {
    const { id: _id } = req.params;
    const { userid } = req.body;

    if (!mongoose.Types.ObjectId.isValid(_id) || !userid) {
        return res.status(400).json({ message: "Invalid request parameters." });
    }

    try {
        const existingComment = await comment.findById(_id);
        if (!existingComment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        const userObjectId = new mongoose.Types.ObjectId(userid);
        const hasLiked = existingComment.likes?.some((id) => id.toString() === userid.toString());
        const hasDisliked = existingComment.dislikes?.some((id) => id.toString() === userid.toString());

        let updateQuery = {};

        if (hasDisliked) {
            // Undo dislike
            updateQuery = {
                $pull: { dislikes: userObjectId },
                $inc: { dislikescount: -1 },
            };
        } else {
            // Add dislike and remove like if present
            updateQuery = {
                $addToSet: { dislikes: userObjectId },
                $pull: { likes: userObjectId },
                $inc: {
                    dislikescount: 1,
                    likescount: hasLiked ? -1 : 0,
                },
            };
        }

        const updated = await comment.findByIdAndUpdate(_id, updateQuery, { new: true });
        return res.status(200).json({
            likescount: Math.max(0, updated.likescount || 0),
            dislikescount: Math.max(0, updated.dislikescount || 0),
            hasLiked: false,
            hasDisliked: !hasDisliked,
        });
    } catch (error) {
        console.error("dislikecomment error:", error);
        return res.status(500).json({ message: "Something went wrong reacting to comment." });
    }
};

/**
 * REPORT a comment for inappropriate content (with duplicate report prevention)
 */
export const reportcomment = async (req, res) => {
    const { id: _id } = req.params;
    const { userid, username, reason, details } = req.body;

    if (!mongoose.Types.ObjectId.isValid(_id) || !userid || !reason) {
        return res.status(400).json({ message: "Missing report parameters or invalid reason." });
    }

    try {
        const existingComment = await comment.findById(_id);
        if (!existingComment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        // Check if user has already reported this comment
        const alreadyReported = existingComment.reports?.some(
            (r) => r.userid?.toString() === userid.toString()
        );

        if (alreadyReported) {
            return res.status(400).json({
                message: "You have already submitted a report for this comment.",
                alreadyReported: true,
            });
        }

        const reportRecord = {
            userid: new mongoose.Types.ObjectId(userid),
            reason,
            details: details || "",
            reportedat: new Date(),
        };

        // Create audit log in CommentReport collection
        await CommentReport.create({
            commentid: _id,
            videoid: existingComment.videoid,
            reportedby: userid,
            reportedbyname: username || "Anonymous",
            reason,
            details: details || "",
            commentcontent: existingComment.commentbody,
            status: "pending",
        });

        // Update comment report count and flag if threshold (>=3 reports) reached
        const newReportCount = (existingComment.reportcount || 0) + 1;
        const newStatus = newReportCount >= 3 ? "flagged" : existingComment.moderationstatus;

        await comment.findByIdAndUpdate(_id, {
            $push: { reports: reportRecord },
            $inc: { reportcount: 1 },
            $set: { moderationstatus: newStatus },
        });

        return res.status(200).json({
            success: true,
            message: "Thank you. Your report has been submitted for review.",
        });
    } catch (error) {
        console.error("reportcomment error:", error);
        return res.status(500).json({ message: "Something went wrong submitting report." });
    }
};

/**
 * TRANSLATE a comment into preferred language with MongoDB caching
 */
export const translatecomment = async (req, res) => {
    const { id: _id } = req.params;
    const { targetLang = "en" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(400).json({ message: "Invalid comment ID." });
    }

    try {
        const existingComment = await comment.findById(_id);
        if (!existingComment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        // Check if translation is already cached in MongoDB
        const existingTranslations = existingComment.translations instanceof Map
            ? Object.fromEntries(existingComment.translations)
            : existingComment.translations || {};

        if (existingTranslations[targetLang]) {
            return res.status(200).json({
                translatedText: existingTranslations[targetLang],
                detectedSourceLang: existingComment.detectedlanguage || "auto",
                targetLang,
                cached: true,
            });
        }

        // Translate via helper
        const result = await translateText(
            existingComment.commentbody,
            targetLang,
            existingComment.detectedlanguage || "auto"
        );

        // Cache translation in DB
        const updateKey = `translations.${targetLang}`;
        await comment.findByIdAndUpdate(_id, {
            $set: { [updateKey]: result.translatedText },
        });

        return res.status(200).json({
            translatedText: result.translatedText,
            detectedSourceLang: result.detectedSourceLang,
            targetLang: result.targetLang,
            cached: false,
        });
    } catch (error) {
        console.error("translatecomment error:", error);
        return res.status(500).json({ message: "Translation failed. Please try again." });
    }
};

/**
 * GET edit history for a comment
 */
export const getcommenthistory = async (req, res) => {
    const { id: _id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(400).json({ message: "Invalid comment ID." });
    }

    try {
        const existingComment = await comment.findById(_id, "edithistory originalbody commentedon isedited");
        if (!existingComment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        return res.status(200).json({
            originalbody: existingComment.originalbody || existingComment.commentbody,
            commentedon: existingComment.commentedon,
            isedited: existingComment.isedited,
            edithistory: existingComment.edithistory || [],
        });
    } catch (error) {
        console.error("getcommenthistory error:", error);
        return res.status(500).json({ message: "Something went wrong fetching history." });
    }
};

/**
 * GENERATE CAPTCHA challenge
 */
export const generateCaptcha = async (req, res) => {
    try {
        const captcha = createCaptchaChallenge();
        return res.status(200).json(captcha);
    } catch (error) {
        console.error("generateCaptcha error:", error);
        return res.status(500).json({ message: "Failed to generate CAPTCHA." });
    }
};

/**
 * GET supported languages list
 */
export const getSupportedLanguages = (req, res) => {
    return res.status(200).json(SUPPORTED_LANGUAGES);
};

/**
 * CHANNEL OWNER: Get flagged comments & reports for a specific video or channel owner's videos
 */
export const getadminflaggedcomments = async (req, res) => {
    try {
        const { videoid, userId } = req.query;

        let reportFilter = { status: "pending" };
        let flaggedFilter = { moderationstatus: "flagged" };

        if (videoid) {
            if (!mongoose.Types.ObjectId.isValid(videoid)) {
                return res.status(400).json({ message: "Invalid video ID." });
            }

            // Verify channel ownership if userId is provided
            const targetVideo = await video.findById(videoid);
            if (targetVideo && userId) {
                const isUploaderMatch = targetVideo.uploader && targetVideo.uploader.toString() === userId.toString();
                let isChannelMatch = false;

                if (mongoose.Types.ObjectId.isValid(userId)) {
                    const userDoc = await User.findById(userId);
                    if (userDoc) {
                        isChannelMatch = Boolean(
                            (userDoc.channelname && targetVideo.videochanel && userDoc.channelname.toLowerCase() === targetVideo.videochanel.toLowerCase()) ||
                            (userDoc.name && targetVideo.videochanel && userDoc.name.toLowerCase() === targetVideo.videochanel.toLowerCase())
                        );
                    }
                }

                if (!isUploaderMatch && !isChannelMatch) {
                    return res.status(403).json({
                        message: "Access denied. Only the channel owner can view moderation reports for this video.",
                    });
                }
            }

            reportFilter.videoid = videoid;
            flaggedFilter.videoid = videoid;
        } else if (userId) {
            // Find all videos belonging to this creator/channel
            let channelConditions = [];
            channelConditions.push({ uploader: userId });

            if (mongoose.Types.ObjectId.isValid(userId)) {
                const userDoc = await User.findById(userId);
                if (userDoc?.channelname) {
                    channelConditions.push({ videochanel: userDoc.channelname });
                }
                if (userDoc?.name) {
                    channelConditions.push({ videochanel: userDoc.name });
                }
            }

            const creatorVideos = await video.find({ $or: channelConditions }).select("_id");
            const creatorVideoIds = creatorVideos.map((v) => v._id);

            reportFilter.videoid = { $in: creatorVideoIds };
            flaggedFilter.videoid = { $in: creatorVideoIds };
        }

        const reports = await CommentReport.find(reportFilter)
            .sort({ createdAt: -1 })
            .populate("commentid")
            .populate("reportedby", "name email image")
            .lean();

        const flaggedComments = await comment.find(flaggedFilter)
            .sort({ reportcount: -1 })
            .lean();

        return res.status(200).json({
            reports,
            flaggedComments,
        });
    } catch (error) {
        console.error("getadminflaggedcomments error:", error);
        return res.status(500).json({ message: "Failed to fetch flagged comments." });
    }
};

/**
 * CHANNEL OWNER: Review, dismiss, or action flagged comment
 */
export const reviewcomment = async (req, res) => {
    const { id: _id } = req.params;
    const { action, reportid, reviewerid } = req.body; // action: "dismiss" | "hide" | "delete" | "approve"

    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(400).json({ message: "Invalid comment ID." });
    }

    try {
        const targetComment = await comment.findById(_id);
        if (!targetComment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        // Verify that the reviewer is the owner of the video where the comment is posted
        if (reviewerid) {
            const targetVideo = await video.findById(targetComment.videoid);
            if (targetVideo) {
                const isUploaderMatch = targetVideo.uploader && targetVideo.uploader.toString() === reviewerid.toString();
                let isChannelMatch = false;

                if (mongoose.Types.ObjectId.isValid(reviewerid)) {
                    const userDoc = await User.findById(reviewerid);
                    if (userDoc) {
                        isChannelMatch = Boolean(
                            (userDoc.channelname && targetVideo.videochanel && userDoc.channelname.toLowerCase() === targetVideo.videochanel.toLowerCase()) ||
                            (userDoc.name && targetVideo.videochanel && userDoc.name.toLowerCase() === targetVideo.videochanel.toLowerCase())
                        );
                    }
                }

                if (!isUploaderMatch && !isChannelMatch) {
                    return res.status(403).json({
                        message: "Access denied. Only the channel owner can moderate comments on this video.",
                    });
                }
            }
        }

        if (action === "dismiss" || action === "approve") {
            await comment.findByIdAndUpdate(_id, {
                $set: { moderationstatus: "approved", reportcount: 0 },
            });
            if (reportid) {
                await CommentReport.findByIdAndUpdate(reportid, {
                    $set: { status: "dismissed", reviewedby: reviewerid, reviewedat: new Date() },
                });
            }
        } else if (action === "hide") {
            await comment.findByIdAndUpdate(_id, {
                $set: { moderationstatus: "hidden" },
            });
            if (reportid) {
                await CommentReport.findByIdAndUpdate(reportid, {
                    $set: { status: "actioned", reviewedby: reviewerid, reviewedat: new Date() },
                });
            }
        } else if (action === "delete") {
            await comment.findByIdAndDelete(_id);
            await CommentReport.updateMany(
                { commentid: _id },
                { $set: { status: "actioned", reviewedby: reviewerid, reviewedat: new Date() } }
            );
        }

        return res.status(200).json({ success: true, message: `Comment ${action}d successfully.` });
    } catch (error) {
        console.error("reviewcomment error:", error);
        return res.status(500).json({ message: "Failed to update review status." });
    }
};