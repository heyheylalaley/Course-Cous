import React from 'react';
import { Mail, X, CheckCircle } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface EmailConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  language: Language;
}

export const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({
  isOpen,
  onClose,
  email,
  language
}) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X size={20} className="text-gray-500 dark:text-gray-400" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <Mail size={40} className="text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-3">
          {t.emailConfirmationTitle}
        </h2>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
          {t.emailConfirmationDesc}
        </p>

        {/* Email badge */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3 mb-4 flex items-center justify-center gap-2">
          <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
          <span className="text-gray-800 dark:text-gray-200 font-medium">{email}</span>
        </div>

        {/* Note */}
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          {t.emailConfirmationNote}
        </p>

        {/* Button */}
        <button
          onClick={onClose}
          className="w-full bg-green-600 dark:bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
        >
          {t.understand}
        </button>
      </div>
    </div>
  );
};
