import express from "express";
import { UploadVideo, getallvideo, deleteVideo } from "../controller/videoController.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.any(), UploadVideo);
routes.get("/getall", getallvideo);
routes.delete("/:id", deleteVideo);
routes.delete("/delete/:id", deleteVideo);

export default routes;