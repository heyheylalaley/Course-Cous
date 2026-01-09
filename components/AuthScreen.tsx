import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Loader2, Moon, Sun, Info, ArrowLeft, Play } from 'lucide-react';
import { Language, Theme } from '../types';
import { TRANSLATIONS } from '../translations';
import { ContactModal } from './ContactModal';
import { AlertModal } from './AlertModal';

interface AuthScreenProps {
  onLoginSuccess: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
}

type AuthView = 'login' | 'register' | 'forgotPassword';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess, language, setLanguage, theme }) => {
  const [authView, setAuthView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(false);

  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';
  const [localTheme, setLocalTheme] = useState<Theme>(theme);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDemoAlert, setShowDemoAlert] = useState(false);

  // Check if demo mode is enabled
  useEffect(() => {
    const checkDemoMode = async () => {
      const enabled = await db.getDemoEnabled();
      setDemoEnabled(enabled);
    };
    checkDemoMode();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Delay for effect
      await new Promise(r => setTimeout(r, 800));
      
      if (authView === 'login') {
        const { user, error } = await db.signIn(email, password);
        if (error) {
          setError(error);
        } else if (user) {
          onLoginSuccess();
        }
      } else if (authView === 'register') {
        // Registration without email confirmation - user is logged in immediately
        const { user, error } = await db.signUp(email, password);
        if (error) {
          setError(error);
        } else if (user) {
          onLoginSuccess();
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await new Promise(r => setTimeout(r, 800));
      const { error } = await db.resetPassword(email);
      
      if (error) {
        setError(error);
      } else {
        setSuccessMessage(t.resetPasswordSuccess);
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

  const handleDemoSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise(r => setTimeout(r, 800));
      const { user, error } = await db.signInAsDemo();
      
      if (error) {
        setError(error);
      } else if (user) {
        // Show demo alert before proceeding to app
        setShowDemoAlert(true);
      }
    } catch (err) {
      setError("Demo sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAlertClose = () => {
    setShowDemoAlert(false);
    onLoginSuccess();
  };

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

  const switchView = (view: AuthView) => {
    setAuthView(view);
    setError(null);
    setSuccessMessage(null);
  };

  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.emailLabel}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 focus:border-green-500 dark:focus:border-green-600 outline-none transition-all"
          placeholder="name@example.com"
        />
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t.forgotPasswordDesc}
      </p>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-100 dark:border-green-800">
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 dark:bg-green-700 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 active:scale-[0.99] transition-all shadow-md flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : t.resetPasswordBtn}
      </button>

      <button
        type="button"
        onClick={() => switchView('login')}
        className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mt-2"
      >
        <ArrowLeft size={16} />
        {t.backToLogin}
      </button>
    </form>
  );

  const renderLoginRegisterForm = () => (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.emailLabel}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 focus:border-green-500 dark:focus:border-green-600 outline-none transition-all"
            placeholder="name@example.com"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.passwordLabel}</label>
            {authView === 'login' && (
              <button
                type="button"
                onClick={() => switchView('forgotPassword')}
                className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
              >
                {t.forgotPassword}
              </button>
            )}
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 focus:border-green-500 dark:focus:border-green-600 outline-none transition-all"
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
          {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (authView === 'login' ? t.signInBtn : t.signUpBtn)}
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

        {/* Demo Mode Button */}
        {demoEnabled && (
          <button
            onClick={handleDemoSignIn}
            disabled={isLoading}
            className="mt-3 w-full flex items-center justify-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 py-2.5 rounded-lg font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/30 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={18} />
            {t.demoMode}
          </button>
        )}
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => switchView(authView === 'login' ? 'register' : 'login')}
          className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
        >
          {authView === 'login' ? t.switchToSignUp : t.switchToSignIn}
        </button>
      </div>
    </>
  );

  const getTitle = () => {
    if (authView === 'forgotPassword') return t.forgotPasswordTitle;
    return t.loginTitle;
  };

  const getSubtitle = () => {
    if (authView === 'forgotPassword') return t.forgotPasswordDesc;
    return t.loginSubtitle;
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
          <h2 className="text-base sm:text-lg font-medium text-gray-600 dark:text-gray-300">{getTitle()}</h2>
          {authView !== 'forgotPassword' && (
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1 text-center">{getSubtitle()}</p>
          )}
        </div>

        {authView === 'forgotPassword' ? renderForgotPasswordForm() : renderLoginRegisterForm()}
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
    
    {/* Demo Mode Alert */}
    <AlertModal
      isOpen={showDemoAlert}
      onClose={handleDemoAlertClose}
      message={(t as any).demoModeAlert || 'You are in demo mode. To register for courses, please create an account or sign in with Google.'}
      language={language}
      type="info"
    />
    </>
  );
};
