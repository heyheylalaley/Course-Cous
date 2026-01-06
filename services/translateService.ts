import { Language } from '../types';

// Google Translate API configuration
const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY as string | undefined;
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

// Debug: Log API key status (only in dev mode)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.log('[Translate] API Key configured:', !!GOOGLE_TRANSLATE_API_KEY);
  if (!GOOGLE_TRANSLATE_API_KEY) {
    console.warn('[Translate] ⚠️ VITE_GOOGLE_TRANSLATE_API_KEY is not set!');
  }
}

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
    console.warn('Google Translate API key not configured');
    return text; // Return original text if API key is not configured
  }

  if (targetLanguage === sourceLanguage) {
    return text; // No translation needed
  }

  try {
    if (import.meta.env.DEV) {
      console.log(`[Translate] Translating text from ${sourceLanguage} to ${targetLanguage}:`, text.substring(0, 50));
    }
    
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
      console.error('[Translate] API Error:', errorData);
      console.error('[Translate] Response status:', response.status, response.statusText);
      throw new Error(errorData.error?.message || `Translation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const translatedText = data.data?.translations?.[0]?.translatedText || text;
    
    // Check if translation actually happened (for Arabic, text should be different)
    if (targetLanguage === 'ar' && translatedText === text && import.meta.env.DEV) {
      console.warn('[Translate] ⚠️ Arabic translation returned original text - possible issue');
    }
    
    return translatedText;
  } catch (error: any) {
    console.error('[Translate] Translation error:', error);
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
  // Log only in development mode
  if (import.meta.env.DEV) {
    console.log(`[Translate] Starting translation for course ${courseId} (description only, title not translated)`);
  }
  
  const languages: Language[] = ['en', 'ua', 'ru', 'ar'];
  const translations: Record<Language, { title: string; description: string }> = {} as any;

  // Translate to all languages
  const translationPromises = languages.map(async (lang) => {
    if (lang === sourceLanguage) {
      // For source language, use original title and description
      translations[lang] = { title, description };
      if (import.meta.env.DEV) {
        console.log(`[Translate] Skipping ${lang} (source language)`);
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.log(`[Translate] Translating description to ${lang}...`);
    }
    
    try {
      // Only translate description, keep original title
      const translatedDescription = await translateText(description, lang, sourceLanguage);

      translations[lang] = {
        title: title, // Always use original title, never translate
        description: translatedDescription
      };
      
      if (import.meta.env.DEV) {
        console.log(`[Translate] ✓ Completed ${lang} (description only)`);
      }
      
      // Special check for Arabic - verify translation actually happened
      if (lang === 'ar' && import.meta.env.DEV) {
        if (translatedDescription === description) {
          console.warn(`[Translate] ⚠️ Arabic translation may have failed - description unchanged`);
        }
      }
    } catch (error: any) {
      console.error(`[Translate] ✗ Failed to translate to ${lang}:`, error);
      console.error(`[Translate] Error details:`, error?.message || error);
      // Fallback to source language if translation fails
      translations[lang] = { title, description };
    }
  });

  await Promise.all(translationPromises);

  // Log only in development mode
  if (import.meta.env.DEV) {
    console.log(`[Translate] Translations completed for course ${courseId}`);
  }
  return translations;
};
