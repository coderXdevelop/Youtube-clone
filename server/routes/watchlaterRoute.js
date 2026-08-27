import express from "express";
import {
    getallwatchlater,
    handlewatchlater,
    deleteWatchLaterItem,
    clearWatchLater,
} from "../controller/watchlaterController.js";

const routes = express.Router();

routes.get("/:userId", getallwatchlater);
routes.post("/:videoId", handlewatchlater);
routes.delete("/clear/:userId", clearWatchLater);
routes.delete("/:id", deleteWatchLaterItem);

export default routes;