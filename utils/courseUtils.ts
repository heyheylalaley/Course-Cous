import { Course, Language } from '../types';

/**
 * Format priority number as ordinal (1st, 2nd, 3rd, 4th, etc.)
 * Supports English, Ukrainian, Russian, and Arabic
 */
export const formatPriorityLabel = (priority: number, language: Language, t: any): string => {
  // Try to get translation first (for backward compatibility)
  const translationKey = `priority${priority}`;
  if (t[translationKey]) {
    return t[translationKey];
  }

  // Fallback to legacy translations for 1-3
  if (priority === 1 && t.priorityFirst) return t.priorityFirst;
  if (priority === 2 && t.prioritySecond) return t.prioritySecond;
  if (priority === 3 && t.priorityThird) return t.priorityThird;

  // Generate ordinal dynamically
  switch (language) {
    case 'en': {
      // English: 1st, 2nd, 3rd, 4th, etc.
      const lastDigit = priority % 10;
      const lastTwoDigits = priority % 100;
      
      // Special cases: 11th, 12th, 13th (not 11st, 12nd, 13rd)
      if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        return `${priority}th choice`;
      }
      
      if (lastDigit === 1) return `${priority}st choice`;
      if (lastDigit === 2) return `${priority}nd choice`;
      if (lastDigit === 3) return `${priority}rd choice`;
      return `${priority}th choice`;
    }
    
    case 'ua':
    case 'ru': {
      // Ukrainian and Russian: 1-й, 2-й, 3-й, 4-й, etc.
      return `${priority}-й ${language === 'ua' ? 'вибір' : 'выбор'}`;
    }
    
    case 'ar': {
      // Arabic: الخيار الأول, الخيار الثاني, الخيار الثالث, etc.
      const arabicOrdinals: Record<number, string> = {
        1: 'الأول',
        2: 'الثاني',
        3: 'الثالث',
        4: 'الرابع',
        5: 'الخامس',
        6: 'السادس',
        7: 'السابع',
        8: 'الثامن',
        9: 'التاسع',
        10: 'العاشر',
        11: 'الحادي عشر',
        12: 'الثاني عشر',
        13: 'الثالث عشر',
        14: 'الرابع عشر',
        15: 'الخامس عشر',
        16: 'السادس عشر',
        17: 'السابع عشر',
        18: 'الثامن عشر',
        19: 'التاسع عشر',
        20: 'العشرون',
      };
      
      if (arabicOrdinals[priority]) {
        return `الخيار ${arabicOrdinals[priority]}`;
      }
      
      // For numbers > 20, use the number format: الخيار 21, الخيار 22, etc.
      return `الخيار ${priority}`;
    }
    
    default:
      return `${priority}th choice`;
  }
};

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
