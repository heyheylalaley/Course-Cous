import React, { useEffect, useState, useRef, memo } from 'react';
import { UserProfile, EnglishLevel, Language, Registration, Course } from '../types';
import { AVAILABLE_COURSES } from '../constants';
import { useCourses } from '../hooks/useCourses';
import { CourseCard } from './CourseCard';
import { Save, User, BookCheck, ArrowUp, ArrowDown, Edit2, Menu, Mail, CheckCircle, Award, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { ProfileInfoModal } from './ProfileInfoModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useUI } from '../contexts/UIContext';

// Helper functions for data masking
const maskEmail = (email: string): string => {
  if (!email) return '-';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length > 2 
    ? local.substring(0, 2) + '***' 
    : local + '***';
  return `${maskedLocal}@${domain}`;
};

const maskPhone = (phone: string): string => {
  if (!phone) return '-';
  // Show first 4 and last 2 characters
  if (phone.length <= 6) return phone;
  return phone.substring(0, 4) + '*** ***' + phone.substring(phone.length - 2);
};

const maskAddress = (address: string): string => {
  if (!address) return '-';
  // Show first 10 characters
  if (address.length <= 10) return address;
  return address.substring(0, 10) + '***';
};

const formatDateDisplay = (dateString: string): string => {
  if (!dateString) return '-';
  // Convert from YYYY-MM-DD to DD.MM.YYYY
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

interface DashboardProps {
  registrations: string[];
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onRemoveRegistration: (courseId: string) => void;
  onUpdatePriority?: (courseId: string, newPriority: number) => void;
  language: Language;
}

export const Dashboard: React.FC<DashboardProps> = memo(({ 
  registrations, 
  userProfile, 
  onUpdateProfile,
  onRemoveRegistration,
  onUpdatePriority,
  language
}) => {
  const [level, setLevel] = useState<EnglishLevel>(userProfile.englishLevel);
  const [isSaving, setIsSaving] = useState(false);
  const [courseRegistrations, setCourseRegistrations] = useState<Registration[]>([]);
  const [showProfileInfoModal, setShowProfileInfoModal] = useState(false);
  const [courseQueues, setCourseQueues] = useState<Map<string, number>>(new Map());
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [courseToRemove, setCourseToRemove] = useState<{ id: string; title: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  // Sensitive data is always masked and cannot be revealed
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [completedCourses, setCompletedCourses] = useState<Array<{ courseId: string; completedAt: Date }>>([]);
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const { courses: availableCourses } = useCourses(false, language);
  const { setSidebarOpen } = useUI();
  const t = TRANSLATIONS[language] as any;

  // Load registrations with priorities and course queues
  // Use refs to track previous values and avoid unnecessary reloads
  const prevRegistrationsRef = useRef<string[]>([]);
  const prevUserProfileIdRef = useRef<string>('');
  
  useEffect(() => {
    // Only reload if registrations actually changed (by length or content)
    const registrationsChanged = 
      registrations.length !== prevRegistrationsRef.current.length ||
      registrations.some((id, index) => id !== prevRegistrationsRef.current[index]);
    
    // Only reload if user profile ID changed (not just other properties)
    const profileChanged = userProfile.id !== prevUserProfileIdRef.current;
    
    // Skip reload if nothing meaningful changed
    if (!registrationsChanged && !profileChanged && 
        prevRegistrationsRef.current.length > 0 && prevUserProfileIdRef.current) {
      return;
    }
    
    // Update refs
    prevRegistrationsRef.current = [...registrations];
    prevUserProfileIdRef.current = userProfile.id;
    
    const loadData = async () => {
      try {
        const regs = await db.getRegistrations();
        setCourseRegistrations(regs);
        
        // Load course queues
        const queues = await db.getCourseQueues();
        const queueMap = new Map<string, number>();
        queues.forEach(q => {
          queueMap.set(q.courseId, q.queueLength);
        });
        setCourseQueues(queueMap);

        // Check if profile is complete
        const complete = await db.isProfileComplete();
        setIsProfileComplete(complete);

        // Load completed courses
        try {
          const completed = await db.getUserCompletedCourses();
          setCompletedCourses(completed);
        } catch (err) {
          // Silently fail - completions might not be available
          console.error("Failed to load completed courses", err);
        }
      } catch (error) {
        console.error("Failed to load data", error);
      }
    };
    loadData();
  }, [registrations, userProfile.id]);

  // Sync local state if parent updates
  useEffect(() => {
    setLevel(userProfile.englishLevel);
  }, [userProfile]);

  // Removed debug log for showNameModal

  const handleSaveProfile = async () => {
    setIsSaving(true);
    await db.updateEnglishLevel(level);
    onUpdateProfile({ ...userProfile, englishLevel: level });
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleSaveProfileInfo = async (updatedProfile: UserProfile) => {
    onUpdateProfile(updatedProfile);
    const complete = await db.isProfileComplete();
    setIsProfileComplete(complete);
    // Show success toast
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const registeredCourses = courseRegistrations
    .sort((a, b) => (a.priority || 999) - (b.priority || 999))
    .map(reg => {
      const course = availableCourses.find(c => c.id === reg.courseId);
      return course ? { course, priority: reg.priority || 999 } : null;
    })
    .filter((item): item is { course: Course, priority: number } => item !== null);

  const handlePriorityChange = async (courseId: string, direction: 'up' | 'down') => {
    const currentReg = courseRegistrations.find(r => r.courseId === courseId);
    if (!currentReg) return;

    const currentPriority = currentReg.priority || courseRegistrations.indexOf(currentReg) + 1;
    const newPriority = direction === 'up' ? currentPriority - 1 : currentPriority + 1;

    if (newPriority < 1 || newPriority > courseRegistrations.length) return;

    try {
      await db.updateRegistrationPriority(courseId, newPriority);
      const updated = await db.getRegistrations();
      setCourseRegistrations(updated);
      onUpdatePriority?.(courseId, newPriority);
    } catch (error) {
      console.error("Failed to update priority", error);
    }
  };

  // Handle course removal with confirmation
  const handleRemoveClick = (courseId: string) => {
    const course = availableCourses.find(c => c.id === courseId);
    if (course) {
      setCourseToRemove({ id: courseId, title: course.title });
    }
  };

  const handleConfirmRemove = async () => {
    if (!courseToRemove) return;
    
    setIsRemoving(true);
    try {
      await onRemoveRegistration(courseToRemove.id);
      // Refresh registrations after removal
      const regs = await db.getRegistrations();
      setCourseRegistrations(regs);
    } finally {
      setIsRemoving(false);
      setCourseToRemove(null);
    }
  };

  return (
    <>
    <div className="flex flex-col h-full min-h-0 bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden h-14 bg-gradient-to-r from-green-600 to-green-700 flex items-center px-4 justify-between flex-shrink-0">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors shadow-md active:scale-95"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-white font-bold text-base">{t.cabinetTitle}</span>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 sm:space-y-8">
        
          {/* Header - Desktop only */}
          <div className="mb-4 sm:mb-6 hidden lg:block">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t.cabinetTitle}</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">{t.cabinetSubtitle}</p>
          </div>

        {/* Profile Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg">
                <User size={20} />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">{t.profileTitle}</h2>
              {!isProfileComplete && (
                <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                  {t.profileIncomplete}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowProfileInfoModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 text-sm font-medium transition-colors"
            >
              <Edit2 size={16} />
              {t.editProfile || 'Edit Profile'}
            </button>
          </div>

          {/* Profile Information */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.additionalInfoDesc}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {/* Email - always masked */}
              <div className="sm:col-span-2 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Mail size={16} className="text-gray-400 dark:text-gray-500" />
                <span className="text-gray-500 dark:text-gray-400">{t.emailLabel || 'Email'}:</span>
                <span className="ml-1 text-gray-900 dark:text-white font-medium">
                  {maskEmail(userProfile.email)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t.firstNameLabel}:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {userProfile.firstName || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t.lastNameLabel}:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {userProfile.lastName || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t.mobileNumberLabel}:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {maskPhone(userProfile.mobileNumber || '')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t.eircodeLabel}:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {userProfile.eircode || '-'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-500 dark:text-gray-400">{t.addressLabel}:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {maskAddress(userProfile.address || '')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t.dateOfBirthLabel}:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {formatDateDisplay(userProfile.dateOfBirth || '')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="max-w-sm">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.engLevelLabel}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t.engLevelDesc}
            </p>
            <div className="flex gap-2">
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as EnglishLevel)}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 border p-2.5 text-sm text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-600 focus:ring-green-500 dark:focus:ring-green-600"
              >
                <option value="None">{t.notSpecified}</option>
                <option value="A1">A1 - Beginner</option>
                <option value="A2">A2 - Elementary</option>
                <option value="B1">B1 - Intermediate</option>
                <option value="B2">B2 - Upper Intermediate</option>
                <option value="C1">C1 - Advanced</option>
                <option value="C2">C2 - Proficient</option>
              </select>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving || level === userProfile.englishLevel}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all
                  ${level === userProfile.englishLevel 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default' 
                    : 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 shadow-sm'
                  }`}
              >
                <Save size={16} />
                {isSaving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </section>

        {/* Registrations Section */}
        <section>
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg">
              <BookCheck size={20} />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">{t.myCourses}</h2>
            <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded-full">
              {registeredCourses.length}
            </span>
          </div>
          
          {registeredCourses.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
              <ArrowUp className="w-4 h-4" />
              <ArrowDown className="w-4 h-4" />
              {t.priorityHint || 'Use arrows to set priority. First course = highest priority.'}
            </p>
          )}

          {registeredCourses.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                <BookCheck className="text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t.noCourses}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t.noCoursesDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {registeredCourses.map(({ course, priority }) => {
                const canMoveUp = priority > 1;
                const canMoveDown = priority < registeredCourses.length;
                const priorityLabel = t[`priority${priority}`] || 
                  (priority === 1 ? (t.priorityFirst || '1st choice') : 
                   priority === 2 ? (t.prioritySecond || '2nd choice') : 
                   (t.priorityThird || '3rd choice'));
                const priorityColor = priority === 1 
                  ? 'bg-green-500 dark:bg-green-600' 
                  : priority === 2 
                    ? 'bg-blue-500 dark:bg-blue-600' 
                    : 'bg-gray-500 dark:bg-gray-600';
                return (
                  <div key={course.id} className={`bg-white dark:bg-gray-800 rounded-xl border-2 ${priority === 1 ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'} p-3 sm:p-4 shadow-sm transition-all`}>
                    {/* Priority Badge */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div className={`${priorityColor} text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5`}>
                        <span className="text-base">{priority}</span>
                        <span>{priorityLabel}</span>
                      </div>
                      
                      {/* Priority controls - more prominent */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePriorityChange(course.id, 'up')}
                          disabled={!canMoveUp}
                          title={t.moveUp || 'Move up'}
                          className={`p-2 rounded-lg transition-colors ${canMoveUp 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-600 dark:hover:text-green-400' 
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                        >
                          <ArrowUp className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handlePriorityChange(course.id, 'down')}
                          disabled={!canMoveDown}
                          title={t.moveDown || 'Move down'}
                          className={`p-2 rounded-lg transition-colors ${canMoveDown 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-600 dark:hover:text-green-400' 
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                        >
                          <ArrowDown className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Course card content */}
                    <CourseCard 
                      course={course} 
                      onToggleRegistration={handleRemoveClick}
                      showRemoveOnly={true}
                      isRegistered={true}
                      language={language}
                      queueLength={courseQueues.get(course.id) || 0}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Completed Courses Section */}
        {completedCourses.length > 0 && (
          <section className="mt-6">
            <button
              onClick={() => setShowCompletedSection(!showCompletedSection)}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg">
                  <Award size={20} />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
                  {t.completedCourses || 'Completed Courses'}
                </h2>
                <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-bold px-2 py-1 rounded-full">
                  {completedCourses.length}
                </span>
              </div>
              {showCompletedSection ? (
                <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              )}
            </button>

            {showCompletedSection && (
              <div className="mt-3 space-y-3">
                {completedCourses.map(({ courseId, completedAt }) => {
                  const course = availableCourses.find(c => c.id === courseId);
                  if (!course) return null;
                  
                  return (
                    <div 
                      key={courseId} 
                      className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {t.courseCompleted || 'Completed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar size={14} />
                          {completedAt.toLocaleDateString(language === 'en' ? 'en-GB' : language === 'ua' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'ar-SA')}
                        </div>
                      </div>
                      <div className="opacity-75">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{course.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{course.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        </div>
      </div>
    </div>

    {/* Profile Info Modal */}
    <ProfileInfoModal
      isOpen={showProfileInfoModal}
      onClose={() => setShowProfileInfoModal(false)}
      onSave={handleSaveProfileInfo}
      language={language}
      currentProfile={userProfile}
    />

    {/* Course Removal Confirmation Modal */}
    <ConfirmationModal
      isOpen={!!courseToRemove}
      onClose={() => setCourseToRemove(null)}
      onConfirm={handleConfirmRemove}
      title={t.confirmRemoveCourse || 'Remove Course?'}
      message={t.confirmRemoveCourseDesc || 'If you cancel your registration and re-register later, you will be placed at the end of the queue.'}
      confirmText={t.confirmRemoveBtn || 'Yes, Remove'}
      language={language}
      type="warning"
      isLoading={isRemoving}
    />

    {/* Success Toast */}
    {showSuccessToast && (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 px-4 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg shadow-lg">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">{t.profileSaved || 'Profile saved successfully'}</span>
        </div>
      </div>
    )}
    </>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;