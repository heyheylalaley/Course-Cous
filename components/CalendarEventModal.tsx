import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar } from 'lucide-react';
import { CalendarEvent, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { AVAILABLE_ICONS } from './AdminCategoryManagement';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName' | 'createdByEmail'>) => Promise<void>;
  event: CalendarEvent | null;
  language: Language;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  event,
  language
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [icon, setIcon] = useState('Calendar');
  const [isPublic, setIsPublic] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';

  // Reset form when modal opens/closes or event changes
  useEffect(() => {
    if (isOpen) {
      if (event) {
        setTitle(event.title);
        setDescription(event.description || '');
        setEventDate(event.eventDate);
        setEventTime(event.eventTime || '');
        setExternalLink(event.externalLink || '');
        setIcon(event.icon);
        setIsPublic(event.isPublic);
      } else {
        setTitle('');
        setDescription('');
        setEventDate('');
        setEventTime('');
        setExternalLink('');
        setIcon('Calendar');
        setIsPublic(false);
      }
      setIconSearch('');
      setError(null);
    }
  }, [isOpen, event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError(t.eventTitleRequired || 'Title is required');
      return;
    }
    
    if (!eventDate) {
      setError(t.eventDateRequired || 'Date is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        eventDate,
        eventTime: eventTime.trim() || undefined,
        externalLink: externalLink.trim() || undefined,
        icon,
        isPublic
      });
    } catch (err: any) {
      setError(err.message || t.eventSaveError || 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  const renderIcon = (iconName: string, className: string = "w-5 h-5") => {
    const IconComponent = AVAILABLE_ICONS[iconName];
    if (IconComponent) {
      return <IconComponent className={className} />;
    }
    return <Calendar className={className} />;
  };

  const filteredIcons = Object.keys(AVAILABLE_ICONS).filter(name =>
    name.toLowerCase().includes(iconSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {event ? (t.adminEditEvent || 'Edit Event') : (t.adminAddEvent || 'Add Event')}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.eventTitle || 'Event Title'} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.eventTitlePlaceholder || 'Enter event title'}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.eventDate || 'Event Date'} *
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none"
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.eventTime || 'Event Time'} {t.optional || '(optional)'}
            </label>
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none"
            />
          </div>

          {/* External Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.eventExternalLink || 'External Link'} {t.optional || '(optional)'}
            </label>
            <input
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder={t.eventExternalLinkPlaceholder || 'https://example.com'}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t.eventExternalLinkHint || 'Optional link to external resource (e.g., registration page, event website)'}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.eventDescription || 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.eventDescriptionPlaceholder || 'Enter event description (optional)'}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/30 outline-none resize-none"
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.eventIcon || 'Icon'}
            </label>
            
            {/* Search */}
            <input
              type="text"
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              placeholder={t.adminSearchIcons || 'Search icons...'}
              className="w-full px-4 py-2 mb-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />

            {/* Selected Icon Preview */}
            <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="p-2 rounded-lg bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400">
                {renderIcon(icon, "w-6 h-6")}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {t.adminSelectedIcon || 'Selected'}: <strong>{icon}</strong>
              </span>
            </div>

            {/* Icon Grid */}
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-32 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              {filteredIcons.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`p-2 rounded-lg transition-colors ${
                    icon === iconName
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                  title={iconName}
                >
                  {renderIcon(iconName, "w-5 h-5")}
                </button>
              ))}
            </div>
          </div>

          {/* Public/Private Toggle */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {t.eventPublic || 'Visible to all users'}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t.eventPrivateHint || 'Private events are only visible to administrators'}
                </p>
              </div>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {t.cancel || 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !title.trim() || !eventDate}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? (t.saving || 'Saving...') : (t.save || 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarEventModal;
