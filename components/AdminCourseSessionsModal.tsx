import React, { useState, useEffect } from 'react';
import { Course, CourseSession, Language } from '../types';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { 
  X, Calendar, Plus, Edit2, Trash2, Archive, Eye, EyeOff, 
  Users, AlertCircle, Check, Loader2 
} from 'lucide-react';

interface AdminCourseSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  language: Language;
}

export const AdminCourseSessionsModal: React.FC<AdminCourseSessionsModalProps> = ({
  isOpen,
  onClose,
  course,
  language
}) => {
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  
  // Form state for adding/editing
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<CourseSession | null>(null);
  const [formDate, setFormDate] = useState('');
  const [formCapacity, setFormCapacity] = useState(20);
  const [formStatus, setFormStatus] = useState<'active' | 'archived'>('active');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, course.id, showArchived]);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await db.getCourseSessions(course.id, showArchived);
      setSessions(data);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingSession(null);
    setFormDate('');
    setFormCapacity(20);
    setFormStatus('active');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleEdit = (session: CourseSession) => {
    setEditingSession(session);
    setFormDate(session.sessionDate);
    setFormCapacity(session.maxCapacity);
    setFormStatus(session.status);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formDate) {
      setFormError(t.adminSessionDateRequired || 'Please select a date');
      return;
    }
    if (formCapacity < 1) {
      setFormError(t.adminSessionCapacityRequired || 'Capacity must be at least 1');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingSession) {
        await db.updateCourseSession(editingSession.id, {
          sessionDate: formDate,
          maxCapacity: formCapacity,
          status: formStatus
        });
      } else {
        await db.createCourseSession(course.id, formDate, formCapacity);
      }
      await loadSessions();
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Failed to save session:', err);
      setFormError(err.message || 'Failed to save session');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (session: CourseSession) => {
    try {
      await db.updateCourseSession(session.id, {
        status: session.status === 'active' ? 'archived' : 'active'
      });
      await loadSessions();
    } catch (err: any) {
      console.error('Failed to update session status:', err);
      alert(err.message || 'Failed to update session status');
    }
  };

  const handleDelete = async (session: CourseSession) => {
    if (!confirm(t.adminSessionDeleteConfirm || `Delete session for ${formatDate(session.sessionDate)}? This will archive it if users are enrolled.`)) {
      return;
    }

    try {
      await db.deleteCourseSession(session.id);
      await loadSessions();
    } catch (err: any) {
      console.error('Failed to delete session:', err);
      alert(err.message || 'Failed to delete session');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(
      language === 'en' ? 'en-GB' : 
      language === 'ua' ? 'uk-UA' : 
      language === 'ru' ? 'ru-RU' : 'ar-SA',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  const getCapacityColor = (session: CourseSession) => {
    const enrollment = session.currentEnrollment || 0;
    const capacity = session.maxCapacity;
    const ratio = enrollment / capacity;
    
    if (ratio >= 1) return 'text-red-600 dark:text-red-400';
    if (ratio >= 0.8) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl transform transition-all ${isRtl ? 'text-right' : 'text-left'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Calendar size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t.adminManageDates || 'Manage Dates'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{course.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Actions */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  showArchived
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {showArchived ? <EyeOff size={16} /> : <Eye size={16} />}
                {showArchived ? (t.adminHideArchived || 'Hide Archived') : (t.adminShowArchived || 'Show Archived')}
              </button>
              
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
              >
                <Plus size={18} />
                {t.adminAddSession || 'Add Date'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Loading */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t.adminNoSessions || 'No sessions scheduled'}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {t.adminNoSessionsDesc || 'Click "Add Date" to create a session'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      session.status === 'archived'
                        ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600 opacity-60'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={18} className="text-gray-400" />
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatDate(session.sessionDate)}
                          </span>
                          {session.status === 'archived' && (
                            <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-full">
                              {t.adminArchived || 'Archived'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Enrollment count */}
                        <div className={`flex items-center gap-1.5 ${getCapacityColor(session)}`}>
                          <Users size={16} />
                          <span className="font-medium">
                            {session.currentEnrollment || 0} / {session.maxCapacity}
                          </span>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(session)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                            title={t.adminEdit || 'Edit'}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(session)}
                            className={`p-2 rounded-lg transition-colors ${
                              session.status === 'archived'
                                ? 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}
                            title={session.status === 'archived' ? (t.adminActivate || 'Activate') : (t.adminArchive || 'Archive')}
                          >
                            {session.status === 'archived' ? <Eye size={16} /> : <Archive size={16} />}
                          </button>
                          <button
                            onClick={() => handleDelete(session)}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors"
                            title={t.adminDelete || 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit Form */}
            {isFormOpen && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {editingSession ? (t.adminEditSession || 'Edit Session') : (t.adminNewSession || 'New Session')}
                </h3>
                
                {formError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {formError}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.adminSessionDate || 'Date'} *
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  {/* Capacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.adminSessionCapacity || 'Max Capacity'} *
                    </label>
                    <input
                      type="number"
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  {/* Status (only when editing) */}
                  {editingSession && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.adminSessionStatus || 'Status'}
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as 'active' | 'archived')}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        <option value="active">{t.adminStatusActive || 'Active'}</option>
                        <option value="archived">{t.adminStatusArchived || 'Archived'}</option>
                      </select>
                    </div>
                  )}
                </div>
                
                {/* Form Actions */}
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.cancel || 'Cancel'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    {isSaving ? (t.saving || 'Saving...') : (t.save || 'Save')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t.adminSessionsNote || 'Sessions with enrolled users cannot be deleted, only archived.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
