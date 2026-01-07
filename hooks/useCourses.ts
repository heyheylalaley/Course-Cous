import { useState, useEffect } from 'react';
import { Course, Language } from '../types';
import { db, supabase } from '../services/db';
import { AVAILABLE_COURSES } from '../constants';

export const useCourses = (includeInactive: boolean = false, language: Language = 'en') => {
  const [courses, setCourses] = useState<Course[]>(AVAILABLE_COURSES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to sort courses by difficulty (Beginner -> Intermediate -> Advanced)
  const sortCoursesByDifficulty = (courses: Course[]): Course[] => {
    const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
    return [...courses].sort((a, b) => {
      const aOrder = difficultyOrder[a.difficulty] || 999;
      const bOrder = difficultyOrder[b.difficulty] || 999;
      return aOrder - bOrder;
    });
  };

  const loadCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedCourses = await db.getAllCourses(includeInactive, language);
      // Sort courses by difficulty: Beginner -> Intermediate -> Advanced
      const sortedCourses = sortCoursesByDifficulty(loadedCourses);
      setCourses(sortedCourses);
    } catch (err: any) {
      // Don't log "Not authenticated" errors - they're expected on login page
      if (err?.message?.includes('Not authenticated') || err?.message?.includes('authentication')) {
        // Use fallback courses silently
        const sortedFallback = sortCoursesByDifficulty(AVAILABLE_COURSES);
        setCourses(sortedFallback);
        setIsLoading(false);
        return;
      }
      console.error('Failed to load courses:', err);
      setError(err.message);
      // Keep fallback courses on error, also sorted
      const sortedFallback = sortCoursesByDifficulty(AVAILABLE_COURSES);
      setCourses(sortedFallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let channel: any = null;
    
    // Load courses initially
    loadCourses();

    // Set up real-time updates using polling (every 30 seconds)
    // Only poll when window is visible to avoid unnecessary requests
    const setupPolling = () => {
      if (intervalId) clearInterval(intervalId);
      
      intervalId = setInterval(() => {
        // Only reload if window is visible
        if (document.visibilityState === 'visible') {
          loadCourses();
        }
      }, 30000); // 30 seconds
    };
    
    setupPolling();

    // Also try to use Supabase realtime if available
    if (supabase) {
      channel = supabase
        .channel('courses-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'courses' },
          (payload) => {
            // Course change detected (no need to log)
            // Only reload if window is visible
            if (document.visibilityState === 'visible') {
              loadCourses();
            }
          }
        )
        .subscribe();
    }

    // Handle visibility change - pause polling when tab is hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible, reload courses and restart polling
        loadCourses();
        setupPolling();
      } else {
        // Tab is hidden, clear interval to stop polling
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [includeInactive, language]);

  return { courses, isLoading, error, refreshCourses: loadCourses };
};
