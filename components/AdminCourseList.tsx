import React from 'react';
import { AdminCourseStats, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { BookOpen, Users, ChevronRight } from 'lucide-react';

interface AdminCourseListProps {
  courseStats: AdminCourseStats[];
  language: Language;
  onCourseSelect: (courseId: string) => void;
}

export const AdminCourseList: React.FC<AdminCourseListProps> = ({
  courseStats,
  language,
  onCourseSelect
}) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  const totalRegistrants = courseStats.reduce((sum, stat) => sum + stat.registrantCount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t.adminTotalRegistrants || 'Total Registrants'}
            </h2>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {totalRegistrants}
            </p>
          </div>
        </div>
      </div>

      {/* Courses List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen size={20} />
            {t.adminCoursesOverview || 'Courses Overview'}
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {courseStats.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {t.adminNoRegistrations || 'No registrations yet'}
            </div>
          ) : (
            courseStats.map((stat) => (
              <button
                key={stat.courseId}
                onClick={() => onCourseSelect(stat.courseId)}
                className="w-full p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between group"
              >
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {stat.courseTitle}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users size={16} />
                      {stat.registrantCount} {stat.registrantCount === 1 
                        ? (t.adminRegistrant || 'registrant') 
                        : (t.adminRegistrants || 'registrants')}
                    </span>
                  </div>
                </div>
                <ChevronRight 
                  size={20} 
                  className={`text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${isRtl ? 'rotate-180' : ''}`}
                />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
