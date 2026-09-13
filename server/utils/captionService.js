import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import caption from "../model/caption.js";
import video from "../model/video.js";

// Configure FFmpeg binary
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

/**
 * Format seconds (e.g. 74.32) into WebVTT timestamp format (00:01:14.320)
 */
export const formatVttTimestamp = (seconds) => {
    const totalMs = Math.max(0, Math.floor(seconds * 1000));
    const ms = totalMs % 1000;
    const totalSec = Math.floor(totalMs / 1000);
    const sec = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const min = totalMin % 60;
    const hours = Math.floor(totalMin / 60);

    const pad = (num, digits = 2) => String(num).padStart(digits, "0");
    return `${pad(hours)}:${pad(min)}:${pad(sec)}.${pad(ms, 3)}`;
};

/**
 * Convert an array of cues [{ start, end, text }] to a standard WebVTT string
 */
export const cuesToWebVTT = (cues, title = "Captions") => {
    let vtt = "WEBVTT\n";
    vtt += `NOTE ${title}\n\n`;

    cues.forEach((cue, index) => {
        const start = formatVttTimestamp(cue.start);
        const end = formatVttTimestamp(cue.end > cue.start ? cue.end : cue.start + 1.5);
        const cleanText = String(cue.text || "").trim();
        if (cleanText) {
            vtt += `${index + 1}\n`;
            vtt += `${start} --> ${end}\n`;
            vtt += `${cleanText}\n\n`;
        }
    });

    return vtt;
};

/**
 * Parses a WebVTT or simple text format back into cue objects
 */
export const parseVTTToCues = (vttText) => {
    const cues = [];
    const lines = vttText.split(/\r?\n/);
    const timecodeRegex = /(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[.,](\d{3})/;

    let currentCue = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("WEBVTT") || line.startsWith("NOTE")) {
            continue;
        }

        const match = line.match(timecodeRegex);
        if (match) {
            const parseSec = (h, m, s, ms) => {
                const hours = Number(h || 0);
                const minutes = Number(m || 0);
                const seconds = Number(s || 0);
                const millis = Number(ms || 0);
                return hours * 3600 + minutes * 60 + seconds + millis / 1000;
            };

            const start = parseSec(match[1], match[2], match[3], match[4]);
            const end = parseSec(match[5], match[6], match[7], match[8]);

            currentCue = { start, end, text: "" };
            cues.push(currentCue);
        } else if (currentCue && !/^\d+$/.test(line)) {
            currentCue.text = currentCue.text ? `${currentCue.text} ${line}` : line;
        }
    }

    return cues;
};

/**
 * Extract 16kHz mono 16-bit PCM WAV audio from input video
 */
export const extractAudioForStt = (videoPath, outputWavPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .noVideo()
            .audioCodec("pcm_s16le")
            .audioChannels(1)
            .audioFrequency(16000)
            .format("wav")
            .output(outputWavPath)
            .on("end", () => {
                resolve(outputWavPath);
            })
            .on("error", (err) => {
                reject(err);
            })
            .run();
    });
};

/**
 * Transcribe audio file via cloud Groq Whisper API (zero local memory footprint)
 */
const transcribeWithGroq = async (audioFilePath, isShortVoiceQuery = false) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.warn("[CaptionService] ℹ️ GROQ_API_KEY is not set. Set GROQ_API_KEY in environment variables for instant cloud speech-to-text.");
        return null;
    }

    try {
        console.log(`[CaptionService] 🚀 Transcribing via Groq Whisper API (${audioFilePath})...`);
        const fileBuffer = fs.readFileSync(audioFilePath);
        const fileName = path.basename(audioFilePath);
        const ext = path.extname(fileName).toLowerCase();
        const mimeType = ext === ".webm" ? "audio/webm" : ext === ".mp4" ? "audio/mp4" : "audio/wav";

        const fileBlob = new Blob([fileBuffer], { type: mimeType });
        const formData = new FormData();
        formData.append("file", fileBlob, fileName);
        formData.append("model", "whisper-large-v3-turbo");

        if (isShortVoiceQuery) {
            formData.append("response_format", "json");
        } else {
            formData.append("response_format", "verbose_json");
            formData.append("timestamp_granularities[]", "segment");
        }

        const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API responded with status ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (isShortVoiceQuery) {
            return [{ start: 0, end: 5, text: data.text || "" }];
        }

        if (data && Array.isArray(data.segments)) {
            return data.segments
                .map((seg) => ({
                    start: Number(seg.start || 0),
                    end: Number(seg.end || seg.start + 2),
                    text: String(seg.text || "").trim(),
                }))
                .filter((c) => c.text.length > 0);
        } else if (data && data.text) {
            return [{ start: 0, end: 5, text: String(data.text).trim() }];
        }

        return null;
    } catch (err) {
        console.warn("[CaptionService] ⚠️ Groq API transcription error:", err.message);
        return null;
    }
};

