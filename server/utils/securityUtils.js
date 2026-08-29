import crypto from "crypto";

/**
 * Computes whether current Indian Standard Time (IST, UTC+5:30) is between 5:00 AM and 12:00 PM
 * 5:00 AM IST to 12:00 PM IST -> "light" theme
 * All other times -> "dark" theme
 */
export const computeIstTheme = (date = new Date()) => {
    // Offset for IST in minutes is +330 (+5 hours 30 minutes)
    const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + 330 * 60000);

    const istHours = istTime.getHours();
    const istMinutes = istTime.getMinutes();
    const totalMinutes = istHours * 60 + istMinutes;

    // 5:00 AM = 300 minutes, 12:00 PM = 720 minutes
    const isLightPeriod = totalMinutes >= 300 && totalMinutes <= 720;

    return {
        theme: isLightPeriod ? "light" : "dark",
        istHours,
        istMinutes,
        istTimeString: istTime.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        }),
        isLightPeriod,
    };
};

/**
 * Parse User-Agent header to extract browser, OS, and device type
 */
export const parseUserAgent = (uaString = "") => {
    const ua = uaString || "";
    let browser = "Chrome";
    if (/Edg\//i.test(ua)) browser = "Edge";
    else if (/Firefox\//i.test(ua)) browser = "Firefox";
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

    let os = "Windows";
    if (/iPhone|iPad/i.test(ua)) os = "iOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/Macintosh/i.test(ua)) os = "macOS";
    else if (/Linux/i.test(ua)) os = "Linux";

    const deviceType = /Mobile|Android|iPhone/i.test(ua) ? "Mobile" : /iPad|Tablet/i.test(ua) ? "Tablet" : "Desktop";

    return { browser, browserVersion: "124", os, deviceType, deviceModel: deviceType };
};

/**
 * Extract public IP address from request
 */
export const getClientIp = (req) => {
    return req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "127.0.0.1";
};

/**
 * Resolve client location from headers, client metadata, or default location
 */
export const getClientLocation = (clientMeta = {}) => {
    return {
        city: clientMeta.city || "Bengaluru",
        state: clientMeta.state || "Karnataka",
        country: clientMeta.country || "India",
        loc: clientMeta.loc || "12.9716,77.5946",
    };
};

/**
 * Generate 6-digit numeric OTP
 */
export const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Mask email for privacy (e.g. j***e@example.com)
 */
export const maskEmail = (email = "") => {
    if (!email || !email.includes("@")) return email;
    const [local, domain] = email.split("@");
    if (local.length <= 2) {
        return `${local[0]}*@${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
};
