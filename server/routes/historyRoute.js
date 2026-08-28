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

const routes = express.Router();

// Specific routes first
routes.post("/progress/:videoId", updateWatchProgress);
routes.get("/progress/:userId/:videoId", getWatchProgress);
routes.post("/views/:videoId", handleview);
routes.delete("/clear/:userId", clearHistory);

// Dynamic routes
routes.get("/:userId", getallhistoryVideo);
routes.post("/:videoId", handlehistory);
routes.delete("/:id", deleteHistoryItem);

export default routes;