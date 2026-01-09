import React, { useState, useEffect, useMemo } from 'react';
import { AdminStudentDetail, Language, EnglishLevel } from '../types';
import { db } from '../services/db';
import { useCourses } from '../hooks/useCourses';
import { TRANSLATIONS } from '../translations';
import { 
  Users, FileSpreadsheet, FileText, Mail, Phone, Calendar, GraduationCap, 
  ArrowUp, ArrowDown, Filter, Search, CheckCircle, Circle, X, ArrowLeft
} from 'lucide-react';

interface AdminStudentListProps {
  courseId: string;
  language: Language;
  onBack: () => void;
}

type SortField = 'priority' | 'firstName' | 'lastName' | 'email' | 'englishLevel' | 'registeredAt' | 'isCompleted';
type SortDirection = 'asc' | 'desc';

const ENGLISH_LEVELS: EnglishLevel[] = ['None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const AdminStudentList: React.FC<AdminStudentListProps> = ({
  courseId,
  language,
  onBack
}) => {
  const [students, setStudents] = useState<AdminStudentDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingUserId, setCompletingUserId] = useState<string | null>(null);
  const { courses: availableCourses } = useCourses(false, language);
  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [englishLevelFilter, setEnglishLevelFilter] = useState<string>('all');
  const [completedFilter, setCompletedFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const course = availableCourses.find(c => c.id === courseId);

  useEffect(() => {
    loadStudentDetails();
  }, [courseId]);

  const loadStudentDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const details = await db.getAdminStudentDetails(courseId);
      
      // Load completion status for each student
      const completions = await db.getAllCompletions();
      const completionMap = new Map<string, Date>();
      completions.forEach(c => {
        if (c.courseId === courseId) {
          completionMap.set(c.userId, c.completedAt);
        }
      });

      // Merge completion data
      const studentsWithCompletion = details.map(student => ({
        ...student,
        isCompleted: completionMap.has(student.userId),
        completedAt: completionMap.get(student.userId)
      }));

      setStudents(studentsWithCompletion);
    } catch (err: any) {
      console.error('Failed to load student details:', err);
      setError(err.message || 'Failed to load student details');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle toggling completion status
  const handleToggleCompleted = async (student: AdminStudentDetail) => {
    setCompletingUserId(student.userId);
    try {
      if (student.isCompleted) {
        await db.unmarkCourseCompleted(student.userId, courseId);
      } else {
        await db.markCourseCompleted(student.userId, courseId);
      }
      // Reload data
      await loadStudentDetails();
    } catch (err: any) {
      console.error('Failed to toggle completion:', err);
      alert(err.message || 'Failed to update completion status');
    } finally {
      setCompletingUserId(null);
    }
  };

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.firstName?.toLowerCase() || '').includes(query) ||
        (s.lastName?.toLowerCase() || '').includes(query) ||
        (s.email?.toLowerCase() || '').includes(query) ||
        (s.mobileNumber?.toLowerCase() || '').includes(query)
      );
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(s => s.priority === parseInt(priorityFilter));
    }

    // Apply English level filter
    if (englishLevelFilter !== 'all') {
      result = result.filter(s => s.englishLevel === englishLevelFilter);
    }

    // Apply completed filter
    if (completedFilter !== 'all') {
      const isCompleted = completedFilter === 'yes';
      result = result.filter(s => s.isCompleted === isCompleted);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'priority':
          comparison = (a.priority || 999) - (b.priority || 999);
          break;
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
        case 'registeredAt':
          comparison = new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
          break;
        case 'isCompleted':
          comparison = (a.isCompleted ? 1 : 0) - (b.isCompleted ? 1 : 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, searchQuery, priorityFilter, englishLevelFilter, completedFilter, sortField, sortDirection]);

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
    if (filteredAndSortedStudents.length === 0) return;

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
      t.adminExportPriority || 'Priority',
      t.adminExportRegisteredAt || 'Registered At'
    ];

    const rows = filteredAndSortedStudents.map(student => [
      student.firstName || '',
      student.lastName || '',
      student.email || '',
      student.mobileNumber || '',
      student.address || '',
      student.eircode || '',
      student.dateOfBirth || '',
      student.englishLevel || '',
      student.ldcRef || '',
      student.irisId || '',
      student.priority?.toString() || '',
      student.registeredAt.toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${course?.title || 'course'}_students_${new Date().toISOString().split('T')[0]}.csv`);
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
    if (filteredAndSortedStudents.length === 0) return;

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
        t.adminExportPriority || 'Priority',
        t.adminExportRegisteredAt || 'Registered At'
      ];

      const data = filteredAndSortedStudents.map(student => ({
        [headers[0]]: student.firstName || '',
        [headers[1]]: student.lastName || '',
        [headers[2]]: student.email || '',
        [headers[3]]: student.mobileNumber || '',
        [headers[4]]: student.address || '',
        [headers[5]]: student.eircode || '',
        [headers[6]]: student.dateOfBirth || '',
        [headers[7]]: student.englishLevel || '',
        [headers[8]]: student.ldcRef || '',
        [headers[9]]: student.irisId || '',
        [headers[10]]: student.priority?.toString() || '',
        [headers[11]]: student.registeredAt.toLocaleString()
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      
      const fileName = `${course?.title || 'course'}_students_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setEnglishLevelFilter('all');
    setCompletedFilter('all');
  };

  const hasActiveFilters = searchQuery || priorityFilter !== 'all' || englishLevelFilter !== 'all' || completedFilter !== 'all';

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
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors lg:hidden"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {course?.title || 'Course'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredAndSortedStudents.length} {t.adminOf || 'of'} {students.length} {students.length === 1 
                  ? (t.adminStudent || 'student') 
                  : (t.adminStudents || 'students')}
              </p>
            </div>
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
            {filteredAndSortedStudents.length > 0 && (
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

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
              >
                <option value="all">{t.adminAllPriorities || 'All Priorities'}</option>
                <option value="1">Priority 1</option>
                <option value="2">Priority 2</option>
                <option value="3">Priority 3</option>
              </select>

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

              {/* Completed Filter */}
              <select
                value={completedFilter}
                onChange={(e) => setCompletedFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
              >
                <option value="all">{t.adminAllStatus || 'All Status'}</option>
                <option value="yes">{t.adminCompletedOnly || 'Completed'}</option>
                <option value="no">{t.adminActiveOnly || 'Active'}</option>
              </select>
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

      {/* Students List */}
      {filteredAndSortedStudents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {hasActiveFilters 
              ? (t.adminNoMatchingStudents || 'No students match the current filters')
              : (t.adminNoStudents || 'No students registered for this course yet')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th 
                    onClick={() => handleSort('isCompleted')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.adminCompleted || 'Done'}
                    <SortIcon field="isCompleted" />
                  </th>
                  <th 
                    onClick={() => handleSort('priority')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.adminExportPriority || 'Priority'}
                    <SortIcon field="priority" />
                  </th>
                  <th 
                    onClick={() => handleSort('firstName')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.adminExportFirstName || 'First Name'}
                    <SortIcon field="firstName" />
                  </th>
                  <th 
                    onClick={() => handleSort('lastName')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.adminExportLastName || 'Last Name'}
                    <SortIcon field="lastName" />
                  </th>
                  <th 
                    onClick={() => handleSort('email')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.adminExportEmail || 'Email'}
                    <SortIcon field="email" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t.adminExportMobile || 'Mobile'}
                  </th>
                  <th 
                    onClick={() => handleSort('englishLevel')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.adminExportEnglishLevel || 'English'}
                    <SortIcon field="englishLevel" />
                  </th>
                  <th 
                    onClick={() => handleSort('registeredAt')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.adminExportRegisteredAt || 'Registered'}
                    <SortIcon field="registeredAt" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedStudents.map((student, index) => (
                  <tr 
                    key={student.userId} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      student.isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleCompleted(student)}
                        disabled={completingUserId === student.userId}
                        className={`p-1 rounded-lg transition-colors ${
                          student.isCompleted 
                            ? 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30' 
                            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                        } ${completingUserId === student.userId ? 'opacity-50' : ''}`}
                        title={student.isCompleted 
                          ? (t.adminUnmarkCompleted || 'Unmark as completed') 
                          : (t.adminMarkCompleted || 'Mark as completed')}
                      >
                        {completingUserId === student.userId ? (
                          <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-indigo-500 rounded-full animate-spin" />
                        ) : student.isCompleted ? (
                          <CheckCircle size={20} />
                        ) : (
                          <Circle size={20} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                        student.isCompleted 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                      }`}>
                        {student.priority || index + 1}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${student.isCompleted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {student.firstName || '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm ${student.isCompleted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {student.lastName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Mail size={14} className="text-gray-400" />
                        {student.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {student.mobileNumber ? (
                        <div className="flex items-center gap-1">
                          <Phone size={14} className="text-gray-400" />
                          {student.mobileNumber}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        <GraduationCap size={14} />
                        {student.englishLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(student.registeredAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t.adminExportNote || 'Click Export buttons above to download full student details including address, eircode, and date of birth'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
