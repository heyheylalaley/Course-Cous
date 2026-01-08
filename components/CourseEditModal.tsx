import React, { useState, useEffect, useRef } from 'react';
import { Course, Language, EnglishLevel, CourseCategory } from '../types';
import { TRANSLATIONS } from '../translations';
import { X, Save, BookOpen, Calendar } from 'lucide-react';
import { db } from '../services/db';

interface CourseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  language: Language;
  course?: Course | null; // null = create new, Course = edit existing
}

// Fallback categories if database load fails
const DEFAULT_CATEGORIES = [
  'Safety', 'Service', 'Security', 'Food Safety', 'Hospitality',
  'Healthcare', 'Education', 'Cleaning', 'Logistics',
  'Technology', 'Business', 'Retail', 'Construction', 'Beauty',
  'Childcare', 'Agriculture', 'Transportation', 'Social Care', 'Environmental'
];

const DIFFICULTY_LEVELS: ('Beginner' | 'Intermediate' | 'Advanced')[] = ['Beginner', 'Intermediate', 'Advanced'];

const ENGLISH_LEVELS: (EnglishLevel | '')[] = ['', 'None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const CourseEditModal: React.FC<CourseEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  language,
  course
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [nextCourseDate, setNextCourseDate] = useState('');
  const [minEnglishLevel, setMinEnglishLevel] = useState<EnglishLevel | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await db.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load categories:', err);
        // Use default categories as fallback
        setCategories(DEFAULT_CATEGORIES.map((name, index) => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          icon: 'BookOpen',
          color: 'text-gray-500',
          sortOrder: index
        })));
      }
    };
    loadCategories();
  }, []);
  
  // Track which course ID was initialized to prevent resetting form on tab switch
  const initializedCourseIdRef = useRef<string | null>(null);
  const wasOpenRef = useRef<boolean>(false);
  const isRestoringFormRef = useRef(false);
  
  // Save form data to localStorage
  const saveFormDataToStorage = () => {
    if (!isOpen) return;
    
    const formData = {
      title,
      category,
      description,
      difficulty,
      nextCourseDate,
      minEnglishLevel,
      isActive,
      courseId: course?.id || null
    };
    
    localStorage.setItem('courseEditFormData', JSON.stringify(formData));
    console.log('[CourseEditModal] Saved form data to localStorage', formData);
  };
  
  // Restore form data from localStorage
  const restoreFormDataFromStorage = () => {
    if (!isOpen) return;
    
    const savedFormData = localStorage.getItem('courseEditFormData');
    if (savedFormData) {
      try {
        const formData = JSON.parse(savedFormData);
        const currentCourseId = course?.id || null;
        
        // Only restore if it's for the same course (or both are null for new course)
        if (formData.courseId === currentCourseId) {
          console.log('[CourseEditModal] Restoring form data from localStorage', formData);
          isRestoringFormRef.current = true;
          setTitle(formData.title || '');
          setCategory(formData.category || '');
          setDescription(formData.description || '');
          setDifficulty(formData.difficulty || 'Beginner');
          setNextCourseDate(formData.nextCourseDate || '');
          setMinEnglishLevel(formData.minEnglishLevel || '');
          setIsActive(formData.isActive !== false);
          setTimeout(() => {
            isRestoringFormRef.current = false;
          }, 100);
          return true;
        }
      } catch (err) {
        console.error('[CourseEditModal] Failed to restore form data', err);
        localStorage.removeItem('courseEditFormData');
      }
    }
    return false;
  };
  
  // Save form data whenever it changes (debounced)
  useEffect(() => {
    if (!isOpen || isRestoringFormRef.current) return;
    
    const timeoutId = setTimeout(() => {
      saveFormDataToStorage();
    }, 300); // Debounce for 300ms
    
    return () => clearTimeout(timeoutId);
  }, [isOpen, title, category, description, difficulty, nextCourseDate, minEnglishLevel, isActive, course?.id]);
  
  // Wrap onClose with logging and cleanup
  const handleClose = () => {
    console.log('[CourseEditModal] onClose called', {
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
    localStorage.removeItem('courseEditFormData');
    onClose();
  };
  
  // Sync form data when modal opens or course changes (only on actual course change, not on tab switch)
  useEffect(() => {
    console.log('[CourseEditModal] useEffect triggered', {
      isOpen,
      courseId: course?.id,
      courseTitle: course?.title,
      wasOpen: wasOpenRef.current,
      initializedCourseId: initializedCourseIdRef.current,
      timestamp: new Date().toISOString()
    });
    
    // Only process if modal is actually open
    if (!isOpen) {
      console.log('[CourseEditModal] Modal closed - resetting refs');
      // Reset refs when modal closes
      if (wasOpenRef.current) {
        initializedCourseIdRef.current = null;
      }
      wasOpenRef.current = false;
      return;
    }
    
    // Don't reset if modal was already open and we're just losing focus
    // Only initialize if modal just opened or course actually changed
    const currentCourseId = course?.id || null;
    const wasPreviouslyOpen = wasOpenRef.current;
    const courseChanged = initializedCourseIdRef.current !== currentCourseId;
    
    const shouldInitialize = !wasPreviouslyOpen || courseChanged;
    
    console.log('[CourseEditModal] Initialization check', {
      currentCourseId,
      wasPreviouslyOpen,
      courseChanged,
      shouldInitialize
    });
    
    // Always try to restore form data from localStorage first
    const restored = restoreFormDataFromStorage();
    
    if (restored) {
      // Form data was restored from localStorage
      console.log('[CourseEditModal] Form data restored from localStorage');
      initializedCourseIdRef.current = currentCourseId;
      setError(null);
      wasOpenRef.current = true;
      return; // Don't reinitialize if we restored from localStorage
    }
    
    // If no saved data, initialize from course or defaults
    if (shouldInitialize) {
      if (course) {
        console.log('[CourseEditModal] Initializing with course data', course.id);
        setTitle(course.title);
        setCategory(course.category);
        setDescription(course.description);
        setDifficulty(course.difficulty);
        setNextCourseDate(course.nextCourseDate || '');
        setMinEnglishLevel(course.minEnglishLevel || '');
        setIsActive(course.isActive !== false);
        initializedCourseIdRef.current = course.id;
      } else if (!wasPreviouslyOpen) {
        console.log('[CourseEditModal] Initializing for new course');
        // Only reset for new course if modal just opened
        // Don't reset if we're editing and course becomes null temporarily
        setTitle('');
        setCategory('');
        setDescription('');
        setDifficulty('Beginner');
        setNextCourseDate('');
        setMinEnglishLevel('');
        setIsActive(true);
        initializedCourseIdRef.current = null;
      }
      setError(null);
    }
    
    wasOpenRef.current = true;
  }, [isOpen, course?.id]);
  
  // Prevent modal from closing when window loses focus (tab switch)
  useEffect(() => {
    if (!isOpen) return;
    
    const handleVisibilityChange = () => {
      console.log('[CourseEditModal] visibilitychange event', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        timestamp: new Date().toISOString()
      });
    };
    
    const handleBlur = () => {
      console.log('[CourseEditModal] window blur event', {
        timestamp: new Date().toISOString()
      });
    };
    
    const handleFocus = () => {
      console.log('[CourseEditModal] window focus event', {
        timestamp: new Date().toISOString()
      });
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    // Validation
    if (!title.trim()) {
      setError(t.adminCourseTitleRequired || 'Title is required');
      return;
    }
    if (!category.trim()) {
      setError(t.adminCourseCategoryRequired || 'Category is required');
      return;
    }
    if (!description.trim()) {
      setError(t.adminCourseDescriptionRequired || 'Description is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        difficulty,
        nextCourseDate: nextCourseDate || undefined,
        minEnglishLevel: minEnglishLevel || undefined,
        isActive
      });
      console.log('[CourseEditModal] Save successful - closing modal');
      localStorage.removeItem('courseEditFormData'); // Clear saved form data on successful save
      handleClose();
    } catch (err: any) {
      console.error('Failed to save course:', err);
      setError(err?.message || t.adminCourseSaveError || 'Failed to save course');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSaving) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            console.log('[CourseEditModal] Close button clicked');
            handleClose();
          }}
          disabled={isSaving}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-3">
            <BookOpen size={24} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center">
            {course ? (t.adminEditCourse || 'Edit Course') : (t.adminCreateCourse || 'Create Course')}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.adminCourseTitle || 'Title'} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.adminCourseTitlePlaceholder || 'Course title'}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.adminCourseCategory || 'Category'} *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
              >
                <option value="">{t.adminSelectCategory || 'Select category'}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.adminCourseDescription || 'Description'} *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.adminCourseDescriptionPlaceholder || 'Course description'}
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.adminCourseDifficulty || 'Difficulty'}
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
              >
                {DIFFICULTY_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.adminCourseMinEnglish || 'Min English Level'}
              </label>
              <select
                value={minEnglishLevel}
                onChange={(e) => setMinEnglishLevel(e.target.value as EnglishLevel | '')}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
              >
                {ENGLISH_LEVELS.map(level => (
                  <option key={level} value={level}>
                    {level || (t.adminNoRequirement || 'No requirement')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t.adminCourseMinEnglishDesc || 'Bot will not recommend this course if user\'s English level is lower'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.adminCourseNextDate || 'Next Course Date'}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={nextCourseDate}
                  onChange={(e) => setNextCourseDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.adminCourseActive || 'Course is active and visible'}
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              console.log('[CourseEditModal] Cancel button clicked');
              handleClose();
            }}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !category.trim() || !description.trim()}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              title.trim() && category.trim() && description.trim() && !isSaving
                ? 'bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save size={18} />
            {isSaving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
};
