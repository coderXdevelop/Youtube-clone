import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import DownloadRecord from "../model/downloadRecord.js";
import User from "../model/user.js";
import video from "../model/video.js";

// Plan limits definition
export const PLAN_LIMITS = {
    Free: 1,
    Bronze: 5,
    Silver: 15,
    Gold: 50,
};

/**
 * Helper to determine active plan (with expiry check)
 */
const getActiveUserPlan = (userDoc) => {
    if (!userDoc) return { plan: "Free", limit: PLAN_LIMITS.Free, isExpired: false };

    let plan = userDoc.subscriptionplan || "Free";
    let isExpired = false;

    if (plan !== "Free" && userDoc.subscriptionexpiresat) {
        const expiryDate = new Date(userDoc.subscriptionexpiresat);
        if (expiryDate < new Date()) {
            plan = "Free";
            isExpired = true;
        }
    }

    const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.Free;
    return { plan, limit, isExpired };
};

/**
 * Helper to parse client device & browser info
 */
const parseClientInfo = (req) => {
    const userAgent = req.headers["user-agent"] || "";
    let browser = "Unknown Browser";
    let deviceinfo = "Desktop Device";

    if (/mobile/i.test(userAgent)) {
        deviceinfo = "Mobile Device";
    } else if (/tablet|ipad/i.test(userAgent)) {
        deviceinfo = "Tablet Device";
    }

    if (/chrome|crios/i.test(userAgent) && !/edge|opr\//i.test(userAgent)) {
        browser = "Chrome";
    } else if (/firefox|fxios/i.test(userAgent)) {
        browser = "Firefox";
    } else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) {
        browser = "Safari";
    } else if (/edg/i.test(userAgent)) {
        browser = "Edge";
    } else if (/opr\//i.test(userAgent)) {
        browser = "Opera";
    }

    const ipaddress =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        "127.0.0.1";

    return { browser, deviceinfo, ipaddress };
};

/**
 * GET /api/download/quota/:userId?videoId=...
 * Check user's remaining download quota and whether this video was already downloaded in 24h
 */
export const checkDownloadQuota = async (req, res) => {
    const { userId } = req.params;
    const { videoId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
    }

    try {
        const userDoc = await User.findById(userId);
        if (!userDoc) {
            return res.status(404).json({ message: "User not found." });
        }

        const { plan, limit, isExpired } = getActiveUserPlan(userDoc);

        // Start of current UTC day
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        // Count unique videos downloaded today (that were not 24h duplicate re-downloads)
        const todayDownloads = await DownloadRecord.find({
            userid: userId,
            downloadtimestamp: { $gte: startOfDay },
            status: "completed",
        }).lean();

        // Calculate unique distinct videos downloaded today
        const distinctVideosToday = new Set(todayDownloads.map((d) => d.videoid.toString()));
        const usedToday = distinctVideosToday.size;
        const remainingQuota = Math.max(0, limit - usedToday);

        // Check if the requested video was downloaded within the 24-hour cooldown window
        let isRedownload = false;
        if (videoId && mongoose.Types.ObjectId.isValid(videoId)) {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentDownload = await DownloadRecord.findOne({
                userid: userId,
                videoid: videoId,
                downloadtimestamp: { $gte: twentyFourHoursAgo },
                status: "completed",
            });
            if (recentDownload) {
                isRedownload = true;
            }
        }

        const canDownload = isRedownload || remainingQuota > 0;

        // Calculate next reset time (midnight UTC)
        const nextReset = new Date(startOfDay);
        nextReset.setUTCDate(nextReset.getUTCDate() + 1);

        return res.status(200).json({
            plan,
            limit,
            usedToday,
            remainingQuota,
            isRedownload,
            canDownload,
            isExpired,
            nextResetTime: nextReset,
        });
    } catch (error) {
        console.error("checkDownloadQuota error:", error);
        return res.status(500).json({ message: "Failed to check download quota." });
    }
};

/**
 * POST /api/download/request
 * Authorize and record a video download attempt
 */
