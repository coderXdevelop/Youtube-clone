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

// Global cached pipeline for @xenova/transformers
let cachedTranscriber = null;

/**
 * Lazy-load the local Whisper pipeline from @xenova/transformers
 */
const getTranscriber = async () => {
    if (!cachedTranscriber) {
        try {
            const { pipeline } = await import("@xenova/transformers");
            console.log("[CaptionService] 🎙️ Initializing Whisper speech-to-text pipeline (Xenova/whisper-tiny)...");
            cachedTranscriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
                quantized: true,
            });
            console.log("[CaptionService] ✅ Whisper pipeline ready.");
        } catch (err) {
            console.warn("[CaptionService] ⚠️ Could not load @xenova/transformers locally:", err.message);
            cachedTranscriber = null;
        }
    }
    return cachedTranscriber;
};

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
 * Transcribe WAV audio via Groq Whisper API if key is available
 */
const transcribeWithGroq = async (wavPath) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    try {
        console.log("[CaptionService] 🚀 Transcribing via Groq Whisper API (whisper-large-v3)...");
        const fileStream = fs.createReadStream(wavPath);
        const stats = fs.statSync(wavPath);

        const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
        const formDataBuffer = [];

        // Build simple multipart/form-data payload without heavy extra deps
        const fileBuffer = fs.readFileSync(wavPath);
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`;
        const modelField = `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3\r\n`;
        const formatField = `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\nverbose_json\r\n`;
        const timestampField = `--${boundary}\r\nContent-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\nsegment\r\n`;
        const footer = `--${boundary}--\r\n`;

        const body = Buffer.concat([
            Buffer.from(header, "utf8"),
            fileBuffer,
            Buffer.from(modelField + formatField + timestampField + footer, "utf8"),
        ]);

        const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
                "Content-Length": String(body.length),
            },
            body: body,
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API responded with ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (data && Array.isArray(data.segments)) {
            return data.segments.map((seg) => ({
                start: Number(seg.start || 0),
                end: Number(seg.end || seg.start + 2),
                text: String(seg.text || "").trim(),
            })).filter((c) => c.text.length > 0);
        }

        return null;
    } catch (err) {
        console.warn("[CaptionService] ⚠️ Groq API transcription failed, falling back to local STT:", err.message);
        return null;
    }
};

/**
 * Transcribe WAV audio via local @xenova/transformers Whisper model
 */
const transcribeWithLocalWhisper = async (wavPath) => {
    try {
        const transcriber = await getTranscriber();
        if (!transcriber) return null;

        const wavefileModule = await import("wavefile");
        const WaveFile = wavefileModule.default?.WaveFile || wavefileModule.WaveFile || wavefileModule.default;
        const buffer = fs.readFileSync(wavPath);
        const wav = new WaveFile(buffer);
        wav.toBitDepth("32f");
        wav.toSampleRate(16000);

        let audioData = wav.getSamples(false, Float32Array);
        if (Array.isArray(audioData)) {
            audioData = audioData[0]; // If multi-channel, use channel 0
        }
        if (!(audioData instanceof Float32Array)) {
            audioData = new Float32Array(audioData);
        }

        console.log(`[CaptionService] 🧠 Running local Whisper inference on audio samples (${audioData.length} samples)...`);
        const output = await transcriber(audioData, {
            chunk_length_s: 30,
            stride_length_s: 0,
            return_timestamps: true,
        });

        if (output && Array.isArray(output.chunks)) {
            const cleanCues = [];
            let lastCleanText = "";

            for (const chunk of output.chunks) {
                let text = String(chunk.text || "").trim();
                text = text.replace(/\[(?:dramatic music|MUSIC PLAYING|MUSIC|music|sound)\]\s*/gi, "[Music] ");
                text = text.replace(/\s+/g, " ").trim();
                text = text.replace(/(\[Music\]\s*)+/gi, "[Music]");

                if (!text) continue;

                const start = Number(Array.isArray(chunk.timestamp) ? chunk.timestamp[0] : 0);
                const end = Number(Array.isArray(chunk.timestamp) ? (chunk.timestamp[1] || start + 2) : start + 2);

                if (text === "[Music]" && lastCleanText === "[Music]") {
                    continue;
                }

                cleanCues.push({
                    start: Math.round(start * 100) / 100,
                    end: Math.round(end * 100) / 100,
                    text: text,
                });
                lastCleanText = text;
            }

            return cleanCues.filter((c) => c.text.length > 0);
        }

        if (output && output.text) {
            return [{
                start: 0,
                end: 5,
                text: output.text.trim(),
            }];
        }

        return null;
    } catch (err) {
        console.warn("[CaptionService] ⚠️ Local Whisper transcription error:", err.message);
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

        // 1. Extract 16kHz mono audio
        console.log(`[CaptionService] 🔊 Extracting 16kHz audio to ${tempWavPath}...`);
        await extractAudioForStt(absoluteVideoPath, tempWavPath);

        // 2. Perform STT (Groq Cloud API if configured, otherwise local Whisper)
        let cues = await transcribeWithGroq(tempWavPath);
        if (!cues || cues.length === 0) {
            cues = await transcribeWithLocalWhisper(tempWavPath);
        }

        // Clean up temp WAV file
        if (fs.existsSync(tempWavPath)) {
            fs.unlinkSync(tempWavPath);
        }

        // If no speech detected or empty audio, provide a default friendly cue
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
