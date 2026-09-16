import express from "express";
import {
    UploadVideo,
    getallvideo,
    deleteVideo,
    getPlaybackInfo,
    streamVideoAuthorized,
    recordWatchHeartbeat,
    getHlsMasterPlaylist,
    serveHlsStreamOrSegment,
} from "../controller/videoController.js";
import {
    getCaptionsByVideoId,
    serveCaptionVtt,
    triggerCaptionGeneration,
    uploadCustomCaption,
    deleteCaption,
} from "../controller/captionController.js";
import {
    handleVoiceTranscribe,
    voiceAudioUpload,
} from "../controller/voiceSearchController.js";
import upload from "../filehelper/filehelper.js";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware.js";

const routes = express.Router();

routes.post("/upload", requireAuth, upload.any(), UploadVideo);
routes.get("/getall", getallvideo);
routes.get("/playback-info/:id", optionalAuth, getPlaybackInfo);
routes.get("/hls/:id/master.m3u8", optionalAuth, getHlsMasterPlaylist);
routes.get("/hls/:id/:file", optionalAuth, serveHlsStreamOrSegment);
routes.get("/stream/:id", optionalAuth, streamVideoAuthorized);
routes.post("/heartbeat", optionalAuth, recordWatchHeartbeat);
routes.delete("/:id", requireAuth, deleteVideo);
routes.delete("/delete/:id", requireAuth, deleteVideo);

// Voice Search Transcription Endpoint
routes.post("/voice-transcribe", voiceAudioUpload.single("audio"), handleVoiceTranscribe);

// Video Captions / Subtitles Endpoints
routes.get("/captions/:id", getCaptionsByVideoId);
routes.get("/captions/:id/vtt", serveCaptionVtt);
routes.post("/captions/generate/:id", requireAuth, triggerCaptionGeneration);
routes.post("/captions/upload/:id", requireAuth, upload.any(), uploadCustomCaption);
routes.delete("/captions/:id", requireAuth, deleteCaption);

export default routes;