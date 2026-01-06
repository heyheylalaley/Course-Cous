import React, { useState } from 'react';
import { X, User, GraduationCap, ArrowRight } from 'lucide-react';
import { EnglishLevel, Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (firstName: string, lastName: string, englishLevel: EnglishLevel) => void;
  language: Language;
  currentFirstName?: string;
  currentLastName?: string;
  currentEnglishLevel?: EnglishLevel;
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

const TRANSLATIONS_ONBOARDING: Record<Language, { 
  nameTitle: string; 
  nameSubtitle: string; 
  levelTitle: string; 
  levelSubtitle: string;
  nextButton: string;
  skipButton: string;
  saveButton: string;
}> = {
  en: {
    nameTitle: 'Welcome! What\'s your name?',
    nameSubtitle: 'We\'d like to personalize your experience',
    levelTitle: 'What is your English level?',
    levelSubtitle: 'This helps us recommend the best courses for you',
    nextButton: 'Next',
    skipButton: 'Skip for now',
    saveButton: 'Save'
  },
  ua: {
    nameTitle: 'Ласкаво просимо! Як вас звати?',
    nameSubtitle: 'Ми хочемо персоналізувати ваш досвід',
    levelTitle: 'Який у вас рівень англійської?',
    levelSubtitle: 'Це допомагає нам рекомендувати найкращі курси для вас',
    nextButton: 'Далі',
    skipButton: 'Пропустити зараз',
    saveButton: 'Зберегти'
  },
  ru: {
    nameTitle: 'Добро пожаловать! Как вас зовут?',
    nameSubtitle: 'Мы хотели бы персонализировать ваш опыт',
    levelTitle: 'Какой у вас уровень английского?',
    levelSubtitle: 'Это помогает нам рекомендовать лучшие курсы для вас',
    nextButton: 'Далее',
    skipButton: 'Пропустить сейчас',
    saveButton: 'Сохранить'
  },
  ar: {
    nameTitle: 'مرحبًا! ما اسمك؟',
    nameSubtitle: 'نود تخصيص تجربتك',
    levelTitle: 'ما هو مستواك في اللغة الإنجليزية؟',
    levelSubtitle: 'يساعدنا هذا في التوصية بأفضل الدورات لك',
    nextButton: 'التالي',
    skipButton: 'تخطي الآن',
    saveButton: 'حفظ'
  }
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ 
  isOpen, 
  onComplete, 
  language,
  currentFirstName,
  currentLastName,
  currentEnglishLevel
}) => {
  const [step, setStep] = useState<'name' | 'level'>('name');
  const [firstName, setFirstName] = useState(currentFirstName ?? '');
  const [lastName, setLastName] = useState(currentLastName ?? '');
  const [selectedLevel, setSelectedLevel] = useState<EnglishLevel | null>(currentEnglishLevel && currentEnglishLevel !== 'None' ? currentEnglishLevel : null);
  const [isSaving, setIsSaving] = useState(false);
  const t = TRANSLATIONS[language];
  const tOnboarding = TRANSLATIONS_ONBOARDING[language];
  const isRtl = language === 'ar';

  React.useEffect(() => {
    if (isOpen) {
      setFirstName(currentFirstName ?? '');
      setLastName(currentLastName ?? '');
      setSelectedLevel(currentEnglishLevel && currentEnglishLevel !== 'None' ? currentEnglishLevel : null);
      // If name is already set, go to level step
      if ((currentFirstName && currentFirstName.trim()) || (currentLastName && currentLastName.trim())) {
        setStep('level');
      } else {
        setStep('name');
      }
    }
  }, [isOpen, currentFirstName, currentLastName, currentEnglishLevel]);

  if (!isOpen) return null;

  const handleNameNext = () => {
    if (firstName.trim() && lastName.trim()) {
      setStep('level');
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      await onComplete(
        firstName.trim() || currentFirstName || '', 
        lastName.trim() || currentLastName || '', 
        selectedLevel || 'None'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      // Don't allow closing on backdrop click during onboarding
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" 
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'name' ? (
          <>
            <div className="flex flex-col items-center mb-4 sm:mb-6">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-3">
                <User size={24} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center">
                {tOnboarding.nameTitle}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                {tOnboarding.nameSubtitle}
              </p>
            </div>

            <div className="mb-4 sm:mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.firstNameLabel} *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t.firstNamePlaceholder}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && firstName.trim() && lastName.trim()) {
                      handleNameNext();
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.lastNameLabel} *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t.lastNamePlaceholder}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && firstName.trim() && lastName.trim()) {
                      handleNameNext();
                    }
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleNameNext}
              disabled={!firstName.trim() || !lastName.trim() || isSaving}
              className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                firstName.trim() && lastName.trim() && !isSaving
                  ? 'bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              {tOnboarding.nextButton}
              <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center mb-4 sm:mb-6">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-3">
                <GraduationCap size={24} />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center">
                {tOnboarding.levelTitle}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                {tOnboarding.levelSubtitle}
              </p>
            </div>

            <div className="space-y-2 mb-4 sm:mb-6 max-h-64 overflow-y-auto">
              {ENGLISH_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setSelectedLevel(level.value)}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    selectedLevel === level.value
                      ? 'border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{level.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{level.description}</div>
                    </div>
                    {selectedLevel === level.value && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('name')}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleComplete}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t.saving : tOnboarding.saveButton}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

