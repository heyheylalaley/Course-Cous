import React, { useState, useEffect, useMemo } from 'react';
import { Language, EnglishLevel, Course } from '../types';
import { db } from '../services/db';
import { useCourses } from '../hooks/useCourses';
import { TRANSLATIONS } from '../translations';
import { ConfirmationModal } from './ConfirmationModal';
import { AdminUserProfileModal } from './AdminUserProfileModal';
import { 
  Users, FileSpreadsheet, FileText, Mail, Phone, Calendar, GraduationCap, 
  ArrowUp, ArrowDown, Filter, Search, CheckCircle, X, BookOpen, Award, ChevronDown, ChevronUp, Trash2, Edit
} from 'lucide-react';

interface AdminAllUsersProps {
  language: Language;
}

interface UserWithDetails {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  address?: string;
  eircode?: string;
  dateOfBirth?: string;
  englishLevel: EnglishLevel;
  isAdmin?: boolean;
  createdAt?: Date;
  registeredCourses: string[];
  completedCourses: string[];
  isProfileComplete: boolean;
  ldcRef?: string;
  irisId?: string;
}

type SortField = 'firstName' | 'lastName' | 'email' | 'englishLevel' | 'createdAt' | 'registeredCourses' | 'completedCourses' | 'isProfileComplete' | 'ldcRef';
type SortDirection = 'asc' | 'desc';

