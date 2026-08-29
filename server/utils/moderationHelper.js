import crypto from "crypto";

// Profanity list covering common abusive/offensive terms across multiple languages & variants
const PROFANITY_PATTERNS = [
    // English
    /\b(f+u+c+k+|s+h+i+t+|b+i+t+c+h+|a+s+s+h+o+l+e+|b+a+s+t+a+r+d+|d+i+c+k+|c+u+n+t+|w+h+o+r+e+|s+l+u+t+|p+u+s+s+y+|n+i+g+g+e+r+|n+i+g+g+a+|f+a+g+g+o+t+|r+e+t+a+r+d+)\b/i,
    // Leetspeak / obfuscated
    /\b(f[\*@#\$_]+ck|sh[\*@#\$_]+t|b[\*@#\$_]+tch|a[\*@#\$_]+hole|d[\*@#\$_]+ck|c[\*@#\$_]+nt)\b/i,
    // Spanish
    /\b(puta|puto|mierda|cabron|cabrona|coño|pendejo|pendeja|hijo de puta|gilipollas|maricon)\b/i,
    // Hindi / Hinglish
    /\b(madarchod|behenchod|chutiya|bhosdike|gaand|harami|kutta|randi|lauda|lodu|chodu|kamina)\b/i,
    // French
    /\b(merde|putain|salope|connard|encule|batard|pute|bordel)\b/i,
    // German
    /\b(scheisse|arschloch|hurensohn|schlampe|wichser|verdammt)\b/i,
];

// Suspicious / Malicious URL patterns (IP addresses as links, suspicious shorteners/tlds)
const SUSPICIOUS_URL_PATTERNS = [
    /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/i, // Direct IP links
    /https?:\/\/[^\s]+(\.tk|\.top|\.xyz|\.click|\.gq|\.cf|\.ml|\.buzz|\.monster|\.rest|\.ru)\b/i, // Risky TLDs
    /https?:\/\/(bit\.ly|tinyurl\.com|goo\.gl|t\.co|is\.gd|buff\.ly|adf\.ly|bc\.vc|ouo\.io)\/[^\s]+/i, // Generic url shorteners often used for spam
    /(free-crypto|free-robux|earn-money-fast|click-here-now|claim-gift|telegram-bot|whatsapp-link|dm-for-nudes)/i,
];

// In-memory rate limiting and CAPTCHA challenge storage
const userRateLimits = new Map();
const recentComments = new Map();
const captchaChallenges = new Map();

/**
 * Checks if comment body contains profanity or abusive language
 */
export const checkProfanity = (text) => {
    if (!text || typeof text !== "string") return { hasProfanity: false };
    const normalized = text.toLowerCase().replace(/[\s_\-\.]+/g, " ");

    for (const pattern of PROFANITY_PATTERNS) {
        if (pattern.test(text) || pattern.test(normalized)) {
            return {
                hasProfanity: true,
                reason: "Comment contains abusive, profane, or inappropriate language.",
            };
        }
    }
    return { hasProfanity: false };
};

/**
 * Checks for repeated special characters, excessive emoji spam, or flooding strings
 */
export const checkSpamPattern = (text) => {
    if (!text || typeof text !== "string") return { isSpam: false };

    // Check for 6+ consecutive identical characters (e.g., "aaaaaaa", "!!!!!!!!!!", "???????")
    const repeatedCharPattern = /(.)\1{5,}/;
    if (repeatedCharPattern.test(text)) {
        return {
            isSpam: true,
            reason: "Comment contains excessive repeated characters or symbols.",
        };
    }

    // Check for excessive repeating emojis (e.g. 8+ identical or total emojis with little text)
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojis = text.match(emojiRegex);
    if (emojis && emojis.length > 8 && text.length < emojis.length * 3) {
        return {
            isSpam: true,
            reason: "Comment contains excessive emoji repetition without meaningful text.",
        };
    }

    // Check for malicious / suspicious links
    for (const urlPattern of SUSPICIOUS_URL_PATTERNS) {
        if (urlPattern.test(text)) {
            return {
                isSpam: true,
                reason: "Comment contains suspicious, shortened, or unapproved links.",
            };
        }
    }

    return { isSpam: false };
};

/**
 * Checks if user is posting duplicate comments in a short window
 */
export const checkDuplicateComment = (userId, text) => {
    if (!userId || !text) return { isDuplicate: false };
    const now = Date.now();
    const userHistory = recentComments.get(userId.toString()) || [];
    const normalizedNew = text.trim().toLowerCase();

    // Check if posted exact or very close comment in the last 10 minutes
    const duplicate = userHistory.find(
        (item) => item.text.trim().toLowerCase() === normalizedNew && now - item.time < 600000
    );

    if (duplicate) {
        return {
            isDuplicate: true,
            reason: "Duplicate comment detected. You have recently posted this exact comment.",
        };
    }

    return { isDuplicate: false };
};

/**
 * Records a posted comment for duplicate tracking
 */
export const recordCommentForSpam = (userId, text) => {
    if (!userId || !text) return;
    const now = Date.now();
    const idStr = userId.toString();
    const list = recentComments.get(idStr) || [];
    list.push({ text: text.trim(), time: now });
    // Keep max last 10 comments
    if (list.length > 10) list.shift();
    recentComments.set(idStr, list);
};

/**
 * Checks rate limiting: max 5 comments per 60 seconds.
 * If exceeded, requires CAPTCHA verification.
 */
export const checkRateLimit = (identifier) => {
    if (!identifier) return { allowed: true, requiresCaptcha: false };
    const now = Date.now();
    const key = identifier.toString();
    const timestamps = (userRateLimits.get(key) || []).filter((t) => now - t < 60000);

    if (timestamps.length >= 5) {
        return {
            allowed: false,
            requiresCaptcha: true,
            reason: "Comment flooding detected (max 5 comments per minute). Please complete CAPTCHA verification.",
        };
    }

    return { allowed: true, requiresCaptcha: false };
};

/**
 * Records a comment posting timestamp for rate limiting
 */
export const recordRateLimitHit = (identifier) => {
    if (!identifier) return;
    const now = Date.now();
    const key = identifier.toString();
    const timestamps = (userRateLimits.get(key) || []).filter((t) => now - t < 60000);
    timestamps.push(now);
    userRateLimits.set(key, timestamps);
};

/**
 * Generates an interactive, lightweight math/puzzle CAPTCHA challenge
 */
export const createCaptchaChallenge = () => {
    const num1 = Math.floor(Math.random() * 12) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ["+", "-", "*"];
    const op = operators[Math.floor(Math.random() * operators.length)];

    let answer;
    if (op === "+") answer = num1 + num2;
    else if (op === "-") answer = num1 - num2;
    else answer = num1 * num2;

    const question = `What is ${num1} ${op} ${num2}?`;
    const token = crypto.randomBytes(16).toString("hex");

    // Valid for 3 minutes
    captchaChallenges.set(token, {
        answer: String(answer),
        expiresAt: Date.now() + 180000,
    });

    return {
        token,
        question,
    };
};

/**
 * Verifies a CAPTCHA response token
 */
export const verifyCaptchaToken = (token, userAnswer) => {
    if (!token || !userAnswer) return false;
    const challenge = captchaChallenges.get(token);
    if (!challenge) return false;

    if (Date.now() > challenge.expiresAt) {
        captchaChallenges.delete(token);
        return false;
    }

    const isValid = String(userAnswer).trim() === challenge.answer;
    if (isValid) {
        // One-time use
        captchaChallenges.delete(token);
    }
    return isValid;
};
