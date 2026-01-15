import React, { useState, useEffect, useCallback, Suspense, useMemo, lazy } from 'react';
import { useSwipeable } from 'react-swipeable';
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
import { Menu, X, MessageSquare, LayoutDashboard, LogOut, Shield, Info, Calendar, Sparkles, Globe } from 'lucide-react';
import { ContactModal } from './components/ContactModal';
import { CalendarModal } from './components/CalendarModal';
import { UpdatePasswordPage } from './components/UpdatePasswordPage';
import { db } from './services/db';
import { EnglishLevel, Course } from './types';
import { TRANSLATIONS } from './translations';
import { Moon, Sun } from 'lucide-react';
import { UserTour, TourStep } from './components/UserTour';
import { useUserTour } from './hooks/useUserTour';
import { useUserRealtimeUpdates } from './hooks/useRealtimeSubscription';

// Lazy load heavy components
const ChatInterface = lazy(() => import('./components/ChatInterface').then(m => ({ default: m.ChatInterface })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

// Main App Content (uses contexts)
const AppContent: React.FC = () => {
  const { isAuthenticated, userProfile, isLoading: authLoading, isPasswordRecovery, isDemoUser, login, logout, updateProfile, updateEnglishLevel, completePasswordRecovery } = useAuth();
  const { courses, categories, registrations, courseQueues, isLoading: coursesLoading, toggleRegistration, refreshCourses, refreshRegistrations, updatePriority } = useCourses();
  const { language, theme, isSidebarOpen, activeTab, setLanguage, toggleTheme, setSidebarOpen, setActiveTab, isRtl } = useUI();

  // Local UI state
  const [showLanguageLevelModal, setShowLanguageLevelModal] = useState(false);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorActionButton, setErrorActionButton] = useState<{ text: string; onClick: () => void } | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [hasInvite, setHasInvite] = useState(false);

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
        position: 'right'
        // No action - just highlight the button, don't switch tabs during tour
      },
      {
        id: 'dashboard-tab',
        target: '[data-tour="dashboard-tab"]',
        title: t.tourDashboardTitle || 'My Profile',
        content: t.tourDashboardContent || 'View and manage your course registrations here.',
        position: 'right'
        // No action - just highlight the button, don't switch tabs during tour
      },
      {
        id: 'calendar-button',
        target: '[data-tour="calendar-button"]',
        title: t.tourCalendarTitle || 'Event Calendar',
        content: t.tourCalendarContent || 'View the calendar to see scheduled course dates and other events. You can see when courses start and what events are coming up.',
        position: 'left',
        action: () => {
          // Open sidebar to show the calendar button on mobile
          setSidebarOpen(true);
        }
      },
      {
        id: 'sidebar',
        target: '[data-tour="course-catalog"]',
        title: t.tourSidebarTitle || 'Course Catalog',
        content: t.tourSidebarContent || 'Browse all available courses here. Use the search bar to find specific courses.',
        position: 'left',
        action: () => {
          // Open sidebar to show the catalog on mobile
          setSidebarOpen(true);
        }
      }
    ];

    // Add admin tour step if user is admin
    if (userProfile.isAdmin) {
      baseSteps.push({
        id: 'admin-tab',
        target: '[data-tour="admin-tab"]',
        title: t.tourAdminTitle || 'Admin Panel',
        content: t.tourAdminContent || 'As an admin, you can manage courses and view student registrations.',
        position: 'right'
        // No action - just highlight the button, don't switch tabs during tour
      });
    }

    return baseSteps;
  }, [language, userProfile.isAdmin, t, setSidebarOpen]);

  const {
    isOpen: isTourOpen,
    currentStep: tourStep,
    startTour,
    closeTour,
    completeTour: baseCompleteTour,
    setCurrentStep: setTourStep
  } = useUserTour({
    tourId: 'main-tour',
    steps: tourSteps,
    enabled: isAuthenticated && !authLoading,
    autoStart: false, // We'll trigger it manually after first login
    isDemoUser: isDemoUser // Pass demo user flag to skip saving completion state
  });

  // Wrap completeTour to switch to chat and close sidebar after tour
  const completeTour = useCallback(() => {
    baseCompleteTour();
    // After tour completes, switch to chat and close sidebar
    setActiveTab('chat');
    setSidebarOpen(false);
  }, [baseCompleteTour, setActiveTab, setSidebarOpen]);

  // Open sidebar when tour starts (so buttons are visible on mobile)
  // Keep it open during the entire tour
  useEffect(() => {
    if (isTourOpen) {
      // Open sidebar on mobile to show navigation buttons and catalog
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile) {
        setSidebarOpen(true);
      }
    }
  }, [isTourOpen, setSidebarOpen]);

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
      const hasCompletedTour = localStorage.getItem('ccplearn_user_tour_completed_main-tour_1.1');
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

  // Callback to check if user has any invites
  const checkInvites = useCallback(async () => {
    if (isAuthenticated && !isDemoUser) {
      try {
        const regs = await db.getRegistrations();
        const hasAnyInvite = regs.some(r => r.isInvited === true);
        setHasInvite(hasAnyInvite);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to check invites:', error);
        }
        setHasInvite(false);
      }
    } else {
      setHasInvite(false);
    }
  }, [isAuthenticated, isDemoUser]);

  // Initial check and when registrations change from context
  useEffect(() => {
    checkInvites();
  }, [checkInvites, registrations]);

  // Setup realtime subscription for invites updates
  useUserRealtimeUpdates(
    userProfile.id || null,
    checkInvites,
    isAuthenticated && !isDemoUser && !!userProfile.id
  );

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
      
      // Start tour after first login profile is completed
      // Small delay to ensure DOM is ready and profile is updated
      setTimeout(() => {
        const hasCompletedTour = localStorage.getItem('ccplearn_user_tour_completed_main-tour_1.1');
        if (!hasCompletedTour && !isDemoUser) {
          startTour();
        }
      }, 1500);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to save first login profile data:', error);
      }
    }
  };

  const handleSkipFirstLogin = () => {
    setShowFirstLoginModal(false);
    // Start tour even if user skipped profile setup (they're still a new user)
    setTimeout(() => {
      const hasCompletedTour = localStorage.getItem('ccplearn_user_tour_completed_main-tour_1.1');
      if (!hasCompletedTour && !isDemoUser) {
        startTour();
      }
    }, 1500);
  };

  const handleToggleRegistration = useCallback(async (courseId: string) => {
    setErrorMessage(null);
    setErrorActionButton(undefined);
    const result = await toggleRegistration(courseId, language);
    if (result.success) {
      // Explicitly refresh registrations after successful registration to ensure real-time sync
      // This ensures Dashboard and other components see the update immediately
      await refreshRegistrations();
    } else if (result.error) {
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
  }, [toggleRegistration, refreshRegistrations, language, t.completeProfile, t.maxCoursesReachedModal, t.goToDashboard, setActiveTab, setSidebarOpen]);

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

  // Swipe gestures для мобильной навигации (для основного контента)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      // Закрыть sidebar при свайпе влево (для LTR) или вправо (для RTL)
      if (isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
        if (isRtl) {
          // Для RTL свайп вправо закрывает sidebar
          setSidebarOpen(false);
        } else {
          // Для LTR свайп влево закрывает sidebar
          setSidebarOpen(false);
        }
      }
    },
    onSwipedRight: () => {
      // Открыть sidebar при свайпе вправо (для LTR) или влево (для RTL)
      if (!isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
        if (isRtl) {
          // Для RTL свайп влево открывает sidebar
          setSidebarOpen(true);
        } else {
          // Для LTR свайп вправо открывает sidebar
          setSidebarOpen(true);
        }
      }
    },
    trackMouse: false,
    trackTouch: true
  });

  // Swipe gestures для сайдбара (закрытие по свайпу)
  const sidebarSwipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      // Закрыть sidebar при свайпе влево (для LTR)
      if (isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024 && !isRtl) {
        setSidebarOpen(false);
      }
    },
    onSwipedRight: () => {
      // Закрыть sidebar при свайпе вправо (для RTL)
      if (isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024 && isRtl) {
        setSidebarOpen(false);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false, // Позволяем прокрутку в сайдбаре
    delta: 50 // Минимальное расстояние свайпа
  });

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
        onClose={() => {
          setShowCourseDetails(false);
          setSelectedCourse(null);
        }}
        language={language}
        queueLength={selectedCourse ? (courseQueues.get(selectedCourse.id) || 0) : 0}
        isRegistered={selectedCourse ? registrations.includes(selectedCourse.id) : false}
        onRegister={async (courseId) => {
          const result = await toggleRegistration(courseId, language);
          if (result.success) {
            // Explicitly refresh registrations after successful registration
            await refreshRegistrations();
            setShowCourseDetails(false);
            setSelectedCourse(null);
            // Show success modal with course name and email info
            const course = courses.find(c => c.id === courseId);
            const courseTitle = course?.title || '';
            setSuccessMessage(`${t.courseRegistrationSuccess}: "${courseTitle}". ${t.courseRegistrationEmailInfo || 'You will receive email information as soon as you are invited to the course.'}`);
          } else if (result.error) {
            // Check if error is about max courses reached - show extended message with dashboard link
            if (result.error.includes('Maximum') || result.error.includes('Максимум') || result.error.includes('الحد الأقصى')) {
              setErrorMessage(t.maxCoursesReachedModal || result.error);
              setErrorActionButton({
                text: t.goToDashboard || 'Go to Personal Cabinet',
                onClick: () => {
                  setActiveTab('dashboard');
                  setSidebarOpen(false);
                  setShowCourseDetails(false);
                  setSelectedCourse(null);
                }
              });
            }
            // Check if error is about incomplete profile
            else if (result.error.includes('profile') || result.error.includes('профиль') || result.error.includes('профіль') || result.error.includes('الملف')) {
              setErrorMessage(result.error);
              setErrorActionButton({
                text: t.completeProfile || 'Complete Profile',
                onClick: () => {
                  setActiveTab('dashboard');
                  setShowCourseDetails(false);
                  setSelectedCourse(null);
                }
              });
            } else {
              setErrorMessage(result.error);
            }
            setShowCourseDetails(false);
            setSelectedCourse(null);
          }
        }}
        isLoading={false}
      />
      <div className="flex h-full w-full bg-gray-100 dark:bg-gray-900 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      
        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-30 w-full sm:w-80 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')}
          `}
          {...sidebarSwipeHandlers}
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
                style={{ willChange: 'background-color' }}
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
              style={{ willChange: 'background-color, transform' }}
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
              style={{ willChange: 'background-color, transform' }}
            >
              <LayoutDashboard size={18} />
              {t.dashboardTab}
              {registrations.length > 0 && (
                <span className={`${hasInvite ? 'bg-purple-500 dark:bg-purple-600' : 'bg-green-500 dark:bg-green-600'} text-white text-[10px] px-1.5 py-0.5 rounded-full ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
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
                style={{ willChange: 'background-color, transform' }}
              >
                <Shield size={18} />
                {t.adminPanel}
              </button>
            )}
            
            {/* Calendar Button */}
            <button 
              data-tour="calendar-button"
              onClick={() => setShowCalendarModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-600 hover:text-green-600 dark:hover:text-green-400 border border-transparent"
              style={{ willChange: 'background-color, transform' }}
            >
              <Calendar size={18} />
              {t.calendar}
            </button>
            
            {/* Contact Info Button */}
            <button 
              onClick={() => setShowContactModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-600 hover:text-green-600 dark:hover:text-green-400 border border-transparent"
              style={{ willChange: 'background-color, transform' }}
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
                  {/* Простая оптимизация: рендерим все курсы, но с мемоизацией */}
                  {filteredCourses.length > 50 ? (
                    <>
                      <div className="text-xs text-gray-500 dark:text-gray-400 px-1 mb-2">
                        {language === 'ru' 
                          ? `Показано ${filteredCourses.length} курсов` 
                          : language === 'ua' 
                          ? `Показано ${filteredCourses.length} курсів` 
                          : language === 'ar' 
                          ? `يُعرض ${filteredCourses.length} دورات` 
                          : `Showing ${filteredCourses.length} courses`}
                      </div>
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
                    </>
                  ) : (
                    filteredCourses.map(course => (
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
                    ))
                  )}
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
          <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Globe 
                  size={16} 
                  className="text-gray-500 dark:text-gray-400 flex-shrink-0" 
                  aria-hidden="true"
                />
                <div className="flex gap-1 sm:gap-1.5 flex-shrink-0">
                  {(['en', 'ua', 'ru', 'ar'] as const).map((lang) => {
                    const langLabels: Record<string, string> = {
                      en: 'English',
                      ua: 'Українська',
                      ru: 'Русский',
                      ar: 'العربية'
                    };
                    return (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={`h-8 w-8 sm:h-8 sm:w-8 flex items-center justify-center text-[11px] sm:text-xs font-bold rounded-lg transition-all border active:scale-95 flex-shrink-0 ${
                          language === lang 
                            ? 'bg-green-600 dark:bg-green-700 text-white border-green-600 dark:border-green-700 shadow-md' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-700'
                        }`}
                        title={langLabels[lang]}
                        aria-label={`Switch to ${langLabels[lang]}`}
                        style={{ willChange: 'background-color, transform' }}
                      >
                        {lang.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                <button 
                  onClick={startTour}
                  className="h-8 w-8 sm:h-7 sm:w-7 flex items-center justify-center p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95 flex-shrink-0"
                  title={t.tourStartTour || 'Start Tour'}
                  aria-label={t.tourStartTour || 'Start Tour'}
                  style={{ willChange: 'background-color, transform' }}
                >
                  <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button 
                  onClick={toggleTheme}
                  className="h-8 w-8 sm:h-7 sm:w-7 flex items-center justify-center p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95 flex-shrink-0"
                  title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                  style={{ willChange: 'background-color, transform' }}
                >
                  {theme === 'light' ? <Moon size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Sun size={16} className="sm:w-[18px] sm:h-[18px]" />}
                </button>
                <button 
                  onClick={() => setShowLogoutConfirm(true)} 
                  className="h-8 w-8 sm:h-7 sm:w-7 flex items-center justify-center p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-95 flex-shrink-0"
                  aria-label={t.logoutBtn || 'Log out'}
                  style={{ willChange: 'background-color, transform' }}
                >
                  <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              &copy; {new Date().getFullYear()} {t.orgName}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div 
          className="flex-1 flex flex-col min-h-0 relative"
          {...swipeHandlers}
        >
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
        <AlertModal
          isOpen={!!successMessage}
          onClose={() => {
            setSuccessMessage(null);
          }}
          message={successMessage || ''}
          language={language}
          type="success"
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
