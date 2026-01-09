import React, { useState, useEffect, useCallback, Suspense, useMemo, lazy } from 'react';
import { CourseCard } from './components/CourseCard';
import { AuthScreen } from './components/AuthScreen';
import { LanguageLevelModal } from './components/LanguageLevelModal';
import { CourseDetailsModal } from './components/CourseDetailsModal';
import { FirstLoginProfileModal } from './components/FirstLoginProfileModal';
import { AlertModal } from './components/AlertModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ChatSkeleton, DashboardSkeleton, AdminDashboardSkeleton, SidebarCourseListSkeleton } from './components/Skeletons';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CoursesProvider, useCourses } from './contexts/CoursesContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { useDebounce } from './hooks/useDebounce';
import { Menu, X, MessageSquare, LayoutDashboard, LogOut, Shield, Info, Calendar, Sparkles } from 'lucide-react';
import { ContactModal } from './components/ContactModal';
import { CalendarModal } from './components/CalendarModal';
import { UpdatePasswordPage } from './components/UpdatePasswordPage';
import { db } from './services/db';
import { EnglishLevel, Course } from './types';
import { TRANSLATIONS } from './translations';
import { Moon, Sun } from 'lucide-react';
import { UserTour, TourStep } from './components/UserTour';
import { useUserTour } from './hooks/useUserTour';

