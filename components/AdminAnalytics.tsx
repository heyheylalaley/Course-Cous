import React, { useState, useEffect } from 'react';
import { Language, AdminCourseStats, EnglishLevel } from '../types';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { BarChart3, Users, BookOpen, TrendingUp, Calendar, Globe, UserCheck, AlertTriangle, Target, Clock } from 'lucide-react';

interface AdminAnalyticsProps {
  language: Language;
}

interface AnalyticsData {
  totalUsers: number;
  totalRegistrations: number;
  totalCourses: number;
  usersWithRegistrations: number;
  usersWithCompleteProfile: number;
  avgRegistrationsPerUser: number;
  registrationsByCourse: AdminCourseStats[];
  registrationsByEnglishLevel: Record<EnglishLevel, number>;
  registrationsByDate: Array<{ date: string; count: number }>;
  topCourses: Array<{ courseId: string; courseTitle: string; count: number }>;
  priorityDistribution: { first: number; second: number; third: number };
  recentRegistrations: number; // last 7 days
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ language }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [courseStats, allRegistrations, allProfiles] = await Promise.all([
        db.getAdminCourseStats(),
        db.getAllRegistrations(),
        db.getAllProfiles()
      ]);

      const totalUsers = allProfiles.length;
      const totalRegistrations = allRegistrations.length;
      const totalCourses = courseStats.length;

      // Users with at least one registration
      const usersWithRegs = new Set(allRegistrations.map(r => r.userId));
      const usersWithRegistrations = usersWithRegs.size;

      // Users with complete profile
      const usersWithCompleteProfile = allProfiles.filter(p => 
        p.firstName && p.lastName && p.mobileNumber && p.address && p.dateOfBirth
      ).length;

      // Average registrations per user
      const avgRegistrationsPerUser = usersWithRegistrations > 0 
        ? Math.round((totalRegistrations / usersWithRegistrations) * 10) / 10 
        : 0;

      // Registrations by English level
      const registrationsByEnglishLevel: Record<EnglishLevel, number> = {
        'None': 0, 'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0, 'C1': 0, 'C2': 0
      };

      allRegistrations.forEach(reg => {
        const profile = allProfiles.find(p => p.id === reg.userId);
        if (profile && profile.englishLevel) {
          registrationsByEnglishLevel[profile.englishLevel] = 
            (registrationsByEnglishLevel[profile.englishLevel] || 0) + 1;
        }
      });

      // Priority distribution
      const priorityDistribution = { first: 0, second: 0, third: 0 };
      allRegistrations.forEach(reg => {
        if (reg.priority === 1) priorityDistribution.first++;
        else if (reg.priority === 2) priorityDistribution.second++;
        else if (reg.priority === 3) priorityDistribution.third++;
      });

      // Generate all 30 days for the chart (fill with 0 for days without registrations)
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

      // Create a map of registrations by date
      const dateCountMap = new Map<string, number>();
      allRegistrations.forEach(reg => {
        const regDate = new Date(reg.registeredAt);
        const dateKey = regDate.toISOString().split('T')[0];
        dateCountMap.set(dateKey, (dateCountMap.get(dateKey) || 0) + 1);
      });

      // Fill all 30 days
      const registrationsByDate: Array<{ date: string; count: number }> = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        registrationsByDate.push({
          date: dateKey,
          count: dateCountMap.get(dateKey) || 0
        });
      }

      // Recent registrations (last 7 days)
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentRegistrations = allRegistrations.filter(reg => 
        new Date(reg.registeredAt) >= sevenDaysAgo
      ).length;

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
        usersWithRegistrations,
        usersWithCompleteProfile,
        avgRegistrationsPerUser,
        registrationsByCourse: courseStats,
        registrationsByEnglishLevel,
        registrationsByDate,
        topCourses,
        priorityDistribution,
        recentRegistrations
      });
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getText = (en: string, ru: string, ua: string, ar: string) => {
    switch (language) {
      case 'ru': return ru;
      case 'ua': return ua;
      case 'ar': return ar;
      default: return en;
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

  if (!analytics) return null;

  const maxRegistrations = Math.max(...analytics.registrationsByCourse.map(s => s.registrantCount), 1);
  const maxByDate = Math.max(...analytics.registrationsByDate.map(d => d.count), 1);
  const maxByLevel = Math.max(...Object.values(analytics.registrationsByEnglishLevel), 1);
  const incompleteProfiles = analytics.totalUsers - analytics.usersWithCompleteProfile;

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                {getText('Total Users', 'Всего пользователей', 'Всього користувачів', 'إجمالي المستخدمين')}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalUsers}</p>
            </div>
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                {getText('Total Registrations', 'Всего регистраций', 'Всього реєстрацій', 'إجمالي التسجيلات')}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalRegistrations}</p>
            </div>
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                {getText('Active Courses', 'Активных курсов', 'Активних курсів', 'الدورات النشطة')}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalCourses}</p>
            </div>
            <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                {getText('Last 7 Days', 'За 7 дней', 'За 7 днів', 'آخر 7 أيام')}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">+{analytics.recentRegistrations}</p>
            </div>
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                {getText('Users Enrolled', 'Зарегистрированы', 'Зареєстровані', 'المستخدمون المسجلون')}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{analytics.usersWithRegistrations}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {Math.round((analytics.usersWithRegistrations / Math.max(analytics.totalUsers, 1)) * 100)}% {getText('of users', 'от всех', 'від усіх', 'من المستخدمين')}
              </p>
            </div>
            <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                {getText('Avg. Courses/User', 'Ср. курсов на юзера', 'Сер. курсів на юзера', 'متوسط الدورات/المستخدم')}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{analytics.avgRegistrationsPerUser}</p>
            </div>
            <Target className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                {getText('Complete Profiles', 'Полных профилей', 'Повних профілів', 'الملفات المكتملة')}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{analytics.usersWithCompleteProfile}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {Math.round((analytics.usersWithCompleteProfile / Math.max(analytics.totalUsers, 1)) * 100)}% {getText('complete', 'заполнено', 'заповнено', 'مكتمل')}
              </p>
            </div>
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-teal-600 dark:text-teal-400" />
          </div>
        </div>

        {incompleteProfiles > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 sm:p-6 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 mb-1">
                  {getText('Incomplete Profiles', 'Неполных профилей', 'Неповних профілів', 'ملفات غير مكتملة')}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300">{incompleteProfiles}</p>
              </div>
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        )}
      </div>

      {/* Registrations Over Time (Last 30 Days) - Fixed Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {getText('Registrations Over Last 30 Days', 'Регистрации за последние 30 дней', 'Реєстрації за останні 30 днів', 'التسجيلات خلال آخر 30 يومًا')}
        </h3>
        <div className="relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>{maxByDate}</span>
            <span>{Math.round(maxByDate / 2)}</span>
            <span>0</span>
          </div>
          
          {/* Chart */}
          <div className="ml-10 overflow-x-auto">
            <div className="flex items-end gap-[2px] h-48 min-w-[600px]">
              {analytics.registrationsByDate.map((item, index) => {
                const height = maxByDate > 0 ? (item.count / maxByDate) * 100 : 0;
                const date = new Date(item.date);
                const dayLabel = date.getDate().toString();
                const monthLabel = date.toLocaleDateString(language === 'ru' ? 'ru' : language === 'ua' ? 'uk' : language === 'ar' ? 'ar' : 'en', { month: 'short' });
                const isWeekStart = date.getDay() === 1;
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <div key={index} className="flex flex-col items-center" style={{ width: '18px' }}>
                    <div 
                      className="relative w-full flex items-end justify-center group"
                      style={{ height: '160px' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {dayLabel} {monthLabel}: {item.count}
                        </div>
                      </div>
                      
                      <div
                        className={`w-3 rounded-t transition-all cursor-pointer ${
                          isToday 
                            ? 'bg-green-500 dark:bg-green-400' 
                            : item.count > 0 
                              ? 'bg-indigo-500 dark:bg-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-500' 
                              : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        style={{ 
                          height: item.count > 0 ? `${Math.max(height, 3)}%` : '2px'
                        }}
                      />
                    </div>
                    {/* Date labels - show every week start or every 5th day */}
                    {(isWeekStart || index === 0 || index === analytics.registrationsByDate.length - 1) && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap">
                        {dayLabel}/{date.getMonth() + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-indigo-500 dark:bg-indigo-400 rounded"></div>
            <span>{getText('Registrations', 'Регистрации', 'Реєстрації', 'التسجيلات')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded"></div>
            <span>{getText('Today', 'Сегодня', 'Сьогодні', 'اليوم')}</span>
          </div>
        </div>
      </div>

      {/* Two columns for Top Courses and Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Courses */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {getText('Top 5 Courses', 'Топ-5 курсов', 'Топ-5 курсів', 'أفضل 5 دورات')}
          </h3>
          <div className="space-y-3">
            {analytics.topCourses.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">{getText('No data', 'Нет данных', 'Немає даних', 'لا توجد بيانات')}</p>
            ) : (
              analytics.topCourses.map((course, index) => (
                <div key={course.courseId} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                    index === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                    index === 2 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                    'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{course.courseTitle}</p>
                    <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all"
                        style={{ width: `${(course.count / maxRegistrations) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{course.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            {getText('Priority Distribution', 'Распределение приоритетов', 'Розподіл пріоритетів', 'توزيع الأولويات')}
          </h3>
          <div className="space-y-4">
            {[
              { label: getText('1st Choice', '1-й выбор', '1-й вибір', 'الخيار الأول'), count: analytics.priorityDistribution.first, color: 'bg-green-500 dark:bg-green-400' },
              { label: getText('2nd Choice', '2-й выбор', '2-й вибір', 'الخيار الثاني'), count: analytics.priorityDistribution.second, color: 'bg-blue-500 dark:bg-blue-400' },
              { label: getText('3rd Choice', '3-й выбор', '3-й вибір', 'الخيار الثالث'), count: analytics.priorityDistribution.third, color: 'bg-gray-500 dark:bg-gray-400' }
            ].map((item, index) => {
              const total = analytics.priorityDistribution.first + analytics.priorityDistribution.second + analytics.priorityDistribution.third;
              const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                    <span className="text-gray-500 dark:text-gray-400">{item.count} ({percent}%)</span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Registrations by English Level */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {getText('Registrations by English Level', 'Регистрации по уровню английского', 'Реєстрації за рівнем англійської', 'التسجيلات حسب مستوى اللغة الإنجليزية')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {(['None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as EnglishLevel[]).map(level => {
            const count = analytics.registrationsByEnglishLevel[level] || 0;
            const percent = maxByLevel > 0 ? Math.round((count / maxByLevel) * 100) : 0;
            return (
              <div key={level} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{level}</div>
                <div className="h-16 flex items-end justify-center mb-2">
                  <div
                    className="w-8 bg-green-500 dark:bg-green-400 rounded-t transition-all"
                    style={{ height: `${Math.max(percent, 5)}%` }}
                  />
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Courses Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {getText('Registrations by All Courses', 'Регистрации по всем курсам', 'Реєстрації за всіма курсами', 'التسجيلات لجميع الدورات')}
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {analytics.registrationsByCourse.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">{getText('No courses', 'Нет курсов', 'Немає курсів', 'لا توجد دورات')}</p>
          ) : (
            analytics.registrationsByCourse.map(stat => (
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
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex-shrink-0 w-8 text-right">{stat.registrantCount}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
