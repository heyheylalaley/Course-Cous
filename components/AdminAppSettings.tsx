import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';
import { Settings, Play, Loader2 } from 'lucide-react';

interface AdminAppSettingsProps {
  language: Language;
}

export const AdminAppSettings: React.FC<AdminAppSettingsProps> = ({ language }) => {
  const [demoEnabled, setDemoEnabled] = useState(false);
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

      {/* Demo Mode Info */}
      {demoEnabled && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {(t as any).demoModeAdminInfo || 'Demo mode allows users to explore the app without registration. Demo users cannot register for courses - they need to create an account to do so.'}
          </p>
        </div>
      )}
    </div>
  );
};
