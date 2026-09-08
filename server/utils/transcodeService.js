import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import video from "../model/video.js";

// Configure FFmpeg binary path
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

export const HLS_QUALITY_PROFILES = [
    { quality: "360p", width: 640, height: 360, bitrate: "400k", maxrate: "450k", bufsize: "800k", bandwidth: 400000 },
    { quality: "480p", width: 854, height: 480, bitrate: "800k", maxrate: "900k", bufsize: "1600k", bandwidth: 800000 },
    { quality: "720p", width: 1280, height: 720, bitrate: "1500k", maxrate: "1700k", bufsize: "3000k", bandwidth: 1500000 },
    { quality: "1080p", width: 1920, height: 1080, bitrate: "3000k", maxrate: "3300k", bufsize: "6000k", bandwidth: 3000000 },
    { quality: "1440p", width: 2560, height: 1440, bitrate: "6000k", maxrate: "6600k", bufsize: "12000k", bandwidth: 6000000 },
    { quality: "4k", width: 3840, height: 2160, bitrate: "12000k", maxrate: "13000k", bufsize: "24000k", bandwidth: 12000000 },
];

/**
 * Transcodes a single HLS variant stream with perfectly aligned segments
 */
const transcodeHlsVariant = (inputPath, outputM3u8Path, segmentPattern, profile) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .audioBitrate("128k")
            .size(`${profile.width}x${profile.height}`)
            .videoBitrate(profile.bitrate)
            .outputOptions([
                "-preset ultrafast", // Fast CPU encoding
                "-g 48", // Fixed GOP size of 48 frames for exact segment time alignment
                "-keyint_min 48",
                "-sc_threshold 0", // Disable scene change detection so I-frames match across all resolutions
                "-pix_fmt yuv420p",
                `-maxrate ${profile.maxrate}`,
                `-bufsize ${profile.bufsize}`,
                "-hls_time 4", // 4-second time-aligned segments
                "-hls_playlist_type vod",
                `-hls_segment_filename ${segmentPattern}`,
            ])
            .output(outputM3u8Path)
            .on("end", () => {
                console.log(`[HLS] ✅ Generated ${profile.quality} variant stream.`);
                resolve(profile);
            })
            .on("error", (err) => {
                console.warn(`[HLS] ⚠️ Failed ${profile.quality} variant:`, err.message);
                reject(err);
            })
            .run();
    });
};

/**
 * Writes the Master HLS Playlist (master.m3u8) linking all available quality variants
 */
export const writeMasterPlaylist = (hlsDir, successfulProfiles) => {
    let masterContent = "#EXTM3U\n#EXT-X-VERSION:3\n";
    for (const p of successfulProfiles) {
        masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${p.bandwidth},RESOLUTION=${p.width}x${p.height},NAME="${p.quality}"\n`;
        masterContent += `stream_${p.quality}.m3u8\n`;
    }
    const masterPath = path.join(hlsDir, "master.m3u8");
    fs.writeFileSync(masterPath, masterContent, "utf8");
    return masterPath;
};

/**
 * Generates time-aligned multi-quality HLS streams (360p, 480p, 720p, 1080p, 1440p, 4k)
 * and updates the video document in MongoDB.
 */
export const transcodeVideoFile = async (inputFilePath, videoId) => {
    try {
        const absoluteInput = path.resolve(inputFilePath.replace(/^\/+/, ""));
        if (!fs.existsSync(absoluteInput)) {
            console.warn(`[HLS] Input file not found: ${absoluteInput}`);
            return [];
        }

        // Create dedicated HLS directory: uploads/hls/<videoId>/
        const hlsDir = path.resolve(path.join("uploads", "hls", String(videoId)));
        if (!fs.existsSync(hlsDir)) {
            fs.mkdirSync(hlsDir, { recursive: true });
        }

        if (videoId) {
            await video.findByIdAndUpdate(videoId, {
                $set: {
                    hlspath: `uploads/hls/${videoId}`,
                    hlsstatus: "processing",
                },
            });
        }

        console.log(`[HLS] Starting multi-quality HLS transcoding for video ID: ${videoId}...`);
        const successfulProfiles = [];

        for (const profile of HLS_QUALITY_PROFILES) {
            const m3u8Path = path.join(hlsDir, `stream_${profile.quality}.m3u8`);
            const segmentPattern = path.join(hlsDir, `stream_${profile.quality}_%03d.ts`);

            try {
                const res = await transcodeHlsVariant(absoluteInput, m3u8Path, segmentPattern, profile);
                successfulProfiles.push(res);
            } catch (err) {
                console.warn(`[HLS] Skipping ${profile.quality} due to error:`, err.message);
            }
        }

        if (successfulProfiles.length > 0) {
            writeMasterPlaylist(hlsDir, successfulProfiles);

            const availableQualities = successfulProfiles.map((p) => p.quality);
            const qualityvariants = successfulProfiles.map((p) => ({
                quality: p.quality,
                filepath: `uploads/hls/${videoId}/stream_${p.quality}.m3u8`,
                filesize: "0",
                resolution: `${p.width}x${p.height}`,
            }));

            if (videoId) {
                await video.findByIdAndUpdate(videoId, {
                    $set: {
                        hlsstatus: "completed",
                        availablequalities: availableQualities,
                        qualityvariants: qualityvariants,
                    },
                });
                console.log(`[HLS] 🎉 Multi-quality HLS transcoding completed successfully for video ${videoId} with ${availableQualities.join(", ")}!`);
            }
        } else if (videoId) {
            await video.findByIdAndUpdate(videoId, {
                $set: { hlsstatus: "failed" },
            });
        }

        return successfulProfiles;
    } catch (err) {
        console.error(`[HLS] Transcode process error for video ${videoId}:`, err);
        if (videoId) {
            await video.findByIdAndUpdate(videoId, {
                $set: { hlsstatus: "failed" },
            }).catch(() => {});
        }
        return [];
    }
};
