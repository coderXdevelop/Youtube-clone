/**
 * Subscription Authentication and Plan Restriction Engine
 * Single source of truth for backend plan authorizations, video quality validation,
 * premium content access, and watch-time limits.
 */

export const QUALITY_RANKS = {
    "360p": 1,
    "480p": 2,
    "720p": 3,
    "1080p": 4,
    "1440p": 5,
    "2k": 5,
    "4k": 6,
    "2160p": 6,
};

export const PLAN_CONFIG = {
    Free: {
        plan: "Free",
        maxQuality: "720p",
        maxQualityRank: 3,
        dailyWatchLimitSeconds: 3600, // 60 minutes daily limit for free tier
        allowAdFree: false,
        allowCourses: false,
        allowVip: false,
        rank: 0,
    },
    Bronze: {
        plan: "Bronze",
        maxQuality: "1080p",
        maxQualityRank: 4,
        dailyWatchLimitSeconds: null, // Unlimited
        allowAdFree: true,
        allowCourses: false,
        allowVip: false,
        rank: 1,
    },
    Silver: {
        plan: "Silver",
        maxQuality: "1440p",
        maxQualityRank: 5,
        dailyWatchLimitSeconds: null, // Unlimited
        allowAdFree: true,
        allowCourses: true,
        allowVip: false,
        rank: 2,
    },
    Gold: {
        plan: "Gold",
        maxQuality: "4k",
        maxQualityRank: 6,
        dailyWatchLimitSeconds: null, // Unlimited
        allowAdFree: true,
        allowCourses: true,
        allowVip: true,
        rank: 3,
    },
};

const ACCESS_LEVEL_RANKS = {
    free: 0,
    bronze: 1,
    silver: 2,
    gold: 3,
};

/**
 * Normalizes quality string into standard format (e.g. "Auto (1080p)" -> "1080p")
 */
export const normalizeQuality = (qualityStr = "") => {
    if (!qualityStr) return "720p";
    const lower = qualityStr.toLowerCase().trim();

    if (lower.includes("4k") || lower.includes("2160")) return "4k";
    if (lower.includes("1440") || lower.includes("2k")) return "1440p";
    if (lower.includes("1080")) return "1080p";
    if (lower.includes("720")) return "720p";
    if (lower.includes("480")) return "480p";
    if (lower.includes("360")) return "360p";

    return "720p";
};

/**
 * Inspects a user document and calculates their active plan, handling expiration
 */
export const getActiveUserPlanInfo = (userDoc) => {
    if (!userDoc) {
        return {
            plan: "Free",
            isExpired: false,
            expiresAt: null,
            ...PLAN_CONFIG.Free,
        };
    }

    let plan = userDoc.subscriptionplan || "Free";
    let isExpired = false;

    if (plan !== "Free" && userDoc.subscriptionexpiresat) {
        const expiryDate = new Date(userDoc.subscriptionexpiresat);
        if (expiryDate < new Date()) {
            plan = "Free";
            isExpired = true;
        }
    }

    const config = PLAN_CONFIG[plan] || PLAN_CONFIG.Free;
    return {
        plan,
        isExpired,
        expiresAt: userDoc.subscriptionexpiresat || null,
        ...config,
    };
};

/**
 * Validates if the requested video quality is authorized under the given plan
 */
export const isQualityAuthorized = (userPlan, requestedQuality) => {
    const planConfig = PLAN_CONFIG[userPlan] || PLAN_CONFIG.Free;
    const normalizedReq = normalizeQuality(requestedQuality);
    const reqRank = QUALITY_RANKS[normalizedReq] || 3;

    return {
        authorized: reqRank <= planConfig.maxQualityRank,
        normalizedRequested: normalizedReq,
        maxAllowedQuality: planConfig.maxQuality,
        maxAllowedRank: planConfig.maxQualityRank,
        requestedRank: reqRank,
    };
};

/**
 * Validates if user has permission to view the video based on access level
 */
export const canAccessVideoContent = (userPlan, videoDoc) => {
    if (!videoDoc) return { allowed: false, reason: "Video not found" };

    const planConfig = PLAN_CONFIG[userPlan] || PLAN_CONFIG.Free;
    const videoLevel = (videoDoc.accesslevel || "free").toLowerCase();
    const isPremium = Boolean(videoDoc.ispremium || videoLevel !== "free");

    const requiredRank = ACCESS_LEVEL_RANKS[videoLevel] || 0;
    const userRank = planConfig.rank;

    if (userRank >= requiredRank) {
        return {
            allowed: true,
            isPremium,
            previewOnly: false,
            previewDuration: 0,
            requiredPlan: videoLevel,
        };
    }

    // User does not meet full requirement, free preview applies
    return {
        allowed: false,
        isPremium,
        previewOnly: true,
        previewDuration: videoDoc.previewduration || 60,
        requiredPlan: videoLevel === "free" ? "Bronze" : videoLevel.charAt(0).toUpperCase() + videoLevel.slice(1),
        message: `This content requires an active ${videoLevel.toUpperCase()} or higher subscription plan.`,
    };
};

/**
 * Returns current UTC date string YYYY-MM-DD
 */
export const getTodayUtcDateString = () => {
    const now = new Date();
    return now.toISOString().split("T")[0];
};
