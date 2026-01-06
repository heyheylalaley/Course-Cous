import React, { useState, useEffect } from 'react';
import { AdminCourseStats, Language } from '../types';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { AdminCourseList } from './AdminCourseList';
import { AdminStudentList } from './AdminStudentList';
import { AdminCourseManagement } from './AdminCourseManagement';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminBotInstructions } from './AdminBotInstructions';
import { Shield, Users, BookOpen, ArrowLeft, Settings, BarChart3, Bot } from 'lucide-react';

interface AdminDashboardProps {
  language: Language;
  onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ language, onBack }) => {
  const [courseStats, setCourseStats] = useState<AdminCourseStats[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'management' | 'analytics' | 'bot-instructions'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    loadCourseStats();
  }, []);

  const loadCourseStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stats = await db.getAdminCourseStats();
      setCourseStats(stats);
    } catch (err: any) {
      console.error('Failed to load course stats:', err);
      setError(err.message || 'Failed to load course statistics');
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeView === 'overview'
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users size={18} className="inline mr-2" />
              {t.adminEnrollmentOverview || 'Enrollment Overview'}
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
              {t.adminCourseManagement || 'Course Management'}
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
              {t.adminBotInstructions || 'Bot Instructions'}
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
        ) : activeView === 'analytics' ? (
          <AdminAnalytics language={language} />
        ) : activeView === 'bot-instructions' ? (
          <AdminBotInstructions
            language={language}
            onBack={() => setActiveView('overview')}
          />
        ) : (
          <AdminCourseManagement
            language={language}
            onBack={() => setActiveView('overview')}
          />
        )}
      </div>
    </div>
  );
};
