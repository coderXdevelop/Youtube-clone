import mongoose from "mongoose";
import crypto from "crypto";
import User from "../model/user.js";
import LoginHistory from "../model/loginHistory.js";
import LoginOtpChallenge from "../model/loginOtpChallenge.js";
import {
    computeIstTheme,
    parseUserAgent,
    getClientIp,
    getClientLocation,
    generateOtp,
    maskEmail,
} from "../utils/securityUtils.js";
import { sendSecurityOtpEmail } from "../utils/emailService.js";

/**
 * Enhanced Login Controller with:
 * 1. Time-based theme adaptation (5:00 AM - 12:00 PM IST -> Light theme, else Dark)
 * 2. Detailed security login recording (IP, browser, OS, device, location, timestamp)
 * 3. 2FA OTP challenge trigger on new browser, new device, new IP, or different location
 */
export const login = async (req, res) => {
    const { email, name, image, deviceId, clientLocation, userAgent: clientUa } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required." });
    }

    try {
        // 1. Evaluate IST Time & Theme
        const istThemeResult = computeIstTheme();
        const computedTimeTheme = istThemeResult.theme;

        // 2. Parse client metadata & location
        const uaString = clientUa || req.headers["user-agent"] || "";
        const uaMeta = parseUserAgent(uaString);
        const ipAddress = getClientIp(req);
        const locationMeta = getClientLocation(clientLocation || {});
        const effectiveDeviceId =
            deviceId ||
            `dev_${crypto.createHash("md5").update(`${email}_${uaMeta.browser}_${uaMeta.os}_${ipAddress}`).digest("hex").slice(0, 12)}`;

        let existingUser = await User.findOne({ email });

        // If brand new user: create account & auto-register first device
        if (!existingUser) {
            const initialDevice = {
                deviceid: effectiveDeviceId,
                devicename: `${uaMeta.browser} on ${uaMeta.os}`,
                browser: uaMeta.browser,
                browserversion: uaMeta.browserVersion,
                os: uaMeta.os,
                devicetype: uaMeta.deviceType,
                devicemodel: uaMeta.deviceModel,
                ipaddress: ipAddress,
                city: locationMeta.city,
                state: locationMeta.state,
                country: locationMeta.country,
                location: `${locationMeta.city}, ${locationMeta.state}, ${locationMeta.country}`,
                trustedat: new Date(),
                expiresat: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                lastactive: new Date(),
            };

            existingUser = await User.create({
                email,
                name: name || (email.split("@")[0] || "User"),
                image: image || "",
                themepreference: "auto",
                lastlogintheme: computedTimeTheme,
                lastloginat: new Date(),
                registereddevices: [initialDevice],
            });

            // Log successful initial login
            await LoginHistory.create({
                userid: existingUser._id,
                useremail: email,
                ipaddress: ipAddress,
                browser: uaMeta.browser,
                browserversion: uaMeta.browserVersion,
                os: uaMeta.os,
                devicetype: uaMeta.deviceType,
                devicemodel: uaMeta.deviceModel,
                deviceid: effectiveDeviceId,
                city: locationMeta.city,
                state: locationMeta.state,
                country: locationMeta.country,
                loc: locationMeta.loc,
                status: "success",
                autothemeapplied: computedTimeTheme,
                istrusteddevice: true,
                isnewdevice: false,
                isnewlocation: false,
                isnewip: false,
                logintimestamp: new Date(),
            });

            const appliedTheme =
                existingUser.themepreference === "auto"
                    ? computedTimeTheme
                    : existingUser.themepreference || computedTimeTheme;

            return res.status(201).json({
                result: existingUser,
                appliedTheme,
                requiresOtp: false,
                istTime: istThemeResult.istTimeString,
            });
        }

        // Existing user: Check trusted devices and previous login history
        const now = new Date();
        const activeTrustedDevice = existingUser.registereddevices?.find(
            (d) =>
                d.deviceid === effectiveDeviceId &&
                new Date(d.expiresat) > now
        );

        // Check previous successful logins to detect changes
        const previousLogins = await LoginHistory.find({
            userid: existingUser._id,
            status: "success",
        })
            .sort({ logintimestamp: -1 })
            .limit(10)
            .lean();

        let isNewBrowser = false;
        let isNewDevice = false;
        let isNewIp = false;
        let isNewLocation = false;

        if (previousLogins.length > 0) {
            const knownBrowsers = new Set(previousLogins.map((l) => l.browser?.toLowerCase()));
            const knownDeviceIds = new Set(previousLogins.map((l) => l.deviceid));
            const knownIps = new Set(previousLogins.map((l) => l.ipaddress));
            const knownCities = new Set(previousLogins.map((l) => l.city?.toLowerCase()));

            isNewBrowser = !knownBrowsers.has(uaMeta.browser.toLowerCase());
            isNewDevice = !knownDeviceIds.has(effectiveDeviceId) && !activeTrustedDevice;
            isNewIp = !knownIps.has(ipAddress);
            isNewLocation = !knownCities.has(locationMeta.city.toLowerCase());
        }

        const isUnfamiliarLogin =
            !activeTrustedDevice &&
            (isNewBrowser || isNewDevice || isNewIp || isNewLocation || previousLogins.length === 0);

        // If unfamiliar login detected: Trigger OTP Verification challenge
        if (isUnfamiliarLogin) {
            const otpCode = generateOtp();
            const challengeId = `chal_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            const reasons = [];
            if (isNewBrowser) reasons.push(`New browser (${uaMeta.browser})`);
            if (isNewDevice) reasons.push(`New device (${uaMeta.os} ${uaMeta.deviceType})`);
            if (isNewIp) reasons.push(`New IP address (${ipAddress})`);
            if (isNewLocation) reasons.push(`New location (${locationMeta.city}, ${locationMeta.state})`);
            const reasonString = reasons.join(", ") || "Unrecognized login environment";

            const loginMeta = {
                ipaddress: ipAddress,
                browser: uaMeta.browser,
                browserversion: uaMeta.browserVersion,
                os: uaMeta.os,
                devicetype: uaMeta.deviceType,
                devicemodel: uaMeta.deviceModel,
                deviceid: effectiveDeviceId,
                city: locationMeta.city,
                state: locationMeta.state,
                country: locationMeta.country,
                loc: locationMeta.loc,
                computedTimeTheme,
            };

            await LoginOtpChallenge.create({
                challengeid: challengeId,
                userid: existingUser._id,
                useremail: email,
                otp: otpCode,
                reason: reasonString,
                loginmeta: loginMeta,
                expiresat: expiresAt,
            });

            // Record security log for OTP requirement
            await LoginHistory.create({
                userid: existingUser._id,
                useremail: email,
                ipaddress: ipAddress,
                browser: uaMeta.browser,
                browserversion: uaMeta.browserVersion,
                os: uaMeta.os,
                devicetype: uaMeta.deviceType,
                devicemodel: uaMeta.deviceModel,
                deviceid: effectiveDeviceId,
                city: locationMeta.city,
                state: locationMeta.state,
                country: locationMeta.country,
                loc: locationMeta.loc,
                status: "otp_required",
                autothemeapplied: computedTimeTheme,
                istrusteddevice: false,
                isnewdevice: isNewDevice,
                isnewlocation: isNewLocation,
                isnewip: isNewIp,
                failurereason: reasonString,
                logintimestamp: new Date(),
            });

            console.log(`[SECURITY] OTP Challenge generated for ${email}: ${otpCode} (Reason: ${reasonString})`);

            // Dispatch transactional security OTP email via Brevo
            sendSecurityOtpEmail({
                toEmail: email,
                userName: existingUser.name || email.split("@")[0],
                otpCode,
                reason: reasonString,
                deviceInfo: {
                    browser: uaMeta.browser,
                    os: uaMeta.os,
                    deviceType: uaMeta.deviceType,
                    ip: ipAddress,
                    location: `${locationMeta.city}, ${locationMeta.state}, ${locationMeta.country}`,
                },
            }).catch((err) => console.warn("Background OTP email dispatch warning:", err.message));

            return res.status(200).json({
                requiresOtp: true,
                challengeId,
                emailMasked: maskEmail(email),
                reason: reasonString,
                testOtp: otpCode, // Provided for smooth sandbox and development verification
                deviceInfo: {
                    browser: uaMeta.browser,
                    os: uaMeta.os,
                    deviceType: uaMeta.deviceType,
                    ip: ipAddress,
                    location: `${locationMeta.city}, ${locationMeta.state}, ${locationMeta.country}`,
                },
            });
        }

        // Trusted / recognized login: Complete directly
        if (activeTrustedDevice) {
            activeTrustedDevice.lastactive = new Date();
            activeTrustedDevice.ipaddress = ipAddress;
            await existingUser.save();
        }

        const appliedTheme =
            existingUser.themepreference === "auto"
                ? computedTimeTheme
                : existingUser.themepreference || computedTimeTheme;

        existingUser.lastloginat = new Date();
        existingUser.lastlogintheme = appliedTheme;
        await existingUser.save();

        // Record successful login
        await LoginHistory.create({
            userid: existingUser._id,
            useremail: email,
            ipaddress: ipAddress,
            browser: uaMeta.browser,
            browserversion: uaMeta.browserVersion,
            os: uaMeta.os,
            devicetype: uaMeta.deviceType,
            devicemodel: uaMeta.deviceModel,
            deviceid: effectiveDeviceId,
            city: locationMeta.city,
            state: locationMeta.state,
            country: locationMeta.country,
            loc: locationMeta.loc,
            status: "success",
            autothemeapplied: appliedTheme,
            istrusteddevice: Boolean(activeTrustedDevice),
            isnewdevice: false,
            isnewlocation: false,
            isnewip: false,
            logintimestamp: new Date(),
        });

        return res.status(200).json({
            result: existingUser,
            appliedTheme,
            requiresOtp: false,
            istTime: istThemeResult.istTimeString,
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Something went wrong during login." });
    }
};

/**
 * Verify 2FA OTP for new device/browser/IP/location login
 * POST /api/user/verify-login-otp
 */
export const verifyLoginOtp = async (req, res) => {
    const { challengeId, otp, trustDevice = true, trustDays = 30 } = req.body;

    if (!challengeId || !otp) {
        return res.status(400).json({ message: "Challenge ID and OTP are required." });
    }

    try {
        const challenge = await LoginOtpChallenge.findOne({ challengeid: challengeId });

        if (!challenge) {
            return res.status(400).json({ message: "OTP challenge expired or not found. Please try logging in again." });
        }

        if (new Date() > new Date(challenge.expiresat)) {
            return res.status(400).json({ message: "OTP has expired. Please request a new code." });
        }

        if (challenge.attempts >= challenge.maxattempts) {
            return res.status(400).json({ message: "Too many incorrect attempts. Please initiate a new login." });
        }

        // Validate OTP string
        if (challenge.otp.trim() !== String(otp).trim()) {
            challenge.attempts += 1;
            await challenge.save();

            // Record failed attempt
            await LoginHistory.create({
                userid: challenge.userid,
                useremail: challenge.useremail,
                ipaddress: challenge.loginmeta?.ipaddress || "127.0.0.1",
                browser: challenge.loginmeta?.browser || "Unknown",
                browserversion: challenge.loginmeta?.browserversion || "",
                os: challenge.loginmeta?.os || "Unknown",
                devicetype: challenge.loginmeta?.devicetype || "Desktop",
                devicemodel: challenge.loginmeta?.devicemodel || "",
                deviceid: challenge.loginmeta?.deviceid || "",
                city: challenge.loginmeta?.city || "",
                state: challenge.loginmeta?.state || "",
                country: challenge.loginmeta?.country || "",
                loc: challenge.loginmeta?.loc || "",
                status: "otp_failed",
                failurereason: "Invalid OTP code entered",
                logintimestamp: new Date(),
            });

            return res.status(400).json({
                message: `Incorrect OTP. ${challenge.maxattempts - challenge.attempts} attempt(s) remaining.`,
            });
        }

        // OTP is valid!
        challenge.verified = true;
        await challenge.save();

        const userDoc = await User.findById(challenge.userid);
        if (!userDoc) {
            return res.status(404).json({ message: "User account not found." });
        }

        const meta = challenge.loginmeta || {};
        const istThemeResult = computeIstTheme();
        const computedTimeTheme = istThemeResult.theme;

        // If user chose to trust this device: add to registereddevices
        if (trustDevice && meta.deviceid) {
            const expiresDate = new Date(Date.now() + Number(trustDays) * 24 * 60 * 60 * 1000);
            const existingIdx = userDoc.registereddevices?.findIndex((d) => d.deviceid === meta.deviceid);

            const deviceObj = {
                deviceid: meta.deviceid,
                devicename: `${meta.browser || "Browser"} on ${meta.os || "Device"}`,
                browser: meta.browser || "Chrome",
                browserversion: meta.browserversion || "",
                os: meta.os || "Windows",
                devicetype: meta.devicetype || "Desktop",
                devicemodel: meta.devicemodel || "",
                ipaddress: meta.ipaddress || "",
                city: meta.city || "",
                state: meta.state || "",
                country: meta.country || "",
                location: `${meta.city || ""}, ${meta.state || ""}, ${meta.country || ""}`.replace(/^, |, $/g, ""),
                trustedat: new Date(),
                expiresat: expiresDate,
                lastactive: new Date(),
            };

            if (existingIdx >= 0) {
                userDoc.registereddevices[existingIdx] = deviceObj;
            } else {
                userDoc.registereddevices.push(deviceObj);
            }
        }

        const appliedTheme =
            userDoc.themepreference === "auto"
                ? computedTimeTheme
                : userDoc.themepreference || computedTimeTheme;

        userDoc.lastloginat = new Date();
        userDoc.lastlogintheme = appliedTheme;
        await userDoc.save();

        // Record successful verified login in audit history
        await LoginHistory.create({
            userid: userDoc._id,
            useremail: userDoc.email,
            ipaddress: meta.ipaddress || "127.0.0.1",
            browser: meta.browser || "Chrome",
            browserversion: meta.browserversion || "",
            os: meta.os || "Windows",
            devicetype: meta.devicetype || "Desktop",
            devicemodel: meta.devicemodel || "",
            deviceid: meta.deviceid || "",
            city: meta.city || "",
            state: meta.state || "",
            country: meta.country || "",
            loc: meta.loc || "",
            status: "success",
            autothemeapplied: appliedTheme,
            istrusteddevice: Boolean(trustDevice),
            logintimestamp: new Date(),
        });

        // Remove challenge after successful use
        await LoginOtpChallenge.deleteOne({ challengeid: challengeId });

        return res.status(200).json({
            success: true,
            message: "Device successfully verified and trusted.",
            result: userDoc,
            appliedTheme,
            istTime: istThemeResult.istTimeString,
        });
    } catch (error) {
        console.error("verifyLoginOtp error:", error);
        return res.status(500).json({ message: "Failed to verify OTP." });
    }
};

/**
 * Resend OTP for active challenge
 * POST /api/user/resend-login-otp
 */
export const resendLoginOtp = async (req, res) => {
    const { challengeId } = req.body;

    if (!challengeId) {
        return res.status(400).json({ message: "Challenge ID is required." });
    }

    try {
        const challenge = await LoginOtpChallenge.findOne({ challengeid: challengeId });
        if (!challenge) {
            return res.status(404).json({ message: "Challenge expired or not found." });
        }

        const newOtp = generateOtp();
        challenge.otp = newOtp;
        challenge.attempts = 0;
        challenge.expiresat = new Date(Date.now() + 10 * 60 * 1000);
        await challenge.save();

        console.log(`[SECURITY] Resent OTP for ${challenge.useremail}: ${newOtp}`);

        return res.status(200).json({
            success: true,
            message: "A fresh verification code has been generated.",
            testOtp: newOtp,
        });
    } catch (error) {
        console.error("resendLoginOtp error:", error);
        return res.status(500).json({ message: "Failed to resend OTP." });
    }
};

/**
 * Fetch Account Security Overview & History
 * GET /api/user/security/:id
 */
export const getSecurityInfo = async (req, res) => {
    const { id: _id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(400).json({ message: "Invalid user ID." });
    }

    try {
        const userDoc = await User.findById(_id).select("-__v");
        if (!userDoc) {
            return res.status(404).json({ message: "User not found." });
        }

        const loginRecords = await LoginHistory.find({ userid: _id })
            .sort({ logintimestamp: -1 })
            .limit(30)
            .lean();

        const istThemeResult = computeIstTheme();

        return res.status(200).json({
            success: true,
            user: {
                _id: userDoc._id,
                email: userDoc.email,
                name: userDoc.name,
                themepreference: userDoc.themepreference || "auto",
                lastlogintheme: userDoc.lastlogintheme || "dark",
                lastloginat: userDoc.lastloginat,
                currentIstTime: istThemeResult.istTimeString,
                currentComputedTheme: istThemeResult.theme,
            },
            trustedDevices: userDoc.registereddevices || [],
            loginHistory: loginRecords,
        });
    } catch (error) {
        console.error("getSecurityInfo error:", error);
        return res.status(500).json({ message: "Failed to fetch security info." });
    }
};

/**
 * Revoke a trusted device
 * POST /api/user/revoke-device
 */
export const revokeTrustedDevice = async (req, res) => {
    const { userId, deviceId } = req.body;

    if (!userId || !deviceId) {
        return res.status(400).json({ message: "User ID and Device ID are required." });
    }

    try {
        const userDoc = await User.findById(userId);
        if (!userDoc) {
            return res.status(404).json({ message: "User not found." });
        }

        userDoc.registereddevices = userDoc.registereddevices.filter((d) => d.deviceid !== deviceId);
        await userDoc.save();

        return res.status(200).json({
            success: true,
            message: "Trusted device revoked successfully.",
            trustedDevices: userDoc.registereddevices,
        });
    } catch (error) {
        console.error("revokeTrustedDevice error:", error);
        return res.status(500).json({ message: "Failed to revoke device." });
    }
};

/**
 * Update user's theme preference ("auto" | "light" | "dark")
 * POST /api/user/theme-preference
 */
export const updateThemePreference = async (req, res) => {
    const { userId, themePreference } = req.body;

    if (!userId || !["auto", "light", "dark"].includes(themePreference)) {
        return res.status(400).json({ message: "Valid userId and themePreference (auto, light, dark) are required." });
    }

    try {
        const userDoc = await User.findByIdAndUpdate(
            userId,
            { $set: { themepreference: themePreference } },
            { new: true }
        );

        if (!userDoc) {
            return res.status(404).json({ message: "User not found." });
        }

        const istThemeResult = computeIstTheme();
        const effectiveTheme =
            themePreference === "auto"
                ? istThemeResult.theme
                : themePreference;

        return res.status(200).json({
            success: true,
            themePreference: userDoc.themepreference,
            effectiveTheme,
            message: "Theme preference updated successfully.",
        });
    } catch (error) {
        console.error("updateThemePreference error:", error);
        return res.status(500).json({ message: "Failed to update theme preference." });
    }
};

export const updateprofile = async (req, res) => {
    const { id: _id } = req.params;
    const { channelname, description } = req.body;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(500).json({ message: "User unavailable..." });
    }
    try {
        const updatedata = await User.findByIdAndUpdate(
            _id,
            {
                $set: {
                    channelname: channelname,
                    discription: description,
                },
            },
            { new: true }
        );
        return res.status(201).json(updatedata);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const getuserprofile = async (req, res) => {
    const { id: _id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(404).json({ message: "Invalid user ID" });
    }
    try {
        const userDoc = await User.findById(_id).select("-__v");
        if (!userDoc) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json(userDoc);
    } catch (error) {
        console.error("getuserprofile error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};