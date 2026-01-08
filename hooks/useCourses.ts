import { useState, useEffect, useCallback, useRef } from 'react';
import { Course, Language } from '../types';
import { db, supabase } from '../services/db';
import { sortCoursesByDifficulty } from '../utils/courseUtils';

/**
 * Hook for loading courses (used in admin components where includeInactive is needed).
 * For regular user components, use CoursesContext instead.
 * 
 * NOTE: This hook does NOT set up Realtime subscriptions to avoid duplicates
 * with CoursesContext. Admin pages refresh on mount.
 */
export const useCourses = (includeInactive: boolean = false, language: Language = 'en') => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track previous params to avoid unnecessary reloads
  const prevParamsRef = useRef({ includeInactive, language });

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
        setCourses([]);
        setIsLoading(false);
        return;
      }
      if (import.meta.env.DEV) {
        console.error('Failed to load courses:', err);
      }
      setError(err.message);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive, language]);

  // Initial load and reload when params change
  useEffect(() => {
    const paramsChanged = 
      prevParamsRef.current.includeInactive !== includeInactive ||
      prevParamsRef.current.language !== language;
    
    if (paramsChanged || courses.length === 0) {
      prevParamsRef.current = { includeInactive, language };
      loadCourses();
    }
  }, [includeInactive, language, loadCourses, courses.length]);

  return { courses, isLoading, error, refreshCourses: loadCourses };
};
