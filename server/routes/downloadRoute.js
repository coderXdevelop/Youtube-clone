import express from "express";
import {
    checkDownloadQuota,
    requestDownload,
    downloadVideoFile,
    getUserDownloads,
    deleteDownloadRecord,
} from "../controller/downloadController.js";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/quota/:userId", requireAuth, checkDownloadQuota);
router.post("/request", requireAuth, requestDownload);
router.get("/file/:videoId", optionalAuth, downloadVideoFile);
router.get("/history/:userId", requireAuth, getUserDownloads);
router.delete("/:recordId", requireAuth, deleteDownloadRecord);

export default router;
