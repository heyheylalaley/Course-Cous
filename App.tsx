import React, { useState, useEffect, useCallback } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { CourseCard } from './components/CourseCard';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthScreen } from './components/AuthScreen';
import { LanguageLevelModal } from './components/LanguageLevelModal';
import { CourseDetailsModal } from './components/CourseDetailsModal';
import { NameModal } from './components/NameModal';
import { OnboardingModal } from './components/OnboardingModal';
import { AlertModal } from './components/AlertModal';
import { AVAILABLE_COURSES } from './constants';
import { useCourses } from './hooks/useCourses';
import { GraduationCap, Menu, X, Info, MessageSquare, LayoutDashboard, LogOut, Shield, Search } from 'lucide-react';
import { db, supabase } from './services/db';
import { UserProfile, Language, EnglishLevel, Course, Theme } from './types';
import { TRANSLATIONS } from './translations';
import { Moon, Sun } from 'lucide-react';

const App: React.FC = () => {
  // Auth & Language State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  // App UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Load saved activeTab from localStorage
  const getSavedActiveTab = (): 'chat' | 'dashboard' | 'admin' => {
    const saved = localStorage.getItem('appActiveTab');
    if (saved && ['chat', 'dashboard', 'admin'].includes(saved)) {
      return saved as 'chat' | 'dashboard' | 'admin';
    }
    return 'chat';
  };

  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'admin'>(getSavedActiveTab());

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('appActiveTab', activeTab);
  }, [activeTab]);
  
  // App Data State
  const [registrations, setRegistrations] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ id: '', email: '', englishLevel: 'None' });
  const [showNameModal, setShowNameModal] = useState(false);
  const [courseQueues, setCourseQueues] = useState<Map<string, number>>(new Map());
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showLanguageLevelModal, setShowLanguageLevelModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDetails, setShowCourseDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { courses: availableCourses, refreshCourses } = useCourses(false, language);
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check Auth on Mount and load course queues
  useEffect(() => {
    const initApp = async () => {
      // Load course queues only if user is authenticated or if it's public data
      const loadQueues = async () => {
        try {
          const queues = await db.getCourseQueues();
          const queueMap = new Map<string, number>();
          queues.forEach(q => {
            queueMap.set(q.courseId, q.queueLength);
          });
          setCourseQueues(queueMap);
        } catch (error: any) {
          // Silently fail if not authenticated - queues will load after login
          if (error?.message?.includes('Not authenticated') || error?.message?.includes('authentication')) {
            // Expected error on login page, don't log it
            return;
          }
          // Only log unexpected errors
          console.error('Failed to load course queues:', error);
        }
      };
      
      // Only load queues if we have a session or if it's public data
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await loadQueues();
        }
      } else {
        // For mock mode, try to load queues
        await loadQueues();
      }

      // Handle Supabase auth callback (email confirmation, magic link, etc.)
      if (supabase) {
        // Check for hash in URL (Supabase callback)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // Exchange tokens for session
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (session && !error) {
            // Clean up URL hash
            window.history.replaceState({}, document.title, '/Course-Cous/');
            setIsAuthenticated(true);
            loadUserData();
          }
        }
      }

      // Check auth session (for Supabase, wait for session to be ready)
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          loadUserData();
        }
      } else {
        const session = db.getCurrentSession();
        if (session) {
          setIsAuthenticated(true);
          loadUserData();
        }
      }

      // Listen to auth state changes (for Supabase)
      if (supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          // Log only in development mode
          if (import.meta.env.DEV) {
            console.log('Auth state changed:', event);
          }
          
          if (event === 'SIGNED_IN' && session) {
            // Clean up URL hash if present
            if (window.location.hash) {
              window.history.replaceState({}, document.title, '/Course-Cous/');
            }
            setIsAuthenticated(true);
            loadUserData();
          } else if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            setRegistrations([]);
            setUserProfile({ id: '', email: '', englishLevel: 'None' });
          } else if (event === 'TOKEN_REFRESHED' && session) {
            // Session refreshed, user still logged in
            setIsAuthenticated(true);
          }
        });

        return () => subscription.unsubscribe();
      }
    };

    initApp();
  }, []);

  const loadUserData = async () => {
    setIsLoadingData(true);
    try {
      const [profile, regs, queues] = await Promise.all([
        db.getProfile(),
        db.getRegistrations(),
        db.getCourseQueues()
      ]);
      // Log only in development mode
      if (import.meta.env.DEV) {
        console.log('User profile loaded');
      }
      setUserProfile(profile);
      setRegistrations(regs.map(r => r.courseId));
      
      // Load course queues
      const queueMap = new Map<string, number>();
      queues.forEach(q => {
        queueMap.set(q.courseId, q.queueLength);
      });
      setCourseQueues(queueMap);
      
      // Refresh courses when loading user data (on login or page open)
      if (refreshCourses) {
        refreshCourses();
      }
      
      // Show onboarding modal if name or level is not set
      if ((!profile.firstName || !profile.lastName || profile.firstName.trim() === '' || profile.lastName.trim() === '') && (!profile.name || profile.name.trim() === '')) {
        setShowOnboardingModal(true);
      } else if (profile.englishLevel === 'None') {
        setShowOnboardingModal(true);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveName = async (firstName: string, lastName: string) => {
    await db.updateProfileInfo({ firstName, lastName });
    const updatedProfile = await db.getProfile();
    setUserProfile(updatedProfile);
  };

  const handleOnboardingComplete = async (firstName: string, lastName: string, englishLevel: EnglishLevel) => {
    try {
      // Update name if provided
      if ((firstName && firstName.trim()) || (lastName && lastName.trim())) {
        await db.updateProfileInfo({ firstName, lastName });
      }
      
      // Update English level
      await db.updateEnglishLevel(englishLevel);
      
      // Reload profile to get updated data
      const updatedProfile = await db.getProfile();
      setUserProfile(updatedProfile);
      
      setShowOnboardingModal(false);
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    loadUserData();
    // Refresh courses when user logs in
    if (refreshCourses) {
      refreshCourses();
    }
  };

  const handleLogout = async () => {
    await db.signOut();
    setIsAuthenticated(false);
    setRegistrations([]);
    setUserProfile({ id: '', email: '', englishLevel: 'None' });
  };

  const handleToggleRegistration = async (courseId: string) => {
    try {
      setErrorMessage(null);
      if (registrations.includes(courseId)) {
        await db.removeRegistration(courseId);
        setRegistrations(prev => prev.filter(id => id !== courseId));
      } else {
        if (registrations.length >= 3) {
          const t = TRANSLATIONS[language];
          setErrorMessage(t.maxCoursesReached || 'Maximum 3 courses allowed');
          return;
        }
        
        // Check if profile is complete before allowing registration
        const isComplete = await db.isProfileComplete();
        if (!isComplete) {
          const t = TRANSLATIONS[language];
          setErrorMessage(t.profileIncompleteDesc || 'Please complete your profile before registering for courses.');
          return;
        }
        
        await db.addRegistration(courseId);
        setRegistrations(prev => [...prev, courseId]);
      }
      
      // Reload queues to ensure sync (count from registrations)
      const queues = await db.getCourseQueues();
      const queueMap = new Map<string, number>();
      queues.forEach(q => {
        queueMap.set(q.courseId, q.queueLength);
      });
      setCourseQueues(queueMap);
    } catch (error: any) {
      const t = TRANSLATIONS[language];
      // Check if error is about incomplete profile
      if (error.message && error.message.includes('complete your profile')) {
        setErrorMessage(t.profileIncompleteDesc || error.message);
      } else {
        setErrorMessage(error.message || 'Failed to update registration');
      }
    }
  };

  const handleViewCourseDetails = (course: Course) => {
    setSelectedCourse(course);
    setShowCourseDetails(true);
  };

  const handleUpdateProfile = React.useCallback((newProfile: UserProfile) => {
    setUserProfile(prev => {
      // Only update if profile actually changed
      if (prev.id === newProfile.id && 
          prev.email === newProfile.email &&
          prev.englishLevel === newProfile.englishLevel &&
          prev.firstName === newProfile.firstName &&
          prev.lastName === newProfile.lastName &&
          prev.address === newProfile.address &&
          prev.eircode === newProfile.eircode &&
          prev.mobileNumber === newProfile.mobileNumber &&
          prev.dateOfBirth === newProfile.dateOfBirth) {
        return prev; // Return same reference if nothing changed
      }
      return newProfile;
    });
  }, []);

  const handleUpdatePriority = async (courseId: string, newPriority: number) => {
    try {
      await db.updateRegistrationPriority(courseId, newPriority);
      // Reload registrations to update order
      const regs = await db.getRegistrations();
      setRegistrations(regs.map(r => r.courseId));
    } catch (error) {
      console.error("Failed to update priority", error);
    }
  };

  const handleLanguageLevelSelect = async (level: EnglishLevel) => {
    try {
      await db.updateEnglishLevel(level);
      setUserProfile(prev => ({ ...prev, englishLevel: level }));
      setShowLanguageLevelModal(false);
    } catch (error) {
      console.error("Failed to update English level", error);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  if (!isAuthenticated) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} language={language} setLanguage={setLanguage} theme={theme} />;
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
      
      {/* Sidebar - Desktop: Static, Mobile: Drawer */}
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
            onClick={() => setIsSidebarOpen(false)} 
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="p-4 space-y-2">
            <button 
              onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }}
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
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
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
                onClick={() => { setActiveTab('admin'); setIsSidebarOpen(false); }}
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

        {/* Available Courses List (Context for user) */}
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
            {availableCourses
              .filter(course => {
                if (!courseSearchQuery.trim()) return true;
                const query = courseSearchQuery.toLowerCase();
                return (
                  course.title.toLowerCase().includes(query) ||
                  course.description.toLowerCase().includes(query) ||
                  course.category.toLowerCase().includes(query) ||
                  course.difficulty.toLowerCase().includes(query)
                );
              })
              .map(course => (
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
            {availableCourses.filter(course => {
              if (!courseSearchQuery.trim()) return false;
              const query = courseSearchQuery.toLowerCase();
              return (
                course.title.toLowerCase().includes(query) ||
                course.description.toLowerCase().includes(query) ||
                course.category.toLowerCase().includes(query) ||
                course.difficulty.toLowerCase().includes(query)
              );
            }).length === 0 && courseSearchQuery.trim() && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                {language === 'ru' ? 'Курсы не найдены' : language === 'ua' ? 'Курси не знайдено' : language === 'ar' ? 'لم يتم العثور على دورات' : 'No courses found'}
              </div>
            )}
          </div>
        </div>
        
        {/* Sidebar Footer with Language, Theme & Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex justify-between items-center mb-3">
             <div className="flex gap-1">
                {(['en', 'ua', 'ru', 'ar'] as Language[]).map((lang) => (
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
               <button onClick={handleLogout} className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Mobile Header Toggle - Always visible on mobile */}
        <div className="lg:hidden h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 justify-between shrink-0 z-20 sticky top-0">
           <button 
             onClick={() => setIsSidebarOpen(true)}
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
            className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 dark:text-white transition-colors shadow-sm hover:shadow-md active:scale-95"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>

        {/* Floating Menu Button - Always visible when sidebar is closed on mobile */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-40 p-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}

        {/* Main View */}
        <div className="flex-1 h-full overflow-hidden bg-white dark:bg-gray-900">
          {isLoadingData ? (
             <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
             </div>
          ) : activeTab === 'chat' ? (
            <ChatInterface language={language} onOpenSidebar={() => setIsSidebarOpen(true)} />
          ) : activeTab === 'admin' ? (
            <AdminDashboard 
              language={language} 
              onBack={() => setActiveTab('dashboard')}
            />
          ) : (
            <Dashboard 
              registrations={registrations} 
              userProfile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              onRemoveRegistration={(id) => handleToggleRegistration(id)}
              onUpdatePriority={handleUpdatePriority}
              language={language}
            />
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

export default App;