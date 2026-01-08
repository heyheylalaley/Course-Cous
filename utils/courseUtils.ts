import { Course } from '../types';

/**
 * Sort courses by difficulty (Beginner -> Intermediate -> Advanced)
 */
export const sortCoursesByDifficulty = (courses: Course[]): Course[] => {
  const difficultyOrder: Record<string, number> = { 
    'Beginner': 1, 
    'Intermediate': 2, 
    'Advanced': 3 
  };
  return [...courses].sort((a, b) => {
    const aOrder = difficultyOrder[a.difficulty] || 999;
    const bOrder = difficultyOrder[b.difficulty] || 999;
    return aOrder - bOrder;
  });
};

/**
 * Sort courses with registered first, then by difficulty
 */
export const sortCoursesWithRegistrations = (courses: Course[], registeredIds: string[]): Course[] => {
  const difficultyOrder: Record<string, number> = { 
    'Beginner': 1, 
    'Intermediate': 2, 
    'Advanced': 3 
  };
  const registeredSet = new Set(registeredIds);
  
  return [...courses].sort((a, b) => {
    const aRegistered = registeredSet.has(a.id);
    const bRegistered = registeredSet.has(b.id);
    
    // Registered courses first
    if (aRegistered && !bRegistered) return -1;
    if (!aRegistered && bRegistered) return 1;
    
    // Then sort by difficulty
    const aOrder = difficultyOrder[a.difficulty] || 999;
    const bOrder = difficultyOrder[b.difficulty] || 999;
    return aOrder - bOrder;
  });
};
