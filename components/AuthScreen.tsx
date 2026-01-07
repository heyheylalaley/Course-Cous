import React, { useState } from 'react';
import { db } from '../services/db';
import { Loader2, Moon, Sun, Info } from 'lucide-react';
import { Language, Theme } from '../types';
import { TRANSLATIONS } from '../translations';
import { ContactModal } from './ContactModal';

interface AuthScreenProps {
  onLoginSuccess: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, language, setLanguage, theme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = TRANSLATIONS[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Delay for effect
      await new Promise(r => setTimeout(r, 800));
      
      const { user, error } = isLogin 
        ? await db.signIn(email, password) 
        : await db.signUp(email, password);

      if (error) {
        setError(error);
      } else if (user) {
        onLoginSuccess();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await db.signInWithGoogle();
      if (error) {
        setError(error);
        setIsLoading(false);
      }
      // If successful, user will be redirected to Google, then back to app
      // onAuthStateChange in App.tsx will handle the login
    } catch (err) {
      setError("Google sign-in failed");
      setIsLoading(false);
    }
  };

  const isRtl = language === 'ar';
  const [localTheme, setLocalTheme] = useState<Theme>(theme);
  const [showContactModal, setShowContactModal] = useState(false);

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

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center items-center p-4 relative" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Language Switcher & Theme Toggle (Top Right) */}
      <div className="absolute top-4 right-4 flex gap-2 items-center">
        <button
          onClick={() => setShowContactModal(true)}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors"
          title={t.contactInfo}
        >
          <Info size={18} />
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          title={localTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {localTheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        {(['en', 'ua', 'ru', 'ar'] as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
              language === lang 
                ? 'bg-green-600 dark:bg-green-700 text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img 
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt="Cork City Partnership" 
            className="w-16 h-16 mb-3"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-400">{t.orgName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t.appTitle}</p>
          <h2 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">{t.loginTitle}</h2>
          <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1 text-center">{t.loginSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.emailLabel}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-indigo-500 dark:focus:border-indigo-600 outline-none transition-all"
              placeholder="name@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.passwordLabel}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-indigo-500 dark:focus:border-indigo-600 outline-none transition-all"
              placeholder="••••••••"
            />
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
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (isLogin ? t.signInBtn : t.signUpBtn)}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">{t.orContinueWith}</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="mt-4 w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2.5 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t.signInWithGoogle}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
          >
            {isLogin ? t.switchToSignUp : t.switchToSignIn}
          </button>
        </div>
      </div>
      
      {/* Footer with organization name */}
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} {t.orgName}. All rights reserved.
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