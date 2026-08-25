/**
 * Free-tier translation helper supporting multiple languages, language detection, and fallbacks.
 * Uses public translation APIs (MyMemory Translation API and Google Translate web fallback)
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
 * Detect language heuristics based on character scripts
 */
export const detectLanguageFromText = (text) => {
    if (!text || typeof text !== "string") return "en";

    // Devanagari script (Hindi, Marathi, Nepali, etc.)
    if (/[\u0900-\u097F]/.test(text)) return "hi";
    // Japanese (Hiragana, Katakana, Kanji)
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return "ja";
    // Chinese (Hanzi)
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
    // Arabic script
    if (/[\u0600-\u06FF]/.test(text)) return "ar";
    // Cyrillic (Russian, etc.)
    if (/[\u0400-\u04FF]/.test(text)) return "ru";
    // Korean (Hangul)
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return "ko";
    // Bengali script
    if (/[\u0980-\u09FF]/.test(text)) return "bn";
    // Tamil script
    if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
    // Telugu script
    if (/[\u0C00-\u0C7F]/.test(text)) return "te";

    // Spanish heuristics
    if (/[áéíóúüñ¿¡]/i.test(text)) return "es";
    // French heuristics
    if (/[éèêëàâîïôûùçœæ]/i.test(text)) return "fr";
    // German heuristics
    if (/[äöüß]/i.test(text)) return "de";

    return "en";
};

/**
 * Translates text into target language using free public API with fallback
 */
export const translateText = async (text, targetLang = "en", sourceLang = "auto") => {
    if (!text || !text.trim()) {
        return { translatedText: text, detectedSourceLang: sourceLang };
    }

    const cleanText = text.trim();
    const detectedSource = sourceLang === "auto" ? detectLanguageFromText(cleanText) : sourceLang;

    // If source and target are the same, return as is
    if (detectedSource.toLowerCase() === targetLang.toLowerCase()) {
        return {
            translatedText: cleanText,
            detectedSourceLang: detectedSource,
            targetLang,
        };
    }

    // Attempt 1: MyMemory Translation API
    try {
        const langPair = `${detectedSource}|${targetLang}`;
        const encodedText = encodeURIComponent(cleanText);
        const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${langPair}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data?.responseData?.translatedText) {
                let translated = data.responseData.translatedText;
                // If MyMemory returns match, return it
                if (translated && !translated.startsWith("MYMEMORY WARNING:")) {
                    return {
                        translatedText: translated,
                        detectedSourceLang: detectedSource,
                        targetLang,
                    };
                }
            }
        }
    } catch (err) {
        console.warn("MyMemory translation attempt failed, trying fallback:", err.message);
    }

    // Attempt 2: Google Translate free endpoint fallback
    try {
        const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${detectedSource}&tl=${targetLang}&dt=t&q=${encodeURIComponent(cleanText)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(gUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data?.[0])) {
                const combined = data[0].map((segment) => segment[0]).join("");
                if (combined) {
                    return {
                        translatedText: combined,
                        detectedSourceLang: data[2] || detectedSource,
                        targetLang,
                    };
                }
            }
        }
    } catch (err) {
        console.warn("Google Translate fallback failed:", err.message);
    }

    // Graceful fallback: return original text if translation service is unavailable
    return {
        translatedText: cleanText,
        detectedSourceLang: detectedSource,
        targetLang,
        fallback: true,
    };
};
