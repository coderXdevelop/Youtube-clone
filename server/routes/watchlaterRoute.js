import express from "express";
import {
    getallwatchlater,
    handlewatchlater,
    deleteWatchLaterItem,
    clearWatchLater,
} from "../controller/watchlaterController.js";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware.js";

const routes = express.Router();

routes.get("/:userId", optionalAuth, getallwatchlater);
routes.post("/:videoId", requireAuth, handlewatchlater);
routes.delete("/clear/:userId", requireAuth, clearWatchLater);
routes.delete("/:id", requireAuth, deleteWatchLaterItem);

export default routes;