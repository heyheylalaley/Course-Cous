import React, { useState, useEffect } from 'react';
import { Language, AdminCourseStats, Registration, UserProfile, EnglishLevel } from '../types';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { BarChart3, Users, BookOpen, TrendingUp, Calendar, Globe } from 'lucide-react';

interface AdminAnalyticsProps {
  language: Language;
}

interface AnalyticsData {
  totalUsers: number;
  totalRegistrations: number;
  totalCourses: number;
  registrationsByCourse: AdminCourseStats[];
  registrationsByEnglishLevel: Record<EnglishLevel, number>;
  registrationsByDate: Array<{ date: string; count: number }>;
  topCourses: Array<{ courseId: string; courseTitle: string; count: number }>;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ language }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load all necessary data
      const [courseStats, allRegistrations, allProfiles] = await Promise.all([
        db.getAdminCourseStats(),
        db.getAllRegistrations(),
        db.getAllProfiles()
      ]);

      // Calculate statistics
      const totalUsers = allProfiles.length;
      const totalRegistrations = allRegistrations.length;
      const totalCourses = courseStats.length;

      // Group registrations by English level
      const registrationsByEnglishLevel: Record<EnglishLevel, number> = {
        'None': 0,
        'A1': 0,
        'A2': 0,
        'B1': 0,
        'B2': 0,
        'C1': 0,
        'C2': 0
      };

      allRegistrations.forEach(reg => {
        const profile = allProfiles.find(p => p.id === reg.userId);
        if (profile && profile.englishLevel) {
          registrationsByEnglishLevel[profile.englishLevel] = 
            (registrationsByEnglishLevel[profile.englishLevel] || 0) + 1;
        }
      });

      // Group registrations by date (last 30 days)
      const dateMap = new Map<string, number>();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      allRegistrations.forEach(reg => {
        const regDate = new Date(reg.registeredAt);
        if (regDate >= thirtyDaysAgo) {
          const dateKey = regDate.toISOString().split('T')[0];
          dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
        }
      });

      const registrationsByDate = Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top courses
      const topCourses = courseStats
        .sort((a, b) => b.registrantCount - a.registrantCount)
        .slice(0, 5)
        .map(stat => ({
          courseId: stat.courseId,
          courseTitle: stat.courseTitle,
          count: stat.registrantCount
        }));

      setAnalytics({
        totalUsers,
        totalRegistrations,
        totalCourses,
        registrationsByCourse: courseStats,
        registrationsByEnglishLevel,
        registrationsByDate,
        topCourses
      });
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const maxRegistrations = Math.max(...analytics.registrationsByCourse.map(s => s.registrantCount), 1);
  const maxByDate = Math.max(...analytics.registrationsByDate.map(d => d.count), 1);
  const maxByLevel = Math.max(...Object.values(analytics.registrationsByEnglishLevel), 1);

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {language === 'ru' ? 'Всего пользователей' : language === 'ua' ? 'Всього користувачів' : language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {language === 'ru' ? 'Всего регистраций' : language === 'ua' ? 'Всього реєстрацій' : language === 'ar' ? 'إجمالي التسجيلات' : 'Total Registrations'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalRegistrations}</p>
            </div>
            <BookOpen className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {language === 'ru' ? 'Всего курсов' : language === 'ua' ? 'Всього курсів' : language === 'ar' ? 'إجمالي الدورات' : 'Total Courses'}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalCourses}</p>
            </div>
            <Globe className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Top Courses */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {language === 'ru' ? 'Топ-5 курсов' : language === 'ua' ? 'Топ-5 курсів' : language === 'ar' ? 'أفضل 5 دورات' : 'Top 5 Courses'}
        </h3>
        <div className="space-y-3">
          {analytics.topCourses.map((course, index) => (
            <div key={course.courseId} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{course.courseTitle}</p>
                <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all"
                    style={{ width: `${(course.count / maxRegistrations) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{course.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Registrations by English Level */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {language === 'ru' ? 'Регистрации по уровню английского' : language === 'ua' ? 'Реєстрації за рівнем англійської' : language === 'ar' ? 'التسجيلات حسب مستوى اللغة الإنجليزية' : 'Registrations by English Level'}
        </h3>
        <div className="space-y-3">
          {(['None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as EnglishLevel[]).map(level => {
            const count = analytics.registrationsByEnglishLevel[level] || 0;
            return (
              <div key={level} className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300">{level}</div>
                <div className="flex-1">
                  <div className="mt-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 dark:bg-green-400 rounded-full transition-all"
                      style={{ width: `${(count / maxByLevel) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 w-12 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Registrations Over Time (Last 30 Days) */}
      {analytics.registrationsByDate.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {language === 'ru' ? 'Регистрации за последние 30 дней' : language === 'ua' ? 'Реєстрації за останні 30 днів' : language === 'ar' ? 'التسجيلات خلال آخر 30 يومًا' : 'Registrations Over Last 30 Days'}
          </h3>
          <div className="flex items-end gap-1 h-48">
            {analytics.registrationsByDate.map((item, index) => {
              const height = (item.count / maxByDate) * 100;
              const date = new Date(item.date);
              const dayLabel = date.getDate().toString();
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: '180px' }}>
                    <div
                      className="w-full bg-indigo-600 dark:bg-indigo-400 rounded-t transition-all hover:bg-indigo-700 dark:hover:bg-indigo-500"
                      style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                      title={`${dayLabel}: ${item.count}`}
                    />
                  </div>
                  {index % 5 === 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{dayLabel}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Courses Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {language === 'ru' ? 'Регистрации по всем курсам' : language === 'ua' ? 'Реєстрації за всіма курсами' : language === 'ar' ? 'التسجيلات لجميع الدورات' : 'Registrations by All Courses'}
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {analytics.registrationsByCourse.map(stat => (
            <div key={stat.courseId} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{stat.courseTitle}</p>
                <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all"
                    style={{ width: `${(stat.registrantCount / maxRegistrations) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex-shrink-0">{stat.registrantCount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
