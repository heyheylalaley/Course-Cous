import React, { useState, useEffect } from 'react';
import { AdminStudentDetail, Language } from '../types';
import { AVAILABLE_COURSES } from '../constants';
import { db } from '../services/db';
import { useCourses } from '../hooks/useCourses';
import { TRANSLATIONS } from '../translations';
import { Users, Download, FileSpreadsheet, FileText, Mail, Phone, MapPin, Calendar, GraduationCap } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminStudentListProps {
  courseId: string;
  language: Language;
  onBack: () => void;
}

export const AdminStudentList: React.FC<AdminStudentListProps> = ({
  courseId,
  language,
  onBack
}) => {
  const [students, setStudents] = useState<AdminStudentDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { courses: availableCourses } = useCourses(false, language);
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  const course = availableCourses.find(c => c.id === courseId);

  useEffect(() => {
    loadStudentDetails();
  }, [courseId]);

  const loadStudentDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const details = await db.getAdminStudentDetails(courseId);
      setStudents(details);
    } catch (err: any) {
      console.error('Failed to load student details:', err);
      setError(err.message || 'Failed to load student details');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (students.length === 0) return;

    const headers = [
      t.adminExportFirstName || 'First Name',
      t.adminExportLastName || 'Last Name',
      t.adminExportEmail || 'Email',
      t.adminExportMobile || 'Mobile Number',
      t.adminExportAddress || 'Address',
      t.adminExportEircode || 'Eircode',
      t.adminExportDateOfBirth || 'Date of Birth',
      t.adminExportEnglishLevel || 'English Level',
      t.adminExportRegisteredAt || 'Registered At',
      t.adminExportPriority || 'Priority'
    ];

    const rows = students.map(student => [
      student.firstName || '',
      student.lastName || '',
      student.email || '',
      student.mobileNumber || '',
      student.address || '',
      student.eircode || '',
      student.dateOfBirth || '',
      student.englishLevel || '',
      student.registeredAt.toLocaleString(),
      student.priority?.toString() || ''
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

  const exportToExcel = async () => {
    if (students.length === 0) return;

    const headers = [
      t.adminExportFirstName || 'First Name',
      t.adminExportLastName || 'Last Name',
      t.adminExportEmail || 'Email',
      t.adminExportMobile || 'Mobile Number',
      t.adminExportAddress || 'Address',
      t.adminExportEircode || 'Eircode',
      t.adminExportDateOfBirth || 'Date of Birth',
      t.adminExportEnglishLevel || 'English Level',
      t.adminExportRegisteredAt || 'Registered At',
      t.adminExportPriority || 'Priority'
    ];

    const data = students.map(student => ({
      [headers[0]]: student.firstName || '',
      [headers[1]]: student.lastName || '',
      [headers[2]]: student.email || '',
      [headers[3]]: student.mobileNumber || '',
      [headers[4]]: student.address || '',
      [headers[5]]: student.eircode || '',
      [headers[6]]: student.dateOfBirth || '',
      [headers[7]]: student.englishLevel || '',
      [headers[8]]: student.registeredAt.toLocaleString(),
      [headers[9]]: student.priority?.toString() || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    
    const fileName = `${course?.title || 'course'}_students_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {course?.title || 'Course'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {students.length} {students.length === 1 
                ? (t.adminStudent || 'student') 
                : (t.adminStudents || 'students')}
            </p>
          </div>
          {students.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                <FileText size={18} />
                {t.adminExportCSV || 'Export CSV'}
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 dark:bg-indigo-700 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
              >
                <FileSpreadsheet size={18} />
                {t.adminExportExcel || 'Export Excel'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Students List */}
      {students.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {t.adminNoStudents || 'No students registered for this course yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t.adminExportPriority || 'Priority'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t.adminExportFirstName || 'First Name'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t.adminExportLastName || 'Last Name'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t.adminExportEmail || 'Email'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t.adminExportMobile || 'Mobile'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t.adminExportEnglishLevel || 'English Level'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {t.adminExportRegisteredAt || 'Registered'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.map((student, index) => (
                  <tr key={student.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
                        {student.priority || index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {student.firstName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
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

          {/* Additional Details Modal/Expandable Rows */}
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
