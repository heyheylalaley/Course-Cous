import React, { useState, useEffect, memo, useCallback } from 'react';
import { AdminCourseStats, Language } from '../types';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { AdminCourseList } from './AdminCourseList';
import { AdminStudentList } from './AdminStudentList';
import { AdminCourseManagement } from './AdminCourseManagement';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminBotInstructions } from './AdminBotInstructions';
import { AdminAllUsers } from './AdminAllUsers';
import { AdminAppSettings } from './AdminAppSettings';
import { AdminCategoryManagement } from './AdminCategoryManagement';
import { AdminCalendarEvents } from './AdminCalendarEvents';
import { Shield, Users, BookOpen, ArrowLeft, Settings, BarChart3, Bot, Menu, Database, Cog, FolderOpen, Calendar } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useAdminRealtimeUpdates } from '../hooks/useRealtimeSubscription';

interface AdminDashboardProps {
  language: Language;
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = memo(({ language, onBack }) => {
  const [courseStats, setCourseStats] = useState<AdminCourseStats[]>([]);
  
  // Load saved state from localStorage
  const getSavedActiveView = (): 'overview' | 'all-users' | 'management' | 'categories' | 'calendar-events' | 'analytics' | 'bot-instructions' | 'app-settings' => {
    const saved = localStorage.getItem('adminActiveView');
    if (saved && ['overview', 'all-users', 'management', 'categories', 'calendar-events', 'analytics', 'bot-instructions', 'app-settings'].includes(saved)) {
      return saved as 'overview' | 'all-users' | 'management' | 'categories' | 'calendar-events' | 'analytics' | 'bot-instructions' | 'app-settings';
    }
    return 'overview';
  };

  const getSavedSelectedCourseId = (): string | null => {
    return localStorage.getItem('adminSelectedCourseId');
  };

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(getSavedSelectedCourseId());
  const [activeView, setActiveView] = useState<'overview' | 'all-users' | 'management' | 'categories' | 'calendar-events' | 'analytics' | 'bot-instructions' | 'app-settings'>(getSavedActiveView());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';
  const { setSidebarOpen } = useUI();

  // Save activeView to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('adminActiveView', activeView);
  }, [activeView]);

  // Save selectedCourseId to localStorage whenever it changes
  useEffect(() => {
    if (selectedCourseId) {
      localStorage.setItem('adminSelectedCourseId', selectedCourseId);
    } else {
      localStorage.removeItem('adminSelectedCourseId');
    }
  }, [selectedCourseId]);

  // Callback to load course stats
  const loadCourseStats = useCallback(async () => {
    try {
      const stats = await db.getAdminCourseStats();
      setCourseStats(stats);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to load course stats:', err);
      }
      setError(err.message || 'Failed to load course statistics');
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);
      await loadCourseStats();
      setIsLoading(false);
    };
    init();
  }, [loadCourseStats]);

  // Setup realtime subscription for admin updates
  // Only refresh when on overview tab to avoid unnecessary API calls
  useAdminRealtimeUpdates(
    loadCourseStats,
    activeView === 'overview' && !selectedCourseId
  );

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const handleBackToList = () => {
    setSelectedCourseId(null);
    loadCourseStats(); // Refresh stats when going back
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800 max-w-md">
          <p className="font-semibold mb-2">{t.adminError || 'Error'}</p>
          <p>{error}</p>
        </div>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
        >
          {t.back || 'Back'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 dark:bg-gray-900" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Mobile Header */}
      <div className="lg:hidden h-14 bg-gradient-to-r from-purple-600 to-purple-700 flex items-center px-4 justify-between flex-shrink-0">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors shadow-md active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-white font-bold text-base">{t.adminPanel || 'Admin Panel'}</span>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
          {/* Header - Desktop only */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Shield size={24} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {t.adminDashboardTitle || 'Admin Dashboard'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t.adminDashboardSubtitle || 'Student Enrollment Overview'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedCourseId && (
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <ArrowLeft size={18} />
                  {t.back || 'Back'}
                </button>
              )}
            </div>
          </div>

        {/* Tabs */}
        {!selectedCourseId && (
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeView === 'overview'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <BookOpen size={18} className="inline mr-2" />
              {t.adminEnrollmentOverview || 'Courses'}
            </button>
            <button
              onClick={() => setActiveView('all-users')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeView === 'all-users'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Database size={18} className="inline mr-2" />
              {t.adminAllUsers || 'All Users'}
            </button>
            <button
              onClick={() => setActiveView('management')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeView === 'management'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Settings size={18} className="inline mr-2" />
              {t.adminCourseManagement || 'Manage Courses'}
            </button>
            <button
              onClick={() => setActiveView('categories')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeView === 'categories'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FolderOpen size={18} className="inline mr-2" />
              {t.adminCategoryManagement || 'Categories'}
            </button>
            <button
              onClick={() => setActiveView('calendar-events')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeView === 'calendar-events'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Calendar size={18} className="inline mr-2" />
              {t.adminCalendarEvents || 'Calendar'}
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeView === 'analytics'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <BarChart3 size={18} className="inline mr-2" />
              {language === 'ru' ? 'Аналитика' : language === 'ua' ? 'Аналітика' : language === 'ar' ? 'التحليلات' : 'Analytics'}
            </button>
            <button
              onClick={() => setActiveView('bot-instructions')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeView === 'bot-instructions'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Bot size={18} className="inline mr-2" />
              {t.adminBotInstructions || 'Bot'}
            </button>
            <button
              onClick={() => setActiveView('app-settings')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeView === 'app-settings'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Cog size={18} className="inline mr-2" />
              {t.adminAppSettings || 'Settings'}
            </button>
          </div>
        )}

        {/* Content */}
        {selectedCourseId ? (
          <AdminStudentList
            courseId={selectedCourseId}
            language={language}
            onBack={handleBackToList}
          />
        ) : activeView === 'overview' ? (
          <AdminCourseList
            courseStats={courseStats}
            language={language}
            onCourseSelect={handleCourseSelect}
          />
        ) : activeView === 'all-users' ? (
          <AdminAllUsers language={language} />
        ) : activeView === 'categories' ? (
          <AdminCategoryManagement language={language} />
        ) : activeView === 'calendar-events' ? (
          <AdminCalendarEvents language={language} />
        ) : activeView === 'analytics' ? (
          <AdminAnalytics language={language} />
        ) : activeView === 'bot-instructions' ? (
          <AdminBotInstructions
            language={language}
            onBack={() => setActiveView('overview')}
          />
        ) : activeView === 'app-settings' ? (
          <AdminAppSettings
            language={language}
          />
        ) : (
          <AdminCourseManagement
            language={language}
            onBack={() => setActiveView('overview')}
          />
        )}
        </div>
      </div>
    </div>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard;
