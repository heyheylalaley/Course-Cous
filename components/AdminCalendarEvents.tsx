import React, { useState, useEffect } from 'react';
import { CalendarEvent, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';
import { Calendar, Plus, Edit2, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import { CalendarEventModal } from './CalendarEventModal';
import { ConfirmationModal } from './ConfirmationModal';
import { AVAILABLE_ICONS } from './AdminCategoryManagement';

interface AdminCalendarEventsProps {
  language: Language;
}

export const AdminCalendarEvents: React.FC<AdminCalendarEventsProps> = ({ language }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<CalendarEvent | null>(null);

  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await db.getCalendarEvents(true); // Admin sees all events
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmEvent) return;

    try {
      await db.deleteCalendarEvent(deleteConfirmEvent.id);
      await loadEvents();
      setDeleteConfirmEvent(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
    }
  };

  const handleSave = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      if (editingEvent) {
        await db.updateCalendarEvent(editingEvent.id, eventData);
      } else {
        await db.createCalendarEvent(eventData);
      }
      await loadEvents();
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (err: any) {
      throw err; // Let the modal handle the error
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(
      language === 'ar' ? 'ar-EG' : language === 'ua' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-IE',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );
  };

  const renderIcon = (iconName: string, className: string = "w-5 h-5") => {
    const IconComponent = AVAILABLE_ICONS[iconName];
    if (IconComponent) {
      return <IconComponent className={className} />;
    }
    return <Calendar className={className} />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t.adminCalendarEvents || 'Calendar Events'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t.adminCalendarEventsDesc || 'Add and manage calendar events for users'}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.adminAddEvent || 'Add Event'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Private events hint */}
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2">
          <EyeOff className="w-4 h-4 flex-shrink-0" />
          <span>{t.eventPrivateHint || 'Private events are only visible to administrators'}</span>
        </div>
      </div>

      {/* Events list */}
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${
              event.isPublic
                ? 'border-gray-200 dark:border-gray-700'
                : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  event.isPublic
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}>
                  {renderIcon(event.icon, "w-5 h-5")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                    {event.isPublic ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                        <Eye className="w-3 h-3" />
                        {t.eventPublic || 'Public'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                        <EyeOff className="w-3 h-3" />
                        {t.eventPrivate || 'Private'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(event.eventDate)}
                  </p>
                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleEdit(event)}
                  className="p-2 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                  title={t.adminEditEvent || 'Edit'}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmEvent(event)}
                  className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title={t.adminDeleteEvent || 'Delete'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.adminNoEvents || 'No events found. Add your first event!'}</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <CalendarEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSave}
        event={editingEvent}
        language={language}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteConfirmEvent}
        onClose={() => setDeleteConfirmEvent(null)}
        onConfirm={handleDelete}
        title={t.adminDeleteEvent || 'Delete Event'}
        message={t.adminDeleteEventConfirm || 'Are you sure you want to delete this event?'}
        confirmText={t.adminDeleteEvent || 'Delete'}
        language={language}
        type="danger"
      />
    </div>
  );
};

export default AdminCalendarEvents;
