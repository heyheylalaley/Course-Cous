import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { UserProfile, Language, Course, EnglishLevel, CalendarEvent } from '../types';
import { db, supabase } from './db';

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

// Helper function to format calendar events for bot prompt
const formatUpcomingEvents = (events: CalendarEvent[]): string => {
  if (!events || events.length === 0) {
    return '';
  }

  // Filter: only future public events
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of day for comparison

  const upcomingEvents = events
    .filter(event => {
      // Only public events
      if (!event.isPublic) return false;
      
      // Only future events (including today)
      const eventDate = new Date(event.eventDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    // Sort by date (nearest first)
    .sort((a, b) => {
      const dateA = new Date(a.eventDate).getTime();
      const dateB = new Date(b.eventDate).getTime();
      return dateA - dateB;
    });

  if (upcomingEvents.length === 0) {
    return '';
  }

  // Format each event
  return upcomingEvents.map(event => {
    const eventDate = new Date(event.eventDate);
    const dateStr = eventDate.toLocaleDateString('en-IE', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    
    const timeStr = event.eventTime 
      ? `, ${event.eventTime}` 
      : '';
    
    let eventText = `• **${event.title}** (${dateStr}${timeStr})`;
    
    if (event.description) {
      eventText += `\n  ${event.description}`;
    }
    
    if (event.externalLink) {
      eventText += `\n  [External Link](${event.externalLink})`;
    }
    
    return eventText;
  }).join('\n\n');
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

// Load courses with all translations (kept for potential future use, but bot now receives only English)
const loadCoursesWithAllTranslations = async (): Promise<(Course & { _translations?: Record<string, { title: string | null; description: string }> })[]> => {
  if (!supabase) {
    // Fallback: load with default language
    return await db.getActiveCourses('en') as any;
  }

  try {
    // Load all active courses
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('title', { ascending: true });

    if (coursesError) throw new Error(coursesError.message);
    if (!coursesData || coursesData.length === 0) return [];

    // Load ALL translations for all courses at once
    const courseIds = coursesData.map((c: any) => c.id);
    const { data: translationsData, error: translationsError } = await supabase
      .from('course_translations')
      .select('course_id, language, title, description')
      .in('course_id', courseIds);

    if (translationsError && import.meta.env.DEV) {
      console.warn('[Gemini] Failed to load translations:', translationsError);
    }

    // Build translations map: courseId -> language -> {title, description}
    const translationsMap: Record<string, Record<string, { title: string | null; description: string }>> = {};
    (translationsData || []).forEach((t: any) => {
      if (!translationsMap[t.course_id]) {
        translationsMap[t.course_id] = {};
      }
      translationsMap[t.course_id][t.language] = {
        title: t.title,
        description: t.description
      };
    });

    // Return courses with English descriptions (bot receives only English, translates descriptions itself)
    return coursesData.map((c: any) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      description: c.description, // English description as default
      difficulty: c.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
      nextCourseDate: c.next_course_date ? new Date(c.next_course_date).toISOString().split('T')[0] : undefined,
      minEnglishLevel: c.min_english_level as EnglishLevel | undefined,
      isActive: c.is_active,
      createdAt: c.created_at ? new Date(c.created_at) : undefined,
      updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
      // Store all translations in a custom field for bot
      _translations: translationsMap[c.id] || {}
    } as Course & { _translations?: Record<string, { title: string | null; description: string }> }));
  } catch (error) {
    console.error('Failed to load courses with translations:', error);
    // Fallback to single language
    return await db.getActiveCourses('en') as any;
  }
};

// Check if we need to reinitialize the chat session
const shouldReinitialize = async (language: Language): Promise<{ needsReinit: boolean; courses: Course[]; profile: UserProfile | null; completedCourseIds: string[] }> => {
  // Load courses with all translations (not just UI language)
  let availableCourses: Course[] = [];
  try {
    availableCourses = await loadCoursesWithAllTranslations();
    
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
  
  // Use provided courses or load from database with all translations
  const availableCourses = forcedCourses || await (async () => {
    try {
      const courses = await loadCoursesWithAllTranslations();
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

  // Build compact course list for bot with all translations
  // Filter out completed courses from the recommendation list
  const availableForRecommendation = availableCourses.filter(c => !completedIds.includes(c.id));
  
  // Load next session dates for all courses in parallel
  const courseDatesMap = new Map<string, string | null>();
  await Promise.all(
    availableForRecommendation.map(async (c) => {
      try {
        const date = await db.getNextCourseSessionDate(c.id);
        courseDatesMap.set(c.id, date);
      } catch (error) {
        console.error(`Failed to load session date for course ${c.id}:`, error);
        courseDatesMap.set(c.id, null);
      }
    })
  );
  
  // Build course list with English names and descriptions only
  // Bot will translate descriptions to user's language when responding
  const courseListForBot = availableForRecommendation.map(c => {
    const level = c.minEnglishLevel || 'None';
    const levelStr = level === 'None' ? '' : ` [${level}+]`;
    // Format date for bot (e.g., "15 Feb 2026")
    const nextSessionDate = courseDatesMap.get(c.id);
    const dateStr = nextSessionDate 
      ? ` (next: ${new Date(nextSessionDate).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })})`
      : '';
    
    // Format: Course name and English description only
    // Bot must translate the description to the user's language when responding
    return `• **${c.title}**${levelStr}${dateStr}
  ${c.description}`;
  }).join('\n\n');

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

  // Load and format upcoming public calendar events
  let upcomingEventsText = '';
  try {
    const allEvents = await db.getCalendarEvents(false); // false = only public events
    upcomingEventsText = formatUpcomingEvents(allEvents);
    
    if (import.meta.env.DEV) {
      console.log('[Gemini] Loaded calendar events:', {
        total: allEvents.length,
        upcoming: upcomingEventsText ? upcomingEventsText.split('\n\n').length : 0
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Gemini] Failed to load calendar events:', error);
    }
  }

  // Append upcoming events if provided (uses {{UPCOMING_EVENTS}} placeholder or appends)
  if (upcomingEventsText && upcomingEventsText.trim()) {
    if (instructions.includes('{{UPCOMING_EVENTS}}')) {
      instructions = instructions.replace(/\{\{UPCOMING_EVENTS\}\}/g, upcomingEventsText);
    } else {
      instructions += `\n\n📅 Upcoming Public Events:\n${upcomingEventsText}`;
    }
  } else if (instructions.includes('{{UPCOMING_EVENTS}}')) {
    // If placeholder exists but no events, replace with empty string
    instructions = instructions.replace(/\{\{UPCOMING_EVENTS\}\}/g, 'No upcoming public events at this time.');
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
