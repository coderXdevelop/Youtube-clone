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
        return { translatedText: text, detectedSourceLang: sourceLang };
    }

    const cleanText = text.trim();

    // Attempt 1: Google Translate auto-detect engine (Primary, highly accurate for all scripts & Latin languages)
    try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang || "auto"}&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(gUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data?.[0])) {
                const combined = data[0]
                    .filter((segment) => Array.isArray(segment) && segment[0])
                    .map((segment) => segment[0])
                    .join("");

                const detected = data[2] || "auto";

                if (combined) {
                    return {
                        translatedText: combined,
                        detectedSourceLang: detected,
                        targetLang,
                    };
                }
            }
        }
    } catch (err) {
        console.warn("Google Translate engine attempt failed, trying MyMemory fallback:", err.message);
    }

    // Attempt 2: MyMemory Translation API fallback
    try {
        const langPair = sourceLang === "auto" ? `autodetect|${targetLang}` : `${sourceLang}|${targetLang}`;
        const encodedText = encodeURIComponent(cleanText);
        const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${langPair}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data?.responseData?.translatedText) {
                const translated = data.responseData.translatedText;
                if (translated && !translated.startsWith("MYMEMORY WARNING:")) {
                    return {
                        translatedText: translated,
                        detectedSourceLang: data.responseData.detectedLanguage || sourceLang,
                        targetLang,
                    };
                }
            }
        }
    } catch (err) {
        console.warn("MyMemory fallback failed:", err.message);
    }

    // Graceful fallback: return original text if both translation services fail
    return {
        translatedText: cleanText,
        detectedSourceLang: sourceLang,
        targetLang,
        fallback: true,
    };
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