// Lazy load heavy components
const ChatInterface = lazy(() => import('./components/ChatInterface').then(m => ({ default: m.ChatInterface })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

// Main App Content (uses contexts)
const AppContent: React.FC = () => {
  const { isAuthenticated, userProfile, isLoading: authLoading, isPasswordRecovery, isDemoUser, login, logout, updateProfile, updateEnglishLevel, completePasswordRecovery } = useAuth();
  const { courses, categories, registrations, courseQueues, isLoading: coursesLoading, toggleRegistration, refreshCourses, updatePriority } = useCourses();
  const { language, theme, isSidebarOpen, activeTab, setLanguage, toggleTheme, setSidebarOpen, setActiveTab, isRtl } = useUI();

  // Local UI state
  const [showLanguageLevelModal, setShowLanguageLevelModal] = useState(false);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorActionButton, setErrorActionButton] = useState<{ text: string; onClick: () => void } | undefined>(undefined);
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Debounced search query
  const debouncedSearchQuery = useDebounce(courseSearchQuery, 300);

  const t = TRANSLATIONS[language] as any;

  // User Tour setup
  const tourSteps: TourStep[] = useMemo(() => {
    const baseSteps: TourStep[] = [
      {
        id: 'welcome',
        target: 'body',
        title: t.tourWelcomeTitle || 'Welcome to CCPLearn!',
        content: t.tourWelcomeContent || 'Let\'s take a quick tour to help you get started.',
        position: 'center'
      },
      {
        id: 'chat-tab',
        target: '[data-tour="chat-tab"]',
        title: t.tourChatTitle || 'AI Assistant Chat',
        content: t.tourChatContent || 'Chat with our AI assistant to get personalized course recommendations.',
        position: 'right',
        action: () => setActiveTab('chat')
      },
      {
        id: 'sidebar',
        target: '[data-tour="course-catalog"]',
        title: t.tourSidebarTitle || 'Course Catalog',
        content: t.tourSidebarContent || 'Browse all available courses here. Use the search bar to find specific courses.',
        position: 'left'
      },
      {
        id: 'dashboard-tab',
        target: '[data-tour="dashboard-tab"]',
        title: t.tourDashboardTitle || 'My Profile',
        content: t.tourDashboardContent || 'View and manage your course registrations here.',
        position: 'right',
        action: () => setActiveTab('dashboard')
      }
    ];

    // Add admin tour step if user is admin
    if (userProfile.isAdmin) {
      baseSteps.push({
        id: 'admin-tab',
        target: '[data-tour="admin-tab"]',
        title: t.tourAdminTitle || 'Admin Panel',
        content: t.tourAdminContent || 'As an admin, you can manage courses and view student registrations.',
        position: 'right',
        action: () => setActiveTab('admin')
      });
    }

    return baseSteps;
  }, [language, userProfile.isAdmin, t, setActiveTab]);

  const {
    isOpen: isTourOpen,
    currentStep: tourStep,
    startTour,
    closeTour,
    completeTour,
    setCurrentStep: setTourStep
  } = useUserTour({
    tourId: 'main-tour',
    steps: tourSteps,
    enabled: isAuthenticated && !authLoading,
    autoStart: false, // We'll trigger it manually after first login
    isDemoUser: isDemoUser // Pass demo user flag to skip saving completion state
  });

  // Auto-start tour for new users after first login modal is closed
  // For demo users, always start tour on login
  useEffect(() => {
    if (isAuthenticated && !authLoading && !showFirstLoginModal && userProfile.id) {
      // For demo users, always start tour
      if (isDemoUser) {
        const timer = setTimeout(() => {
          startTour();
        }, 1000);
        return () => clearTimeout(timer);
      }
      
      // For regular users, check if they're new
      const hasCompletedTour = localStorage.getItem('ccplearn_user_tour_completed_main-tour_1.0');
      const isNewUser = (!userProfile.firstName || userProfile.firstName.trim() === '') && 
                        (!userProfile.lastName || userProfile.lastName.trim() === '') &&
                        (!userProfile.name || userProfile.name.trim() === '') &&
                        (userProfile.englishLevel === 'None') &&
                        (!userProfile.mobileNumber || userProfile.mobileNumber.trim() === '');
      
      // Start tour for new users who haven't completed it
      if (isNewUser && !hasCompletedTour) {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
          startTour();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, authLoading, showFirstLoginModal, userProfile, isDemoUser, startTour]);

  // Check if first login profile setup is needed
  useEffect(() => {
    if (isAuthenticated && !authLoading && userProfile.id) {
      // Check if this is essentially a new/empty profile
      const hasNoName = (!userProfile.firstName || userProfile.firstName.trim() === '') && 
                        (!userProfile.lastName || userProfile.lastName.trim() === '') &&
                        (!userProfile.name || userProfile.name.trim() === '');
      const hasNoLevel = userProfile.englishLevel === 'None';
      const hasNoContact = !userProfile.mobileNumber || userProfile.mobileNumber.trim() === '';
      
      // Show first login modal if profile is mostly empty (new user)
      if (hasNoName && hasNoLevel && hasNoContact) {
        setShowFirstLoginModal(true);
      }
    }
  }, [isAuthenticated, authLoading, userProfile]);

  // Refresh courses on login
  useEffect(() => {
    if (isAuthenticated) {
      refreshCourses();
    }
  }, [isAuthenticated, refreshCourses]);

  const handleFirstLoginComplete = async (profileData: {
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    address?: string;
    eircode?: string;
    dateOfBirth?: string;
    englishLevel?: EnglishLevel;
  }) => {
    try {
      // Update profile info if any personal data provided
      const hasPersonalData = profileData.firstName || profileData.lastName || 
                              profileData.mobileNumber || profileData.address || 
                              profileData.eircode || profileData.dateOfBirth;
      
      if (hasPersonalData) {
        await db.updateProfileInfo({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          mobileNumber: profileData.mobileNumber,
          address: profileData.address,
          eircode: profileData.eircode,
          dateOfBirth: profileData.dateOfBirth
        });
      }
      
      // Update English level if provided
      if (profileData.englishLevel) {
        await updateEnglishLevel(profileData.englishLevel);
      }
      
      const updatedProfile = await db.getProfile();
      updateProfile(updatedProfile);
      setShowFirstLoginModal(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to save first login profile data:', error);
      }
    }
  };

  const handleSkipFirstLogin = () => {
    setShowFirstLoginModal(false);
  };

  const handleToggleRegistration = useCallback(async (courseId: string) => {
    setErrorMessage(null);
    setErrorActionButton(undefined);
    const result = await toggleRegistration(courseId, language);
    if (!result.success && result.error) {
      // Check if error is about max courses reached - show extended message with dashboard link
      if (result.error.includes('Maximum') || result.error.includes('Максимум') || result.error.includes('الحد الأقصى')) {
        setErrorMessage(t.maxCoursesReachedModal || result.error);
        setErrorActionButton({
          text: t.goToDashboard || 'Go to Personal Cabinet',
          onClick: () => {
            setActiveTab('dashboard');
            setSidebarOpen(false);
          }
        });
      }
      // Check if error is about incomplete profile
      else if (result.error.includes('profile') || result.error.includes('профиль') || result.error.includes('профіль') || result.error.includes('الملف')) {
        setErrorMessage(result.error);
        setErrorActionButton({
          text: t.completeProfile || 'Complete Profile',
          onClick: () => setActiveTab('dashboard')
        });
      } else {
        setErrorMessage(result.error);
      }
    }
  }, [toggleRegistration, language, t.completeProfile, t.maxCoursesReachedModal, t.goToDashboard, setActiveTab, setSidebarOpen]);

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

  // Show password update page when in recovery mode
  if (isPasswordRecovery) {
    return (
      <UpdatePasswordPage 
        onPasswordUpdated={completePasswordRecovery} 
        language={language} 
        setLanguage={setLanguage} 
        theme={theme} 
      />
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={login} language={language} setLanguage={setLanguage} theme={theme} />;
  }

  return (
    <>
      <FirstLoginProfileModal
        isOpen={showFirstLoginModal}
        onComplete={handleFirstLoginComplete}
        onSkip={handleSkipFirstLogin}
        language={language}
        currentProfile={userProfile}
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
      <div className="flex h-full w-full bg-gray-100 dark:bg-gray-900 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      
        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-30 w-full sm:w-80 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')}
          `}
        >
          {/* Sidebar Header */}
          <div className="h-auto flex flex-col px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-green-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <img 
                  src={`${import.meta.env.BASE_URL}logo.svg`}
                  alt="Cork City Partnership" 
                  className="w-10 h-10 bg-white rounded-lg p-1"
                />
                <div>
                  <span className="font-bold text-base sm:text-lg tracking-tight text-white block">{t.orgName}</span>
                  <span className="text-green-100 text-xs">{t.appTitle}</span>
                </div>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="lg:hidden p-2 rounded-md hover:bg-white/20 text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <div className="p-4 space-y-2">
            <button 
              data-tour="chat-tab"
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                ${activeTab === 'chat' 
                  ? 'bg-green-600 dark:bg-green-700 text-white shadow-md' 
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-600 hover:text-green-600 dark:hover:text-green-400 border border-transparent'
                }`}
            >
              <MessageSquare size={18} />
              {t.chatTab}
            </button>
            <button 
              data-tour="dashboard-tab"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                ${activeTab === 'dashboard' 
                  ? 'bg-green-600 dark:bg-green-700 text-white shadow-md' 
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-600 hover:text-green-600 dark:hover:text-green-400 border border-transparent'
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
            
            {/* Calendar Button */}
            <button 
              onClick={() => setShowCalendarModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-600 hover:text-green-600 dark:hover:text-green-400 border border-transparent"
            >
              <Calendar size={18} />
              {t.calendar}
            </button>
            
            {/* Contact Info Button */}
            <button 
              onClick={() => setShowContactModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-600 hover:text-green-600 dark:hover:text-green-400 border border-transparent"
            >
              <Info size={18} />
              {t.contactInfo}
            </button>
          </div>

          {/* Course Catalog */}
          <div data-tour="course-catalog" className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4 custom-scrollbar flex flex-col">
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
                      allowUnregister={false}
                      language={language}
                      queueLength={courseQueues.get(course.id) || 0}
                      onViewDetails={handleViewCourseDetails}
                      categories={categories}
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
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' 
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={startTour}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={t.tourStartTour || 'Start Tour'}
                >
                  <Sparkles size={18} />
                </button>
                <button 
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button 
                  onClick={() => setShowLogoutConfirm(true)} 
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              &copy; {new Date().getFullYear()} {t.orgName}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main View with Lazy Loading */}
          <div className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-gray-900">
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
          onClose={() => {
            setErrorMessage(null);
            setErrorActionButton(undefined);
          }}
          message={errorMessage || ''}
          language={language}
          type="error"
          actionButton={errorActionButton}
        />
        <ContactModal 
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          language={language}
        />
        <CalendarModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          language={language}
          courses={courses}
          isAdmin={userProfile.isAdmin || false}
        />
        <ConfirmationModal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            logout();
          }}
          title={t.logoutConfirmTitle || 'Log Out'}
          message={t.logoutConfirm || 'Are you sure you want to log out?'}
          confirmText={t.logoutBtn || 'Log Out'}
          language={language}
          type="danger"
        />
        <UserTour
          isOpen={isTourOpen}
          steps={tourSteps}
          onClose={closeTour}
          onComplete={completeTour}
          language={language}
          currentStep={tourStep}
          onStepChange={setTourStep}
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
