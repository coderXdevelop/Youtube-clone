/**
 * Upgraded Multi-Tier Neural Machine Translation & Language Detection Helper
 *
 * ARCHITECTURE:
 *  - Tier 1: LibreTranslate Open-Source Neural Machine Translation (Local instance or public mirrors)
 *  - Tier 2: Google NMT Client Fallback (High-quality neural translation for internet slang & colloquial text)
 *  - Tier 3: MyMemory Translation Memory (Tertiary fallback with strict sanitization)
 *  - High-Precision Language Detector: Fast script & Unicode lexical analysis
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
    { code: "mr", name: "Marathi (मराठी)" },
    { code: "gu", name: "Gujarati (ગુજરાતી)" },
    { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
    { code: "ml", name: "Malayalam (മലയാളം)" },
    { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)" },
    { code: "ur", name: "Urdu (اردو)" },
    { code: "id", name: "Indonesian (Bahasa Indonesia)" },
    { code: "vi", name: "Vietnamese (Tiếng Việt)" },
    { code: "th", name: "Thai (ไทย)" },
    { code: "nl", name: "Dutch (Nederlands)" },
    { code: "pl", name: "Polish (Polski)" },
    { code: "sv", name: "Swedish (Svenska)" },
];

export const getLanguageName = (code) => {
    if (!code || code === "auto") return "Original Language";
    const found = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase());
    return found ? found.name.split(" ")[0] : code.toUpperCase();
};

const TIMEOUT_MS = 5000;
const withTimeout = (ms) => (AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);

// HTML Entity decoder for clean text outputs
const decodeHtmlEntities = (text) => {
    if (!text || typeof text !== "string") return "";
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x2F;/g, "/")
        .replace(/&#x60;/g, "`")
        .replace(/&#34;/g, '"')
        .replace(/&rsquo;/g, "’")
        .replace(/&lsquo;/g, "‘")
        .replace(/&rdquo;/g, "”")
        .replace(/&ldquo;/g, "“");
};

/**
 * Validates candidate translation to ensure it is meaningful and clean.
 */
const cleanCandidate = (text, original) => {
    if (!text || typeof text !== "string") return null;
    let clean = decodeHtmlEntities(text).trim();
    if (!clean) return null;
    if (clean.includes("*****") || clean.includes("(disambiguation)") || /reviewed words/i.test(clean)) {
        return null;
    }
    // Reject excessive word explosion (e.g. 1 word becoming 10+ words of dictionary definitions)
    const inWords = original.trim().split(/\s+/).length;
    const outWords = clean.split(/\s+/).length;
    if (inWords === 1 && outWords > 5) return null;
    if (original.trim().length <= 10 && clean.length > 45) return null;

    return clean;
};

/**
 * Script & Unicode Lexical Language Detection
 */
