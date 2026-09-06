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
 *  2. Lingva    (multiple public instances) — open-source Google Translate proxy.
 *     Tries several community-hosted instances in order.
 *  3. Failure signal — returns failed:true so controller sends 502, not a silent passthrough.
 *
 * BUGS FIXED IN THIS VERSION:
 *  - MyMemory rejected "auto" as source lang — it requires "autodetect".
 *    `"auto"` is truthy so the `|| "autodetect"` fallback never fired.
 *  - `translated === text` check caused valid unchanged results (untranslatable slang,
 *    proper nouns) to be discarded and fall through to Lingva unnecessarily.
 *  - Only one Lingva instance — `lingva.ml` is frequently down; now tries 3 instances.
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

// MyMemory language code overrides (it has its own dialect for some codes)
const MYMEMORY_LANG_MAP = {
    zh: "zh-CN",
    he: "iw",
    // "auto" -> "autodetect" is handled separately below (the critical bug fix)
};

/**
 * Tier 1: MyMemory — official free public API, works reliably from cloud environments.
 * BUG FIX: source lang "auto" MUST become "autodetect" for MyMemory — "auto" is silently
 * rejected (returns responseStatus 400/206) because MyMemory does not recognise "auto".
 */
const tryMyMemory = async (text, targetLang, sourceLang) => {
    const tl = MYMEMORY_LANG_MAP[targetLang] || targetLang;
    // Critical: map "auto" to "autodetect" — MyMemory's required keyword
    const sl = (sourceLang === "auto" || !sourceLang)
        ? "autodetect"
        : (MYMEMORY_LANG_MAP[sourceLang] || sourceLang);

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`;
    const res = await fetch(url, { signal: withTimeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

    const data = await res.json();
    // responseStatus 200 = OK; 429 = quota exceeded; 400 = bad params
    if (data?.responseStatus !== 200) throw new Error(`MyMemory status ${data?.responseStatus}: ${data?.responseDetails}`);

    const translated = data?.responseData?.translatedText;
    if (!translated) throw new Error("MyMemory empty translatedText");

    // If we used autodetect and got back the same text, MyMemory couldn't identify the language.
    // Fall through to Lingva which handles short/ambiguous text better.
    if (sl === "autodetect" && translated.trim().toLowerCase() === text.trim().toLowerCase()) {
        throw new Error("MyMemory returned unchanged text with autodetect — likely unknown language");
    }

    return {
        translatedText: translated,
        detectedSourceLang: data?.responseData?.detectedLanguage || sourceLang || "auto",
    };
};

/**
 * Tier 2: Lingva — tries multiple public instances in order.
 * lingva.ml goes down frequently; fallbacks prevent total failure.
 */
const LINGVA_INSTANCES = [
    "https://lingva.ml",
    "https://lingva.thedaviddelta.com",
    "https://translate.plausibility.cloud",
];

const tryLingva = async (text, targetLang, sourceLang) => {
    const sl = (sourceLang && sourceLang !== "auto") ? sourceLang : "auto";

    for (const instance of LINGVA_INSTANCES) {
        try {
            const url = `${instance}/api/v1/${sl}/${targetLang}/${encodeURIComponent(text)}`;
            const res = await fetch(url, { signal: withTimeout(TIMEOUT_MS) });
            if (!res.ok) continue;

            const data = await res.json();
            if (!data?.translation) continue;

            return {
                translatedText: data.translation,
                detectedSourceLang: sourceLang || "auto",
            };
        } catch {
            // Try next instance
        }
    }

    throw new Error("All Lingva instances failed");
};

/**
 * Main export — tries tier 1 → tier 2 → returns failed:true
 * so the controller returns a proper 502 instead of silently passing back the original text.
 */
export const translateText = async (text, targetLang = "en", sourceLang = "auto") => {
    if (!text || !text.trim()) {
        return { translatedText: text, detectedSourceLang: sourceLang, targetLang };
    }

    // Never try to "translate" to the same detected language
    const detectedSrc = detectLanguageFromText(text);
    if (detectedSrc !== "auto" && detectedSrc === targetLang) {
        return { translatedText: text.trim(), detectedSourceLang: detectedSrc, targetLang, failed: false };
    }

    const cleanText = text.trim();
    const effectiveSrc = (sourceLang && sourceLang !== "auto")
        ? sourceLang
        : (detectedSrc !== "auto" ? detectedSrc : "auto");

    // Tier 1: MyMemory
    try {
        const result = await tryMyMemory(cleanText, targetLang, effectiveSrc);
        return { ...result, targetLang, failed: false };
    } catch (err) {
        console.warn("[translate] MyMemory failed:", err.message);
    }

    // Tier 2: Lingva (multiple instances)
    try {
        const result = await tryLingva(cleanText, targetLang, effectiveSrc);
        return { ...result, targetLang, failed: false };
    } catch (err) {
        console.warn("[translate] Lingva failed:", err.message);
    }

    // All tiers failed
    console.error("[translate] All translation providers failed for lang:", targetLang);
    return {
        translatedText: null,
        detectedSourceLang: detectedSrc !== "auto" ? detectedSrc : sourceLang,
        targetLang,
        failed: true,
    };
};

/**
 * Script-based language detection from Unicode character ranges
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
