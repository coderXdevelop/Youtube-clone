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

import { requireAuth, optionalAuth, requireAdmin } from "../middleware/authMiddleware.js";

const routes = express.Router();

// Public / User Comment Routes
routes.get("/languages", getSupportedLanguages);
routes.get("/captcha/generate", generateCaptcha);
routes.get("/history/:id", getcommenthistory);
routes.get("/:videoid", optionalAuth, getallcomment);
routes.post("/postcomment", requireAuth, postcomment);
routes.post("/editcomment/:id", requireAuth, editcomment);
routes.delete("/deletecomment/:id", requireAuth, deletecomment);

// Reactions & Actions
routes.post("/like/:id", requireAuth, likecomment);
routes.post("/dislike/:id", requireAuth, dislikecomment);
routes.post("/report/:id", requireAuth, reportcomment);
routes.post("/translate/:id", translatecomment);

// Admin Moderation Routes (Protected by Authentication + Admin Role)
routes.get("/admin/flagged", requireAuth, requireAdmin, getadminflaggedcomments);
routes.post("/admin/review/:id", requireAuth, requireAdmin, reviewcomment);

export default routes;