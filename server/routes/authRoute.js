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

const router = Router();

// Core Authentication & OTP Verification
router.post("/login", login);
router.post("/verify-login-otp", verifyLoginOtp);
router.post("/resend-login-otp", resendLoginOtp);

// Security & Session Management
router.get("/security/:id", getSecurityInfo);
router.post("/revoke-device", revokeTrustedDevice);
router.post("/theme-preference", updateThemePreference);

// Profile & Channel Management
router.post("/update/:id", updateprofile);
router.patch("/update/:id", updateprofile);
router.delete("/channel/:id", deleteChannel);
router.delete("/delete-channel/:id", deleteChannel);
router.get("/profile/:id", getuserprofile);
router.get("/:id", getuserprofile);

export default router;