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

export default routes;