import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';
import { Settings, Play, Loader2, Mail, Save, MessageSquare, BookOpen, Phone, MapPin, Globe, Clock, Bell } from 'lucide-react';

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
  
  // Reminder email template state
  const [reminderEmailSubject, setReminderEmailSubject] = useState('');
  const [reminderEmailBody, setReminderEmailBody] = useState('');
  const [isLoadingReminderTemplate, setIsLoadingReminderTemplate] = useState(false);
  const [isSavingReminderTemplate, setIsSavingReminderTemplate] = useState(false);
  const [reminderTemplateSaveSuccess, setReminderTemplateSaveSuccess] = useState(false);
  const [reminderTemplateError, setReminderTemplateError] = useState<string | null>(null);

  // Welcome message state
  const [welcomeMessages, setWelcomeMessages] = useState<Record<Language, string>>({
    en: '',
    ua: '',
    ru: '',
    ar: ''
  });
  const [isLoadingWelcome, setIsLoadingWelcome] = useState(false);
  const [isSavingWelcome, setIsSavingWelcome] = useState(false);
  const [welcomeSaveSuccess, setWelcomeSaveSuccess] = useState(false);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);

  // Course registration limit state
  const [maxRegistrations, setMaxRegistrations] = useState(3);
  const [isLoadingLimit, setIsLoadingLimit] = useState(false);
  const [isSavingLimit, setIsSavingLimit] = useState(false);
  const [limitSaveSuccess, setLimitSaveSuccess] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);

  // Contact info state
  const [contactInfo, setContactInfo] = useState({
    organizationName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    openingHours: ''
  });
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSaveSuccess, setContactSaveSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    loadSettings();
    loadEmailTemplate();
    loadReminderEmailTemplate();
    loadWelcomeMessages();
    loadRegistrationLimit();
    loadContactInfo();
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

  const loadReminderEmailTemplate = async () => {
    setIsLoadingReminderTemplate(true);
    setReminderTemplateError(null);
    try {
      const template = await db.getEmailTemplate('course_reminder');
      if (template) {
        setReminderEmailSubject(template.subject);
        setReminderEmailBody(template.body);
      } else {
        // Set default values if template not found
        setReminderEmailSubject('Reminder: Upcoming Course {courseTitle}');
        setReminderEmailBody(`Hello!

This is a friendly reminder that you are confirmed to attend our course: {courseTitle}.

The course session is scheduled for {sessionDate}.

Please make sure you are available on this date. If you have any questions or need to make changes, please don't hesitate to contact us.

You can also visit our website at {websiteUrl} for more information.

We look forward to seeing you soon!`);
      }
    } catch (err: any) {
      setReminderTemplateError(err.message || 'Failed to load reminder email template');
    } finally {
      setIsLoadingReminderTemplate(false);
    }
  };

  const handleSaveReminderEmailTemplate = async () => {
    setIsSavingReminderTemplate(true);
    setReminderTemplateError(null);
    setReminderTemplateSaveSuccess(false);
    
    try {
      const { error } = await db.updateEmailTemplate('course_reminder', reminderEmailSubject, reminderEmailBody);
      
      if (error) {
        setReminderTemplateError(error);
      } else {
        setReminderTemplateSaveSuccess(true);
        setTimeout(() => setReminderTemplateSaveSuccess(false), 2000);
      }
    } catch (err: any) {
      setReminderTemplateError(err.message || 'Failed to save reminder email template');
    } finally {
      setIsSavingReminderTemplate(false);
    }
  };

  const loadWelcomeMessages = async () => {
    setIsLoadingWelcome(true);
    setWelcomeError(null);
    try {
      const languages: Language[] = ['en', 'ua', 'ru', 'ar'];
      const messages: Record<Language, string> = {
        en: '',
        ua: '',
        ru: '',
        ar: ''
      };

      for (const lang of languages) {
        const saved = await db.getWelcomeMessage(lang).catch(() => null);
        messages[lang] = saved || TRANSLATIONS[lang].welcomeMessage;
      }

      setWelcomeMessages(messages);
    } catch (err: any) {
      setWelcomeError(err.message || 'Failed to load welcome messages');
    } finally {
      setIsLoadingWelcome(false);
    }
  };

  const handleSaveWelcomeMessages = async () => {
    setIsSavingWelcome(true);
    setWelcomeError(null);
    setWelcomeSaveSuccess(false);
    
    try {
      const languages: Language[] = ['en', 'ua', 'ru', 'ar'];
      let hasError = false;

      for (const lang of languages) {
        const { error } = await db.setWelcomeMessage(lang, welcomeMessages[lang]);
        if (error) {
          setWelcomeError(error);
          hasError = true;
          break;
        }
      }

      if (!hasError) {
        setWelcomeSaveSuccess(true);
        setTimeout(() => setWelcomeSaveSuccess(false), 2000);
      }
    } catch (err: any) {
      setWelcomeError(err.message || 'Failed to save welcome messages');
    } finally {
      setIsSavingWelcome(false);
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

  const loadRegistrationLimit = async () => {
    setIsLoadingLimit(true);
    setLimitError(null);
    try {
      const limit = await db.getMaxCourseRegistrations();
      setMaxRegistrations(limit);
    } catch (err: any) {
      setLimitError(err.message || 'Failed to load registration limit');
    } finally {
      setIsLoadingLimit(false);
    }
  };

  const handleSaveRegistrationLimit = async () => {
    setIsSavingLimit(true);
    setLimitError(null);
    setLimitSaveSuccess(false);
    
    try {
      const { error } = await db.setMaxCourseRegistrations(maxRegistrations);
      
      if (error) {
        setLimitError(error);
      } else {
        setLimitSaveSuccess(true);
        setTimeout(() => setLimitSaveSuccess(false), 2000);
      }
    } catch (err: any) {
      setLimitError(err.message || 'Failed to save registration limit');
    } finally {
      setIsSavingLimit(false);
    }
  };

  const loadContactInfo = async () => {
    setIsLoadingContact(true);
    setContactError(null);
    try {
      const info = await db.getContactInfo();
      setContactInfo(info);
    } catch (err: any) {
      setContactError(err.message || 'Failed to load contact information');
    } finally {
      setIsLoadingContact(false);
    }
  };

  const handleSaveContactInfo = async () => {
    setIsSavingContact(true);
    setContactError(null);
    setContactSaveSuccess(false);
    
    try {
      const { error } = await db.setContactInfo(contactInfo);
      
      if (error) {
        setContactError(error);
      } else {
        setContactSaveSuccess(true);
        setTimeout(() => setContactSaveSuccess(false), 2000);
      }
    } catch (err: any) {
      setContactError(err.message || 'Failed to save contact information');
    } finally {
      setIsSavingContact(false);
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

      {/* Course Registration Limit Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <BookOpen size={20} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {(t as any).adminMaxCourseRegistrations || 'Maximum Course Registrations'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(t as any).adminMaxCourseRegistrationsDesc || 'Set the maximum number of courses a user can register for at the same time.'}
            </p>
          </div>
        </div>

        {/* Limit Error Message */}
        {limitError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
            {limitError}
          </div>
        )}

        {/* Limit Success Message */}
        {limitSaveSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-100 dark:border-green-800">
            {(t as any).adminMaxCourseRegistrationsSaved || 'Registration limit saved successfully'}
          </div>
        )}

        {isLoadingLimit ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminMaxCourseRegistrationsLabel || 'Maximum Registrations'}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxRegistrations}
                onChange={(e) => setMaxRegistrations(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="3"
              />
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {(t as any).adminMaxCourseRegistrationsHint || 'Enter a number between 1 and 100'}
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveRegistrationLimit}
              disabled={isSavingLimit || maxRegistrations < 1 || maxRegistrations > 100}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingLimit ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {(t as any).adminMaxCourseRegistrationsSave || 'Save Limit'}
            </button>
          </div>
        )}
      </div>

      {/* Contact Information Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
            <Phone size={20} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {(t as any).adminContactInfo || 'Contact Information'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(t as any).adminContactInfoDesc || 'Manage organization contact details displayed to users.'}
            </p>
          </div>
        </div>

        {/* Contact Error Message */}
        {contactError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
            {contactError}
          </div>
        )}

        {/* Contact Success Message */}
        {contactSaveSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-100 dark:border-green-800">
            {(t as any).adminContactInfoSaved || 'Contact information saved successfully'}
          </div>
        )}

        {isLoadingContact ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminContactOrgName || 'Organization Name'}
              </label>
              <input
                type="text"
                value={contactInfo.organizationName}
                onChange={(e) => setContactInfo(prev => ({ ...prev, organizationName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Cork City Partnership"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminContactAddress || 'Address'}
              </label>
              <textarea
                value={contactInfo.address}
                onChange={(e) => setContactInfo(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Heron House, Blackpool Park&#10;Cork, T23 R50R&#10;Ireland"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminContactPhone || 'Phone'}
              </label>
              <input
                type="text"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+353 21 430 2310"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminContactEmail || 'Email'}
              </label>
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="info@partnershipcork.ie"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminContactWebsite || 'Website'}
              </label>
              <input
                type="text"
                value={contactInfo.website}
                onChange={(e) => setContactInfo(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="www.corkcitypartnership.ie"
              />
            </div>

            {/* Opening Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminContactHours || 'Opening Hours'}
              </label>
              <input
                type="text"
                value={contactInfo.openingHours}
                onChange={(e) => setContactInfo(prev => ({ ...prev, openingHours: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Monday - Friday: 9:00 AM - 5:00 PM"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveContactInfo}
              disabled={isSavingContact}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingContact ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {(t as any).adminContactInfoSave || 'Save Contact Information'}
            </button>
          </div>
        )}
      </div>

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

      {/* Reminder Email Template Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {(t as any).adminReminderEmailTemplate || 'Reminder Email Template'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(t as any).adminReminderEmailTemplateDesc || 'Customize the reminder email template sent to students. Use {courseTitle}, {sessionDate}, and {websiteUrl} as placeholders.'}
            </p>
          </div>
        </div>

        {/* Template Error Message */}
        {reminderTemplateError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
            {reminderTemplateError}
          </div>
        )}

        {/* Template Success Message */}
        {reminderTemplateSaveSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-100 dark:border-green-800">
            {(t as any).adminEmailTemplateSaved || 'Email template saved successfully'}
          </div>
        )}

        {isLoadingReminderTemplate ? (
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
                value={reminderEmailSubject}
                onChange={(e) => setReminderEmailSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Reminder: Upcoming Course {courseTitle}"
              />
            </div>

            {/* Body Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {(t as any).adminEmailTemplateBody || 'Email Body'}
              </label>
              <textarea
                value={reminderEmailBody}
                onChange={(e) => setReminderEmailBody(e.target.value)}
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter email body..."
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Available placeholders: {'{courseTitle}'}, {'{sessionDate}'}, {'{websiteUrl}'}
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveReminderEmailTemplate}
              disabled={isSavingReminderTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingReminderTemplate ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {(t as any).adminEmailTemplateSave || 'Save Email Template'}
            </button>
          </div>
        )}
      </div>

      {/* Welcome Message Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              {(t as any).adminWelcomeMessage || 'Welcome Message'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(t as any).adminWelcomeMessageDesc || 'Customize the welcome message shown to users when they start a chat. You can set different messages for each language.'}
            </p>
          </div>
        </div>

        {/* Welcome Error Message */}
        {welcomeError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
            {welcomeError}
          </div>
        )}

        {/* Welcome Success Message */}
        {welcomeSaveSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg border border-green-100 dark:border-green-800">
            {(t as any).adminWelcomeMessageSaved || 'Welcome messages saved successfully'}
          </div>
        )}

        {isLoadingWelcome ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* English */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                English (en)
              </label>
              <textarea
                value={welcomeMessages.en}
                onChange={(e) => setWelcomeMessages(prev => ({ ...prev, en: e.target.value }))}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Enter welcome message in English..."
              />
            </div>

            {/* Ukrainian */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Українська (ua)
              </label>
              <textarea
                value={welcomeMessages.ua}
                onChange={(e) => setWelcomeMessages(prev => ({ ...prev, ua: e.target.value }))}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Введіть привітальне повідомлення українською..."
              />
            </div>

            {/* Russian */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Русский (ru)
              </label>
              <textarea
                value={welcomeMessages.ru}
                onChange={(e) => setWelcomeMessages(prev => ({ ...prev, ru: e.target.value }))}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Введите приветственное сообщение на русском..."
              />
            </div>

            {/* Arabic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                العربية (ar)
              </label>
              <textarea
                value={welcomeMessages.ar}
                onChange={(e) => setWelcomeMessages(prev => ({ ...prev, ar: e.target.value }))}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                dir="rtl"
                placeholder="أدخل رسالة الترحيب بالعربية..."
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveWelcomeMessages}
              disabled={isSavingWelcome}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingWelcome ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {(t as any).adminWelcomeMessageSave || 'Save Welcome Messages'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
