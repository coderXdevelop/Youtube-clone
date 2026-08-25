import { login, updateprofile, getuserprofile } from "../controller/authController.js";
import { Router } from "express";

const router = Router();

router.post("/login", login);
router.post("/update/:id", updateprofile);
router.patch("/update/:id", updateprofile);
router.get("/profile/:id", getuserprofile);
router.get("/:id", getuserprofile);

export default router;