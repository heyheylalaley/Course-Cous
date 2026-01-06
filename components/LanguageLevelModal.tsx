import React, { useState } from 'react';
import { EnglishLevel, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { GraduationCap, X } from 'lucide-react';

interface LanguageLevelModalProps {
  isOpen: boolean;
  onSelect: (level: EnglishLevel) => void;
  language: Language;
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

const TRANSLATIONS_LEVELS: Record<Language, { title: string; subtitle: string; selectButton: string; skipButton: string }> = {
  en: {
    title: 'What is your English level?',
    subtitle: 'This helps us recommend the best courses for you',
    selectButton: 'Select',
    skipButton: 'Skip for now'
  },
  ua: {
    title: 'Який у вас рівень англійської?',
    subtitle: 'Це допомагає нам рекомендувати найкращі курси для вас',
    selectButton: 'Вибрати',
    skipButton: 'Пропустити зараз'
  },
  ru: {
    title: 'Какой у вас уровень английского?',
    subtitle: 'Это помогает нам рекомендовать лучшие курсы для вас',
    selectButton: 'Выбрать',
    skipButton: 'Пропустить сейчас'
  },
  ar: {
    title: 'ما هو مستواك في اللغة الإنجليزية؟',
    subtitle: 'يساعدنا هذا في التوصية بأفضل الدورات لك',
    selectButton: 'اختر',
    skipButton: 'تخطي الآن'
  }
};

export const LanguageLevelModal: React.FC<LanguageLevelModalProps> = ({ isOpen, onSelect, language }) => {
  const [selectedLevel, setSelectedLevel] = useState<EnglishLevel | null>(null);
  const t = TRANSLATIONS_LEVELS[language];
  const isRtl = language === 'ar';

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedLevel) {
      onSelect(selectedLevel);
    }
  };

  const handleSkip = () => {
    onSelect('None');
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-3">
            <GraduationCap size={24} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center">{t.title}</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-2">{t.subtitle}</p>
        </div>

        {/* Level selection */}
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

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t.skipButton}
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedLevel}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              selectedLevel
                ? 'bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {t.selectButton}
          </button>
        </div>
      </div>
    </div>
  );
};

