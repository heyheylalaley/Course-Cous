import React, { useEffect, useState, useRef, memo } from 'react';
import { UserProfile, EnglishLevel, Language, Registration, Course } from '../types';
import { AVAILABLE_COURSES } from '../constants';
import { useCourses } from '../hooks/useCourses';
import { CourseCard } from './CourseCard';
import { Save, User, BookCheck, ArrowUp, ArrowDown, GripVertical, Edit2 } from 'lucide-react';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { NameModal } from './NameModal';
import { ProfileInfoModal } from './ProfileInfoModal';

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
  const [showNameModal, setShowNameModal] = useState(false);
  const [showProfileInfoModal, setShowProfileInfoModal] = useState(false);
  const [courseQueues, setCourseQueues] = useState<Map<string, number>>(new Map());
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const { courses: availableCourses } = useCourses(false, language);
  const t = TRANSLATIONS[language];

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

  const handleSaveName = async (firstName: string, lastName: string) => {
    try {
      await db.updateProfileInfo({ firstName, lastName });
      // Reload profile from database to ensure sync
      const updatedProfile = await db.getProfile();
      onUpdateProfile(updatedProfile);
      const complete = await db.isProfileComplete();
      setIsProfileComplete(complete);
      // Name saved successfully (no need to log)
    } catch (error: any) {
      console.error('Failed to save name:', error);
      alert(error?.message || 'Failed to save name. Please try again.');
      throw error;
    }
  };

  const handleSaveProfileInfo = async (updatedProfile: UserProfile) => {
    onUpdateProfile(updatedProfile);
    const complete = await db.isProfileComplete();
    setIsProfileComplete(complete);
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

  return (
    <>
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 sm:space-y-8">
        
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t.cabinetTitle}</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">{t.cabinetSubtitle}</p>
        </div>

        {/* Profile Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg">
              <User size={20} />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">{t.profileTitle}</h2>
          </div>
          
          {/* Name Section */}
          <div className="max-w-sm mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.nameLabel}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={userProfile.firstName && userProfile.lastName 
                  ? `${userProfile.firstName} ${userProfile.lastName}` 
                  : userProfile.name || ''}
                readOnly
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t.namePlaceholder}
              />
              <button
                onClick={() => setShowNameModal(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                title={t.editName}
              >
                <Edit2 size={18} />
              </button>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
                  {t.additionalInfoTitle}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.additionalInfoDesc}
                </p>
              </div>
              {!isProfileComplete && (
                <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                  {t.profileIncomplete}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                  {userProfile.mobileNumber || '-'}
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
                  {userProfile.address || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">{t.dateOfBirthLabel}:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {userProfile.dateOfBirth || '-'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowProfileInfoModal(true)}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 text-sm font-medium transition-colors"
            >
              <Edit2 size={16} />
              {t.editAdditionalInfo}
            </button>
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
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg">
              <BookCheck size={20} />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">{t.myCourses}</h2>
            <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold px-2 py-1 rounded-full">
              {registeredCourses.length}
            </span>
          </div>

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
                return (
                  <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {/* Priority controls */}
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => handlePriorityChange(course.id, 'up')}
                          disabled={!canMoveUp}
                          className={`p-1 rounded ${canMoveUp ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <div className="text-xs font-bold text-green-600 dark:text-green-400 text-center py-1">
                          {priority}
                        </div>
                        <button
                          onClick={() => handlePriorityChange(course.id, 'down')}
                          disabled={!canMoveDown}
                          className={`p-1 rounded ${canMoveDown ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}`}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Course card content */}
                      <div className="flex-1">
                        <CourseCard 
                          course={course} 
                          onToggleRegistration={onRemoveRegistration}
                          showRemoveOnly={true}
                          isRegistered={true}
                          language={language}
                          queueLength={courseQueues.get(course.id) || 0}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>

    {/* Name Modal - rendered outside overflow container */}
    <NameModal
      isOpen={showNameModal}
      onClose={() => setShowNameModal(false)}
      onSave={handleSaveName}
      language={language}
      currentFirstName={userProfile.firstName ?? undefined}
      currentLastName={userProfile.lastName ?? undefined}
    />

    {/* Profile Info Modal */}
    <ProfileInfoModal
      isOpen={showProfileInfoModal}
      onClose={() => setShowProfileInfoModal(false)}
      onSave={handleSaveProfileInfo}
      language={language}
      currentProfile={userProfile}
    />
    </>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;