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
const shouldReinitialize = async (language: Language): Promise<{ needsReinit: boolean; courses: Course[]; profile: UserProfile | null; completedCourseIds: string[] }> => {
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

  // Load user profile from database (same pattern as courses)
  let userProfile: UserProfile | null = null;
  let completedCourseIds: string[] = [];
  try {
    userProfile = await db.getProfile();
    // Load user's completed courses
    const completedCourses = await db.getUserCompletedCourses();
    completedCourseIds = completedCourses.map(c => c.courseId);
  } catch (error) {
    // User might not be authenticated - that's ok
    if (import.meta.env.DEV) {
      console.log('[Gemini] Could not load user profile:', error);
    }
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
    console.log(`[Gemini] Reinitializing chat session (reason: ${reason}, user level: ${currentEnglishLevel})`);
  }
  
  return { needsReinit, courses: availableCourses, profile: userProfile, completedCourseIds };
};

export const initializeChat = async (userProfile?: UserProfile, language: Language = 'en', forcedCourses?: Course[], completedCourseIds?: string[]): Promise<Chat> => {
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

  // Load completed courses if not provided
  const completedIds = completedCourseIds || await (async () => {
    try {
      const completed = await db.getUserCompletedCourses();
      return completed.map(c => c.courseId);
    } catch (error) {
      return [];
    }
  })();

  if (import.meta.env.DEV && availableCourses.length > 0) {
    console.log(`[Gemini] Bot has ${availableCourses.length} courses available`);
  }

  // Build compact course list for bot (saves ~60% tokens vs JSON)
  // Filter out completed courses from the recommendation list
  const availableForRecommendation = availableCourses.filter(c => !completedIds.includes(c.id));
  const courseListForBot = availableForRecommendation.map(c => {
    const level = c.minEnglishLevel || 'None';
    const levelStr = level === 'None' ? '' : ` [${level}+]`;
    // Format date for bot (e.g., "15 Feb 2026")
    const dateStr = c.nextCourseDate 
      ? ` (next: ${new Date(c.nextCourseDate).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })})`
      : '';
    return `• **${c.title}**${levelStr} — ${c.description}${dateStr}`;
  }).join('\n');

  // Build list of completed courses to inform bot
  const completedCoursesList = completedIds.length > 0 
    ? availableCourses
        .filter(c => completedIds.includes(c.id))
        .map(c => `• ${c.title}`)
        .join('\n')
    : '';

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

  // Get user's English level
  const userLevel = userProfile?.englishLevel || 'None';

  // Build instructions by replacing placeholders
  let instructions = mainInstructions
    .replace(/\{\{COURSES_LIST\}\}/g, courseListForBot)
    .replace(/\{\{USER_ENGLISH_LEVEL\}\}/g, userLevel);

  // Add completed courses info to instructions
  if (completedCoursesList) {
    instructions += `\n\n🏆 ALREADY COMPLETED COURSES (DO NOT recommend these again, user has already completed them):\n${completedCoursesList}\n\nIf user asks about these courses, congratulate them on completing and suggest other courses instead.`;
  }

  // Append contact info if provided (uses {{CONTACTS}} placeholder or appends)
  if (contactsInstructions && contactsInstructions.trim()) {
    if (instructions.includes('{{CONTACTS}}')) {
      instructions = instructions.replace(/\{\{CONTACTS\}\}/g, contactsInstructions);
    } else {
      instructions += `\n\n📇 Contact Information:\n${contactsInstructions}`;
    }
  }

  // Append external links if provided (uses {{EXTERNAL_LINKS}} placeholder or appends)
  if (externalLinksInstructions && externalLinksInstructions.trim()) {
    if (instructions.includes('{{EXTERNAL_LINKS}}')) {
      instructions = instructions.replace(/\{\{EXTERNAL_LINKS\}\}/g, externalLinksInstructions);
    } else {
      instructions += `\n\n🔗 External Resources:\n${externalLinksInstructions}`;
    }
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
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction: instructions,
        temperature: 0.8,
      },
    });
  } catch (error) {
    console.warn('gemini-2.0-flash not available, trying gemini-1.5-flash');
    chatSession = ai.chats.create({
      model: 'gemini-1.5-flash',
      config: {
        systemInstruction: instructions,
        temperature: 0.8,
      },
    });
  }
  
  // Update cache
  lastCoursesHash = createCoursesHash(availableCourses);
  lastLanguage = language;
  lastEnglishLevel = userProfile?.englishLevel || 'None';
  
  return chatSession;
};

export const sendMessageToGemini = async function* (message: string, _userProfile?: UserProfile, language: Language = 'en') {
  // Check if we need to reinitialize - loads fresh profile from database
  const { needsReinit, courses, profile, completedCourseIds } = await shouldReinitialize(language);
  
  if (needsReinit) {
    try {
      // Use the fresh profile from database, not the passed parameter
      chatSession = await initializeChat(profile || undefined, language, courses, completedCourseIds);
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

  // Send message directly - context is already in system instructions
  const enrichedMessage = message;

  try {
    const responseStream = await chatSession.sendMessageStream({ message: enrichedMessage });

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
        const { courses: freshCourses, profile: freshProfile, completedCourseIds: freshCompleted } = await shouldReinitialize(language);
        chatSession = await initializeChat(freshProfile || undefined, language, freshCourses, freshCompleted);
        
        // Retry the message
        const retryEnrichedMessage = message;
        
        const retryStream = await chatSession.sendMessageStream({ message: retryEnrichedMessage });
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
