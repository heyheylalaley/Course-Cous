import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { UserProfile, Language, Course, EnglishLevel } from '../types';
import { db } from './db';

// Cache for chat session and courses hash
let chatSession: Chat | null = null;
let lastCoursesHash: string = '';
let lastLanguage: Language = 'en';
let lastEnglishLevel: EnglishLevel = 'None';

// Helper function to create a simple hash of courses for change detection
const createCoursesHash = (courses: Course[]): string => {
  return courses
    .map(c => `${c.id}:${c.title}:${c.isActive}`)
    .sort()
    .join('|');
};

// Helper function to compare English levels
const compareEnglishLevels = (userLevel: EnglishLevel, requiredLevel: EnglishLevel): boolean => {
  const levels: EnglishLevel[] = ['None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const userIndex = levels.indexOf(userLevel);
  const requiredIndex = levels.indexOf(requiredLevel);
  return userIndex >= requiredIndex;
};

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                 import.meta.env.GEMINI_API_KEY || 
                 (typeof process !== 'undefined' && process.env?.API_KEY) ||
                 (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY);
  
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment variables.");
    throw new Error("API Key configuration error. Please set VITE_GEMINI_API_KEY in your .env file.");
  }
  return new GoogleGenAI({ apiKey });
};

// Check if we need to reinitialize the chat session
const shouldReinitialize = async (language: Language, userProfile?: UserProfile): Promise<{ needsReinit: boolean; courses: Course[] }> => {
  // Load courses from database
  let availableCourses: Course[] = [];
  try {
    availableCourses = await db.getActiveCourses('en');
    
    // Verify no inactive courses slipped through
    availableCourses = availableCourses.filter(c => c.isActive !== false);
  } catch (error) {
    console.error('Failed to load courses from database:', error);
    availableCourses = [];
  }

  const currentHash = createCoursesHash(availableCourses);
  const currentEnglishLevel = userProfile?.englishLevel || 'None';
  
  // Check if courses changed, language changed, English level changed, or no session exists
  const needsReinit = !chatSession || 
                      currentHash !== lastCoursesHash || 
                      language !== lastLanguage ||
                      currentEnglishLevel !== lastEnglishLevel;
  
  if (import.meta.env.DEV && needsReinit) {
    const reason = !chatSession ? 'no session' : 
                   currentHash !== lastCoursesHash ? 'courses changed' : 
                   language !== lastLanguage ? 'language changed' :
                   'English level changed';
    console.log(`[Gemini] Reinitializing chat session (reason: ${reason})`);
  }
  
  return { needsReinit, courses: availableCourses };
};

