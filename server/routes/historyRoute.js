import express from "express";
import {
    getallhistoryVideo,
    handlehistory,
    handleview,
    clearHistory,
    deleteHistoryItem,
    updateWatchProgress,
    getWatchProgress,
} from "../controller/historyController.js";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware.js";

const routes = express.Router();

// Specific routes first
routes.post("/progress/:videoId", optionalAuth, updateWatchProgress);
routes.get("/progress/:userId/:videoId", optionalAuth, getWatchProgress);
routes.post("/views/:videoId", handleview);
routes.delete("/clear/:userId", requireAuth, clearHistory);

// Dynamic routes
routes.get("/:userId", optionalAuth, getallhistoryVideo);
routes.post("/:videoId", optionalAuth, handlehistory);
routes.delete("/:id", requireAuth, deleteHistoryItem);

export default routes;