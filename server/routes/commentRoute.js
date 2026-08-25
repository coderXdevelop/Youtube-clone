import express from "express";
import {
    getallcomment,
    postcomment,
    editcomment,
    deletecomment,
    likecomment,
    dislikecomment,
    reportcomment,
    translatecomment,
    getcommenthistory,
    generateCaptcha,
    getSupportedLanguages,
    getadminflaggedcomments,
    reviewcomment,
} from "../controller/commentController.js";

const routes = express.Router();

// Public / User Comment Routes
routes.get("/languages", getSupportedLanguages);
routes.get("/captcha/generate", generateCaptcha);
routes.get("/history/:id", getcommenthistory);
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.post("/editcomment/:id", editcomment);
routes.delete("/deletecomment/:id", deletecomment);

// Reactions & Actions
routes.post("/like/:id", likecomment);
routes.post("/dislike/:id", dislikecomment);
routes.post("/report/:id", reportcomment);
routes.post("/translate/:id", translatecomment);

// Admin Moderation Routes
routes.get("/admin/flagged", getadminflaggedcomments);
routes.post("/admin/review/:id", reviewcomment);

export default routes;