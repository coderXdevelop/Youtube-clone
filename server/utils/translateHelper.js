/**
 * Production-safe translation helper.
 *
 * WHY the old approach broke:
 *  - translate.googleapis.com/translate_a/single (the "gtx" client) is Google's
 *    internal/unofficial endpoint. It is rate-limited by IP, frequently blocked
 *    by cloud hosting providers (Vercel, Render, Railway) at the egress level,
 *    and has no public SLA. It reliably fails in serverless / shared-IP environments.
 *
 * NEW APPROACH — 3-tier chain, all free, no API key required:
 *  1. MyMemory  (https://mymemory.translated.net) — official free tier, 5 000 chars/day/IP,
 *     works from all cloud providers, returns JSON.
 *  2. Lingva    (https://lingva.ml) — open-source Google Translate proxy,
 *     community-hosted, no rate-limit issues for short comments.
 *  3. Script-based guess — returns original text with a flag so the client
 *     can show "Translation unavailable" instead of silently returning the original.
 */

export const SUPPORTED_LANGUAGES = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish (Español)" },
    { code: "hi", name: "Hindi (हिन्दी)" },
    { code: "fr", name: "French (Français)" },
    { code: "de", name: "German (Deutsch)" },
    { code: "ja", name: "Japanese (日本語)" },
    { code: "zh", name: "Chinese (中文)" },
    { code: "ar", name: "Arabic (العربية)" },
    { code: "pt", name: "Portuguese (Português)" },
    { code: "ru", name: "Russian (Русский)" },
    { code: "bn", name: "Bengali (বাংলা)" },
    { code: "ko", name: "Korean (한국어)" },
    { code: "it", name: "Italian (Italiano)" },
    { code: "tr", name: "Turkish (Türkçe)" },
    { code: "ta", name: "Tamil (தமிழ்)" },
    { code: "te", name: "Telugu (తెలుగు)" },
];

const TIMEOUT_MS = 6000;

const withTimeout = (ms) => AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;

/**
 * Tier 1: MyMemory — free public API, works from all cloud providers
 * Docs: https://mymemory.translated.net/doc/spec.php
 * Limit: 5 000 chars/day per IP (more than enough for comment translation)
 */
const tryMyMemory = async (text, targetLang, sourceLang) => {
    // MyMemory uses "zh-CN" not "zh"; map the short code
    const langMap = { zh: "zh-CN", he: "iw" };
    const tl = langMap[targetLang] || targetLang;
    const sl = langMap[sourceLang] || sourceLang || "autodetect";

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`;
    const res = await fetch(url, { signal: withTimeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

    const data = await res.json();
    // responseStatus 200 = OK, 429 = quota exceeded
    if (data?.responseStatus !== 200) throw new Error(`MyMemory status ${data?.responseStatus}`);

    const translated = data?.responseData?.translatedText;
    if (!translated || translated === text) throw new Error("MyMemory returned unchanged text");

    return {
        translatedText: translated,
        detectedSourceLang: data?.responseData?.match?.source || sourceLang || "auto",
    };
};

/**
 * Tier 2: Lingva — open-source Google Translate proxy
 * Docs: https://github.com/thedaviddelta/lingva-translate
 * Public instance: lingva.ml
 */
const tryLingva = async (text, targetLang, sourceLang) => {
    const sl = sourceLang || "auto";
    const url = `https://lingva.ml/api/v1/${sl}/${targetLang}/${encodeURIComponent(text)}`;
    const res = await fetch(url, { signal: withTimeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Lingva HTTP ${res.status}`);

    const data = await res.json();
    if (!data?.translation) throw new Error("Lingva empty response");

    return {
        translatedText: data.translation,
        detectedSourceLang: sourceLang || "auto",
    };
};

/**
 * Main export — tries tier 1 → tier 2 → returns fallback with failed=true
 * so the controller can return a proper 502 instead of silently returning the original text.
 */
export const translateText = async (text, targetLang = "en", sourceLang = "auto") => {
    if (!text || !text.trim()) {
        return { translatedText: text, detectedSourceLang: sourceLang, targetLang };
    }

    // Never try to "translate" to the same language
    const detectedSrc = detectLanguageFromText(text);
    if (detectedSrc !== "auto" && detectedSrc === targetLang) {
        return { translatedText: text.trim(), detectedSourceLang: detectedSrc, targetLang };
    }

    const cleanText = text.trim();
    const effectiveSrc = sourceLang === "auto" ? (detectedSrc !== "auto" ? detectedSrc : "auto") : sourceLang;

    // Tier 1: MyMemory
    try {
        const result = await tryMyMemory(cleanText, targetLang, effectiveSrc);
        return { ...result, targetLang, failed: false };
    } catch (err) {
        console.warn("[translate] MyMemory failed:", err.message);
    }

    // Tier 2: Lingva
    try {
        const result = await tryLingva(cleanText, targetLang, effectiveSrc);
        return { ...result, targetLang, failed: false };
    } catch (err) {
        console.warn("[translate] Lingva failed:", err.message);
    }

    // All tiers failed — return a clear failure signal, NOT the original text silently
    console.error("[translate] All translation providers failed for lang:", targetLang);
    return {
        translatedText: null,
        detectedSourceLang: detectedSrc !== "auto" ? detectedSrc : sourceLang,
        targetLang,
        failed: true,
    };
};

/**
 * Script-based language detection from Unicode ranges
 */
export const detectLanguageFromText = (text) => {
    if (!text || typeof text !== "string") return "auto";
    if (/[\u0900-\u097F]/.test(text)) return "hi";
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return "ja";
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
    if (/[\u0600-\u06FF]/.test(text)) return "ar";
    if (/[\u0400-\u04FF]/.test(text)) return "ru";
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return "ko";
    if (/[\u0980-\u09FF]/.test(text)) return "bn";
    if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
    if (/[\u0C00-\u0C7F]/.test(text)) return "te";
    return "auto";
};
