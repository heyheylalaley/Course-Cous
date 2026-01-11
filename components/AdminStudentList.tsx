import React, { useState, useEffect, useMemo } from 'react';
import { AdminStudentDetail, Language, EnglishLevel, CourseSession } from '../types';
import { db } from '../services/db';
import { useCourses } from '../hooks/useCourses';
import { TRANSLATIONS } from '../translations';
import { ConfirmationModal } from './ConfirmationModal';
import { 
  Users, FileSpreadsheet, FileText, Mail, Phone, Calendar, GraduationCap, 
  ArrowUp, ArrowDown, Filter, Search, CheckCircle, Circle, X, ArrowLeft,
  Send, CalendarCheck, Loader2, Copy, Check
} from 'lucide-react';

interface AdminStudentListProps {
  courseId: string;
  language: Language;
  onBack: () => void;
}

type SortField = 'priority' | 'firstName' | 'lastName' | 'email' | 'englishLevel' | 'registeredAt' | 'isCompleted' | 'isInvited' | 'assignedDate' | 'selectedDate';
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
  const [studentToConfirm, setStudentToConfirm] = useState<AdminStudentDetail | null>(null);
  const { courses: availableCourses } = useCourses(false, language);
  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';

  // Course sessions for enrollment management
  const [courseSessions, setCourseSessions] = useState<CourseSession[]>([]);
  const [updatingInviteUserId, setUpdatingInviteUserId] = useState<string | null>(null);
  const [updatingAssignUserId, setUpdatingAssignUserId] = useState<string | null>(null);
  
  // Email generation modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [emailsCopied, setEmailsCopied] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [englishLevelFilter, setEnglishLevelFilter] = useState<string>('all');
  const [completedFilter, setCompletedFilter] = useState<string>('no'); // Default to 'no' to exclude completed students
  const [inviteFilter, setInviteFilter] = useState<string>('all');
  const [assignedDateFilter, setAssignedDateFilter] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const course = availableCourses.find(c => c.id === courseId);

  useEffect(() => {
    loadStudentDetails();
    loadCourseSessions();
  }, [courseId]);

  // Prevent body scroll when email modal is open
  useEffect(() => {
    if (showEmailModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showEmailModal]);

  const loadCourseSessions = async () => {
    try {
      const sessions = await db.getCourseSessions(courseId, false);
      setCourseSessions(sessions);
    } catch (err: any) {
      console.error('Failed to load course sessions:', err);
    }
  };

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

  // Handle invite toggle
  const handleToggleInvite = async (student: AdminStudentDetail) => {
    setUpdatingInviteUserId(student.userId);
    try {
      await db.setUserInvite(student.userId, courseId, !student.isInvited);
      await loadStudentDetails();
    } catch (err: any) {
      console.error('Failed to update invite:', err);
      alert(err.message || 'Failed to update invite status');
    } finally {
      setUpdatingInviteUserId(null);
    }
  };

  // Handle session assignment
  const handleAssignSession = async (student: AdminStudentDetail, sessionId: string | null) => {
    setUpdatingAssignUserId(student.userId);
    try {
      await db.assignUserSession(student.userId, courseId, sessionId);
      await loadStudentDetails();
      await loadCourseSessions(); // Refresh session counts
    } catch (err: any) {
      console.error('Failed to assign session:', err);
      alert(err.message || 'Failed to assign session');
    } finally {
      setUpdatingAssignUserId(null);
    }
  };

  // Format session date for display
  const formatSessionDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(
      language === 'en' ? 'en-GB' : 
      language === 'ua' ? 'uk-UA' : 
      language === 'ru' ? 'ru-RU' : 'ar-SA',
      { day: '2-digit', month: 'short', year: 'numeric' }
    );
  };

  // Handle toggling completion status
  const handleToggleCompleted = async (student: AdminStudentDetail) => {
    // If student is already completed, unmark immediately without confirmation
    if (student.isCompleted) {
      setCompletingUserId(student.userId);
      try {
        await db.unmarkCourseCompleted(student.userId, courseId);
        await loadStudentDetails();
      } catch (err: any) {
        console.error('Failed to toggle completion:', err);
        alert(err.message || 'Failed to update completion status');
      } finally {
        setCompletingUserId(null);
      }
    } else {
      // If student is not completed, show confirmation modal
      setStudentToConfirm(student);
    }
  };

  // Handle confirmation of course completion
  const handleConfirmComplete = async () => {
    if (!studentToConfirm) return;
    
    setCompletingUserId(studentToConfirm.userId);
    try {
      await db.markCourseCompleted(studentToConfirm.userId, courseId);
      await loadStudentDetails();
      setStudentToConfirm(null);
    } catch (err: any) {
      console.error('Failed to mark course as completed:', err);
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

    // Apply invite filter
    if (inviteFilter !== 'all') {
      const isInvited = inviteFilter === 'yes';
      result = result.filter(s => (s.isInvited || false) === isInvited);
    }

    // Apply assigned date filter
    if (assignedDateFilter !== 'all') {
      const isAssigned = assignedDateFilter === 'yes';
      result = result.filter(s => {
        if (isAssigned) {
          return !!s.assignedSessionId;
        } else {
          return !s.assignedSessionId;
        }
      });
    }

    // Apply selected filter
    if (selectedFilter !== 'all') {
      const hasSelected = selectedFilter === 'yes';
      result = result.filter(s => {
        if (hasSelected) {
          return !!s.userSelectedSessionDate;
        } else {
          return !s.userSelectedSessionDate;
        }
      });
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
        case 'isInvited':
          comparison = ((a.isInvited || false) ? 1 : 0) - ((b.isInvited || false) ? 1 : 0);
          break;
        case 'assignedDate':
          if (a.assignedSessionDate && b.assignedSessionDate) {
            comparison = new Date(a.assignedSessionDate).getTime() - new Date(b.assignedSessionDate).getTime();
          } else if (a.assignedSessionDate) {
            comparison = 1;
          } else if (b.assignedSessionDate) {
            comparison = -1;
          } else {
            comparison = 0;
          }
          break;
        case 'selectedDate':
          if (a.userSelectedSessionDate && b.userSelectedSessionDate) {
            comparison = new Date(a.userSelectedSessionDate).getTime() - new Date(b.userSelectedSessionDate).getTime();
          } else if (a.userSelectedSessionDate) {
            comparison = 1;
          } else if (b.userSelectedSessionDate) {
            comparison = -1;
          } else {
            comparison = 0;
          }
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, searchQuery, priorityFilter, englishLevelFilter, completedFilter, inviteFilter, assignedDateFilter, selectedFilter, sortField, sortDirection]);

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
      t.adminExportRegisteredAt || 'Registered At',
      t.adminInvite || 'Invite',
      t.adminAssignedDate || 'Assigned Date',
      t.adminSelectedDate || 'Selected Date'
    ];

    const rows = filteredAndSortedStudents.map(student => [
      student.firstName || '',
      student.lastName || '',
      student.email || '', // Keep email in export for CSV/Excel even though it's removed from table
      student.mobileNumber || '',
      student.address || '',
      student.eircode || '',
      student.dateOfBirth || '',
      student.englishLevel || '',
      student.ldcRef || '',
      student.irisId || '',
      student.priority?.toString() || '',
      student.registeredAt.toLocaleString(),
      student.isInvited ? 'Yes' : 'No',
      student.assignedSessionDate || 'Not assigned',
      student.userSelectedSessionDate || 'Not selected'
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
        t.adminExportRegisteredAt || 'Registered At',
        t.adminInvite || 'Invite',
        t.adminAssignedDate || 'Assigned Date',
        t.adminSelectedDate || 'Selected Date'
      ];

      const data = filteredAndSortedStudents.map(student => ({
        [headers[0]]: student.firstName || '',
        [headers[1]]: student.lastName || '',
        [headers[2]]: student.email || '', // Keep email in export for CSV/Excel even though it's removed from table
        [headers[3]]: student.mobileNumber || '',
        [headers[4]]: student.address || '',
        [headers[5]]: student.eircode || '',
        [headers[6]]: student.dateOfBirth || '',
        [headers[7]]: student.englishLevel || '',
        [headers[8]]: student.ldcRef || '',
        [headers[9]]: student.irisId || '',
        [headers[10]]: student.priority?.toString() || '',
        [headers[11]]: student.registeredAt.toLocaleString(),
        [headers[12]]: student.isInvited ? 'Yes' : 'No',
        [headers[13]]: student.assignedSessionDate || 'Not assigned',
        [headers[14]]: student.userSelectedSessionDate || 'Not selected'
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
    setCompletedFilter('no'); // Reset to default (exclude completed)
    setInviteFilter('all');
    setAssignedDateFilter('all');
    setSelectedFilter('all');
  };

  const hasActiveFilters = searchQuery || priorityFilter !== 'all' || englishLevelFilter !== 'all' || completedFilter !== 'no' || inviteFilter !== 'all' || assignedDateFilter !== 'all' || selectedFilter !== 'all';

  // Calculate active (non-completed) students count for display
  const activeStudentsCount = useMemo(() => {
    return students.filter(s => !s.isCompleted).length;
  }, [students]);

  // Get invited students
  const invitedStudents = useMemo(() => {
    return students.filter(s => s.isInvited);
  }, [students]);

  // Generate invitation email
  const generateInvitationEmail = (): string => {
    if (!course) return '';
    
    // Filter active sessions that are in the future (or today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeSessions = courseSessions.filter(s => {
      if (s.status !== 'active') return false;
      const sessionDate = new Date(s.sessionDate + 'T00:00:00');
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate >= today;
    });
    
    activeSessions.sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
    
    const formatDateForEmail = (dateString: string) => {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('en-GB', { 
        weekday: 'long',
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    };

    const datesList = activeSessions.length > 0
      ? activeSessions.map(session => {
          const spotsLeft = (session.maxCapacity || 0) - (session.currentEnrollment || 0);
          return `• ${formatDateForEmail(session.sessionDate)}${spotsLeft > 0 ? ` (${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} available)` : ' (Full)'}`;
        }).join('\n')
      : '• Dates will be announced soon';

    const email = `Subject: Invitation to Join ${course.title}

Hello!

I hope this email finds you well. I'm delighted to invite you to participate in our upcoming course: ${course.title}.

We would be thrilled to have you join us! To confirm your participation and select your preferred date, you have two options:

1. Visit our website at https://ccplearn.pages.dev/ and confirm your participation in the course, where you can also choose your preferred date.

2. Simply reply to this email with your chosen date.

Please note that spaces for this course are limited, so we encourage you to confirm your participation as soon as possible.

Available dates for this course:
${datesList}

We look forward to having you join us for this course. If you have any questions, please don't hesitate to reach out.`;

    return email;
  };

  // Get invited students emails as comma-separated string
  const getInvitedStudentsEmails = (): string => {
    return invitedStudents.map(s => s.email).join('; ');
  };

  // Copy email to clipboard
  const handleCopyEmail = async () => {
    const emailText = generateInvitationEmail();
    try {
      await navigator.clipboard.writeText(emailText);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
      alert('Failed to copy email to clipboard');
    }
  };

  // Copy email addresses to clipboard
  const handleCopyEmails = async () => {
    const emails = getInvitedStudentsEmails();
    try {
      await navigator.clipboard.writeText(emails);
      setEmailsCopied(true);
      setTimeout(() => setEmailsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy emails:', err);
      alert('Failed to copy emails to clipboard');
    }
  };

  // Show email modal
  const handleGenerateEmail = () => {
    if (invitedStudents.length === 0) {
      alert(t.adminNoInvitedStudents || 'No invited students found. Please invite students first before generating the email.');
      return;
    }
    if (!course) {
      alert(t.adminError || 'Course information not available.');
      return;
    }
    setShowEmailModal(true);
  };

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
                {filteredAndSortedStudents.length} {t.adminOf || 'of'} {
                  completedFilter === 'no' 
                    ? activeStudentsCount 
                    : students.length
                } {(() => {
                  const totalCount = completedFilter === 'no' ? activeStudentsCount : students.length;
                  return totalCount === 1 
                    ? (t.adminStudent || 'student') 
                    : (t.adminStudents || 'students');
                })()}
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
            <button
              onClick={handleGenerateEmail}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                invitedStudents.length > 0
                  ? 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600'
                  : 'bg-purple-400 dark:bg-purple-800 text-white opacity-75 cursor-pointer hover:opacity-100'
              }`}
              title={
                invitedStudents.length > 0
                  ? `Generate invitation email for ${invitedStudents.length} invited ${invitedStudents.length === 1 ? 'student' : 'students'}`
                  : t.adminNoInvitedStudents || 'No invited students. Please invite students first.'
              }
            >
              <Mail size={18} />
              {t.adminGenerateInviteEmail || 'Generate Invite Email'}
              {invitedStudents.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-500 dark:bg-purple-600 text-xs font-semibold">
                  {invitedStudents.length}
                </span>
              )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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

              {/* Invite Filter */}
              <select
                value={inviteFilter}
                onChange={(e) => setInviteFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
              >
                <option value="all">{t.adminAllInviteStatus || 'All Invite Status'}</option>
                <option value="yes">{t.adminInvitedOnly || 'Invited'}</option>
                <option value="no">{t.adminNotInvitedOnly || 'Not Invited'}</option>
              </select>

              {/* Assigned Date Filter */}
              <select
                value={assignedDateFilter}
                onChange={(e) => setAssignedDateFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
              >
                <option value="all">{t.adminAllAssignedStatus || 'All Assigned Status'}</option>
                <option value="yes">{t.adminAssignedOnly || 'Assigned'}</option>
                <option value="no">{t.adminNotAssignedOnly || 'Not Assigned'}</option>
              </select>

              {/* Selected Filter */}
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
              >
                <option value="all">{t.adminAllSelectedStatus || 'All Selected Status'}</option>
                <option value="yes">{t.adminSelectedOnly || 'Selected'}</option>
                <option value="no">{t.adminNotSelectedOnly || 'Not Selected'}</option>
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
                    {t.adminRegistrationDate || 'Registration Date'}
                    <SortIcon field="registeredAt" />
                  </th>
                  {/* Enrollment Management Columns */}
                  <th 
                    onClick={() => handleSort('isInvited')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.adminInvite || 'Invite'}
                    <SortIcon field="isInvited" />
                  </th>
                  <th 
                    onClick={() => handleSort('assignedDate')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.adminAssignedDate || 'Assigned Date'}
                    <SortIcon field="assignedDate" />
                  </th>
                  <th 
                    onClick={() => handleSort('selectedDate')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t.adminSelectedDate || 'Selected'}
                    <SortIcon field="selectedDate" />
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
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        <GraduationCap size={14} />
                        {student.englishLevel}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm whitespace-nowrap ${student.isCompleted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                      {formatDate(student.registeredAt)}
                    </td>
                    {/* Invite Column */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleInvite(student)}
                        disabled={updatingInviteUserId === student.userId}
                        className={`p-1.5 rounded-lg transition-colors ${
                          student.isInvited 
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                        } ${updatingInviteUserId === student.userId ? 'opacity-50' : ''}`}
                        title={student.isInvited 
                          ? (t.adminRevokeInvite || 'Revoke invite') 
                          : (t.adminSendInvite || 'Send invite to select date')}
                      >
                        {updatingInviteUserId === student.userId ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} className={student.isInvited ? 'fill-current' : ''} />
                        )}
                      </button>
                    </td>
                    {/* Assigned Date Column */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="relative">
                        <select
                          value={student.assignedSessionId || ''}
                          onChange={(e) => handleAssignSession(student, e.target.value || null)}
                          disabled={updatingAssignUserId === student.userId || courseSessions.length === 0}
                          className={`w-full min-w-[140px] px-2 py-1.5 text-sm rounded-lg border transition-colors appearance-none pr-8 ${
                            student.assignedSessionId 
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                          } ${updatingAssignUserId === student.userId ? 'opacity-50' : ''} disabled:opacity-50 disabled:cursor-not-allowed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none`}
                        >
                          <option value="">{t.adminNotAssigned || '— Not assigned —'}</option>
                          {courseSessions.map(session => (
                            <option key={session.id} value={session.id}>
                              {formatSessionDate(session.sessionDate)} ({session.currentEnrollment || 0}/{session.maxCapacity})
                            </option>
                          ))}
                        </select>
                        {updatingAssignUserId === student.userId && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <Loader2 size={14} className="animate-spin text-indigo-500" />
                          </div>
                        )}
                      </div>
                    </td>
                    {/* User Selected Date Column */}
                    <td className="px-4 py-3 text-sm">
                      {student.userSelectedSessionDate ? (
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <CalendarCheck size={16} />
                          <span className="font-medium">{formatSessionDate(student.userSelectedSessionDate)}</span>
                        </div>
                      ) : student.isInvited ? (
                        <span className="text-gray-400 dark:text-gray-500 text-xs italic">
                          {t.adminAwaitingSelection || 'Awaiting...'}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
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

      {/* Email Generation Modal */}
      {showEmailModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEmailModal(false);
            }
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t.adminInvitationEmail || 'Invitation Email'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  For {invitedStudents.length} invited {invitedStudents.length === 1 ? 'student' : 'students'}
                </p>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                  {generateInvitationEmail()}
                </pre>
              </div>
              
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              {/* Email Addresses Section */}
              <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t.adminInvitedStudentsEmails || 'Invited Students Emails'} ({invitedStudents.length}):
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t.adminEmailsCopyHint || 'Copy emails to paste into Outlook (separated by semicolon)'}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyEmails}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm flex-shrink-0"
                  >
                    {emailsCopied ? (
                      <>
                        <Check size={16} />
                        {t.adminCopied || 'Copied!'}
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        {t.adminCopyEmails || 'Copy Emails'}
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                    {getInvitedStudentsEmails() || t.adminNoInvitedStudents || 'No invited students'}
                  </p>
                </div>
              </div>

              {/* Copy Email Button Section */}
              <div className="flex items-center justify-between p-4 sm:p-6">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.adminEmailCopyHint || 'Copy the email above and send it to invited students'}
                </p>
                <button
                  onClick={handleCopyEmail}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                >
                  {emailCopied ? (
                    <>
                      <Check size={18} />
                      {t.adminCopied || 'Copied!'}
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      {t.adminCopyEmail || 'Copy Email'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!studentToConfirm}
        onClose={() => setStudentToConfirm(null)}
        onConfirm={handleConfirmComplete}
        title={t.adminMarkCompleted || 'Mark as completed'}
        message={
          studentToConfirm && course
            ? `${t.adminMarkCompleted || 'Mark as completed'}: ${studentToConfirm.firstName || ''} ${studentToConfirm.lastName || ''} - ${course.title}?`
            : ''
        }
        confirmText={t.confirm || 'Confirm'}
        cancelText={t.cancel || 'Cancel'}
        language={language}
        type="warning"
        isLoading={completingUserId === studentToConfirm?.userId}
      />
    </div>
  );
};
