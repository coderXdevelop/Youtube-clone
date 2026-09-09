import video from "../model/video.js";
import user from "../model/user.js";
import history from "../model/history.js";
import like from "../model/like.js";
import watchlater from "../model/watchlater.js";
import comment from "../model/comment.js";
import downloadRecord from "../model/downloadRecord.js";
import DailyWatchQuota from "../model/dailyWatchQuota.js";
import {
    getActiveUserPlanInfo,
    isQualityAuthorized,
    canAccessVideoContent,
    getTodayUtcDateString,
    normalizeQuality,
    QUALITY_RANKS,
    PLAN_CONFIG,
} from "../utils/subscriptionAuth.js";
import { transcodeVideoFile } from "../utils/transcodeService.js";
import { generateCaptionsForVideo } from "../utils/captionService.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

export const UploadVideo = async (req, res) => {
    try {
        let videoFile = null;
        let thumbnailFile = null;

        // Handle multer files (req.files as array or object, or req.file)
        if (Array.isArray(req.files)) {
            videoFile = req.files.find(
                (f) => f.fieldname === "file" || f.mimetype.startsWith("video/")
            );
            thumbnailFile = req.files.find(
                (f) => f.fieldname === "thumbnail" || f.mimetype.startsWith("image/")
            );
        } else if (req.files && typeof req.files === "object") {
            videoFile = req.files.file?.[0] || req.files.video?.[0];
            thumbnailFile = req.files.thumbnail?.[0];
        } else if (req.file) {
            videoFile = req.file;
        }

        if (!videoFile) {
            return res.status(400).json({ message: "Please upload a valid MP4 video file." });
        }

        let thumbnailPath = "";
        let thumbnailFilename = "";

        if (thumbnailFile) {
            thumbnailPath = thumbnailFile.path.replace(/\\/g, "/");
            thumbnailFilename = thumbnailFile.originalname;
        } else if (req.body.thumbnailData && typeof req.body.thumbnailData === "string" && req.body.thumbnailData.startsWith("data:image/")) {
            // Handle client-generated video frame snapshot (base64)
            try {
                const base64Data = req.body.thumbnailData.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const filename = `thumb-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
                const uploadDir = "uploads";
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const savePath = path.join(uploadDir, filename);
                fs.writeFileSync(savePath, buffer);
                thumbnailPath = `uploads/${filename}`;
                thumbnailFilename = filename;
            } catch (thumbErr) {
                console.warn("Error saving base64 thumbnail frame:", thumbErr.message);
            }
        }

        const description = req.body.videodescription || req.body.description || "";
        let categoryRaw = req.body.category || "All";
        let categoryStr = "All";

        if (Array.isArray(categoryRaw)) {
            const valid = categoryRaw.map((c) => String(c).trim()).filter(Boolean);
            categoryStr = valid.length > 0 ? valid.join(", ") : "All";
        } else if (typeof categoryRaw === "string") {
            const valid = categoryRaw
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);
            categoryStr = valid.length > 0 ? valid.join(", ") : "All";
        }

        const uploaderId = req.body.uploader || "";
        let uploaderImage = "";
        if (uploaderId && mongoose.Types.ObjectId.isValid(uploaderId)) {
            const uploaderUser = await user.findById(uploaderId);
            if (uploaderUser) {
                uploaderImage = uploaderUser.image || "";
            }
        }

        const rawAccessLevel = (req.body.accesslevel || "free").toLowerCase();
        const validAccessLevels = ["free", "bronze", "silver", "gold"];
        const accessLevel = validAccessLevels.includes(rawAccessLevel) ? rawAccessLevel : "free";
        const isPremium = req.body.ispremium === "true" || req.body.ispremium === true || accessLevel !== "free";
        const previewDuration = Number(req.body.previewduration) || 60;
        const normalizedFilePath = videoFile.path.replace(/\\/g, "/");

        const newVideo = new video({
            videotitle: req.body.videotitle,
            videodescription: description,
            description: description,
            category: categoryStr,
            filename: videoFile.originalname,
            filepath: normalizedFilePath,
            filetype: videoFile.mimetype,
            filesize: String(videoFile.size),
            videochanel: req.body.videochanel || "My Channel",
            uploader: uploaderId,
            uploaderimage: uploaderImage,
            channelimage: uploaderImage,
            thumbnailpath: thumbnailPath,
            thumbnailfilename: thumbnailFilename,
            accesslevel: accessLevel,
            ispremium: isPremium,
            previewduration: previewDuration,
            qualityvariants: [
                {
                    quality: "720p",
                    filepath: normalizedFilePath,
                    filesize: String(videoFile.size),
                    resolution: "1280x720",
                },
                {
                    quality: "1080p",
                    filepath: normalizedFilePath,
                    filesize: String(videoFile.size),
                    resolution: "1920x1080",
                },
            ],
        });

        await newVideo.save();

        // Asynchronously transcode multi-resolution variants (360p, 480p, 720p, 1080p) via FFmpeg in background
        transcodeVideoFile(normalizedFilePath, newVideo._id).catch((err) => {
            console.warn(`[FFMPEG] Background transcoding warning for ${newVideo._id}:`, err.message);
        });

        // Asynchronously extract audio and generate timestamped captions via Speech-to-Text
        generateCaptionsForVideo(newVideo._id, normalizedFilePath, newVideo.uploader, "en").catch((err) => {
            console.warn(`[Caption] Background STT caption generation warning for ${newVideo._id}:`, err.message);
        });

        return res.status(201).json({
            message: "file uploaded successfully",
            video: newVideo,
        });
    } catch (error) {
        console.error("UploadVideo error:", error);
        return res.status(500).json({ message: "Something went wrong during video upload." });
    }
};

export const getallvideo = async (req, res) => {
    try {
        const files = await video.find().sort({ createdAt: -1 }).lean();

        // Enrich videos with channel/uploader profile avatar image
        const uploaderIds = files.map((f) => f.uploader).filter((id) => id && mongoose.Types.ObjectId.isValid(id));
        const channelNames = files.map((f) => f.videochanel).filter(Boolean);

        const matchingUsers = await user
            .find({
                $or: [
                    { _id: { $in: uploaderIds } },
                    { channelname: { $in: channelNames } },
                    { name: { $in: channelNames } },
                ],
            })
            .lean();

        const userMap = new Map();
        matchingUsers.forEach((u) => {
            userMap.set(String(u._id), u);
            if (u.channelname) userMap.set(u.channelname.toLowerCase(), u);
            if (u.name) userMap.set(u.name.toLowerCase(), u);
        });

        const enrichedFiles = files.map((file) => {
            const matchedUser =
                userMap.get(String(file.uploader)) ||
                userMap.get((file.videochanel || "").toLowerCase());

            const userImg = matchedUser?.image || file.uploaderimage || file.channelimage || "";
            return {
                ...file,
                uploaderimage: userImg,
                channelimage: userImg,
                userimage: userImg,
            };
        });

        return res.status(200).send(enrichedFiles);
    } catch (error) {
        console.error("getallvideo error:", error);
        return res.status(500).json({ message: "Something went wrong fetching videos." });
    }
};

/**
 * Delete a video by channel owner or admin
 * DELETE /api/video/:id
 */
export const deleteVideo = async (req, res) => {
    const { id } = req.params;
    const userId = req.body?.userId || req.query?.userId || req.headers?.["x-user-id"];

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid video ID." });
    }

    try {
        const targetVideo = await video.findById(id);
        if (!targetVideo) {
            return res.status(404).json({ message: "Video not found." });
        }

        // Authorization / Ownership check
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const requestingUser = await user.findById(userId);
            const isOwner =
                targetVideo.uploader === userId ||
                (requestingUser?.channelname &&
                    targetVideo.videochanel?.toLowerCase() === requestingUser.channelname?.toLowerCase()) ||
                (requestingUser?.name &&
                    targetVideo.videochanel?.toLowerCase() === requestingUser.name?.toLowerCase());

            const isAdmin =
                requestingUser?.user_type === "admin" ||
                requestingUser?.isadmin === true;

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ message: "You are not authorized to delete this video." });
            }
        }

        // 1. Clean up master video and all generated quality files from disk if present
        const filesToDelete = new Set();
        if (targetVideo.filepath) filesToDelete.add(targetVideo.filepath);
        if (Array.isArray(targetVideo.qualityvariants)) {
            targetVideo.qualityvariants.forEach((v) => {
                if (v.filepath) filesToDelete.add(v.filepath);
            });
        }

        filesToDelete.forEach((fPath) => {
            const absPath = path.resolve(fPath.replace(/^\/+/, ""));
            if (fs.existsSync(absPath)) {
                try {
                    fs.unlinkSync(absPath);
                } catch (fileErr) {
                    console.warn("Could not delete variant file from disk:", fileErr.message);
                }
            }
        });

        // 2. Clean up thumbnail from disk if present
        if (targetVideo.thumbnailpath && fs.existsSync(targetVideo.thumbnailpath)) {
            try {
                fs.unlinkSync(targetVideo.thumbnailpath);
            } catch (thumbErr) {
                console.warn("Could not delete thumbnail file from disk:", thumbErr.message);
            }
        }

        // Clean up HLS directory if present
        const hlsDirPath = path.resolve(path.join("uploads", "hls", String(id)));
        if (fs.existsSync(hlsDirPath)) {
            try {
                fs.rmSync(hlsDirPath, { recursive: true, force: true });
            } catch (hlsErr) {
                console.warn("Could not delete HLS directory from disk:", hlsErr.message);
            }
        }

        // 3. Cascade cleanup associated records in MongoDB
        await Promise.allSettled([
            history.deleteMany({ videoid: id }),
            like.deleteMany({ videoid: id }),
            watchlater.deleteMany({ videoid: id }),
            comment.deleteMany({ videoid: id }),
            downloadRecord.deleteMany({ videoid: id }),
        ]);

        // 4. Delete the video document
        await video.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Video deleted successfully from the platform.",
            videoId: id,
        });
    } catch (error) {
        console.error("deleteVideo error:", error);
        return res.status(500).json({ message: "Failed to delete video." });
    }
};

/**
 * GET /api/video/hls/:id/master.m3u8?userId=...
 * Dynamic Master HLS Playlist generated per-user based on active subscription tier
 */
export const getHlsMasterPlaylist = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send("Invalid video ID format.");
    }

    try {
        const videoDoc = await video.findById(id).lean();
        if (!videoDoc) {
            return res.status(404).send("Video not found.");
        }

        let userDoc = null;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            userDoc = await user.findById(userId).lean();
        }

        const userPlanInfo = getActiveUserPlanInfo(userDoc);
        const accessCheck = canAccessVideoContent(userPlanInfo.plan, videoDoc);

        if (!accessCheck.allowed && !accessCheck.previewOnly) {
            return res.status(403).json({
                message: accessCheck.message || "This video requires a higher subscription tier.",
                requiredPlan: accessCheck.requiredPlan,
            });
        }

        // Check daily watch time quota for Free users
        if (userPlanInfo.dailyWatchLimitSeconds !== null) {
            const todayStr = getTodayUtcDateString();
            if (userDoc?._id) {
                const quotaDoc = await DailyWatchQuota.findOne({ userid: userDoc._id, date: todayStr }).lean();
                if (quotaDoc && quotaDoc.watchedseconds >= userPlanInfo.dailyWatchLimitSeconds) {
                    return res.status(403).json({
                        message: "Daily free watch time limit (60 minutes) reached.",
                        limitReached: true,
                        plan: userPlanInfo.plan,
                    });
                }
            }
        }

        const hlsDir = path.resolve(path.join("uploads", "hls", String(id)));
        const HLS_PROFILES = [
            { quality: "360p", width: 640, height: 360, bandwidth: 400000 },
            { quality: "480p", width: 854, height: 480, bandwidth: 800000 },
            { quality: "720p", width: 1280, height: 720, bandwidth: 1500000 },
            { quality: "1080p", width: 1920, height: 1080, bandwidth: 3000000 },
            { quality: "1440p", width: 2560, height: 1440, bandwidth: 6000000 },
            { quality: "4k", width: 3840, height: 2160, bandwidth: 12000000 },
        ];

        // Filter profiles that exist on disk and are authorized for this user's subscription tier
        const authorizedProfiles = HLS_PROFILES.filter((p) => {
            const variantFile = path.join(hlsDir, `stream_${p.quality}.m3u8`);
            const exists = fs.existsSync(variantFile);
            const isAuth = isQualityAuthorized(userPlanInfo.plan, p.quality).authorized;
            return exists && isAuth;
        });

        if (authorizedProfiles.length === 0) {
            // Check if standard master.m3u8 exists at all
            const masterFallback = path.join(hlsDir, "master.m3u8");
            if (fs.existsSync(masterFallback)) {
                const content = fs.readFileSync(masterFallback, "utf8");
                res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
                res.setHeader("Cache-Control", "no-cache");
                return res.send(content);
            }
            return res.status(404).send("HLS streams not ready for this video.");
        }

        // Build filtered Master Playlist
        let masterContent = "#EXTM3U\n#EXT-X-VERSION:3\n";
        const querySuffix = userId ? `?userId=${encodeURIComponent(userId)}` : "";

        for (const p of authorizedProfiles) {
            masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${p.bandwidth},RESOLUTION=${p.width}x${p.height},NAME="${p.quality}"\n`;
            masterContent += `stream_${p.quality}.m3u8${querySuffix}\n`;
        }

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.setHeader("Cache-Control", "no-cache");
        return res.send(masterContent);
    } catch (error) {
        console.error("getHlsMasterPlaylist error:", error);
        return res.status(500).send("Error generating HLS master playlist.");
    }
};

/**
 * GET /api/video/hls/:id/:file
 * Serves variant playlists (stream_<quality>.m3u8) and segment files (stream_<quality>_xxx.ts)
 * with strict backend subscription quality & quota validation
 */
export const serveHlsStreamOrSegment = async (req, res) => {
    const { id, file } = req.params;
    const { userId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send("Invalid video ID format.");
    }

    try {
        // Extract quality from filename e.g. stream_1080p.m3u8 or stream_1080p_001.ts
        const qualityMatch = file.match(/stream_([0-9a-zA-Z]+)(?:_\d+)?\.(m3u8|ts)/i);
        const requestedQuality = qualityMatch ? qualityMatch[1] : null;

        if (requestedQuality) {
            let userDoc = null;
            if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                userDoc = await user.findById(userId).lean();
            }

            const userPlanInfo = getActiveUserPlanInfo(userDoc);
            const authCheck = isQualityAuthorized(userPlanInfo.plan, requestedQuality);

            if (!authCheck.authorized) {
                return res.status(403).json({
                    message: `Quality ${requestedQuality} is not available on ${userPlanInfo.plan} plan.`,
                    requestedQuality,
                    userPlan: userPlanInfo.plan,
                    maxAllowedQuality: authCheck.maxAllowedQuality,
                });
            }

            // Check daily watch quota
            if (userPlanInfo.dailyWatchLimitSeconds !== null) {
                const todayStr = getTodayUtcDateString();
                if (userDoc?._id) {
                    const quotaDoc = await DailyWatchQuota.findOne({ userid: userDoc._id, date: todayStr }).lean();
                    if (quotaDoc && quotaDoc.watchedseconds >= userPlanInfo.dailyWatchLimitSeconds) {
                        return res.status(403).json({
                            message: "Daily free watch time limit reached.",
                            limitReached: true,
                        });
                    }
                }
            }
        }

        const safeFilename = path.basename(file);
        const filePath = path.resolve(path.join("uploads", "hls", String(id), safeFilename));

        if (!fs.existsSync(filePath)) {
            return res.status(404).send("Requested HLS resource not found.");
        }

        if (safeFilename.endsWith(".m3u8")) {
            let m3u8Content = fs.readFileSync(filePath, "utf8");
            // If userId is present, append query param to segment references so .ts requests are authorized
            if (userId) {
                m3u8Content = m3u8Content.replace(
                    /(stream_[0-9a-zA-Z]+_\d+\.ts)/g,
                    `$1?userId=${encodeURIComponent(userId)}`
                );
            }
            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            res.setHeader("Cache-Control", "no-cache");
            return res.send(m3u8Content);
        } else if (safeFilename.endsWith(".ts")) {
            res.setHeader("Content-Type", "video/MP2T");
            res.setHeader("Cache-Control", "public, max-age=31536000");
            return fs.createReadStream(filePath).pipe(res);
        } else {
            return res.sendFile(filePath);
        }
    } catch (error) {
        console.error("serveHlsStreamOrSegment error:", error);
        return res.status(500).send("Error serving HLS file.");
    }
};

