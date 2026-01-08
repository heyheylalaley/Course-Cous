import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';
import { Settings, Play, Loader2, Save, Eye, EyeOff } from 'lucide-react';

interface AdminAppSettingsProps {
  language: Language;
}

export const AdminAppSettings: React.FC<AdminAppSettingsProps> = ({ language }) => {
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const enabled = await db.getDemoEnabled();
      setDemoEnabled(enabled);
      
      const credentials = await db.getDemoCredentials();
      if (credentials) {
        setDemoEmail(credentials.email);
        setDemoPassword(credentials.password);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDemo = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      const newValue = !demoEnabled;
      const { error } = await db.setDemoEnabled(newValue);
      
      if (error) {
        setError(error);
      } else {
        setDemoEnabled(newValue);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save setting');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!demoEmail || !demoPassword) {
      setError('Email and password are required');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      const { error } = await db.setDemoCredentials(demoEmail, demoPassword);
      
      if (error) {
        setError(error);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save credentials');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
          <Settings size={24} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t.adminAppSettings}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t.adminDemoModeDesc}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-100 dark:border-green-800">
          {t.botInstructionsSaved || 'Settings saved successfully'}
        </div>
      )}

      {/* Demo Mode Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Play size={20} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t.adminDemoMode}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {demoEnabled ? t.adminDemoEnabled : t.adminDemoDisabled}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleToggleDemo}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              demoEnabled 
                ? 'bg-green-600' 
                : 'bg-gray-300 dark:bg-gray-600'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                demoEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Demo Credentials */}
      {demoEnabled && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            {t.adminDemoCredentials}
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.adminDemoEmail}
            </label>
            <input
              type="email"
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-indigo-500 dark:focus:border-indigo-600 outline-none transition-all"
              placeholder="demo@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t.adminDemoPassword}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={demoPassword}
                onChange={(e) => setDemoPassword(e.target.value)}
                className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:border-indigo-500 dark:focus:border-indigo-600 outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveCredentials}
              disabled={isSaving || !demoEmail || !demoPassword}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {t.save}
            </button>
          </div>

          <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
            {t.adminDemoNote}
          </p>
        </div>
      )}
    </div>
  );
};
