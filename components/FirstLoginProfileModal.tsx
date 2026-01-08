import React, { useState, useRef, useEffect } from 'react';
import { X, User, GraduationCap, Save, ChevronRight, ChevronLeft } from 'lucide-react';
import { EnglishLevel, Language, UserProfile } from '../types';
import { TRANSLATIONS } from '../translations';

interface FirstLoginProfileModalProps {
  isOpen: boolean;
  onComplete: (profileData: {
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    address?: string;
    eircode?: string;
    dateOfBirth?: string;
    englishLevel?: EnglishLevel;
  }) => Promise<void>;
  onSkip: () => void;
  language: Language;
  currentProfile?: UserProfile;
}

const ENGLISH_LEVELS: { value: EnglishLevel; label: string; description: string }[] = [
  { value: 'None', label: 'None / Не указано', description: 'I don\'t know / Не знаю' },
  { value: 'A1', label: 'A1 - Beginner', description: 'Basic level / Базовый уровень' },
  { value: 'A2', label: 'A2 - Elementary', description: 'Elementary level / Элементарный уровень' },
  { value: 'B1', label: 'B1 - Intermediate', description: 'Intermediate level / Средний уровень' },
  { value: 'B2', label: 'B2 - Upper Intermediate', description: 'Upper intermediate / Выше среднего' },
  { value: 'C1', label: 'C1 - Advanced', description: 'Advanced level / Продвинутый уровень' },
  { value: 'C2', label: 'C2 - Proficiency', description: 'Native-like / Уровень носителя' },
];

