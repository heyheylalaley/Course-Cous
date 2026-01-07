import { useState, useEffect, useCallback } from 'react';
import { Course, Language } from '../types';
import { db, supabase } from '../services/db';
import { AVAILABLE_COURSES } from '../constants';

// Helper function to sort courses by difficulty (Beginner -> Intermediate -> Advanced)
const sortCoursesByDifficulty = (courses: Course[]): Course[] => {
  const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
  return [...courses].sort((a, b) => {
    const aOrder = difficultyOrder[a.difficulty] || 999;
    const bOrder = difficultyOrder[b.difficulty] || 999;
    return aOrder - bOrder;
  });
};

export const useCourses = (includeInactive: boolean = false, language: Language = 'en') => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedCourses = await db.getAllCourses(includeInactive, language);
      const sortedCourses = sortCoursesByDifficulty(loadedCourses);
      setCourses(sortedCourses);
    } catch (err: any) {
      // Don't log "Not authenticated" errors - they're expected on login page
      if (err?.message?.includes('Not authenticated') || err?.message?.includes('authentication')) {
        const sortedFallback = sortCoursesByDifficulty(AVAILABLE_COURSES);
        setCourses(sortedFallback);
        setIsLoading(false);
        return;
      }
      console.error('Failed to load courses:', err);
      setError(err.message);
      const sortedFallback = sortCoursesByDifficulty(AVAILABLE_COURSES);
      setCourses(sortedFallback);
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive, language]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    // Initial load
    loadCourses();

    // Setup Supabase Realtime subscription (no polling)
    if (supabase) {
      channel = supabase
        .channel('courses-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'courses' },
          (payload) => {
            if (import.meta.env.DEV) {
              console.log('[useCourses] Course change detected:', payload.eventType);
            }
            loadCourses();
          }
        )
        .subscribe((status) => {
          if (import.meta.env.DEV) {
            console.log('[useCourses] Realtime subscription status:', status);
          }
        });
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadCourses]);

  return { courses, isLoading, error, refreshCourses: loadCourses };
};
