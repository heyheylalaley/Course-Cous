import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  language: Language;
  type?: 'error' | 'warning' | 'info';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  message,
  language,
  type = 'error'
}) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          iconBg: 'bg-yellow-100 dark:bg-yellow-900',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          buttonBg: 'bg-yellow-600 dark:bg-yellow-700 hover:bg-yellow-700 dark:hover:bg-yellow-600'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900',
          iconColor: 'text-blue-600 dark:text-blue-400',
          borderColor: 'border-blue-200 dark:border-blue-800',
          buttonBg: 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600'
        };
      default: // error
        return {
          iconBg: 'bg-red-100 dark:bg-red-900',
          iconColor: 'text-red-600 dark:text-red-400',
          borderColor: 'border-red-200 dark:border-red-800',
          buttonBg: 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 relative border-2 ${styles.borderColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className={`w-12 h-12 ${styles.iconBg} ${styles.iconColor} rounded-xl flex items-center justify-center mb-3`}>
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {type === 'error' ? t.alertTitle || 'Error' : 
             type === 'warning' ? t.alertWarningTitle || 'Warning' : 
             t.alertInfoTitle || 'Information'}
          </h2>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 text-center">
            {message}
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all shadow-md ${styles.buttonBg}`}
          >
            {t.understand || 'Understand'}
          </button>
        </div>
      </div>
    </div>
  );
};
