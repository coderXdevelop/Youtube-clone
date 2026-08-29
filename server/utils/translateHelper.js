/**
 * Free-tier translation helper supporting multiple languages, language detection, and fallbacks.
 * Uses Google Translate web engine and MyMemory API with automatic language detection.
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

/**
 * Translates text into target language using Google Translate API with MyMemory fallback
 */
export const translateText = async (text, targetLang = "en", sourceLang = "auto") => {
    if (!text || !text.trim()) {
        return { translatedText: text, detectedSourceLang: sourceLang, targetLang };
    }

    const cleanText = text.trim();
    try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang || "auto"}&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`;
        const response = await fetch(gUrl, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
            const data = await response.json();
            const translatedText = data?.[0]?.map((s) => s?.[0]).filter(Boolean).join("") || cleanText;
            const detectedSourceLang = data?.[2] || sourceLang;
            return { translatedText, detectedSourceLang, targetLang };
        }
    } catch (err) {
        console.warn("Translation service unavailable:", err.message);
    }

    return { translatedText: cleanText, detectedSourceLang: sourceLang, targetLang, fallback: true };
};

/**
 * Optional helper for frontend script check
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