const ENGLISH_LEVELS: EnglishLevel[] = ['None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const AdminAllUsers: React.FC<AdminAllUsersProps> = ({ language }) => {
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { courses: availableCourses } = useCourses(true, language); // includeInactive = true for admin
  const t = TRANSLATIONS[language] as any;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [englishLevelFilter, setEnglishLevelFilter] = useState<string>('all');
  const [profileCompleteFilter, setProfileCompleteFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [hasRegistrationsFilter, setHasRegistrationsFilter] = useState<string>('all');
  const [ldcRefFilter, setLdcRefFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Expanded rows for managing completed courses
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // Confirmation modal for removing completion
  const [completionToRemove, setCompletionToRemove] = useState<{ userId: string; courseId: string; courseTitle: string; userName: string } | null>(null);
  const [isRemovingCompletion, setIsRemovingCompletion] = useState(false);
  
  // Edit profile modal
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersData = await db.getAllUsersWithDetails();
      setUsers(usersData);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // Get course title by ID
  const getCourseTitle = (courseId: string): string => {
    const course = availableCourses.find(c => c.id === courseId);
    return course?.title || courseId;
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        (u.firstName?.toLowerCase() || '').includes(query) ||
        (u.lastName?.toLowerCase() || '').includes(query) ||
        (u.email?.toLowerCase() || '').includes(query) ||
        (u.mobileNumber?.toLowerCase() || '').includes(query)
      );
    }

    // Apply English level filter
    if (englishLevelFilter !== 'all') {
      result = result.filter(u => u.englishLevel === englishLevelFilter);
    }

    // Apply profile complete filter
    if (profileCompleteFilter !== 'all') {
      const isComplete = profileCompleteFilter === 'yes';
      result = result.filter(u => u.isProfileComplete === isComplete);
    }

    // Apply course filter
    if (courseFilter !== 'all') {
      result = result.filter(u => 
        u.registeredCourses.includes(courseFilter) || 
        u.completedCourses.includes(courseFilter)
      );
    }

    // Apply has registrations filter
    if (hasRegistrationsFilter !== 'all') {
      if (hasRegistrationsFilter === 'yes') {
        result = result.filter(u => u.registeredCourses.length > 0 || u.completedCourses.length > 0);
      } else {
        result = result.filter(u => u.registeredCourses.length === 0 && u.completedCourses.length === 0);
      }
    }

    // Apply LDC Ref filter
    if (ldcRefFilter.trim()) {
      const ldcQuery = ldcRefFilter.toLowerCase();
      result = result.filter(u => 
        (u.ldcRef || '').toLowerCase().includes(ldcQuery)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'firstName':
          comparison = (a.firstName || '').localeCompare(b.firstName || '');
          break;
        case 'lastName':
          comparison = (a.lastName || '').localeCompare(b.lastName || '');
          break;
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
          break;
        case 'englishLevel':
          comparison = ENGLISH_LEVELS.indexOf(a.englishLevel) - ENGLISH_LEVELS.indexOf(b.englishLevel);
          break;
        case 'createdAt':
          comparison = (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
          break;
        case 'registeredCourses':
          comparison = a.registeredCourses.length - b.registeredCourses.length;
          break;
        case 'completedCourses':
          comparison = a.completedCourses.length - b.completedCourses.length;
          break;
        case 'isProfileComplete':
          comparison = (a.isProfileComplete ? 1 : 0) - (b.isProfileComplete ? 1 : 0);
          break;
        case 'ldcRef':
          comparison = (a.ldcRef || '').localeCompare(b.ldcRef || '');
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [users, searchQuery, englishLevelFilter, profileCompleteFilter, courseFilter, hasRegistrationsFilter, ldcRefFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-300 dark:text-gray-600 ml-1">↕</span>;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="inline ml-1" />
      : <ArrowDown size={14} className="inline ml-1" />;
  };

  const exportToCSV = () => {
    if (filteredAndSortedUsers.length === 0) return;

    const headers = [
      t.adminExportFirstName || 'First Name',
      t.adminExportLastName || 'Last Name',
      t.adminExportEmail || 'Email',
      t.adminExportMobile || 'Mobile Number',
      t.adminExportAddress || 'Address',
      t.adminExportEircode || 'Eircode',
      t.adminExportDateOfBirth || 'Date of Birth',
      t.adminExportEnglishLevel || 'English Level',
      'LDC Ref',
      'IRIS ID',
      t.adminRegisteredCourses || 'Registered Courses',
      t.adminCompletedCourses || 'Completed Courses',
      t.adminCreatedAt || 'Created At'
    ];

    const rows = filteredAndSortedUsers.map(user => [
      user.firstName || '',
      user.lastName || '',
      user.email || '',
      user.mobileNumber || '',
      user.address || '',
      user.eircode || '',
      user.dateOfBirth || '',
      user.englishLevel || '',
      user.ldcRef || '',
      user.irisId || '',
      user.registeredCourses.map(id => getCourseTitle(id)).join('; '),
      user.completedCourses.map(id => getCourseTitle(id)).join('; '),
      user.createdAt?.toLocaleString() || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `all_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadXLSXLibrary = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).XLSX) {
        resolve((window as any).XLSX);
        return;
      }

      import('xlsx')
        .then((XLSX) => {
          resolve(XLSX);
        })
        .catch(() => {
          if (typeof document !== 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            script.onload = () => {
              if ((window as any).XLSX) {
                resolve((window as any).XLSX);
              } else {
                reject(new Error('Failed to load XLSX library from CDN'));
              }
            };
            script.onerror = () => {
              reject(new Error('Failed to load XLSX library'));
            };
            document.head.appendChild(script);
          } else {
            reject(new Error('XLSX library not available'));
          }
        });
    });
  };

  const exportToExcel = async () => {
    if (filteredAndSortedUsers.length === 0) return;

    try {
      const XLSX = await loadXLSXLibrary();
      
      if (!XLSX || !XLSX.utils || !XLSX.writeFile) {
        alert('Excel export is not available. Please check your internet connection.');
        return;
      }

      const headers = [
        t.adminExportFirstName || 'First Name',
        t.adminExportLastName || 'Last Name',
        t.adminExportEmail || 'Email',
        t.adminExportMobile || 'Mobile Number',
        t.adminExportAddress || 'Address',
        t.adminExportEircode || 'Eircode',
        t.adminExportDateOfBirth || 'Date of Birth',
        t.adminExportEnglishLevel || 'English Level',
        'LDC Ref',
        'IRIS ID',
        t.adminRegisteredCourses || 'Registered Courses',
        t.adminCompletedCourses || 'Completed Courses',
        t.adminCreatedAt || 'Created At'
      ];

      const data = filteredAndSortedUsers.map(user => ({
        [headers[0]]: user.firstName || '',
        [headers[1]]: user.lastName || '',
        [headers[2]]: user.email || '',
        [headers[3]]: user.mobileNumber || '',
        [headers[4]]: user.address || '',
        [headers[5]]: user.eircode || '',
        [headers[6]]: user.dateOfBirth || '',
        [headers[7]]: user.englishLevel || '',
        [headers[8]]: user.ldcRef || '',
        [headers[9]]: user.irisId || '',
        [headers[10]]: user.registeredCourses.map(id => getCourseTitle(id)).join('; '),
        [headers[11]]: user.completedCourses.map(id => getCourseTitle(id)).join('; '),
        [headers[12]]: user.createdAt?.toLocaleString() || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      
      const fileName = `all_users_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert(`Error exporting to Excel: ${error instanceof Error ? error.message : 'Unknown error'}.`);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'en' ? 'en-GB' : language === 'ua' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setEnglishLevelFilter('all');
    setProfileCompleteFilter('all');
    setCourseFilter('all');
    setHasRegistrationsFilter('all');
    setLdcRefFilter('');
  };

  const hasActiveFilters = searchQuery || englishLevelFilter !== 'all' || profileCompleteFilter !== 'all' || courseFilter !== 'all' || hasRegistrationsFilter !== 'all' || ldcRefFilter.trim() !== '';

  // Toggle expanded row
  const toggleExpanded = (userId: string) => {
    setExpandedUserId(prev => prev === userId ? null : userId);
  };

  // Handle removing a completion
  const handleRemoveCompletionClick = (userId: string, courseId: string, userName: string) => {
    const courseTitle = getCourseTitle(courseId);
    setCompletionToRemove({ userId, courseId, courseTitle, userName });
  };

  const handleConfirmRemoveCompletion = async () => {
    if (!completionToRemove) return;
    
    setIsRemovingCompletion(true);
    try {
      await db.unmarkCourseCompleted(completionToRemove.userId, completionToRemove.courseId);
      // Reload users to reflect the change
      await loadUsers();
      setCompletionToRemove(null);
    } catch (err: any) {
      console.error('Failed to remove completion:', err);
      setError(err.message || 'Failed to remove completion');
    } finally {
      setIsRemovingCompletion(false);
    }
  };

  // Stats
  const totalUsers = users.length;
  const usersWithRegistrations = users.filter(u => u.registeredCourses.length > 0).length;
  const completedUsers = users.filter(u => u.completedCourses.length > 0).length;
  const profileCompleteUsers = users.filter(u => u.isProfileComplete).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <p className="font-semibold mb-2">{t.adminError || 'Error'}</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Users size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.adminTotalUsers || 'Total Users'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{usersWithRegistrations}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.adminWithRegistrations || 'With Registrations'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg">
              <Award size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedUsers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.adminWithCompletions || 'With Completions'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-lg">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{profileCompleteUsers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.adminProfilesComplete || 'Profiles Complete'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header with Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {t.adminAllUsersTitle || 'All Users'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredAndSortedUsers.length} {t.adminOf || 'of'} {users.length} {t.adminUsers || 'users'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                hasActiveFilters 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <Filter size={18} />
              {t.adminFilters || 'Filters'}
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
            </button>
            {filteredAndSortedUsers.length > 0 && (
              <>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                >
                  <FileText size={18} />
                  CSV
                </button>
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                >
                  <FileSpreadsheet size={18} />
                  Excel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.adminSearchPlaceholder || 'Search by name, email, phone...'}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-600 outline-none"
                  />
                </div>
              </div>

              {/* English Level Filter */}
              <select
                value={englishLevelFilter}
                onChange={(e) => setEnglishLevelFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
              >
                <option value="all">{t.adminAllLevels || 'All English Levels'}</option>
                {ENGLISH_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>

              {/* Profile Complete Filter */}
              <select
                value={profileCompleteFilter}
                onChange={(e) => setProfileCompleteFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
              >
                <option value="all">{t.adminAllProfiles || 'All Profiles'}</option>
                <option value="yes">{t.adminProfileCompleteYes || 'Profile Complete'}</option>
                <option value="no">{t.adminProfileCompleteNo || 'Profile Incomplete'}</option>
              </select>

              {/* Has Registrations Filter */}
              <select
                value={hasRegistrationsFilter}
                onChange={(e) => setHasRegistrationsFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
              >
                <option value="all">{t.adminAllRegistrations || 'All'}</option>
                <option value="yes">{t.adminHasRegistrations || 'Has Courses'}</option>
                <option value="no">{t.adminNoCoursesFilter || 'No Courses'}</option>
              </select>
            </div>

            {/* Course filter and LDC Ref filter on second row */}
            <div className="mt-3 flex flex-col sm:flex-row gap-3">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
              >
                <option value="all">{t.adminAllCourses || 'All Courses'}</option>
                {availableCourses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
              
              {/* LDC Ref Filter */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={ldcRefFilter}
                  onChange={(e) => setLdcRefFilter(e.target.value)}
                  placeholder={t.adminLdcRefFilterPlaceholder || 'Filter by LDC Ref...'}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-600 outline-none"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <X size={16} />
                {t.adminClearFilters || 'Clear filters'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Users List */}
      {filteredAndSortedUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {hasActiveFilters 
              ? (t.adminNoMatchingUsers || 'No users match the current filters')
              : (t.adminNoUsers || 'No users found')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th 
                    onClick={() => handleSort('firstName')}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                  >
                    {t.adminExportFirstName || 'First Name'}
                    <SortIcon field="firstName" />
                  </th>
                  <th 
                    onClick={() => handleSort('lastName')}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                  >
                    {t.adminExportLastName || 'Last Name'}
                    <SortIcon field="lastName" />
                  </th>
                  <th 
                    onClick={() => handleSort('email')}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                  >
                    {t.adminExportEmail || 'Email'}
                    <SortIcon field="email" />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    {t.adminExportMobile || 'Mobile'}
                  </th>
                  <th 
                    onClick={() => handleSort('englishLevel')}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                  >
                    {t.adminExportEnglishLevel || 'English'}
                    <SortIcon field="englishLevel" />
                  </th>
                  <th 
                    onClick={() => handleSort('registeredCourses')}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                  >
                    {t.adminCourses || 'Courses'}
                    <SortIcon field="registeredCourses" />
                  </th>
                  <th 
                    onClick={() => handleSort('isProfileComplete')}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                  >
                    {t.adminProfile || 'Profile'}
                    <SortIcon field="isProfileComplete" />
                  </th>
                  <th 
                    onClick={() => handleSort('createdAt')}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                  >
                    {t.adminCreatedAt || 'Joined'}
                    <SortIcon field="createdAt" />
                  </th>
                  <th 
                    onClick={() => handleSort('ldcRef')}
                    className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                  >
                    LDC Ref
                    <SortIcon field="ldcRef" />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    IRIS ID
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                    {t.adminActions || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedUsers.map((user) => {
                  const isExpanded = expandedUserId === user.userId;
                  const hasCompletedCourses = user.completedCourses.length > 0;
                  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
                  
                  return (
                    <React.Fragment key={user.userId}>
                      <tr 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${hasCompletedCourses ? 'cursor-pointer' : ''}`}
                        onClick={() => hasCompletedCourses && toggleExpanded(user.userId)}
                      >
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {hasCompletedCourses && (
                              <span className="text-gray-400">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </span>
                            )}
                            {user.firstName || '-'}
                            {user.isAdmin && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                          {user.lastName || '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {user.mobileNumber ? (
                            <div className="flex items-center gap-1">
                              <Phone size={14} className="text-gray-400" />
                              {user.mobileNumber}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            <GraduationCap size={14} />
                            {user.englishLevel}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {user.registeredCourses.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs">
                                <BookOpen size={12} />
                                {user.registeredCourses.length}
                              </span>
                            )}
                            {user.completedCourses.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                                <Award size={12} />
                                {user.completedCourses.length}
                              </span>
                            )}
                            {user.registeredCourses.length === 0 && user.completedCourses.length === 0 && (
                              <span className="text-gray-400 dark:text-gray-500">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          {user.isProfileComplete ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              <CheckCircle size={14} />
                              {t.adminYes || 'Yes'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                              {t.adminNo || 'No'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {user.createdAt ? (
                            <div className="flex items-center gap-1">
                              <Calendar size={14} className="text-gray-400" />
                              {formatDate(user.createdAt)}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {user.ldcRef || '-'}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {user.irisId || '-'}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingUser(user);
                            }}
                            className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 transition-colors flex-shrink-0"
                            title={t.adminEditProfile || 'Edit Profile'}
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded row showing completed courses */}
                      {isExpanded && hasCompletedCourses && (
                        <tr className="bg-green-50 dark:bg-green-900/10">
                          <td colSpan={11} className="px-3 py-3">
                            <div className="ml-6">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Award size={16} className="text-green-600 dark:text-green-400" />
                                {t.adminCompletedCourses || 'Completed Courses'}:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {user.completedCourses.map(courseId => (
                                  <div 
                                    key={courseId}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 text-sm"
                                  >
                                    <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                                    <span className="text-gray-800 dark:text-gray-200">{getCourseTitle(courseId)}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveCompletionClick(user.userId, courseId, userName);
                                      }}
                                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors"
                                      title={t.adminRemoveCompletion || 'Remove completion status'}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {t.adminRemoveCompletionHint || 'Click the trash icon to allow user to re-register for this course'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t.adminExportNote || 'Click Export buttons above to download full user details including address, eircode, and date of birth'}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal for removing completion */}
      <ConfirmationModal
        isOpen={!!completionToRemove}
        onClose={() => setCompletionToRemove(null)}
        onConfirm={handleConfirmRemoveCompletion}
        title={t.adminRemoveCompletionTitle || 'Remove Completion Status'}
        message={
          completionToRemove 
            ? (t.adminRemoveCompletionConfirm || 'Are you sure you want to remove the completion status for "{course}" from {user}? This will allow them to register for this course again.')
                .replace('{course}', completionToRemove.courseTitle)
                .replace('{user}', completionToRemove.userName)
            : ''
        }
        confirmText={t.adminRemoveCompletionBtn || 'Remove Completion'}
        language={language}
        type="warning"
        isLoading={isRemovingCompletion}
      />

      {/* Edit User Profile Modal */}
      <AdminUserProfileModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={async () => {
          await loadUsers();
          setEditingUser(null);
        }}
        language={language}
        user={editingUser ? {
          userId: editingUser.userId,
          email: editingUser.email,
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          mobileNumber: editingUser.mobileNumber,
          address: editingUser.address,
          eircode: editingUser.eircode,
          dateOfBirth: editingUser.dateOfBirth,
          englishLevel: editingUser.englishLevel,
          isAdmin: editingUser.isAdmin,
          createdAt: editingUser.createdAt,
          registeredCourses: editingUser.registeredCourses,
          completedCourses: editingUser.completedCourses,
          isProfileComplete: editingUser.isProfileComplete,
          ldcRef: editingUser.ldcRef,
          irisId: editingUser.irisId
        } : null}
      />
    </div>
  );
};

