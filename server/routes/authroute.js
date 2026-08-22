import { login } from "../controller/authcontroller.js";
import { Router } from "express";

const router = Router();

router.post("/login", login);

export default router;