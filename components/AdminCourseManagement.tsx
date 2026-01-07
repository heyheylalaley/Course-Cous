import React, { useState, useEffect } from 'react';
import { Course, Language, EnglishLevel } from '../types';
import { db } from '../services/db';
import { TRANSLATIONS } from '../translations';
import { CourseEditModal } from './CourseEditModal';
import { BookOpen, Plus, Edit2, Trash2, Eye, EyeOff, Shield } from 'lucide-react';

interface AdminCourseManagementProps {
  language: Language;
  onBack: () => void;
}

export const AdminCourseManagement: React.FC<AdminCourseManagementProps> = ({ language, onBack }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Get editing course from courses list to maintain reference stability
  const editingCourse = editingCourseId ? courses.find(c => c.id === editingCourseId) || null : null;
  
  // Log when modal state changes
  useEffect(() => {
    console.log('[AdminCourseManagement] isEditModalOpen changed', {
      isEditModalOpen,
      editingCourseId,
      editingCourse: editingCourse ? { id: editingCourse.id, title: editingCourse.title } : null,
      coursesCount: courses.length,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
  }, [isEditModalOpen, editingCourseId, editingCourse, courses.length]);
  
  // Log when editingCourse changes
  useEffect(() => {
    console.log('[AdminCourseManagement] editingCourse changed', {
      editingCourseId,
      editingCourse: editingCourse ? { id: editingCourse.id, title: editingCourse.title } : null,
      foundInCourses: editingCourseId ? courses.some(c => c.id === editingCourseId) : false,
      timestamp: new Date().toISOString()
    });
  }, [editingCourse, editingCourseId, courses]);
  
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    loadCourses();
  }, [showInactive]);

  const loadCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allCourses = await db.getAllCourses(showInactive);
      setCourses(allCourses);
    } catch (err: any) {
      console.error('Failed to load courses:', err);
      setError(err.message || 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCourse = () => {
    setEditingCourseId(null);
    setIsEditModalOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setIsEditModalOpen(true);
  };

  const handleSaveCourse = async (courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingCourseId) {
        await db.updateCourse(editingCourseId, courseData);
      } else {
        await db.createCourse(courseData);
      }
      await loadCourses();
      setIsEditModalOpen(false);
      setEditingCourseId(null);
    } catch (err: any) {
      throw err; // Let CourseEditModal handle the error
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!confirm(t.adminCourseDeleteConfirm || `Are you sure you want to ${course.isActive === false ? 'permanently delete' : 'deactivate'} "${course.title}"?`)) {
      return;
    }

    try {
      await db.deleteCourse(course.id);
      await loadCourses();
    } catch (err: any) {
      alert(err.message || 'Failed to delete course');
    }
  };

  const handleToggleActive = async (course: Course) => {
    try {
      await db.updateCourse(course.id, { isActive: !course.isActive });
      await loadCourses();
    } catch (err: any) {
      alert(err.message || 'Failed to update course');
    }
  };

  const getEnglishLevelLabel = (level?: EnglishLevel) => {
    if (!level) return t.adminNoRequirement || 'No requirement';
    return level;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Shield size={24} />
              {t.adminCourseManagement || 'Course Management'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.adminCourseManagementDesc || 'Manage courses: add, edit, delete, and set English level requirements'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showInactive
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {showInactive ? <EyeOff size={18} className="inline mr-1" /> : <Eye size={18} className="inline mr-1" />}
              {showInactive ? (t.adminHideInactive || 'Hide inactive') : (t.adminShowInactive || 'Show inactive')}
            </button>
            <button
              onClick={handleCreateCourse}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
            >
              <Plus size={18} />
              {t.adminAddCourse || 'Add Course'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <p className="font-semibold mb-2">{t.adminError || 'Error'}</p>
          <p>{error}</p>
        </div>
      )}

      {/* Courses List */}
      {courses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {t.adminNoCourses || 'No courses found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-4 shadow-sm ${
                course.isActive === false
                  ? 'border-gray-300 dark:border-gray-600 opacity-60'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                      {course.title}
                    </h3>
                    {course.isActive === false && (
                      <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        {t.adminInactive || 'Inactive'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span className="font-semibold">{course.category}</span>
                    <span>•</span>
                    <span>{course.difficulty}</span>
                    {course.minEnglishLevel && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Shield size={14} />
                          {t.adminMinEnglish || 'Min English'}: {getEnglishLevelLabel(course.minEnglishLevel)}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {course.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    ID: {course.id} • Link: {course.link}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleEditCourse(course)}
                    className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    title={t.adminEditCourse || 'Edit course'}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(course)}
                    className={`p-2 rounded-lg transition-colors ${
                      course.isActive === false
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={course.isActive === false ? (t.adminActivate || 'Activate') : (t.adminDeactivate || 'Deactivate')}
                  >
                    {course.isActive === false ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course)}
                    className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    title={t.adminDeleteCourse || 'Delete course'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <CourseEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          console.log('[AdminCourseManagement] Modal onClose called', {
            timestamp: new Date().toISOString(),
            stack: new Error().stack
          });
          setIsEditModalOpen(false);
          setEditingCourseId(null);
        }}
        onSave={handleSaveCourse}
        language={language}
        course={editingCourse}
      />
    </div>
  );
};