/**
 * GET /api/video/playback-info/:id?userId=...
 * Single source of truth for video playback authorization:
 * - Active subscription plan and validity
 * - Authorized video quality options (and locked tiers)
 * - Premium access permissions (or free preview limitations)
 * - Server-tracked daily watch-time quota & remaining seconds
 * - HLS Stream URL and available qualities
 */
export const getPlaybackInfo = async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid video ID." });
    }

    try {
        const videoDoc = await video.findById(id).lean();
        if (!videoDoc) {
            return res.status(404).json({ message: "Video not found." });
        }

        let userDoc = null;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            userDoc = await user.findById(userId).lean();
        }

        const userPlanInfo = getActiveUserPlanInfo(userDoc);
        const accessCheck = canAccessVideoContent(userPlanInfo.plan, videoDoc);

        // Calculate Daily Watch Time for today (UTC)
        const todayStr = getTodayUtcDateString();
        let watchedSecondsToday = 0;

        if (userDoc?._id) {
            const quotaDoc = await DailyWatchQuota.findOne({ userid: userDoc._id, date: todayStr }).lean();
            if (quotaDoc) {
                watchedSecondsToday = quotaDoc.watchedseconds || 0;
            }
        }

        const dailyLimitSeconds = userPlanInfo.dailyWatchLimitSeconds;
        const isUnlimitedWatch = dailyLimitSeconds === null || dailyLimitSeconds === undefined;
        const remainingSecondsToday = isUnlimitedWatch
            ? null
            : Math.max(0, dailyLimitSeconds - watchedSecondsToday);
        const watchQuotaExceeded = !isUnlimitedWatch && remainingSecondsToday <= 0;

        // Build available qualities matrix based on user's authorized quality rank
        const allQualities = ["360p", "480p", "720p", "1080p", "1440p", "4k"];
        const qualityOptions = allQualities.map((q) => {
            const auth = isQualityAuthorized(userPlanInfo.plan, q);
            const reqRank = QUALITY_RANKS[q];
            let minRequiredPlan = "Free";
            if (reqRank >= 6) minRequiredPlan = "Gold";
            else if (reqRank >= 5) minRequiredPlan = "Silver";
            else if (reqRank >= 4) minRequiredPlan = "Bronze";

            return {
                quality: q,
                label: q === "4k" ? "4K Ultra HD" : q === "1440p" ? "1440p 2K QHD" : q === "1080p" ? "1080p Full HD" : q === "720p" ? "720p HD" : q,
                isAllowed: auth.authorized,
                requiredPlan: minRequiredPlan,
            };
        });

        // Check if HLS directory or master.m3u8 exists
        const hlsDir = path.resolve(path.join("uploads", "hls", String(id)));
        const hasHls = fs.existsSync(path.join(hlsDir, "master.m3u8")) || videoDoc.hlsstatus === "completed";

        const hlsStreamUrl = `/api/video/hls/${videoDoc._id}/master.m3u8${userId ? `?userId=${userId}` : ""}`;
        const fallbackStreamUrl = `/api/video/stream/${videoDoc._id}?quality=${encodeURIComponent(userPlanInfo.maxQuality || "720p")}${userId ? `&userId=${userId}` : ""}`;

        return res.status(200).json({
            videoId: videoDoc._id,
            videotitle: videoDoc.videotitle,
            access: accessCheck,
            userPlan: {
                plan: userPlanInfo.plan,
                isExpired: userPlanInfo.isExpired,
                maxAllowedQuality: userPlanInfo.maxQuality,
                isAdFree: userPlanInfo.allowAdFree,
                canAccessCourses: userPlanInfo.allowCourses,
            },
            watchTime: {
                isUnlimited: isUnlimitedWatch,
                dailyLimitSeconds,
                watchedSecondsToday,
                remainingSecondsToday,
                quotaExceeded: watchQuotaExceeded,
            },
            qualities: qualityOptions,
            maxAllowedQuality: userPlanInfo.maxQuality,
            isHls: hasHls,
            hlsStatus: videoDoc.hlsstatus || (hasHls ? "completed" : "none"),
            hlsStreamUrl,
            streamUrl: hasHls ? hlsStreamUrl : fallbackStreamUrl,
            availableQualities: videoDoc.availablequalities || ["360p", "480p", "720p", "1080p"],
        });
    } catch (error) {
        console.error("getPlaybackInfo error:", error);
        return res.status(500).json({ message: "Failed to evaluate playback authorization." });
    }
};

