import {
    login,
    verifyLoginOtp,
    resendLoginOtp,
    getSecurityInfo,
    revokeTrustedDevice,
    updateThemePreference,
    updateprofile,
    getuserprofile,
    deleteChannel,
} from "../controller/authController.js";
import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

// Core Authentication & OTP Verification
router.post("/login", login);
router.post("/verify-login-otp", verifyLoginOtp);
router.post("/resend-login-otp", resendLoginOtp);

// Security & Session Management (Protected)
router.get("/security/:id", requireAuth, getSecurityInfo);
router.post("/revoke-device", requireAuth, revokeTrustedDevice);
router.post("/theme-preference", requireAuth, updateThemePreference);

// Profile & Channel Management (Protected)
router.post("/update/:id", requireAuth, updateprofile);
router.patch("/update/:id", requireAuth, updateprofile);
router.delete("/channel/:id", requireAuth, deleteChannel);
router.delete("/delete-channel/:id", requireAuth, deleteChannel);
router.get("/profile/:id", getuserprofile);
router.get("/:id", getuserprofile);

export default router;