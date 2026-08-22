import { login, updateprofile } from "../controller/authcontroller.js";
import { Router } from "express";

const router = Router();

router.post("/login", login);
router.post("/update/:id", updateprofile);
router.patch("/update/:id", updateprofile);

export default router;