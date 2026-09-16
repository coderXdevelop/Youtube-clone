import express from "express";
import { handlelike, getallLikedVideo, deleteLikedItem } from "../controller/likeController.js";
import { requireAuth, optionalAuth } from "../middleware/authMiddleware.js";

const routes = express.Router();

routes.get("/:userId", optionalAuth, getallLikedVideo);
routes.post("/:videoId", requireAuth, handlelike);
routes.post("/", requireAuth, handlelike);
routes.delete("/:id", requireAuth, deleteLikedItem);

export default routes;