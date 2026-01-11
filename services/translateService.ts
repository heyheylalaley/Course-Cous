import { Language } from '../types';

// Google Translate API configuration
const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY as string | undefined;
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';


// Language code mapping
const LANGUAGE_CODES: Record<Language, string> = {
  en: 'en',
  ua: 'uk', // Google Translate uses 'uk' for Ukrainian
  ru: 'ru',
  ar: 'ar'
};

/**
 * Translate text using Google Translate API
 */
export const translateText = async (
  text: string,
  targetLanguage: Language,
  sourceLanguage: Language = 'en'
): Promise<string> => {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    return text; // Return original text if API key is not configured
  }

  if (targetLanguage === sourceLanguage) {
    return text; // No translation needed
  }

  try {
    const response = await fetch(
      `${GOOGLE_TRANSLATE_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: LANGUAGE_CODES[sourceLanguage],
          target: LANGUAGE_CODES[targetLanguage],
          format: 'text'
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      throw new Error(errorData.error?.message || `Translation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const translatedText = data.data?.translations?.[0]?.translatedText || text;
    
    return translatedText;
  } catch (error: any) {
    // Return original text on error
    return text;
  }
};

/**
 * Translate course description to all supported languages
 * Note: Course titles are NOT translated - only descriptions are translated
 */
export const translateCourse = async (
  courseId: string,
  title: string,
  description: string,
  sourceLanguage: Language = 'en'
): Promise<Record<Language, { title: string; description: string }>> => {
  const languages: Language[] = ['en', 'ua', 'ru', 'ar'];
  const translations: Record<Language, { title: string; description: string }> = {} as any;

  // Translate to all languages
  const translationPromises = languages.map(async (lang) => {
    if (lang === sourceLanguage) {
      // For source language, use original title and description
      translations[lang] = { title, description };
      return;
    }

    try {
      // Only translate description, keep original title
      const translatedDescription = await translateText(description, lang, sourceLanguage);

      translations[lang] = {
        title: title, // Always use original title, never translate
        description: translatedDescription
      };
    } catch (error: any) {
      // Fallback to source language if translation fails
      translations[lang] = { title, description };
    }
  });

  await Promise.all(translationPromises);

  return translations;
};
