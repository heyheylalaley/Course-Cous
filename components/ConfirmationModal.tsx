import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  language: Language;
  type?: 'warning' | 'danger';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  language,
  type = 'warning',
  isLoading = false
}) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  // Предотвратить скролл body при открытой модалке
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const getTypeStyles = () => {
    if (type === 'danger') {
      return {
        iconBg: 'bg-red-100 dark:bg-red-900',
        iconColor: 'text-red-600 dark:text-red-400',
        borderColor: 'border-red-200 dark:border-red-800',
        confirmBg: 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600'
      };
    }
    // warning (default)
    return {
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      confirmBg: 'bg-yellow-600 dark:bg-yellow-700 hover:bg-yellow-700 dark:hover:bg-yellow-600'
    };
  };

  const styles = getTypeStyles();

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative border-2 ${styles.borderColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 min-h-[44px] min-w-[44px] sm:p-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 active:scale-95 flex items-center justify-center"
          aria-label={t.close || 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className={`w-12 h-12 ${styles.iconBg} ${styles.iconColor} rounded-xl flex items-center justify-center mb-3`}>
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 text-center">
            {message}
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="min-h-[44px] px-6 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50 active:scale-95"
          >
            {cancelText || t.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`min-h-[44px] px-6 py-2.5 rounded-lg font-medium text-white transition-all shadow-md disabled:opacity-50 active:scale-95 ${styles.confirmBg}`}
          >
            {isLoading ? t.saving : (confirmText || t.confirm)}
          </button>
        </div>
      </div>
    </div>
  );
};

