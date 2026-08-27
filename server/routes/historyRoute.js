import express from "express";
import {
    getallhistoryVideo,
    handlehistory,
    handleview,
    clearHistory,
    deleteHistoryItem,
} from "../controller/historyController.js";

const routes = express.Router();

routes.get("/:userId", getallhistoryVideo);
routes.post("/views/:videoId", handleview);
routes.post("/:videoId", handlehistory);
routes.delete("/clear/:userId", clearHistory);
routes.delete("/:id", deleteHistoryItem);

export default routes;