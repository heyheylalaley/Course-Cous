import React, { useState, useEffect } from 'react';
import { SessionWithAvailability, Registration, Language } from '../types';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { Calendar, Check, AlertCircle, Users, Loader2, CalendarCheck } from 'lucide-react';

interface CourseSessionSelectorProps {
  courseId: string;
  registration: Registration;
  language: Language;
  onSessionSelected?: () => void;
}

export const CourseSessionSelector: React.FC<CourseSessionSelectorProps> = ({
  courseId,
  registration,
  language,
  onSessionSelected
}) => {
  const [sessions, setSessions] = useState<SessionWithAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    registration.userSelectedSessionId || null
  );
  const [isSaving, setIsSaving] = useState(false);

  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';

  // Effective date is assigned (by admin) or user-selected
  const effectiveSessionId = registration.assignedSessionId || registration.userSelectedSessionId;
  const isAssignedByAdmin = !!registration.assignedSessionId;

  useEffect(() => {
    loadAvailableSessions();
  }, [courseId]);

  const loadAvailableSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const availableSessions = await db.getAvailableSessions(courseId);
      setSessions(availableSessions);
    } catch (err: any) {
      console.error('Failed to load available sessions:', err);
      setError(err.message || 'Failed to load available sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = async (sessionId: string | null) => {
    if (isAssignedByAdmin) return; // Cannot change if admin assigned
    
    setIsSaving(true);
    setError(null);
    try {
      await db.selectUserSession(courseId, sessionId);
      setSelectedSessionId(sessionId);
      onSessionSelected?.();
    } catch (err: any) {
      console.error('Failed to select session:', err);
      setError(err.message || 'Failed to select session');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(
      language === 'en' ? 'en-GB' : 
      language === 'ua' ? 'uk-UA' : 
      language === 'ru' ? 'ru-RU' : 'ar-SA',
      { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }
    );
  };

  // Get the selected session details
  const selectedSession = sessions.find(s => s.id === (selectedSessionId || effectiveSessionId));
  const assignedSession = sessions.find(s => s.id === registration.assignedSessionId);

  // If not invited, don't show anything
  if (!registration.isInvited) {
    return null;
  }

  // If admin assigned a date, show that with a message
  if (isAssignedByAdmin && assignedSession) {
    return (
      <div className={`mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 ${isRtl ? 'text-right' : 'text-left'}`}>
        <div className="flex items-center gap-2 mb-1">
          <CalendarCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            {t.sessionConfirmed || 'Session Confirmed'}
          </span>
        </div>
        <p className="text-sm text-indigo-600 dark:text-indigo-400">
          {formatDate(assignedSession.sessionDate)}
        </p>
        <p className="text-xs text-indigo-500 dark:text-indigo-500 mt-1">
          {t.sessionAssignedByAdmin || 'This date was confirmed by the administrator'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">{t.loadingSessions || 'Loading available dates...'}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <AlertCircle size={18} />
          <span className="text-sm">{t.noSessionsAvailable || 'No dates available at the moment'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 ${isRtl ? 'text-right' : 'text-left'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={18} className="text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
          {t.selectPreferredDate || 'Select your preferred date'}
        </span>
      </div>

      {selectedSessionId && selectedSession && (
        <div className="mb-3 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Check size={16} />
            <span className="text-sm font-medium">
              {t.yourSelectedDate || 'Your selection'}: {formatDate(selectedSession.sessionDate)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {sessions.map((session) => {
          const isSelected = session.id === selectedSessionId;
          const isFull = !session.isAvailable;
          const spotsLeft = session.maxCapacity - session.currentEnrollment;

          return (
            <button
              key={session.id}
              onClick={() => !isFull && handleSelectSession(isSelected ? null : session.id)}
              disabled={isFull || isSaving}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600 ring-2 ring-purple-300 dark:ring-purple-700'
                  : isFull
                    ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 opacity-60 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              } ${isSaving ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-purple-500 dark:bg-purple-600 flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      isFull 
                        ? 'border-gray-300 dark:border-gray-600' 
                        : 'border-purple-300 dark:border-purple-600'
                    }`} />
                  )}
                  <div>
                    <p className={`font-medium ${
                      isFull 
                        ? 'text-gray-400 dark:text-gray-500' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {formatDate(session.sessionDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 text-xs ${
                    isFull 
                      ? 'text-red-500 dark:text-red-400' 
                      : spotsLeft <= 3 
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    <Users size={14} />
                    {isFull ? (
                      <span className="font-medium">{t.sessionFull || 'Full'}</span>
                    ) : (
                      <span>
                        {spotsLeft} {spotsLeft === 1 
                          ? (t.spotLeft || 'spot left') 
                          : (t.spotsLeft || 'spots left')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {isSaving && (
        <div className="mt-2 flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">{t.savingSelection || 'Saving your selection...'}</span>
        </div>
      )}

      <p className="mt-2 text-xs text-purple-600 dark:text-purple-500">
        {t.sessionSelectionNote || 'You can change your selection while spots are available'}
      </p>
    </div>
  );
};
