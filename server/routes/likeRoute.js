import express from "express";
import { handlelike, getallLikedVideo, deleteLikedItem } from "../controller/likeController.js";

const routes = express.Router();

routes.get("/:userId", getallLikedVideo);
routes.post("/:videoId", handlelike);
routes.post("/", handlelike);
routes.delete("/:id", deleteLikedItem);

export default routes;