/**
 * Orchestrator: Generate timestamped captions for an uploaded video file
 */
export const generateCaptionsForVideo = async (videoId, videoFilePath, userId = "", language = "en") => {
    const videoIdStr = String(videoId);
    let captionRecord = null;

    try {
        console.log(`[CaptionService] 🎬 Starting caption generation for video ${videoIdStr}...`);

        // Find or create Caption database record
        captionRecord = await caption.findOne({ videoid: videoId, language });
        if (!captionRecord) {
            captionRecord = new caption({
                videoid: videoId,
                language: language,
                label: language === "en" ? "English (Auto-generated)" : `${language.toUpperCase()} (Auto-generated)`,
                status: "processing",
                autogenerated: true,
                uploader: userId || "",
            });
            await captionRecord.save();
        } else {
            captionRecord.status = "processing";
            captionRecord.errormessage = "";
            await captionRecord.save();
        }

        const absoluteVideoPath = path.resolve(videoFilePath.replace(/^\/+/, ""));
        if (!fs.existsSync(absoluteVideoPath)) {
            throw new Error(`Video file does not exist on disk: ${absoluteVideoPath}`);
        }

        // Prepare temporary paths
        const captionsDir = path.resolve(path.join("uploads", "captions"));
        if (!fs.existsSync(captionsDir)) {
            fs.mkdirSync(captionsDir, { recursive: true });
        }

        const tempWavPath = path.join(captionsDir, `temp_${videoIdStr}_${Date.now()}.wav`);
        const finalVttPath = path.join(captionsDir, `${videoIdStr}_${language}.vtt`);
        const relativeVttPath = `uploads/captions/${videoIdStr}_${language}.vtt`.replace(/\\/g, "/");

        let cues = null;
        try {
            // 1. Extract 16kHz mono audio for transcription
            console.log(`[CaptionService] 🔊 Extracting 16kHz audio to ${tempWavPath}...`);
            await extractAudioForStt(absoluteVideoPath, tempWavPath);

            // 2. Perform STT via Groq Cloud API
            cues = await transcribeWithGroq(tempWavPath, false);
        } finally {
            // Guarantee immediate cleanup of temporary WAV file to save disk and memory
            if (fs.existsSync(tempWavPath)) {
                try {
                    fs.unlinkSync(tempWavPath);
                } catch (e) {}
            }
        }

        // If no speech detected, or GROQ_API_KEY not configured, provide a default friendly cue
        if (!cues || cues.length === 0) {
            const vidDoc = await video.findById(videoId);
            const title = vidDoc?.videotitle || "Video Stream";
            cues = [
                { start: 0, end: 4, text: `[Music / Audio: "${title}"]` },
            ];
        }

        // 3. Generate WebVTT content & write to file
        const vttContent = cuesToWebVTT(cues, `Video Captions (${language})`);
        fs.writeFileSync(finalVttPath, vttContent, "utf8");

        // 4. Update MongoDB Caption record
        captionRecord.status = "completed";
        captionRecord.cues = cues;
        captionRecord.vttpath = relativeVttPath;
        await captionRecord.save();

        console.log(`[CaptionService] 🎉 Successfully generated ${cues.length} caption cues for video ${videoIdStr}!`);
        return captionRecord;
    } catch (error) {
        console.error(`[CaptionService] ❌ Caption generation failed for video ${videoIdStr}:`, error);
        if (captionRecord) {
            captionRecord.status = "failed";
            captionRecord.errormessage = error.message || "Caption generation failed";
            await captionRecord.save().catch(() => {});
        }
        return null;
    }
};

/**
 * Transcribe a short voice search audio clip (uploaded from browser mic)
 * Lightweight streaming directly to Groq Whisper with 0MB in-process ML memory
 */
export const transcribeAudioQuery = async (audioFilePath) => {
    try {
        console.log(`[CaptionService] 🎙️ Processing voice search query from ${audioFilePath}...`);
        
        // Directly transcribe audio file with Groq (supports webm/wav/mp4 natively)
        const cues = await transcribeWithGroq(audioFilePath, true);

        if (cues && cues.length > 0) {
            const fullText = cues
                .map((c) => c.text)
                .join(" ")
                .replace(/\[(?:dramatic music|MUSIC PLAYING|MUSIC|music|sound|applause)\]\s*/gi, "")
                .replace(/\[.*?\]/g, "")
                .replace(/\s+/g, " ")
                .trim();
            return fullText;
        }
        return "";
    } catch (err) {
        console.error("[CaptionService] ❌ Voice search query transcription failed:", err);
        return "";
    }
};


