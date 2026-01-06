import React from 'react';
import { Course, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { BookOpen, Shield, Coffee, Users, Globe, Stethoscope, HardHat, Warehouse, Sparkles, HeartPulse, CheckCircle, PlusCircle, Trash2, Users as UsersIcon } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  isRegistered?: boolean;
  onToggleRegistration?: (courseId: string) => void;
  showRemoveOnly?: boolean;
  language: Language;
  queueLength?: number;
  onViewDetails?: (course: Course) => void;
}

const getIcon = (category: string) => {
  switch (category) {
    case 'Safety': return <HardHat className="w-5 h-5 text-orange-500" />;
    case 'Service': return <Users className="w-5 h-5 text-purple-500" />;
    case 'Security': return <Shield className="w-5 h-5 text-blue-800" />;
    case 'Food Safety': return <BookOpen className="w-5 h-5 text-green-500" />;
    case 'Hospitality': return <Coffee className="w-5 h-5 text-brown-500" />;
    case 'Healthcare': return <HeartPulse className="w-5 h-5 text-red-500" />;
    case 'Education': return <BookOpen className="w-5 h-5 text-indigo-500" />;
    case 'Cleaning': return <Sparkles className="w-5 h-5 text-cyan-500" />;
    case 'Logistics': return <Warehouse className="w-5 h-5 text-slate-500" />;
    default: return <Globe className="w-5 h-5 text-gray-500" />;
  }
};

export const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  isRegistered = false, 
  onToggleRegistration,
  showRemoveOnly = false,
  language,
  queueLength = 0,
  onViewDetails
}) => {
  const t = TRANSLATIONS[language];

  return (
    <div className={`bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border shadow-sm transition-all duration-200 ${
      isRegistered ? 'border-green-200 dark:border-green-800 ring-1 ring-green-100 dark:ring-green-900/30' : 'border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg'
    }`}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getIcon(course.category)}
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
        <button
          onClick={() => onViewDetails?.(course)}
          className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
        >
          {t.viewDetails}
        </button>

        {onToggleRegistration && (
          <button
            onClick={() => onToggleRegistration(course.id)}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0
              ${showRemoveOnly 
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30' 
                : isRegistered 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30' 
                  : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
              }`}
          >
            {showRemoveOnly ? (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                {t.remove}
              </>
            ) : isRegistered ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                {t.registered}
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5" />
                {t.register}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};