/**
 * GET /api/video/stream/:id
 * Authorized HTTP 206 Range-based Video Streaming
 * - Verifies user subscription and content permissions
 * - Enforces quality limit (downgrades higher requested resolutions if unauthorized)
 * - Enforces daily watch time quota for free accounts
 * - Pipes video range chunks securely
 */
export const streamVideoAuthorized = async (req, res) => {
    const { id } = req.params;
    const { userId, quality = "720p" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send("Invalid video ID format.");
    }

    try {
        const videoDoc = await video.findById(id).lean();
        if (!videoDoc) {
            return res.status(404).send("Video not found.");
        }

        let userDoc = null;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            userDoc = await user.findById(userId).lean();
        }

        const userPlanInfo = getActiveUserPlanInfo(userDoc);
        const accessCheck = canAccessVideoContent(userPlanInfo.plan, videoDoc);

        // If video is premium and user has no access, allow only preview duration or reject
        if (!accessCheck.allowed && !accessCheck.previewOnly) {
            return res.status(403).json({
                message: accessCheck.message || "This content requires a higher subscription plan.",
                requiredPlan: accessCheck.requiredPlan,
            });
        }

        // Check daily watch time quota for Free users
        if (userPlanInfo.dailyWatchLimitSeconds !== null) {
            const todayStr = getTodayUtcDateString();
            if (userDoc?._id) {
                const quotaDoc = await DailyWatchQuota.findOne({ userid: userDoc._id, date: todayStr }).lean();
                if (quotaDoc && quotaDoc.watchedseconds >= userPlanInfo.dailyWatchLimitSeconds) {
                    return res.status(403).json({
                        message: "Daily free watch time limit (60 minutes) reached. Upgrade to Bronze, Silver, or Gold for unlimited watch time.",
                        limitReached: true,
                        plan: userPlanInfo.plan,
                    });
                }
            }
        }

        // Authorize and normalize quality
        const qualityCheck = isQualityAuthorized(userPlanInfo.plan, quality);
        const authorizedQuality = qualityCheck.authorized
            ? qualityCheck.normalizedRequested
            : qualityCheck.maxAllowedQuality;

        // Resolve target file path (check for specific quality variant, else main filepath)
        let targetFilePath = videoDoc.filepath;
        if (Array.isArray(videoDoc.qualityvariants) && videoDoc.qualityvariants.length > 0) {
            const variant = videoDoc.qualityvariants.find(
                (v) => normalizeQuality(v.quality) === authorizedQuality
            );
            if (variant && variant.filepath && fs.existsSync(path.resolve(variant.filepath.replace(/^\/+/, "")))) {
                targetFilePath = variant.filepath;
            }
        }

        const relativePath = targetFilePath.replace(/^\/+/, "");
        const absolutePath = path.resolve(relativePath);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).send("Video file stream source is missing.");
        }

        const stat = fs.statSync(absolutePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        // If client sends Range header (standard HTML5 video player requests)
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize) {
                res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
                return res.end();
            }

            const chunksize = end - start + 1;
            const fileStream = fs.createReadStream(absolutePath, { start, end });

            const headers = {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunksize,
                "Content-Type": videoDoc.filetype || "video/mp4",
                "X-Authorized-Quality": authorizedQuality,
                "X-User-Plan": userPlanInfo.plan,
            };

            res.writeHead(206, headers);
            fileStream.pipe(res);
        } else {
            const headers = {
                "Content-Length": fileSize,
                "Content-Type": videoDoc.filetype || "video/mp4",
                "Accept-Ranges": "bytes",
                "X-Authorized-Quality": authorizedQuality,
                "X-User-Plan": userPlanInfo.plan,
            };

            res.writeHead(200, headers);
            fs.createReadStream(absolutePath).pipe(res);
        }
    } catch (error) {
        console.error("streamVideoAuthorized error:", error);
        if (!res.headersSent) {
            return res.status(500).send("Error streaming video.");
        }
    }
};

