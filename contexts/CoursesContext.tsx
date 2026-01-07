import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Course, Registration, CourseQueue, Language } from '../types';
import { db, supabase } from '../services/db';
import { TRANSLATIONS } from '../translations';

interface CoursesContextValue {
  courses: Course[];
  registrations: string[];
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

// Helper function to sort courses by difficulty
const sortCoursesByDifficulty = (courses: Course[]): Course[] => {
  const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
  return [...courses].sort((a, b) => {
    const aOrder = difficultyOrder[a.difficulty] || 999;
    const bOrder = difficultyOrder[b.difficulty] || 999;
    return aOrder - bOrder;
  });
};

export const CoursesProvider: React.FC<CoursesProviderProps> = ({ children, language }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [registrations, setRegistrations] = useState<string[]>([]);
  const [courseQueues, setCourseQueues] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    try {
      const loadedCourses = await db.getAllCourses(false, language);
      const sortedCourses = sortCoursesByDifficulty(loadedCourses);
      setCourses(sortedCourses);
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
    await Promise.all([loadRegistrations(), loadQueues()]);
  }, [loadRegistrations, loadQueues]);

  // Initial load and Supabase Realtime setup
  useEffect(() => {
    let channel: any = null;

    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadCourses(), loadRegistrations(), loadQueues()]);
      setIsLoading(false);
    };

    init();

    // Setup Supabase Realtime instead of polling
    if (supabase) {
      channel = supabase
        .channel('courses-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'courses' },
          () => {
            loadCourses();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'registrations' },
          () => {
            loadQueues();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadCourses, loadRegistrations, loadQueues]);

  // Reload courses when language changes
  useEffect(() => {
    loadCourses();
  }, [language, loadCourses]);

  const toggleRegistration = useCallback(async (courseId: string, language: Language): Promise<{ success: boolean; error?: string }> => {
    const t = TRANSLATIONS[language];
    const isRegistered = registrations.includes(courseId);
    
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
      if (registrations.length >= 3) {
        return { success: false, error: t.maxCoursesReached || 'Maximum 3 courses allowed' };
      }
      
      // Check if profile is complete before allowing registration
      const isComplete = await db.isProfileComplete();
      if (!isComplete) {
        return { success: false, error: t.profileIncompleteDesc || 'Please complete your profile before registering for courses.' };
      }
      
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
      
      // Refresh queues to ensure sync
      await loadQueues();
      return { success: true };
    } catch (err: any) {
      // Rollback on error
      await Promise.all([loadRegistrations(), loadQueues()]);
      return { success: false, error: err.message || 'Failed to update registration' };
    }
  }, [registrations, loadRegistrations, loadQueues]);

  const updatePriority = useCallback(async (courseId: string, newPriority: number) => {
    try {
      await db.updateRegistrationPriority(courseId, newPriority);
      await loadRegistrations();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Failed to update priority", err);
      }
    }
  }, [loadRegistrations]);

  const value: CoursesContextValue = {
    courses,
    registrations,
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