export const detectLanguageFromText = (text) => {
    if (!text || typeof text !== "string") return "auto";
    const clean = text.trim();

    // Indic Scripts
    if (/[\u0900-\u097F]/.test(clean)) return "hi"; // Hindi / Devanagari
    if (/[\u0980-\u09FF]/.test(clean)) return "bn"; // Bengali
    if (/[\u0B80-\u0BFF]/.test(clean)) return "ta"; // Tamil
    if (/[\u0C00-\u0C7F]/.test(clean)) return "te"; // Telugu
    if (/[\u0A80-\u0AFF]/.test(clean)) return "gu"; // Gujarati
    if (/[\u0C80-\u0CFF]/.test(clean)) return "kn"; // Kannada
    if (/[\u0D00-\u0D7F]/.test(clean)) return "ml"; // Malayalam
    if (/[\u0A00-\u0A7F]/.test(clean)) return "pa"; // Punjabi

    // East Asian Scripts
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(clean)) return "ja"; // Japanese Kana
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(clean)) return "ko"; // Korean Hangul
    if (/[\u4E00-\u9FFF]/.test(clean)) return "zh"; // Chinese Hanzi

    // Middle Eastern & European Non-Latin
    if (/[\u0600-\u06FF]/.test(clean)) return "ar"; // Arabic / Urdu
    if (/[\u0400-\u04FF]/.test(clean)) return "ru"; // Cyrillic (Russian)
    if (/[\u0590-\u05FF]/.test(clean)) return "he"; // Hebrew
    if (/[\u0E00-\u0E7F]/.test(clean)) return "th"; // Thai
    if (/[\u0370-\u03FF]/.test(clean)) return "el"; // Greek

    // Common Latin lexical cues for short phrases
    const lower = clean.toLowerCase();
    if (/\b(hola|gracias|buenos|amigo|por favor|cómo estás|qué tal)\b/i.test(lower)) return "es";
    if (/\b(bonjour|merci|salut|s'il vous plaît|comment allez-vous)\b/i.test(lower)) return "fr";
    if (/\b(ciao|grazie|buongiorno|per favore|come stai)\b/i.test(lower)) return "it";
    if (/\b(danke|hallo|guten|bitte|wie geht)\b/i.test(lower)) return "de";
    if (/\b(obrigado|obrigada|olá|bom dia|tudo bem)\b/i.test(lower)) return "pt";
    if (/\b(merhaba|teşekkürler|nasılsın|günaydın)\b/i.test(lower)) return "tr";
    if (/\b(terima kasih|selamat|apa kabar)\b/i.test(lower)) return "id";

    return "auto";
};

// ─── TIER 1: LibreTranslate (Open-Source Neural Machine Translation) ──────────

const LIBRE_MIRRORS = [
    process.env.LIBRETRANSLATE_URL,
    "https://translate.terraprint.co/translate",
    "https://libretranslate.de/translate",
    "https://lt.vern.cc/translate",
].filter(Boolean);

const libreTranslateCall = async (text, targetLang, sourceLang = "auto") => {
    for (const endpoint of LIBRE_MIRRORS) {
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang || "auto",
                    target: targetLang,
                    format: "text",
                }),
                signal: withTimeout(3500),
            });

            if (!res.ok) continue;
            const data = await res.json();
            const translated = cleanCandidate(data?.translatedText, text);
            if (translated) {
                return {
                    translatedText: translated,
                    detectedSourceLang: data?.detectedLanguage?.language || sourceLang || "auto",
                    provider: "LibreTranslate (NMT)",
                };
            }
        } catch {
            // Failover to next mirror
            continue;
        }
    }
    throw new Error("LibreTranslate mirrors unreachable or failed");
};

// ─── TIER 2: Google NMT Client Endpoint ──────────────────────────────────────

const googleTranslateCall = async (text, targetLang, sourceLang = "auto") => {
    const sl = sourceLang && sourceLang !== "auto" ? sourceLang : "auto";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*",
        },
        signal: withTimeout(TIMEOUT_MS),
    });

    if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);
    const data = await res.json();

    if (Array.isArray(data?.[0])) {
        const fullTranslation = data[0].map((chunk) => chunk?.[0] || "").join("");
        const detected = data?.[2] || sourceLang || "auto";
        const cleaned = cleanCandidate(fullTranslation, text);
        if (cleaned) {
            return {
                translatedText: cleaned,
                detectedSourceLang: detected,
                provider: "Google (NMT)",
            };
        }
    }
    throw new Error("Google Translate returned empty translation");
};

// ─── TIER 3: MyMemory Translation Memory Fallback ────────────────────────────

