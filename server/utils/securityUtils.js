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
    if (!uaString) {
        return {
            browser: "Chrome",
            browserVersion: "124.0",
            os: "Windows",
            deviceType: "Desktop",
            deviceModel: "PC",
        };
    }

    let browser = "Chrome";
    let browserVersion = "";
    let os = "Windows";
    let deviceType = "Desktop";
    let deviceModel = "";

    // Browser detection
    if (/Edg\/([0-9.]+)/i.test(uaString)) {
        browser = "Edge";
        browserVersion = uaString.match(/Edg\/([0-9.]+)/i)?.[1] || "";
    } else if (/OPR\/([0-9.]+)/i.test(uaString) || /Opera/i.test(uaString)) {
        browser = "Opera";
        browserVersion = uaString.match(/OPR\/([0-9.]+)/i)?.[1] || "";
    } else if (/Firefox\/([0-9.]+)/i.test(uaString)) {
        browser = "Firefox";
        browserVersion = uaString.match(/Firefox\/([0-9.]+)/i)?.[1] || "";
    } else if (/Chrome\/([0-9.]+)/i.test(uaString)) {
        browser = "Chrome";
        browserVersion = uaString.match(/Chrome\/([0-9.]+)/i)?.[1] || "";
    } else if (/Safari\/([0-9.]+)/i.test(uaString) && !/Chrome/i.test(uaString)) {
        browser = "Safari";
        browserVersion = uaString.match(/Version\/([0-9.]+)/i)?.[1] || "";
    }

    // OS detection
    if (/Windows NT 10/i.test(uaString)) {
        os = "Windows 10/11";
    } else if (/Windows/i.test(uaString)) {
        os = "Windows";
    } else if (/iPhone/i.test(uaString)) {
        os = "iOS";
        deviceType = "Mobile";
        deviceModel = "iPhone";
    } else if (/iPad/i.test(uaString)) {
        os = "iPadOS";
        deviceType = "Tablet";
        deviceModel = "iPad";
    } else if (/Android/i.test(uaString)) {
        os = "Android";
        deviceType = /Tablet|Tab/i.test(uaString) ? "Tablet" : "Mobile";
        const modelMatch = uaString.match(/Android[^;]+;\s*([^;)]+)/i);
        if (modelMatch) deviceModel = modelMatch[1].trim();
    } else if (/Macintosh|Mac OS X/i.test(uaString)) {
        os = "macOS";
        deviceType = "Desktop";
        deviceModel = "Mac";
    } else if (/Linux/i.test(uaString)) {
        os = "Linux";
        deviceType = "Desktop";
    }

    return {
        browser,
        browserVersion: browserVersion ? browserVersion.split(".")[0] : "",
        os,
        deviceType,
        deviceModel: deviceModel || deviceType,
    };
};

/**
 * Extract public IP address from request headers
 */
export const getClientIp = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
        const firstIp = forwarded.split(",")[0].trim();
        if (firstIp) return firstIp;
    }
    return (
        req.headers["x-real-ip"] ||
        req.headers["cf-connecting-ip"] ||
        req.socket?.remoteAddress ||
        req.ip ||
        "127.0.0.1"
    );
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
