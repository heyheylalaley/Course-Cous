import React, { useState, useEffect } from 'react';
import { Course, Language, CourseCategory } from '../types';
import { TRANSLATIONS } from '../translations';
import { X, BookOpen, Shield, Coffee, Users, Globe, HardHat, Warehouse, Sparkles, HeartPulse, Cpu, Briefcase, ShoppingBag, Scissors, Baby, Leaf, Car, Heart, TreePine, Calendar, GraduationCap, Hammer } from 'lucide-react';
import { db } from '../services/db';
import { AVAILABLE_ICONS } from './AdminCategoryManagement';

interface CourseDetailsModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  queueLength: number;
}

// Fallback icon mapping for when categories haven't loaded yet
const FALLBACK_ICONS: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  'Safety': { icon: HardHat, color: 'text-orange-500' },
  'Service': { icon: Users, color: 'text-purple-500' },
  'Security': { icon: Shield, color: 'text-blue-800' },
  'Food Safety': { icon: BookOpen, color: 'text-green-500' },
  'Hospitality': { icon: Coffee, color: 'text-amber-600' },
  'Healthcare': { icon: HeartPulse, color: 'text-red-500' },
  'Education': { icon: GraduationCap, color: 'text-indigo-500' },
  'Cleaning': { icon: Sparkles, color: 'text-cyan-500' },
  'Logistics': { icon: Warehouse, color: 'text-slate-500' },
  'Technology': { icon: Cpu, color: 'text-blue-500' },
  'Business': { icon: Briefcase, color: 'text-gray-700' },
  'Retail': { icon: ShoppingBag, color: 'text-pink-500' },
  'Construction': { icon: Hammer, color: 'text-yellow-600' },
  'Beauty': { icon: Scissors, color: 'text-rose-400' },
  'Childcare': { icon: Baby, color: 'text-sky-400' },
  'Agriculture': { icon: Leaf, color: 'text-green-600' },
  'Transportation': { icon: Car, color: 'text-indigo-400' },
  'Social Care': { icon: Heart, color: 'text-red-400' },
  'Environmental': { icon: TreePine, color: 'text-emerald-500' },
};

const getCategoryIcon = (categoryName: string, categories: CourseCategory[]) => {
  // First try to find in dynamic categories
  const category = categories.find(c => c.name === categoryName);
  if (category) {
    const IconComponent = AVAILABLE_ICONS[category.icon];
    if (IconComponent) {
      return <IconComponent className={`w-6 h-6 ${category.color}`} />;
    }
  }
  
  // Fallback to static mapping
  const fallback = FALLBACK_ICONS[categoryName];
  if (fallback) {
    const FallbackIcon = fallback.icon;
    return <FallbackIcon className={`w-6 h-6 ${fallback.color}`} />;
  }
  
  return <Globe className="w-6 h-6 text-gray-500" />;
};

const TRANSLATIONS_DETAILS: Record<Language, { queue: string; difficulty: string; category: string; description: string; close: string; nextCourseDate: string; notScheduled: string }> = {
  en: {
    queue: 'People in queue',
    difficulty: 'Difficulty',
    category: 'Category',
    description: 'Description',
    close: 'Close',
    nextCourseDate: 'Next Course Date',
    notScheduled: 'Not scheduled yet'
  },
  ua: {
    queue: 'Людей в черзі',
    difficulty: 'Складність',
    category: 'Категорія',
    description: 'Опис',
    close: 'Закрити',
    nextCourseDate: 'Дата наступного курсу',
    notScheduled: 'Ще не заплановано'
  },
  ru: {
    queue: 'Людей в очереди',
    difficulty: 'Сложность',
    category: 'Категория',
    description: 'Описание',
    close: 'Закрыть',
    nextCourseDate: 'Дата следующего курса',
    notScheduled: 'Пока не запланировано'
  },
  ar: {
    queue: 'الأشخاص في قائمة الانتظار',
    difficulty: 'الصعوبة',
    category: 'الفئة',
    description: 'الوصف',
    close: 'إغلاق',
    nextCourseDate: 'تاريخ الدورة القادمة',
    notScheduled: 'لم تتم جدولته بعد'
  }
};

export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({ course, isOpen, onClose, language, queueLength }) => {
  const [categories, setCategories] = useState<CourseCategory[]>([]);

  // Load categories
  useEffect(() => {
    db.getCategories().then(setCategories).catch(console.error);
  }, []);

  if (!isOpen || !course) return null;

  const t = TRANSLATIONS_DETAILS[language];
  const isRtl = language === 'ar';

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="p-2 sm:p-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex-shrink-0">
            {getCategoryIcon(course.category, categories)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {course.category}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                course.difficulty === 'Beginner' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                course.difficulty === 'Intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {course.difficulty}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{course.title}</h2>
          </div>
        </div>

        {/* Queue info */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">{t.queue}</span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{queueLength}</span>
          </div>
        </div>

        {/* Next Course Date */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-300">{t.nextCourseDate}</span>
            </div>
            <span className="text-lg font-bold text-purple-700 dark:text-purple-400">
              {course.nextCourseDate 
                ? new Date(course.nextCourseDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : language === 'ua' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-IE', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })
                : t.notScheduled}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.description}</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">{course.description}</p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};

