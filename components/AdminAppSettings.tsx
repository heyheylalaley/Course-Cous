import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';
import { Settings, Play, Loader2, Mail, Save } from 'lucide-react';

interface AdminAppSettingsProps {
  language: Language;
}

export const AdminAppSettings: React.FC<AdminAppSettingsProps> = ({ language }) => {
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Email template state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    loadSettings();
    loadEmailTemplate();
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

  const loadEmailTemplate = async () => {
    setIsLoadingTemplate(true);
    setTemplateError(null);
    try {
      const template = await db.getEmailTemplate('course_invitation');
      if (template) {
        setEmailSubject(template.subject);
        setEmailBody(template.body);
      } else {
        // Set default values if template not found
        setEmailSubject('Invitation to Join {courseTitle}');
        setEmailBody(`Hello!

I hope this email finds you well. I'm delighted to invite you to participate in our upcoming course: {courseTitle}.

We would be thrilled to have you join us! To confirm your participation and select your preferred date, you have two options:

1. Visit our website at {websiteUrl} and confirm your participation in the course, where you can also choose your preferred date.

2. Simply reply to this email with your chosen date.

Please note that spaces for this course are limited, so we encourage you to confirm your participation as soon as possible.

Available dates for this course:
{datesList}

We look forward to having you join us for this course. If you have any questions, please don't hesitate to reach out.`);
      }
    } catch (err: any) {
      setTemplateError(err.message || 'Failed to load email template');
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleSaveEmailTemplate = async () => {
    setIsSavingTemplate(true);
    setTemplateError(null);
    setTemplateSaveSuccess(false);
    
    try {
      const { error } = await db.updateEmailTemplate('course_invitation', emailSubject, emailBody);
      
      if (error) {
        setTemplateError(error);
      } else {
        setTemplateSaveSuccess(true);
        setTimeout(() => setTemplateSaveSuccess(false), 2000);
      }
    } catch (err: any) {
      setTemplateError(err.message || 'Failed to save email template');
    } finally {
      setIsSavingTemplate(false);
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

      {/* Email Template Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Mail size={20} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {(t as any).adminEmailTemplate || 'Email Template'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(t as any).adminEmailTemplateDesc || 'Customize the invitation email template sent to students. Use {courseTitle}, {datesList}, and {websiteUrl} as placeholders.'}
            </p>
          </div>
        </div>

        {/* Template Error Message */}
        {templateError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
            {templateError}
          </div>
        )}

        {/* Template Success Message */}
        {templateSaveSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-100 dark:border-green-800">
            {(t as any).adminEmailTemplateSaved || 'Email template saved successfully'}
          </div>
        )}

        {isLoadingTemplate ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Subject Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminEmailTemplateSubject || 'Email Subject'}
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Invitation to Join {courseTitle}"
              />
            </div>

            {/* Body Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminEmailTemplateBody || 'Email Body'}
              </label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                placeholder="Email body text..."
              />
            </div>

            {/* Variables Info */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminEmailTemplateVariables || 'Available Variables:'}
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li><code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">&#123;courseTitle&#125;</code> - {(t as any).adminEmailTemplateVarCourseTitle || 'Course title'}</li>
                <li><code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">&#123;datesList&#125;</code> - {(t as any).adminEmailTemplateVarDatesList || 'List of available dates'}</li>
                <li><code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">&#123;websiteUrl&#125;</code> - {(t as any).adminEmailTemplateVarWebsiteUrl || 'Website URL'}</li>
              </ul>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveEmailTemplate}
              disabled={isSavingTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingTemplate ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {(t as any).adminEmailTemplateSave || 'Save Email Template'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