export const FirstLoginProfileModal: React.FC<FirstLoginProfileModalProps> = ({ 
  isOpen, 
  onComplete,
  onSkip,
  language,
  currentProfile
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [eircode, setEircode] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<EnglishLevel>('None');
  const [isSaving, setIsSaving] = useState(false);
  
  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';

  // Track initialization
  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Modal just opened - initialize with current profile data if any
      setFirstName(currentProfile?.firstName || '');
      setLastName(currentProfile?.lastName || '');
      setMobileNumber(currentProfile?.mobileNumber || '');
      setAddress(currentProfile?.address || '');
      setEircode(currentProfile?.eircode || '');
      setDateOfBirth(currentProfile?.dateOfBirth || '');
      setSelectedLevel(currentProfile?.englishLevel || 'None');
      setStep(1);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onComplete({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        mobileNumber: mobileNumber.trim() || undefined,
        address: address.trim() || undefined,
        eircode: eircode.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        englishLevel: selectedLevel
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't allow closing on backdrop click during first login
    e.stopPropagation();
  };

  const goToStep2 = () => setStep(2);
  const goToStep1 = () => setStep(1);

  // Translations for this modal
  const modalT = {
    en: {
      welcomeTitle: 'Welcome! Let\'s set up your profile',
      welcomeSubtitle: 'This information helps us serve you better. You can skip this for now and complete it later.',
      step1Title: 'Personal Information',
      step2Title: 'English Level',
      skipBtn: 'Skip for now',
      nextBtn: 'Next',
      backBtn: 'Back',
      saveBtn: 'Save Profile',
      step1of2: 'Step 1 of 2',
      step2of2: 'Step 2 of 2',
      optionalNote: 'All fields are optional. You can update this information later in your profile.',
      requiredForCourses: 'Note: Complete profile is required to register for courses.'
    },
    ua: {
      welcomeTitle: 'Ласкаво просимо! Налаштуймо ваш профіль',
      welcomeSubtitle: 'Ця інформація допомагає нам краще обслуговувати вас. Ви можете пропустити це зараз і заповнити пізніше.',
      step1Title: 'Особиста інформація',
      step2Title: 'Рівень англійської',
      skipBtn: 'Пропустити зараз',
      nextBtn: 'Далі',
      backBtn: 'Назад',
      saveBtn: 'Зберегти профіль',
      step1of2: 'Крок 1 з 2',
      step2of2: 'Крок 2 з 2',
      optionalNote: 'Усі поля необов\'язкові. Ви можете оновити цю інформацію пізніше у своєму профілі.',
      requiredForCourses: 'Примітка: Для реєстрації на курси потрібен повний профіль.'
    },
    ru: {
      welcomeTitle: 'Добро пожаловать! Настроим ваш профиль',
      welcomeSubtitle: 'Эта информация помогает нам лучше обслуживать вас. Вы можете пропустить это сейчас и заполнить позже.',
      step1Title: 'Личная информация',
      step2Title: 'Уровень английского',
      skipBtn: 'Пропустить сейчас',
      nextBtn: 'Далее',
      backBtn: 'Назад',
      saveBtn: 'Сохранить профиль',
      step1of2: 'Шаг 1 из 2',
      step2of2: 'Шаг 2 из 2',
      optionalNote: 'Все поля необязательны. Вы можете обновить эту информацию позже в своём профиле.',
      requiredForCourses: 'Примечание: Для регистрации на курсы требуется полный профиль.'
    },
    ar: {
      welcomeTitle: 'مرحبًا! لنقم بإعداد ملفك الشخصي',
      welcomeSubtitle: 'تساعدنا هذه المعلومات في خدمتك بشكل أفضل. يمكنك تخطي هذا الآن وإكماله لاحقًا.',
      step1Title: 'المعلومات الشخصية',
      step2Title: 'مستوى اللغة الإنجليزية',
      skipBtn: 'تخطي الآن',
      nextBtn: 'التالي',
      backBtn: 'رجوع',
      saveBtn: 'حفظ الملف الشخصي',
      step1of2: 'الخطوة 1 من 2',
      step2of2: 'الخطوة 2 من 2',
      optionalNote: 'جميع الحقول اختيارية. يمكنك تحديث هذه المعلومات لاحقًا في ملفك الشخصي.',
      requiredForCourses: 'ملاحظة: يلزم ملف شخصي مكتمل للتسجيل في الدورات.'
    }
  };

  const mt = modalT[language];

  return (
    <div 
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" 
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            {step === 1 ? <User size={28} /> : <GraduationCap size={28} />}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center">
            {mt.welcomeTitle}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
            {mt.welcomeSubtitle}
          </p>
          
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`w-3 h-3 rounded-full ${step === 1 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            <div className={`w-3 h-3 rounded-full ${step === 2 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {step === 1 ? mt.step1of2 : mt.step2of2}
          </p>
        </div>

        {step === 1 ? (
          <>
            {/* Step 1: Personal Information */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <User size={16} />
                {mt.step1Title}
              </h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t.firstNameLabel}
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t.firstNamePlaceholder}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 dark:focus:border-green-600 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/30 outline-none transition-all text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t.lastNameLabel}
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t.lastNamePlaceholder}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 dark:focus:border-green-600 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/30 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t.mobileNumberLabel}
                  </label>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder={t.mobileNumberPlaceholder}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 dark:focus:border-green-600 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/30 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {t.addressLabel}
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t.addressPlaceholder}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 dark:focus:border-green-600 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/30 outline-none transition-all text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t.eircodeLabel}
                    </label>
                    <input
                      type="text"
                      value={eircode}
                      onChange={(e) => setEircode(e.target.value.toUpperCase())}
                      placeholder={t.eircodePlaceholder}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-green-500 dark:focus:border-green-600 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/30 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {t.dateOfBirthLabel}
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-600 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900/30 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Info note */}
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {mt.requiredForCourses}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                {mt.skipBtn}
              </button>
              <button
                onClick={goToStep2}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 shadow-md flex items-center justify-center gap-2 text-sm"
              >
                {mt.nextBtn}
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2: English Level */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <GraduationCap size={16} />
                {mt.step2Title}
              </h3>
              
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {ENGLISH_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setSelectedLevel(level.value)}
                    className={`w-full p-2.5 rounded-lg border-2 transition-all text-left ${
                      selectedLevel === level.value
                        ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{level.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{level.description}</div>
                      </div>
                      {selectedLevel === level.value && (
                        <div className="w-4 h-4 rounded-full bg-green-600 dark:bg-green-500 flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional note */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {mt.optionalNote}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={goToStep1}
                className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                <ChevronLeft size={16} />
                {mt.backBtn}
              </button>
              <button
                onClick={onSkip}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                {mt.skipBtn}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                <Save size={16} />
                {isSaving ? t.saving : mt.saveBtn}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