export const requestDownload = async (req, res) => {
    const { userId, videoId } = req.body;

    if (!userId || !videoId) {
        return res.status(400).json({ message: "User ID and Video ID are required." });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(videoId)) {
        return res.status(400).json({ message: "Invalid user or video ID format." });
    }

    try {
        const userDoc = await User.findById(userId);
        if (!userDoc) {
            return res.status(404).json({ message: "User not found." });
        }

        const videoDoc = await video.findById(videoId);
        if (!videoDoc) {
            return res.status(404).json({ message: "Video not found or unavailable." });
        }

        const { plan, limit } = getActiveUserPlan(userDoc);
        const { browser, deviceinfo, ipaddress } = parseClientInfo(req);

        // Check if duplicate re-download within 24h
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentDownload = await DownloadRecord.findOne({
            userid: userId,
            videoid: videoId,
            downloadtimestamp: { $gte: twentyFourHoursAgo },
            status: "completed",
        });

        const isRedownload = Boolean(recentDownload);

        // If not a free 24h re-download, enforce daily quota limit
        if (!isRedownload) {
            const startOfDay = new Date();
            startOfDay.setUTCHours(0, 0, 0, 0);

            const todayDownloads = await DownloadRecord.find({
                userid: userId,
                downloadtimestamp: { $gte: startOfDay },
                status: "completed",
            }).lean();

            const distinctVideosToday = new Set(todayDownloads.map((d) => d.videoid.toString()));
            if (distinctVideosToday.size >= limit) {
                return res.status(429).json({
                    message: `Daily download limit reached for ${plan} plan (${limit} video/day). Upgrade plan or wait until midnight UTC.`,
                    limitReached: true,
                    plan,
                    limit,
                });
            }
        }

        // Create download audit record
        const newRecord = new DownloadRecord({
            userid: userId,
            videoid: videoId,
            videotitle: videoDoc.videotitle || "Untitled Video",
            thumbnailpath: videoDoc.thumbnailpath || "",
            filepath: videoDoc.filepath || "",
            filesize: videoDoc.filesize || "0",
            downloadtimestamp: new Date(),
            ipaddress,
            deviceinfo,
            browser,
            subscriptionplan: plan,
            status: "completed",
            cooldownuntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        await newRecord.save();

        return res.status(200).json({
            success: true,
            message: isRedownload
                ? "Re-download authorized (24-hour window active, quota preserved)."
                : "Download authorized successfully.",
            record: newRecord,
            downloadUrl: `/api/download/file/${videoId}?userId=${userId}`,
        });
    } catch (error) {
        console.error("requestDownload error:", error);
        return res.status(500).json({ message: "Something went wrong authorizing download." });
    }
};

/**
 * GET /api/download/file/:videoId?userId=...
 * Securely stream and download the video file with Content-Disposition headers
 */
export const downloadVideoFile = async (req, res) => {
    const { videoId } = req.params;
    const { userId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        return res.status(400).send("Invalid video ID.");
    }

    try {
        const videoDoc = await video.findById(videoId);
        if (!videoDoc || !videoDoc.filepath) {
            return res.status(404).send("Video file not found.");
        }

        const relativePath = videoDoc.filepath.replace(/^\/+/, "");
        const absolutePath = path.resolve(relativePath);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).send("Video file is missing from server storage.");
        }

        const stat = fs.statSync(absolutePath);
        const fileSize = stat.size;
        const cleanTitle = (videoDoc.videotitle || "video")
            .replace(/[^\w\s.-]/gi, "_")
            .trim();
        const downloadFilename = `${cleanTitle}.mp4`;

        // Handle partial content range requests for resumed downloads
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = end - start + 1;
            const fileStream = fs.createReadStream(absolutePath, { start, end });

            const head = {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunksize,
                "Content-Type": "video/mp4",
                "Content-Disposition": `attachment; filename="${downloadFilename}"`,
            };

            res.writeHead(206, head);
            fileStream.pipe(res);
        } else {
            const head = {
                "Content-Length": fileSize,
                "Content-Type": "video/mp4",
                "Content-Disposition": `attachment; filename="${downloadFilename}"`,
            };

            res.writeHead(200, head);
            fs.createReadStream(absolutePath).pipe(res);
        }
    } catch (error) {
        console.error("downloadVideoFile error:", error);
        return res.status(500).send("Failed to stream video download.");
    }
};

/**
 * GET /api/download/history/:userId
 * Fetch all download records for a user's Downloads section
 */
export const getUserDownloads = async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user ID." });
    }

    try {
        const records = await DownloadRecord.find({ userid: userId })
            .sort({ downloadtimestamp: -1 })
            .populate("videoid", "videotitle thumbnailpath views category videochanel duration")
            .lean();

        return res.status(200).json(records);
    } catch (error) {
        console.error("getUserDownloads error:", error);
        return res.status(500).json({ message: "Failed to fetch download history." });
    }
};

/**
 * DELETE /api/download/:recordId?userId=...
 * Remove an item from the user's downloads library
 */
export const deleteDownloadRecord = async (req, res) => {
    const { recordId } = req.params;
    const { userId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
        return res.status(400).json({ message: "Invalid record ID." });
    }

    try {
        const record = await DownloadRecord.findById(recordId);
        if (!record) {
            return res.status(404).json({ message: "Download record not found." });
        }

        if (userId && record.userid.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized to delete this record." });
        }

        await DownloadRecord.findByIdAndDelete(recordId);
        return res.status(200).json({ success: true, message: "Record removed from downloads." });
    } catch (error) {
        console.error("deleteDownloadRecord error:", error);
        return res.status(500).json({ message: "Failed to delete download record." });
    }
};
