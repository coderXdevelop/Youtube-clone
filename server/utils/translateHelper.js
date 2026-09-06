/**
 * Production-safe translation helper.
 *
 * ARCHITECTURE — 2 strategies, no external dependency beyond MyMemory:
 *
 *  Strategy A (primary): MyMemory with auto-detect.
 *    - If detection succeeds → done.
 *    - If detection fails (returns same text) → Strategy B.
 *
 *  Strategy B (fallback for undetected scripts):
 *    For Latin-script text that MyMemory can't autodetect, probe a small set
 *    of common languages until one produces a different result.
 *    Common case: short words like "Ciao" (Italian), "Hola" (Spanish),
 *    "Bonjour" (French) that are too short for autodetect to work.
 *
 *  Why not Lingva? All public Lingva instances (lingva.ml, thedaviddelta.com,
 *  translate.plausibility.cloud) returned HTTP 500/503 in production — they are
 *  community-run and unreliable. Tested 2026-09-06.
 *
 *  Why not Google translate_a? Returns 429 from cloud-hosted IPs (rate-limited by IP).
 *
 * BUGS FIXED:
 *  - "auto" passed as langpair source to MyMemory — MyMemory requires "autodetect".
 *    "auto" is a truthy string so the || "autodetect" fallback never fired.
 *  - translated === text caused valid untranslatable text (slang, proper nouns) to fail.
 *  - Single Lingva instance that is permanently down.
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

const TIMEOUT_MS = 7000;

const withTimeout = (ms) => AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;

// MyMemory requires its own dialect for some codes
const MYMEMORY_LANG_MAP = { zh: "zh-CN", he: "iw" };

// When autodetect fails for Latin-script text, probe these source langs in order.
// Ordered by global comment frequency: Spanish, French, Italian, German, Portuguese, Turkish.
const LATIN_PROBE_LANGS = ["es", "fr", "it", "de", "pt", "tr", "nl", "pl", "sv"];

/**
 * Single MyMemory call.
 * Returns { translatedText, detectedSourceLang } on success, throws on failure.
 * @param {string} sl - source language code OR "autodetect"
 */
const myMemoryCall = async (text, targetLang, sl) => {
    const tl = MYMEMORY_LANG_MAP[targetLang] || targetLang;
    const mappedSl = MYMEMORY_LANG_MAP[sl] || sl;

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${mappedSl}|${tl}`;
    const res = await fetch(url, { signal: withTimeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

    const data = await res.json();
    if (data?.responseStatus !== 200) throw new Error(`MyMemory status ${data?.responseStatus}: ${data?.responseDetails}`);

    const translated = data?.responseData?.translatedText;
    if (!translated) throw new Error("MyMemory returned empty translatedText");

    return {
        translatedText: translated,
        detectedSourceLang: data?.responseData?.detectedLanguage || sl,
        sameAsInput: translated.trim().toLowerCase() === text.trim().toLowerCase(),
    };
};

/**
 * Main export — resolves translation or returns { failed: true }.
 */
export const translateText = async (text, targetLang = "en", sourceLang = "auto") => {
    if (!text || !text.trim()) {
        return { translatedText: text, detectedSourceLang: sourceLang, targetLang, failed: false };
    }

    const cleanText = text.trim();

    // Script-based detection (reliable for non-Latin scripts: Arabic, Cyrillic, CJK, etc.)
    const detectedSrc = detectLanguageFromText(cleanText);

    // Never translate to the same detected language
    if (detectedSrc !== "auto" && detectedSrc === targetLang) {
        return { translatedText: cleanText, detectedSourceLang: detectedSrc, targetLang, failed: false };
    }

    // Determine the source language to try first
    const effectiveSrc = (sourceLang && sourceLang !== "auto")
        ? sourceLang
        : (detectedSrc !== "auto" ? detectedSrc : "auto");

    // ─── Strategy A: MyMemory with known/detected source lang ───────────────
    if (effectiveSrc !== "auto") {
        try {
            const result = await myMemoryCall(cleanText, targetLang, effectiveSrc);
            // Accept even if same as input — may be an untranslatable proper noun or slang
            return { translatedText: result.translatedText, detectedSourceLang: result.detectedSourceLang, targetLang, failed: false };
        } catch (err) {
            console.warn("[translate] MyMemory (known src) failed:", err.message);
        }
    }

    // ─── Strategy A2: MyMemory with autodetect ───────────────────────────────
    try {
        const result = await myMemoryCall(cleanText, targetLang, "autodetect");
        if (!result.sameAsInput) {
            // Autodetect worked and produced a different result — use it
            return { translatedText: result.translatedText, detectedSourceLang: result.detectedSourceLang, targetLang, failed: false };
        }
        // Autodetect couldn't identify the language (short Latin-script word) → Strategy B
        console.warn("[translate] MyMemory autodetect returned same text, trying language probing");
    } catch (err) {
        console.warn("[translate] MyMemory autodetect failed:", err.message);
    }

    // ─── Strategy B: probe common Latin-script source languages ─────────────
    // Handles words like "Hola" → es, "Bonjour" → fr that are long enough for TM lookup
    // but too short for autodetect. Only probe if text is >= 6 chars to avoid garbage TM results
    // for very short words (e.g. "Ciao" probed as French gives irrelevant TM noise).
    if (cleanText.length >= 6) {
        const probeTargets = LATIN_PROBE_LANGS.filter((l) => l !== targetLang);
        for (const probeLang of probeTargets) {
            try {
                const result = await myMemoryCall(cleanText, targetLang, probeLang);
                if (!result.sameAsInput) {
                    return { translatedText: result.translatedText, detectedSourceLang: probeLang, targetLang, failed: false };
                }
            } catch {
                // Try next
            }
        }
    }

    // For very short or truly untranslatable text (slang, proper nouns), return the
    // autodetect result as-is rather than failing — it IS a valid translation outcome.
    // The client already has the autodetect result from Strategy A2 above (same as input).
    // Re-fetch it cleanly here to return a proper success response.
    try {
        const result = await myMemoryCall(cleanText, targetLang, "autodetect");
        // Accept same-as-input for short/untranslatable content
        return { translatedText: result.translatedText, detectedSourceLang: result.detectedSourceLang, targetLang, failed: false };
    } catch {
        // fall through to final failure
    }

    // All strategies exhausted
    console.error("[translate] All translation strategies failed for:", cleanText, "→", targetLang);
    return {
        translatedText: null,
        detectedSourceLang: detectedSrc !== "auto" ? detectedSrc : sourceLang,
        targetLang,
        failed: true,
    };
};

/**
 * Script-based language detection from Unicode character ranges.
 * Reliable for non-Latin scripts; returns "auto" for Latin-script text.
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