const myMemoryCall = async (text, targetLang, sourceLang = "autodetect") => {
    const MYMEMORY_LANG_MAP = { zh: "zh-CN", he: "iw" };
    const tl = MYMEMORY_LANG_MAP[targetLang] || targetLang;
    const mappedSl = MYMEMORY_LANG_MAP[sourceLang] || (sourceLang === "auto" ? "autodetect" : sourceLang);

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${mappedSl}|${tl}`;
    const res = await fetch(url, { signal: withTimeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

    const data = await res.json();
    if (data?.responseStatus !== 200) throw new Error(`MyMemory status ${data?.responseStatus}`);

    const rawTop = data?.responseData?.translatedText;
    let best = cleanCandidate(rawTop, text);

    if (!best && Array.isArray(data?.matches)) {
        for (const m of data.matches) {
            const candidate = cleanCandidate(m.translation, text);
            if (candidate) {
                best = candidate;
                break;
            }
        }
    }

    if (!best && rawTop) {
        best = decodeHtmlEntities(rawTop).trim();
    }

    if (!best) throw new Error("MyMemory returned empty or invalid translation");

    return {
        translatedText: best,
        detectedSourceLang: data?.responseData?.detectedLanguage || sourceLang,
        provider: "MyMemory",
    };
};

/**
 * Main translation dispatcher with automatic multi-tier failover.
 *
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target ISO language code (e.g. "en", "es", "hi")
 * @param {string} [sourceLang="auto"] - Optional source language code
 * @returns {Promise<{ translatedText: string|null, detectedSourceLang: string, targetLang: string, provider?: string, failed: boolean }>}
 */
export const translateText = async (text, targetLang = "en", sourceLang = "auto") => {
    if (!text || !text.trim()) {
        return { translatedText: text, detectedSourceLang: sourceLang, targetLang, failed: false };
    }

    const cleanText = text.trim();
    const detectedSrc = detectLanguageFromText(cleanText);

    // If already in target language, return directly
    if (detectedSrc !== "auto" && detectedSrc.toLowerCase() === targetLang.toLowerCase()) {
        return {
            translatedText: cleanText,
            detectedSourceLang: detectedSrc,
            targetLang,
            provider: "Direct Match",
            failed: false,
        };
    }

    const effectiveSrc = sourceLang && sourceLang !== "auto" ? sourceLang : detectedSrc;

    // ── Tier 1: Custom Self-Hosted LibreTranslate (if configured via env) ───
    if (process.env.LIBRETRANSLATE_URL) {
        try {
            const result = await libreTranslateCall(cleanText, targetLang, effectiveSrc !== "auto" ? effectiveSrc : undefined);
            return {
                translatedText: result.translatedText,
                detectedSourceLang: result.detectedSourceLang || effectiveSrc,
                targetLang,
                provider: result.provider,
                failed: false,
            };
        } catch (err) {
            console.warn("[translate] Custom LibreTranslate failed, falling back:", err.message);
        }
    }

    // ── Tier 2: High-Speed Google NMT Client Endpoint ─────────────────────────
    try {
        const result = await googleTranslateCall(cleanText, targetLang, effectiveSrc !== "auto" ? effectiveSrc : "auto");
        return {
            translatedText: result.translatedText,
            detectedSourceLang: result.detectedSourceLang || effectiveSrc,
            targetLang,
            provider: result.provider,
            failed: false,
        };
    } catch (err) {
        console.warn("[translate] Google NMT skipped:", err.message);
    }

    // ── Tier 3: LibreTranslate Public Mirrors ────────────────────────────────
    try {
        const result = await libreTranslateCall(cleanText, targetLang, effectiveSrc !== "auto" ? effectiveSrc : undefined);
        return {
            translatedText: result.translatedText,
            detectedSourceLang: result.detectedSourceLang || effectiveSrc,
            targetLang,
            provider: result.provider,
            failed: false,
        };
    } catch (err) {
        console.warn("[translate] LibreTranslate mirrors skipped:", err.message);
    }

    // ── Tier 4: MyMemory Translation Memory ──────────────────────────────────
    try {
        const result = await myMemoryCall(cleanText, targetLang, effectiveSrc !== "auto" ? effectiveSrc : "autodetect");
        return {
            translatedText: result.translatedText,
            detectedSourceLang: result.detectedSourceLang || effectiveSrc,
            targetLang,
            provider: result.provider,
            failed: false,
        };
    } catch (err) {
        console.warn("[translate] MyMemory failed:", err.message);
    }

    // If original text is already untranslatable proper nouns/symbols, treat as success
    if (/^[0-9\s.,!?:;@#$%^&*()_\-+=[\]{}|\\/<>~`"']+$/.test(cleanText)) {
        return {
            translatedText: cleanText,
            detectedSourceLang: detectedSrc !== "auto" ? detectedSrc : sourceLang,
            targetLang,
            provider: "Fallback Passthrough",
            failed: false,
        };
    }

    console.error(`[translate] All translation strategies failed for: "${cleanText}" → ${targetLang}`);
    return {
        translatedText: null,
        detectedSourceLang: detectedSrc !== "auto" ? detectedSrc : sourceLang,
        targetLang,
        failed: true,
    };
};
