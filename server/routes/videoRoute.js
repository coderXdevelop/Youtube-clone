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
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.any(), UploadVideo);
routes.get("/getall", getallvideo);
routes.get("/playback-info/:id", getPlaybackInfo);
routes.get("/hls/:id/master.m3u8", getHlsMasterPlaylist);
routes.get("/hls/:id/:file", serveHlsStreamOrSegment);
routes.get("/stream/:id", streamVideoAuthorized);
routes.post("/heartbeat", recordWatchHeartbeat);
routes.delete("/:id", deleteVideo);
routes.delete("/delete/:id", deleteVideo);

// Video Captions / Subtitles Endpoints
routes.get("/captions/:id", getCaptionsByVideoId);
routes.get("/captions/:id/vtt", serveCaptionVtt);
routes.post("/captions/generate/:id", triggerCaptionGeneration);
routes.post("/captions/upload/:id", upload.any(), uploadCustomCaption);
routes.delete("/captions/:id", deleteCaption);

export default routes;