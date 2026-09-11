import multer from "multer";
import path from "path";
import fs from "fs";
import { transcribeAudioQuery } from "../utils/captionService.js";

// Ensure uploads/temp directory exists
const tempUploadDir = path.resolve(path.join("uploads", "temp"));
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Multer storage for voice search audio blobs
const voiceStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempUploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || ".webm";
        cb(null, `voice-${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`);
    },
});

export const voiceAudioUpload = multer({
    storage: voiceStorage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15 MB limit for audio query
    },
});

/**
 * Handle voice audio transcription request
 */
export const handleVoiceTranscribe = async (req, res) => {
    let filePath = "";
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                text: "",
                message: "No audio file provided in request.",
            });
        }

        filePath = req.file.path;
        console.log(`[VoiceSearchController] 🎙️ Received voice query file: ${filePath} (${req.file.size} bytes)`);

        const transcribedText = await transcribeAudioQuery(filePath);

        return res.status(200).json({
            success: true,
            text: transcribedText || "",
            message: transcribedText ? "Voice transcribed successfully." : "No speech detected.",
        });
    } catch (err) {
        console.error("[VoiceSearchController] ❌ Voice search handler error:", err);
        return res.status(500).json({
            success: false,
            text: "",
            message: err.message || "Failed to transcribe voice search audio.",
        });
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (cleanupErr) {
                console.warn("[VoiceSearchController] Could not remove temp uploaded audio:", cleanupErr.message);
            }
        }
    }
};