export const initializeChat = async (userProfile?: UserProfile, language: Language = 'en', forcedCourses?: Course[]): Promise<Chat> => {
  const ai = getAiClient();
  
  // Use provided courses or load from database
  const availableCourses = forcedCourses || await (async () => {
    try {
      const courses = await db.getActiveCourses('en');
      return courses.filter(c => c.isActive !== false);
    } catch (error) {
      console.error('Failed to load courses from database:', error);
      return [];
    }
  })();

  if (import.meta.env.DEV && availableCourses.length > 0) {
    console.log(`[Gemini] Bot has ${availableCourses.length} courses available`);
  }

  // Build compact course list for bot (saves ~60% tokens vs JSON)
  const courseListForBot = availableCourses.map(c => {
    const level = c.minEnglishLevel || 'None';
    const levelStr = level === 'None' ? '' : ` [${level}+]`;
    return `• **${c.title}**${levelStr} — ${c.description}`;
  }).join('\n');

  // Load bot instructions from database
  let mainInstructions = '';
  let contactsInstructions = '';
  let externalLinksInstructions = '';
  
  try {
    mainInstructions = await db.getBotInstructions('main', 'en');
    contactsInstructions = await db.getBotInstructions('contacts', 'en');
    externalLinksInstructions = await db.getBotInstructions('external_links', 'en');
    
    if (import.meta.env.DEV) {
      console.log('[Gemini] Loaded instructions from database:', {
        main: mainInstructions ? `${mainInstructions.length} chars` : 'empty',
        contacts: contactsInstructions ? `${contactsInstructions.length} chars` : 'empty',
        external_links: externalLinksInstructions ? `${externalLinksInstructions.length} chars` : 'empty'
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Gemini] Failed to load bot instructions from database:', error);
    }
  }

  if (!mainInstructions || mainInstructions.trim() === '') {
    throw new Error('Bot instructions are not configured. Please set up bot instructions in the admin panel.');
  }

  // Build instructions with compact course list
  let instructions = mainInstructions.replace('{{COURSES_LIST}}', courseListForBot);
  
  if (!mainInstructions.includes('{{COURSES_LIST}}')) {
    instructions += `\n\n📚 Available courses:\n${courseListForBot}\n\n⚠️ ONLY recommend courses from this list.`;
  }

  if (contactsInstructions && contactsInstructions.trim()) {
    instructions += `\n\n📇 Contact Information:\n${contactsInstructions}`;
  }

  if (externalLinksInstructions && externalLinksInstructions.trim()) {
    instructions += `\n\n🔗 External Resources:\n${externalLinksInstructions}`;
  }

  // Add user's English level to help bot make appropriate recommendations
  if (userProfile?.englishLevel) {
    const userLevel = userProfile.englishLevel;
    instructions += `\n\n👤 USER'S ENGLISH LEVEL: ${userLevel}`;
    instructions += `\nWhen recommending courses, compare user's level (${userLevel}) with course requirements [A1+], [A2+], [B1+], [B2+].`;
    instructions += `\nIf user's level is BELOW the requirement: still suggest the course, but kindly note they should improve their English first. Recommend ETB Cork for free English courses.`;
    instructions += `\nIf user's level is SUFFICIENT: recommend the course without English warnings.`;
    instructions += `\nLevel hierarchy: None < A1 < A2 < B1 < B2 < C1 < C2`;
  }

  if (import.meta.env.DEV) {
    console.log(`[Gemini] Instructions prepared with ${availableCourses.length} courses, user level: ${userProfile?.englishLevel || 'unknown'}`);
  }

  if (availableCourses.length === 0) {
    console.warn('[Gemini] WARNING: No courses loaded! Bot will have no courses to recommend.');
  }

  // Create chat session
  try {
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash-lite',
      config: {
        systemInstruction: instructions,
        temperature: 0.7,
      },
    });
  } catch (error) {
    console.warn('gemini-2.5-flash-lite not available, trying gemini-3-flash-preview');
    chatSession = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: instructions,
        temperature: 0.7,
      },
    });
  }
  
  // Update cache
  lastCoursesHash = createCoursesHash(availableCourses);
  lastLanguage = language;
  lastEnglishLevel = userProfile?.englishLevel || 'None';
  
  return chatSession;
};

export const sendMessageToGemini = async function* (message: string, userProfile?: UserProfile, language: Language = 'en') {
  // Check if we need to reinitialize (pass userProfile to check English level changes)
  const { needsReinit, courses } = await shouldReinitialize(language, userProfile);
  
  if (needsReinit) {
    try {
      chatSession = await initializeChat(userProfile, language, courses);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      if (!chatSession) {
        throw new Error("Failed to initialize chat session.");
      }
    }
  }

  if (!chatSession) {
    throw new Error("Failed to initialize chat session.");
  }

  try {
    const responseStream = await chatSession.sendMessageStream({ message });

    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        yield c.text;
      }
    }
  } catch (error: any) {
    console.error("Error communicating with Gemini:", error);
    
    // If session error, try to reinitialize once
    if (error?.message?.includes('session') || error?.status === 400) {
      console.log('[Gemini] Session error, attempting to reinitialize...');
      chatSession = null; // Force reinit
      lastCoursesHash = ''; // Force courses reload
      
      try {
        const { courses: freshCourses } = await shouldReinitialize(language, userProfile);
        chatSession = await initializeChat(userProfile, language, freshCourses);
        
        // Retry the message
        const retryStream = await chatSession.sendMessageStream({ message });
        for await (const chunk of retryStream) {
          const c = chunk as GenerateContentResponse;
          if (c.text) {
            yield c.text;
          }
        }
        return;
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
      }
    }
    
    // Provide specific error messages
    if (error?.status === 403 || error?.code === 403) {
      throw new Error("API access forbidden. Please check your API key and permissions.");
    } else if (error?.status === 429 || error?.code === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error?.status === 401 || error?.code === 401) {
      throw new Error("Invalid API key. Please check your configuration.");
    } else if (error?.message) {
      throw new Error(error.message);
    } else {
      throw new Error("Connection error. Please check your internet connection and try again.");
    }
  }
};

// Force reinitialize on next message (call when courses are updated)
export const invalidateChatCache = () => {
  chatSession = null;
  lastCoursesHash = '';
  lastEnglishLevel = 'None';
  if (import.meta.env.DEV) {
    console.log('[Gemini] Chat cache invalidated');
  }
};
