import React, { useState, useEffect, useCallback, Suspense, useMemo, lazy } from 'react';
import { CourseCard } from './components/CourseCard';
import { AuthScreen } from './components/AuthScreen';
import { LanguageLevelModal } from './components/LanguageLevelModal';
import { CourseDetailsModal } from './components/CourseDetailsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { AlertModal } from './components/AlertModal';
import { ChatSkeleton, DashboardSkeleton, AdminDashboardSkeleton, SidebarCourseListSkeleton } from './components/Skeletons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CoursesProvider, useCourses } from './contexts/CoursesContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { useDebounce } from './hooks/useDebounce';
import { GraduationCap, Menu, X, MessageSquare, LayoutDashboard, LogOut, Shield } from 'lucide-react';
import { db } from './services/db';
import { EnglishLevel, Course } from './types';
import { TRANSLATIONS } from './translations';
import { Moon, Sun } from 'lucide-react';

// Lazy load heavy components
const ChatInterface = lazy(() => import('./components/ChatInterface').then(m => ({ default: m.ChatInterface })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

// Main App Content (uses contexts)
const AppContent: React.FC = () => {
  const { isAuthenticated, userProfile, isLoading: authLoading, login, logout, updateProfile, updateEnglishLevel } = useAuth();
  const { courses, registrations, courseQueues, isLoading: coursesLoading, toggleRegistration, refreshCourses, updatePriority } = useCourses();
  const { language, theme, isSidebarOpen, activeTab, setLanguage, toggleTheme, setSidebarOpen, setActiveTab, isRtl } = useUI();

  // Local UI state
  const [showLanguageLevelModal, setShowLanguageLevelModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');

  // Debounced search query
  const debouncedSearchQuery = useDebounce(courseSearchQuery, 300);

  const t = TRANSLATIONS[language];

  // Check if onboarding is needed
  useEffect(() => {
    if (isAuthenticated && !authLoading && userProfile.id) {
      const needsName = (!userProfile.firstName || !userProfile.lastName || 
                        userProfile.firstName.trim() === '' || userProfile.lastName.trim() === '') && 
                       (!userProfile.name || userProfile.name.trim() === '');
      const needsLevel = userProfile.englishLevel === 'None';
      
      if (needsName || needsLevel) {
        setShowOnboardingModal(true);
      }
    }
  }, [isAuthenticated, authLoading, userProfile]);

  // Refresh courses on login
  useEffect(() => {
    if (isAuthenticated) {
      refreshCourses();
    }
  }, [isAuthenticated, refreshCourses]);

  const handleOnboardingComplete = async (firstName: string, lastName: string, englishLevel: EnglishLevel) => {
    try {
      if ((firstName && firstName.trim()) || (lastName && lastName.trim())) {
        await db.updateProfileInfo({ firstName, lastName });
      }
      await updateEnglishLevel(englishLevel);
      const updatedProfile = await db.getProfile();
      updateProfile(updatedProfile);
      setShowOnboardingModal(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to save onboarding data:', error);
      }
    }
  };

  const handleToggleRegistration = useCallback(async (courseId: string) => {
    setErrorMessage(null);
    const result = await toggleRegistration(courseId, language);
    if (!result.success && result.error) {
      setErrorMessage(result.error);
    }
  }, [toggleRegistration, language]);

  const handleViewCourseDetails = useCallback((course: Course) => {
    setSelectedCourse(course);
    setShowCourseDetails(true);
  }, []);

  const handleLanguageLevelSelect = async (level: EnglishLevel) => {
    await updateEnglishLevel(level);
    setShowLanguageLevelModal(false);
  };

  // Memoized filtered courses
  const filteredCourses = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return courses;
    const query = debouncedSearchQuery.toLowerCase();
    return courses.filter(course => 
      course.title.toLowerCase().includes(query) ||
      course.description.toLowerCase().includes(query) ||
      course.category.toLowerCase().includes(query) ||
      course.difficulty.toLowerCase().includes(query)
    );
  }, [courses, debouncedSearchQuery]);

  const hasNoSearchResults = debouncedSearchQuery.trim() && filteredCourses.length === 0;

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={login} language={language} setLanguage={setLanguage} theme={theme} />;
  }

  return (
    <>
      <OnboardingModal
        isOpen={showOnboardingModal}
        onComplete={handleOnboardingComplete}
        language={language}
        currentFirstName={userProfile.firstName}
        currentLastName={userProfile.lastName}
        currentEnglishLevel={userProfile.englishLevel}
      />
      <LanguageLevelModal
        isOpen={showLanguageLevelModal}
        onSelect={handleLanguageLevelSelect}
        language={language}
      />
      <CourseDetailsModal
        course={selectedCourse}
        isOpen={showCourseDetails}
        onClose={() => setShowCourseDetails(false)}
        language={language}
        queueLength={selectedCourse ? (courseQueues.get(selectedCourse.id) || 0) : 0}
      />
      <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      
        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-30 w-full sm:w-80 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')}
          `}
        >
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <GraduationCap className="w-6 h-6" />
              <span className="font-bold text-base sm:text-lg tracking-tight">{t.appTitle}</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <div className="p-4 space-y-2">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                ${activeTab === 'chat' 
                  ? 'bg-indigo-600 dark:bg-indigo-700 text-white shadow-md' 
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent'
                }`}
            >
              <MessageSquare size={18} />
              {t.chatTab}
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                ${activeTab === 'dashboard' 
                  ? 'bg-indigo-600 dark:bg-indigo-700 text-white shadow-md' 
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 border border-transparent'
                }`}
            >
              <LayoutDashboard size={18} />
              {t.dashboardTab}
              {registrations.length > 0 && (
                <span className={`bg-green-500 dark:bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
                  {registrations.length}
                </span>
              )}
            </button>
            {userProfile.isAdmin && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                  ${activeTab === 'admin' 
                    ? 'bg-purple-600 dark:bg-purple-700 text-white shadow-md' 
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-600 hover:text-purple-600 dark:hover:text-purple-400 border border-transparent'
                  }`}
              >
                <Shield size={18} />
                {t.adminPanel}
              </button>
            )}
          </div>

          {/* Course Catalog */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4 custom-scrollbar flex flex-col">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1 mt-2">{t.quickCatalog}</h3>
            
            {/* Search Input */}
            <div className="mb-3">
              <input
                type="text"
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                placeholder={t.searchCourses}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
              />
            </div>

            <div className="space-y-2 sm:space-y-3 flex-1">
              {coursesLoading ? (
                <SidebarCourseListSkeleton count={5} />
              ) : (
                <>
                  {filteredCourses.map(course => (
                    <CourseCard 
                      key={course.id} 
                      course={course} 
                      isRegistered={registrations.includes(course.id)}
                      onToggleRegistration={handleToggleRegistration}
                      language={language}
                      queueLength={courseQueues.get(course.id) || 0}
                      onViewDetails={handleViewCourseDetails}
                    />
                  ))}
                  {hasNoSearchResults && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                      {language === 'ru' ? 'Курсы не найдены' : language === 'ua' ? 'Курси не знайдено' : language === 'ar' ? 'لم يتم العثور على دورات' : 'No courses found'}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-1">
                {(['en', 'ua', 'ru', 'ar'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-full transition-colors border ${
                      language === lang 
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700' 
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button 
                  onClick={logout} 
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              &copy; {new Date().getFullYear()} {t.footer}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full relative">
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Mobile Header - Only one menu button here */}
          <div className="lg:hidden h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 justify-between shrink-0 z-20 sticky top-0">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
              <GraduationCap className="w-5 h-5" />
              <span className="text-base sm:text-lg">{t.appTitle}</span>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors shadow-sm hover:shadow-md active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>

          {/* Main View with Lazy Loading */}
          <div className="flex-1 h-full overflow-hidden bg-white dark:bg-gray-900">
            {authLoading ? (
              <ChatSkeleton />
            ) : activeTab === 'chat' ? (
              <Suspense fallback={<ChatSkeleton />}>
                <ChatInterface language={language} onOpenSidebar={() => setSidebarOpen(true)} />
              </Suspense>
            ) : activeTab === 'admin' ? (
              <Suspense fallback={<AdminDashboardSkeleton />}>
                <AdminDashboard 
                  language={language} 
                  onBack={() => setActiveTab('dashboard')}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<DashboardSkeleton />}>
                <Dashboard 
                  registrations={registrations} 
                  userProfile={userProfile}
                  onUpdateProfile={updateProfile}
                  onRemoveRegistration={handleToggleRegistration}
                  onUpdatePriority={updatePriority}
                  language={language}
                />
              </Suspense>
            )}
          </div>
        </div>
        <AlertModal
          isOpen={!!errorMessage}
          onClose={() => setErrorMessage(null)}
          message={errorMessage || ''}
          language={language}
          type="error"
        />
      </div>
    </>
  );
};

// Root App with Providers
const App: React.FC = () => {
  return (
    <UIProvider>
      <AuthProvider>
        <AppWithCoursesProvider />
      </AuthProvider>
    </UIProvider>
  );
};

// Separate component to use UIContext for language
const AppWithCoursesProvider: React.FC = () => {
  const { language } = useUI();
  
  return (
    <CoursesProvider language={language}>
      <AppContent />
    </CoursesProvider>
  );
};

export default App;