/**
 * POST /api/video/heartbeat
 * Records watched seconds in user's DailyWatchQuota on the backend
 * Body: { userId, videoId, secondsWatched, sessionId }
 */
export const recordWatchHeartbeat = async (req, res) => {
    const { userId, videoId, secondsWatched = 5, sessionId = "" } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(200).json({ allowed: true, plan: "Anonymous" });
    }

    try {
        const userDoc = await user.findById(userId).lean();
        if (!userDoc) {
            return res.status(404).json({ message: "User not found." });
        }

        const userPlanInfo = getActiveUserPlanInfo(userDoc);
        const dailyLimit = userPlanInfo.dailyWatchLimitSeconds;

        // Paid plans have unlimited watch time
        if (dailyLimit === null || dailyLimit === undefined) {
            return res.status(200).json({
                allowed: true,
                isUnlimited: true,
                plan: userPlanInfo.plan,
            });
        }

        const todayStr = getTodayUtcDateString();
        const incrementSec = Math.min(30, Math.max(1, Number(secondsWatched) || 5));

        const updatedQuota = await DailyWatchQuota.findOneAndUpdate(
            { userid: userId, date: todayStr },
            {
                $inc: { watchedseconds: incrementSec },
                $set: { lastheartbeat: new Date() },
                ...(sessionId ? { $addToSet: { sessionids: sessionId } } : {}),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const totalWatched = updatedQuota.watchedseconds;
        const remaining = Math.max(0, dailyLimit - totalWatched);
        const quotaExceeded = totalWatched >= dailyLimit;

        return res.status(200).json({
            allowed: !quotaExceeded,
            plan: userPlanInfo.plan,
            isUnlimited: false,
            dailyLimitSeconds: dailyLimit,
            watchedSecondsToday: totalWatched,
            remainingSecondsToday: remaining,
            quotaExceeded,
            message: quotaExceeded
                ? "Daily free watch time limit reached. Please upgrade to continue watching."
                : undefined,
        });
    } catch (error) {
        console.error("recordWatchHeartbeat error:", error);
        return res.status(500).json({ message: "Failed to record watch heartbeat." });
    }
};