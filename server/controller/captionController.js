import caption from "../model/caption.js";
import video from "../model/video.js";
import { generateCaptionsForVideo, parseVTTToCues, cuesToWebVTT } from "../utils/captionService.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

/**
 * Retrieve all captions for a specific video
 */
export const getCaptionsByVideoId = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid video ID." });
        }

        const videoDoc = await video.findById(id);
        if (!videoDoc) {
            return res.status(404).json({ message: "Video not found." });
        }

        let captions = await caption.find({ videoid: id }).lean();

        // If no captions exist yet, trigger auto-generation in background
        if (!captions || captions.length === 0) {
            generateCaptionsForVideo(videoDoc._id, videoDoc.filepath, videoDoc.uploader, "en").catch((err) => {
                console.warn(`[Caption] Background generation warning for video ${id}:`, err.message);
            });
        }

        return res.status(200).json({
            message: "Captions retrieved successfully",
            captions: captions || [],
        });
    } catch (error) {
        console.error("getCaptionsByVideoId error:", error);
        return res.status(500).json({ message: "Failed to retrieve captions." });
    }
};

/**
 * Serve raw WebVTT file with correct Content-Type and CORS headers
 */
export const serveCaptionVtt = async (req, res) => {
    try {
        const { id } = req.params;
        const lang = req.query.lang || "en";

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send("Invalid video ID");
        }

        const captionDoc = await caption.findOne({ videoid: id, language: lang });
        if (!captionDoc || captionDoc.status !== "completed") {
            // Return empty valid WebVTT
            res.setHeader("Content-Type", "text/vtt; charset=utf-8");
            res.setHeader("Access-Control-Allow-Origin", "*");
            return res.send("WEBVTT\n\n");
        }

        // If file exists on disk, stream it
        if (captionDoc.vttpath) {
            const absolutePath = path.resolve(captionDoc.vttpath.replace(/^\/+/, ""));
            if (fs.existsSync(absolutePath)) {
                res.setHeader("Content-Type", "text/vtt; charset=utf-8");
                res.setHeader("Access-Control-Allow-Origin", "*");
                return fs.createReadStream(absolutePath).pipe(res);
            }
        }

        // Fallback: build from stored cues
        const vttText = cuesToWebVTT(captionDoc.cues || [], `Video ${id} Captions`);
        res.setHeader("Content-Type", "text/vtt; charset=utf-8");
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.send(vttText);
    } catch (error) {
        console.error("serveCaptionVtt error:", error);
        res.setHeader("Content-Type", "text/vtt; charset=utf-8");
        return res.status(500).send("WEBVTT\n\nNOTE Error generating captions\n");
    }
};

/**
 * Manually trigger or re-run Speech-to-Text caption generation
 */
export const triggerCaptionGeneration = async (req, res) => {
    try {
        const { id } = req.params;
        const { language = "en", userId = "" } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid video ID." });
        }

        const videoDoc = await video.findById(id);
        if (!videoDoc) {
            return res.status(404).json({ message: "Video not found." });
        }

        // Validate uploader / permissions
        if (userId && videoDoc.uploader && String(videoDoc.uploader) !== String(userId)) {
            return res.status(403).json({ message: "You do not have permission to modify captions for this video." });
        }

        // Trigger in background
        generateCaptionsForVideo(videoDoc._id, videoDoc.filepath, userId || videoDoc.uploader, language).catch((err) => {
            console.error(`[Caption] Manual generation error:`, err);
        });

        return res.status(202).json({
            message: "Caption generation started in background.",
            status: "processing",
        });
    } catch (error) {
        console.error("triggerCaptionGeneration error:", error);
        return res.status(500).json({ message: "Failed to trigger caption generation." });
    }
};

/**
 * Upload custom WebVTT or SRT captions manually
 */
export const uploadCustomCaption = async (req, res) => {
    try {
        const { id } = req.params;
        const { language = "en", label = "", userId = "", vttText = "" } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid video ID." });
        }

        const videoDoc = await video.findById(id);
        if (!videoDoc) {
            return res.status(404).json({ message: "Video not found." });
        }

        // Check ownership
        if (userId && videoDoc.uploader && String(videoDoc.uploader) !== String(userId)) {
            return res.status(403).json({ message: "Unauthorized. Only video uploader can upload captions." });
        }

        let rawText = vttText;

        // Check if file was uploaded via multer
        if (req.file) {
            rawText = fs.readFileSync(req.file.path, "utf8");
        } else if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            rawText = fs.readFileSync(req.files[0].path, "utf8");
        }

        if (!rawText || !rawText.trim()) {
            return res.status(400).json({ message: "Caption file content is empty." });
        }

        const cues = parseVTTToCues(rawText);
        if (!cues || cues.length === 0) {
            return res.status(400).json({ message: "No valid timestamped cues found in caption content." });
        }

        // Save .vtt file to disk
        const captionsDir = path.resolve(path.join("uploads", "captions"));
        if (!fs.existsSync(captionsDir)) {
            fs.mkdirSync(captionsDir, { recursive: true });
        }

        const safeFilename = `${id}_${language}_custom_${Date.now()}.vtt`;
        const savePath = path.join(captionsDir, safeFilename);
        const formattedVtt = cuesToWebVTT(cues, `Custom ${label || language}`);
        fs.writeFileSync(savePath, formattedVtt, "utf8");

        const relativePath = `uploads/captions/${safeFilename}`.replace(/\\/g, "/");

        // Save or update MongoDB record
        const captionRecord = await caption.findOneAndUpdate(
            { videoid: id, language },
            {
                $set: {
                    label: label || (language === "en" ? "English" : language.toUpperCase()),
                    vttpath: relativePath,
                    cues: cues,
                    autogenerated: false,
                    status: "completed",
                    uploader: userId || videoDoc.uploader,
                },
            },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            message: "Captions uploaded and processed successfully.",
            caption: captionRecord,
        });
    } catch (error) {
        console.error("uploadCustomCaption error:", error);
        return res.status(500).json({ message: "Failed to upload custom caption." });
    }
};

/**
 * Delete a specific caption
 */
export const deleteCaption = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId = "" } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid caption ID." });
        }

        const cap = await caption.findById(id);
        if (!cap) {
            return res.status(404).json({ message: "Caption not found." });
        }

        // Verify ownership
        const vid = await video.findById(cap.videoid);
        if (userId && vid && vid.uploader && String(vid.uploader) !== String(userId)) {
            return res.status(403).json({ message: "Unauthorized to delete this caption." });
        }

        // Remove file from disk
        if (cap.vttpath) {
            const absolutePath = path.resolve(cap.vttpath.replace(/^\/+/, ""));
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        await caption.findByIdAndDelete(id);

        return res.status(200).json({ message: "Caption deleted successfully." });
    } catch (error) {
        console.error("deleteCaption error:", error);
        return res.status(500).json({ message: "Failed to delete caption." });
    }
};
