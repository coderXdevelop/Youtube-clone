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
 * Parse User-Agent header to extract browser, OS, device type, and exact browser version
 */
export const parseUserAgent = (uaString = "") => {
    const ua = uaString || "";

    // 1. Browser Detection & Exact Version Extraction
    let browser = "Chrome";
    let browserVersion = "";

    if (/Edg\//i.test(ua)) {
        browser = "Edge";
        const match = ua.match(/Edg\/([0-9.]+)/i);
        if (match) browserVersion = match[1];
    } else if (/OPR\//i.test(ua) || /Opera\//i.test(ua)) {
        browser = "Opera";
        const match = ua.match(/(?:OPR|Opera)\/([0-9.]+)/i);
        if (match) browserVersion = match[1];
    } else if (/Firefox\//i.test(ua)) {
        browser = "Firefox";
        const match = ua.match(/Firefox\/([0-9.]+)/i);
        if (match) browserVersion = match[1];
    } else if (/Chrome\//i.test(ua) || /CriOS\//i.test(ua)) {
        browser = "Chrome";
        const match = ua.match(/(?:Chrome|CriOS)\/([0-9.]+)/i);
        if (match) browserVersion = match[1];
    } else if (/Safari\//i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
        browser = "Safari";
        const match = ua.match(/Version\/([0-9.]+)/i);
        if (match) browserVersion = match[1];
    }

    // 2. OS Detection
    let os = "Windows";
    if (/iPhone/i.test(ua)) os = "iOS";
    else if (/iPad/i.test(ua)) os = "iPadOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
    else if (/Linux/i.test(ua)) os = "Linux";

    // 3. Device Type & Model Detection
    const deviceType = /Mobile|Android.*Mobile|iPhone/i.test(ua)
        ? "Mobile"
        : /iPad|Tablet|Android(?!.*Mobile)/i.test(ua)
        ? "Tablet"
        : "Desktop";

    let deviceModel = deviceType;
    if (/iPhone/i.test(ua)) deviceModel = "Apple iPhone";
    else if (/iPad/i.test(ua)) deviceModel = "Apple iPad";
    else if (/Pixel/i.test(ua)) {
        const match = ua.match(/Pixel\s?[\w\d\s]+/i);
        deviceModel = match ? match[0] : "Google Pixel";
    }

    return {
        browser,
        browserVersion: browserVersion || "124",
        os,
        deviceType,
        deviceModel,
    };
};

/**
 * Extract public IP address from request, handling proxy headers and IPv6-mapped IPv4 strings
 */
export const getClientIp = (req = {}) => {
    let rawIp = "";

    const forwarded = req?.headers?.["x-forwarded-for"];
    const realIp = req?.headers?.["x-real-ip"];

    if (forwarded) {
        rawIp = String(forwarded).split(",")[0].trim();
    } else if (realIp) {
        rawIp = String(realIp).trim();
    } else if (req?.ip) {
        rawIp = String(req.ip);
    } else if (req?.socket?.remoteAddress) {
        rawIp = String(req.socket.remoteAddress);
    }

    // Sanitize IPv6-mapped IPv4 address (e.g. ::ffff:127.0.0.1 -> 127.0.0.1)
    if (rawIp.startsWith("::ffff:")) {
        rawIp = rawIp.replace("::ffff:", "");
    }

    // Normalize IPv6 loopback
    if (rawIp === "::1") {
        rawIp = "127.0.0.1";
    }

    return rawIp || "127.0.0.1";
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
