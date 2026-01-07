import React, { useState, useRef } from 'react';
import { X, User } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface NameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (firstName: string, lastName: string) => void;
  language: Language;
  currentFirstName?: string;
  currentLastName?: string;
}

export const NameModal: React.FC<NameModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  language,
  currentFirstName,
  currentLastName
}) => {
  const [firstName, setFirstName] = useState(currentFirstName ?? '');
  const [lastName, setLastName] = useState(currentLastName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  // Track initialization to prevent resetting form on tab switch
  const initializedNamesRef = useRef<string>('');
  const wasOpenRef = useRef<boolean>(false);

  // Update names when modal opens (only on first open or when names actually change externally)
  React.useEffect(() => {
    const currentNamesKey = `${currentFirstName ?? ''}|${currentLastName ?? ''}`;
    const shouldInitialize = isOpen && (
      !wasOpenRef.current || // Modal just opened
      initializedNamesRef.current !== currentNamesKey // Names changed externally
    );
    
    if (shouldInitialize) {
      setFirstName(currentFirstName ?? '');
      setLastName(currentLastName ?? '');
      initializedNamesRef.current = currentNamesKey;
    }
    
    wasOpenRef.current = isOpen;
    
    // Reset refs when modal closes
    if (!isOpen) {
      initializedNamesRef.current = '';
    }
  }, [isOpen, currentFirstName, currentLastName]);

  if (!isOpen) {
    return null;
  }

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    setIsSaving(true);
    try {
      await onSave(firstName.trim(), lastName.trim());
      onClose();
    } catch (error) {
      console.error('Failed to save name:', error);
      // Don't close modal on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-3">
            <User size={24} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center">
            {(currentFirstName && currentFirstName.trim()) || (currentLastName && currentLastName.trim()) ? t.editName : t.enterYourName}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
            {(currentFirstName && currentFirstName.trim()) || (currentLastName && currentLastName.trim()) ? t.editNameDesc : t.enterYourNameDesc}
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
                  handleSave();
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
                  handleSave();
                }
              }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          {((currentFirstName && currentFirstName.trim()) || (currentLastName && currentLastName.trim())) && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t.cancel}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!firstName.trim() || !lastName.trim() || isSaving}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              firstName.trim() && lastName.trim() && !isSaving
                ? 'bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

