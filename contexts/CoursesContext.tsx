import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Course, CourseCategory, Language } from '../types';
import { db, supabase } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { sortCoursesByDifficulty, sortCoursesWithRegistrations } from '../utils/courseUtils';

interface CoursesContextValue {
  courses: Course[];
  categories: CourseCategory[];
  registrations: string[];
  completedCourses: string[];
  courseQueues: Map<string, number>;
  isLoading: boolean;
  error: string | null;
  toggleRegistration: (courseId: string, language: Language) => Promise<{ success: boolean; error?: string }>;
  refreshCourses: () => Promise<void>;
  refreshRegistrations: () => Promise<void>;
  updatePriority: (courseId: string, newPriority: number) => Promise<void>;
}

const CoursesContext = createContext<CoursesContextValue | undefined>(undefined);

export const useCourses = () => {
  const context = useContext(CoursesContext);
  if (!context) {
    throw new Error('useCourses must be used within a CoursesProvider');
  }
  return context;
};

interface CoursesProviderProps {
  children: ReactNode;
  language: Language;
}

export const CoursesProvider: React.FC<CoursesProviderProps> = ({ children, language }) => {
  const [rawCourses, setRawCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [registrations, setRegistrations] = useState<string[]>([]);
  const [completedCourses, setCompletedCourses] = useState<string[]>([]);
  const [courseQueues, setCourseQueues] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized sorted courses: registered first, then by difficulty
  // Filter out completed courses - users shouldn't see them in the catalog
  const courses = useMemo(() => {
    const filteredCourses = rawCourses.filter(c => !completedCourses.includes(c.id));
    return sortCoursesWithRegistrations(filteredCourses, registrations);
  }, [rawCourses, registrations, completedCourses]);

  const loadCourses = useCallback(async () => {
    try {
      const loadedCourses = await db.getAllCourses(false, language);
      const sortedCourses = sortCoursesByDifficulty(loadedCourses);
      setRawCourses(sortedCourses);
    } catch (err: any) {
      if (!err?.message?.includes('Not authenticated')) {
        console.error('Failed to load courses:', err);
        setError(err.message);
      }
    }
  }, [language]);

  const loadRegistrations = useCallback(async () => {
    try {
      const regs = await db.getRegistrations();
      setRegistrations(regs.map(r => r.courseId));
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to load registrations:', err);
      }
    }
  }, []);

  const loadCompletedCourses = useCallback(async () => {
    try {
      const completed = await db.getUserCompletedCourses();
      setCompletedCourses(completed.map(c => c.courseId));
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to load completed courses:', err);
      }
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await db.getCategories();
      setCategories(cats);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to load categories:', err);
      }
    }
  }, []);

  const loadQueues = useCallback(async () => {
    try {
      const queues = await db.getCourseQueues();
      const queueMap = new Map<string, number>();
      queues.forEach(q => {
        queueMap.set(q.courseId, q.queueLength);
      });
      setCourseQueues(queueMap);
    } catch (err: any) {
      if (!err?.message?.includes('Not authenticated') && !err?.message?.includes('authentication')) {
        if (import.meta.env.DEV) {
          console.error('Failed to load course queues:', err);
        }
      }
    }
  }, []);

  const refreshCourses = useCallback(async () => {
    await loadCourses();
  }, [loadCourses]);

  const refreshRegistrations = useCallback(async () => {
    await Promise.all([loadRegistrations(), loadQueues(), loadCompletedCourses()]);
  }, [loadRegistrations, loadQueues, loadCompletedCourses]);

  const refreshCategories = useCallback(async () => {
    await loadCategories();
  }, [loadCategories]);

  // Initial load and Supabase Realtime setup
  useEffect(() => {
    let channel: any = null;

    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadCourses(), loadRegistrations(), loadQueues(), loadCompletedCourses(), loadCategories()]);
      setIsLoading(false);
    };

    init();

    // Setup Supabase Realtime instead of polling
    if (supabase) {
      // Get current user ID for filtering (if available)
      let currentUserId: string | null = null;
      try {
        const session = db.getCurrentSession();
        currentUserId = session?.id || null;
      } catch (e) {
        // Session might not be available yet
      }

      channel = supabase
        .channel('courses-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'courses' },
          () => {
            loadCourses();
            loadQueues(); // Course changes might affect queue display
          }
        )
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'registrations',
            // Filter by user_id if available (RLS should handle this, but explicit filter helps)
            ...(currentUserId ? { filter: `user_id=eq.${currentUserId}` } : {})
          },
          () => {
            // Reload all registration-related data when registrations change
            loadRegistrations();
            loadQueues();
            loadCompletedCourses();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'course_completions' },
          () => {
            // Reload completed courses when completions change
            loadCompletedCourses();
            loadRegistrations(); // Also reload registrations as completed courses affect what's shown
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'course_sessions' },
          () => {
            // Reload queues when session capacity changes (affects queue length)
            loadQueues();
            loadCourses(); // Sessions affect course display too
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'course_categories' },
          () => {
            // Reload categories when they change
            loadCategories();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadCourses, loadRegistrations, loadQueues, loadCompletedCourses, loadCategories]);

  // Reload courses when language changes
  useEffect(() => {
    loadCourses();
  }, [language, loadCourses]);

  const toggleRegistration = useCallback(async (courseId: string, language: Language): Promise<{ success: boolean; error?: string }> => {
    const t = TRANSLATIONS[language] as any;
    const isRegistered = registrations.includes(courseId);
    const isCompleted = completedCourses.includes(courseId);
    
    // Check if course is already completed - prevent re-registration
    if (!isRegistered && isCompleted) {
      return { success: false, error: t.courseAlreadyCompleted || 'This course has already been completed. You cannot register for it again.' };
    }
    
    // Optimistic update
    if (isRegistered) {
      setRegistrations(prev => prev.filter(id => id !== courseId));
      setCourseQueues(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(courseId) || 0;
        newMap.set(courseId, Math.max(0, currentCount - 1));
        return newMap;
      });
    } else {
      // Check registration limit
      const maxRegistrations = await db.getMaxCourseRegistrations();
      if (registrations.length >= maxRegistrations) {
        return { success: false, error: t.maxCoursesReached || `Maximum ${maxRegistrations} courses allowed` };
      }
      
      // Check if profile is complete before allowing registration
      const isComplete = await db.isProfileComplete();
      if (!isComplete) {
        return { success: false, error: t.profileIncompleteDesc || 'Please complete your profile before registering for courses.' };
      }
      
      // Optimistic update for registration
      setRegistrations(prev => [...prev, courseId]);
      setCourseQueues(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(courseId) || 0;
        newMap.set(courseId, currentCount + 1);
        return newMap;
      });
    }

    try {
      if (isRegistered) {
        await db.removeRegistration(courseId);
      } else {
        await db.addRegistration(courseId);
      }
      
      // Always reload from database after successful operation to ensure sync
      // No delay needed - let realtime subscriptions handle rapid updates
      await Promise.all([
        loadRegistrations(), // Reload registrations from DB
        loadQueues(),        // Reload queues from DB
        loadCompletedCourses() // Reload completions from DB
      ]);
      
      return { success: true };
    } catch (err: any) {
      // Rollback on error - reload all data to ensure UI is in sync
      await Promise.all([loadRegistrations(), loadQueues(), loadCompletedCourses()]);
      return { success: false, error: err.message || 'Failed to update registration' };
    }
  }, [registrations, completedCourses, loadRegistrations, loadQueues, loadCompletedCourses]);

  const updatePriority = useCallback(async (courseId: string, newPriority: number) => {
    try {
      await db.updateRegistrationPriority(courseId, newPriority);
      // Refresh all registration data including priorities
      await refreshRegistrations();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Failed to update priority", err);
      }
      throw err; // Re-throw to let Dashboard handle the error
    }
  }, [refreshRegistrations]);

  const value: CoursesContextValue = {
    courses,
    categories,
    registrations,
    completedCourses,
    courseQueues,
    isLoading,
    error,
    toggleRegistration,
    refreshCourses,
    refreshRegistrations,
    updatePriority
  };

  return (
    <CoursesContext.Provider value={value}>
      {children}
    </CoursesContext.Provider>
  );
};
