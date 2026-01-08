import React, { useState } from 'react';
import { Loader2, Moon, Sun, Info, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Language, Theme } from '../types';
import { TRANSLATIONS } from '../translations';
import { ContactModal } from './ContactModal';
import { db } from '../services/db';

interface UpdatePasswordPageProps {
  onPasswordUpdated: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
}

export const UpdatePasswordPage: React.FC<UpdatePasswordPageProps> = ({ 
  onPasswordUpdated, 
  language, 
  setLanguage, 
  theme 
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';
  const [localTheme, setLocalTheme] = useState<Theme>(theme);
  const [showContactModal, setShowContactModal] = useState(false);

  // Password update translations
  const translations = {
    en: {
      title: 'Create New Password',
      subtitle: 'Please enter your new password below.',
      newPasswordLabel: 'New Password',
      confirmPasswordLabel: 'Confirm Password',
      passwordPlaceholder: 'Enter new password',
      confirmPlaceholder: 'Confirm new password',
      updateBtn: 'Update Password',
      successTitle: 'Password Updated!',
      successMessage: 'Your password has been successfully updated. You can now use your new password to sign in.',
      continueBtn: 'Continue to App',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      updateError: 'Failed to update password. Please try again.',
    },
    ua: {
      title: 'Створіть новий пароль',
      subtitle: 'Будь ласка, введіть ваш новий пароль нижче.',
      newPasswordLabel: 'Новий пароль',
      confirmPasswordLabel: 'Підтвердіть пароль',
      passwordPlaceholder: 'Введіть новий пароль',
      confirmPlaceholder: 'Підтвердіть новий пароль',
      updateBtn: 'Оновити пароль',
      successTitle: 'Пароль оновлено!',
      successMessage: 'Ваш пароль успішно оновлено. Тепер ви можете використовувати новий пароль для входу.',
      continueBtn: 'Продовжити',
      passwordMismatch: 'Паролі не співпадають',
      passwordTooShort: 'Пароль має містити щонайменше 6 символів',
      updateError: 'Не вдалося оновити пароль. Спробуйте ще раз.',
    },
    ru: {
      title: 'Создайте новый пароль',
      subtitle: 'Пожалуйста, введите ваш новый пароль ниже.',
      newPasswordLabel: 'Новый пароль',
      confirmPasswordLabel: 'Подтвердите пароль',
      passwordPlaceholder: 'Введите новый пароль',
      confirmPlaceholder: 'Подтвердите новый пароль',
      updateBtn: 'Обновить пароль',
      successTitle: 'Пароль обновлен!',
      successMessage: 'Ваш пароль успешно обновлен. Теперь вы можете использовать новый пароль для входа.',
      continueBtn: 'Продолжить',
      passwordMismatch: 'Пароли не совпадают',
      passwordTooShort: 'Пароль должен содержать минимум 6 символов',
      updateError: 'Не удалось обновить пароль. Попробуйте еще раз.',
    },
    ar: {
      title: 'إنشاء كلمة مرور جديدة',
      subtitle: 'يرجى إدخال كلمة المرور الجديدة أدناه.',
      newPasswordLabel: 'كلمة المرور الجديدة',
      confirmPasswordLabel: 'تأكيد كلمة المرور',
      passwordPlaceholder: 'أدخل كلمة المرور الجديدة',
      confirmPlaceholder: 'تأكيد كلمة المرور الجديدة',
      updateBtn: 'تحديث كلمة المرور',
      successTitle: 'تم تحديث كلمة المرور!',
      successMessage: 'تم تحديث كلمة المرور بنجاح. يمكنك الآن استخدام كلمة المرور الجديدة لتسجيل الدخول.',
      continueBtn: 'متابعة',
      passwordMismatch: 'كلمات المرور غير متطابقة',
      passwordTooShort: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل',
      updateError: 'فشل تحديث كلمة المرور. يرجى المحاولة مرة أخرى.',
    }
  };

  const pt = translations[language];

  const toggleTheme = () => {
    const newTheme = localTheme === 'light' ? 'dark' : 'light';
    setLocalTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 6) {
      setError(pt.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(pt.passwordMismatch);
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await db.updatePassword(password);
      
      if (updateError) {
        setError(updateError);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(pt.updateError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    onPasswordUpdated();
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
        
        {/* Top Bar with Language & Theme */}
        <div className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex gap-1">
            {(['en', 'ua', 'ru', 'ar'] as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`w-9 h-9 text-xs font-bold rounded-lg transition-colors ${
                  language === lang 
                    ? 'bg-green-600 dark:bg-green-700 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowContactModal(true)}
              className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-green-600 dark:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={t.contactInfo}
            >
              <Info size={20} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={localTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {localTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center items-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center mb-6 sm:mb-8">
              <img 
                src={`${import.meta.env.BASE_URL}logo.svg`}
                alt="Cork City Partnership" 
                className="w-16 h-16 mb-3"
              />
              <h1 className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400">{t.orgName}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t.appTitle}</p>
              
              {success ? (
                <>
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-lg font-medium text-gray-600 dark:text-gray-300">{pt.successTitle}</h2>
                </>
              ) : (
                <h2 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">{pt.title}</h2>
              )}
            </div>

            {success ? (
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {pt.successMessage}
                </p>
                <button
                  onClick={handleContinue}
                  className="w-full bg-green-600 dark:bg-green-700 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 active:scale-[0.99] transition-all shadow-md"
                >
                  {pt.continueBtn}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                  {pt.subtitle}
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {pt.newPasswordLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 focus:border-green-500 dark:focus:border-green-600 outline-none transition-all"
                      placeholder={pt.passwordPlaceholder}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {pt.confirmPasswordLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 focus:border-green-500 dark:focus:border-green-600 outline-none transition-all"
                      placeholder={pt.confirmPlaceholder}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 dark:bg-green-700 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 active:scale-[0.99] transition-all shadow-md flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : pt.updateBtn}
                </button>
              </form>
            )}
          </div>
          
          {/* Footer with organization name */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} {t.orgName}. All rights reserved.
          </div>
        </div>
      </div>
      
      <ContactModal 
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        language={language}
      />
    </>
  );
};
