import express from "express";
import { UploadVideo, getallvideo } from "../controller/videocontroller.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.single("file"), UploadVideo);
routes.get("/getall", getallvideo);
export default routes;