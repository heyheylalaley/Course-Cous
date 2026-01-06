import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
// Removed SYSTEM_INSTRUCTION import - we build instructions dynamically to avoid stale course data
import { UserProfile, Language, Course, EnglishLevel } from '../types';
import { db } from './db';

// Helper function to compare English levels
const compareEnglishLevels = (userLevel: EnglishLevel, requiredLevel: EnglishLevel): boolean => {
  const levels: EnglishLevel[] = ['None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const userIndex = levels.indexOf(userLevel);
  const requiredIndex = levels.indexOf(requiredLevel);
  return userIndex >= requiredIndex;
};

let chatSession: Chat | null = null;

const getAiClient = () => {
  // Try multiple ways to get API key (for different build configurations)
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

export const initializeChat = async (userProfile?: UserProfile, language: Language = 'en'): Promise<Chat> => {
  const ai = getAiClient();
  
  // Load courses from database
  let availableCourses: Course[] = [];
  try {
    // Use getActiveCourses which handles both authenticated and public access
    // Use English for bot as it needs consistent language for recommendations
    availableCourses = await db.getActiveCourses('en');
    // Log only in development mode
    if (import.meta.env.DEV) {
      console.log(`[Gemini] Loaded ${availableCourses.length} active courses from database`);
    }
    
    // Verify no inactive courses slipped through
    const inactiveCourses = availableCourses.filter(c => c.isActive === false);
    if (inactiveCourses.length > 0) {
      console.error(`[Gemini] ERROR: Found ${inactiveCourses.length} inactive courses in result:`, inactiveCourses.map(c => c.title));
      availableCourses = availableCourses.filter(c => c.isActive !== false);
    }
  } catch (error) {
    console.error('Failed to load courses from database:', error);
    // IMPORTANT: Don't use fallback if we can't load from DB
    // This ensures we never show inactive courses
    // If DB fails, return empty array - bot will say no courses available
    availableCourses = [];
    console.warn(`[Gemini] Database load failed, using empty course list to prevent showing inactive courses`);
  }

  // CRITICAL: Filter out inactive courses (double-check)
  // This is a safety net - getAllCourses(false) should already filter, but we check again
  availableCourses = availableCourses.filter(course => {
    // Explicitly check isActive - if false or undefined but we want only active, exclude
    // Since we called getAllCourses(false), all courses should be active, but double-check
    if (course.isActive === false) {
      console.warn(`[Gemini] Filtered out inactive course: ${course.title}`);
      return false;
    }
    return true;
  });

  // DON'T filter courses - pass ALL courses to bot so it can mention them even if user's English is insufficient
  // Bot will explain English requirements when needed
  // Log only in development mode
  if (import.meta.env.DEV && availableCourses.length > 0) {
    console.log(`[Gemini] Bot has ${availableCourses.length} courses available`);
  }

  // Build course list for bot with ALL courses
  const courseListForBot = availableCourses.map(c => ({
    title: c.title,
    description: c.description,
    difficulty: c.difficulty,
    link: c.link,
    minEnglishLevel: c.minEnglishLevel || 'None'
  }));

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

  // Check if main instructions are configured
  if (!mainInstructions || mainInstructions.trim() === '') {
    throw new Error('Bot instructions are not configured. Please set up bot instructions in the admin panel.');
  }

  // Replace {{COURSES_LIST}} placeholder with actual course list
  const coursesListJson = JSON.stringify(courseListForBot, null, 2);
  let instructions = mainInstructions.replace('{{COURSES_LIST}}', coursesListJson);
  
  // If template didn't have placeholder, append courses list at the end
  if (!mainInstructions.includes('{{COURSES_LIST}}')) {
    instructions += `\n\nAVAILABLE COURSES LIST:\n${coursesListJson}\n\nCRITICAL: Only recommend courses from this list.`;
  }

  // Add contact information if configured
  if (contactsInstructions && contactsInstructions.trim()) {
    instructions += `\n\nCONTACT INFORMATION:\n${contactsInstructions}\n\nIMPORTANT: You can share this contact information with users when they ask for help, support, or need to reach the training center.`;
  }

  // Add external links if configured
  if (externalLinksInstructions && externalLinksInstructions.trim()) {
    instructions += `\n\nEXTERNAL RESOURCES AND LINKS:\n${externalLinksInstructions}\n\nIMPORTANT: When users ask about courses or services that are NOT in the AVAILABLE COURSES LIST, you can suggest these external resources. For example, if someone asks about English language courses and there are none in the available courses, you can mention ETB or FET links from the list above.`;
  }

  // Log only in development mode
  if (import.meta.env.DEV) {
    console.log(`[Gemini] Instructions prepared with ${courseListForBot.length} courses`);
    console.log(`[Gemini] Course titles in list:`, courseListForBot.map(c => c.title));
    console.log(`[Gemini] Instructions length: ${instructions.length} characters`);
    // Verify courses list is in instructions
    if (!instructions.includes(coursesListJson)) {
      console.error('[Gemini] ERROR: Course list not found in instructions!');
    } else {
      console.log('[Gemini] ✓ Course list successfully inserted into instructions');
    }
  }
  
  // Verify that instructions contain the actual course list
  // This is a safety check to ensure courses are passed correctly
  if (courseListForBot.length === 0) {
    console.warn('[Gemini] WARNING: No courses loaded! Bot will have no courses to recommend.');
  }

  // Try gemini-3-flash-preview first, fallback to gemini-2.0-flash-exp if not available
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
  
  return chatSession;
};

export const sendMessageToGemini = async function* (message: string, userProfile?: UserProfile, language: Language = 'en') {
  // Always reinitialize chat to get latest courses from database
  // This ensures that when courses are updated/deactivated, bot uses the latest list
  try {
    chatSession = await initializeChat(userProfile, language);
  } catch (error) {
    console.error('Failed to initialize chat:', error);
    // If initialization fails, try to use existing session
    if (!chatSession) {
      throw new Error("Failed to initialize chat session.");
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
    
    // Provide more specific error messages
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
