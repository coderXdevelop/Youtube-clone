import express from "express";
import {
    checkDownloadQuota,
    requestDownload,
    downloadVideoFile,
    getUserDownloads,
    deleteDownloadRecord,
} from "../controller/downloadController.js";

const router = express.Router();

router.get("/quota/:userId", checkDownloadQuota);
router.post("/request", requestDownload);
router.get("/file/:videoId", downloadVideoFile);
router.get("/history/:userId", getUserDownloads);
router.delete("/:recordId", deleteDownloadRecord);

export default router;
