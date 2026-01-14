import React, { memo } from 'react';
import { Course, Language, CourseCategory } from '../types';
import { TRANSLATIONS } from '../translations';
import { BookOpen, Shield, Coffee, Users, Globe, HardHat, Warehouse, Sparkles, HeartPulse, Trash2, Users as UsersIcon, Cpu, Briefcase, ShoppingBag, Scissors, Baby, Leaf, Car, Heart, TreePine, GraduationCap, Hammer, CheckCircle } from 'lucide-react';
import { AVAILABLE_ICONS } from './AdminCategoryManagement';

interface CourseCardProps {
  course: Course;
  isRegistered?: boolean;
  onToggleRegistration?: (courseId: string) => void;
  showRemoveOnly?: boolean;
  allowUnregister?: boolean;
  language: Language;
  queueLength?: number;
  onViewDetails?: (course: Course) => void;
  categories?: CourseCategory[]; // Pass from CoursesContext to avoid N+1 queries
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
      return <IconComponent className={`w-5 h-5 ${category.color}`} />;
    }
  }
  
  // Fallback to static mapping
  const fallback = FALLBACK_ICONS[categoryName];
  if (fallback) {
    const FallbackIcon = fallback.icon;
    return <FallbackIcon className={`w-5 h-5 ${fallback.color}`} />;
  }
  
  return <Globe className="w-5 h-5 text-gray-500" />;
};

export const CourseCard: React.FC<CourseCardProps> = memo(({ 
  course, 
  isRegistered = false, 
  onToggleRegistration,
  showRemoveOnly = false,
  allowUnregister = true,
  language,
  queueLength = 0,
  onViewDetails,
  categories = [] // Use categories from props (passed from CoursesContext)
}) => {
  const t = TRANSLATIONS[language];

  return (
    <div className={`bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border shadow-sm transition-all duration-200 ${
      isRegistered ? 'border-green-200 dark:border-green-800 ring-1 ring-green-100 dark:ring-green-900/30' : 'border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg'
    }`}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getCategoryIcon(course.category, categories)}
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
            {course.category}
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
          course.difficulty === 'Beginner' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
          course.difficulty === 'Intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        }`}>
          {course.difficulty}
        </span>
      </div>
      
      <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">{course.title}</h3>
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{course.description}</p>
      
      {/* Queue info */}
      <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500 dark:text-gray-400">
        <UsersIcon className="w-3.5 h-3.5" />
        <span>{queueLength} {language === 'ru' ? 'в очереди' : language === 'ua' ? 'в черзі' : language === 'ar' ? 'في قائمة الانتظار' : 'in queue'}</span>
      </div>
      
      <div className="flex items-center justify-between mt-auto gap-2">
        {onViewDetails ? (
          <button
            onClick={() => onViewDetails(course)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              isRegistered
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }`}
          >
            {isRegistered ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                {t.registered}
              </>
            ) : (
              t.viewDetails
            )}
          </button>
        ) : null}

        {onToggleRegistration && showRemoveOnly && (
          <button
            onClick={() => onToggleRegistration(course.id)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t.remove}
          </button>
        )}
      </div>
    </div>
  );
});

CourseCard.displayName = 'CourseCard';