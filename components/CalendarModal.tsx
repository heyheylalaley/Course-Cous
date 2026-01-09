import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, BookOpen } from 'lucide-react';
import { Language, Course, CalendarEvent } from '../types';
import { TRANSLATIONS } from '../translations';
import { db } from '../services/db';
import { AVAILABLE_ICONS } from './AdminCategoryManagement';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  courses: Course[];
  isAdmin: boolean;
}

interface DayEvents {
  courses: Course[];
  events: CalendarEvent[];
}

const WEEKDAYS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ua: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  ar: ['إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد']
};

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ua: ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
};

export const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, language, courses, isAdmin }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const t = TRANSLATIONS[language] as any;
  const isRtl = language === 'ar';

  // Load calendar events
  useEffect(() => {
    if (isOpen) {
      loadEvents();
    }
  }, [isOpen, isAdmin]);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const events = await db.getCalendarEvents(isAdmin);
      setCalendarEvents(events);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get calendar grid data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Convert Sunday (0) to 6, Monday (1) to 0, etc. to start week from Monday
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const totalDays = lastDay.getDate();

    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }

    return { year, month, days, totalDays };
  }, [currentDate]);

  // Get events for each day
  const getEventsForDay = (day: number): DayEvents => {
    const dateStr = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayCourses = courses.filter(course => course.nextCourseDate === dateStr);
    const dayEvents = calendarEvents
      .filter(event => event.eventDate === dateStr)
      .sort((a, b) => {
        // Sort by time: events with time first, then by time value, then events without time
        if (a.eventTime && b.eventTime) {
          return a.eventTime.localeCompare(b.eventTime);
        }
        if (a.eventTime && !b.eventTime) return -1;
        if (!a.eventTime && b.eventTime) return 1;
        return 0;
      });
    
    return { courses: dayCourses, events: dayEvents };
  };

  // Check if day has events
  const hasEvents = (day: number): { hasCourses: boolean; hasEvents: boolean; hasPrivateEvents: boolean } => {
    const { courses, events } = getEventsForDay(day);
    const publicEvents = events.filter(event => event.isPublic);
    const privateEvents = events.filter(event => !event.isPublic);
    return { 
      hasCourses: courses.length > 0, 
      hasEvents: publicEvents.length > 0,
      hasPrivateEvents: isAdmin && privateEvents.length > 0
    };
  };

  // Check if day is today
  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      calendarData.month === today.getMonth() &&
      calendarData.year === today.getFullYear()
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(calendarData.year, calendarData.month - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(calendarData.year, calendarData.month + 1, 1));
    setSelectedDate(null);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Convert URLs in text to clickable links
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!isOpen) return null;

  const selectedDayEvents = selectedDate ? getEventsForDay(parseInt(selectedDate.split('-')[2])) : null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t.calendarTitle || 'Event Calendar'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            </div>
          ) : (
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                  title={t.calendarPrevMonth}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {MONTHS[language][calendarData.month]} {calendarData.year}
                  </h3>
                  <button
                    onClick={handleGoToToday}
                    className="text-xs px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                  >
                    {t.calendarToday || 'Today'}
                  </button>
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                  title={t.calendarNextMonth}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS[language].map((day, index) => (
                  <div
                    key={index}
                    className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {calendarData.days.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dateStr = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const { hasCourses: dayHasCourses, hasEvents: dayHasEvents, hasPrivateEvents: dayHasPrivateEvents } = hasEvents(day);
                  const isSelected = selectedDate === dateStr;
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={day}
                      onClick={() => handleDayClick(day)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                          : isTodayDate
                          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-sm font-medium">{day}</span>
                      {(dayHasCourses || dayHasEvents || dayHasPrivateEvents) && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayHasCourses && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-green-300' : 'bg-green-500'}`} />
                          )}
                          {dayHasEvents && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-300' : 'bg-purple-500'}`} />
                          )}
                          {dayHasPrivateEvents && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-gray-300' : 'bg-gray-500'}`} />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{t.calendarCourses || 'Courses'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>{t.calendarEvents || 'Events'}</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    <span>{t.calendarPrivateEvents || 'Private Events'}</span>
                  </div>
                )}
              </div>

              {/* Selected Day Events */}
              {selectedDate && selectedDayEvents && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                    {new Date(selectedDate).toLocaleDateString(
                      language === 'ar' ? 'ar-EG' : language === 'ua' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-IE',
                      { weekday: 'long', day: 'numeric', month: 'long' }
                    )}
                  </h4>

                  {selectedDayEvents.courses.length === 0 && selectedDayEvents.events.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      {t.calendarNoEvents || 'No events on this day'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {/* Courses */}
                      {selectedDayEvents.courses.map(course => (
                        <div
                          key={course.id}
                          className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{course.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{course.category}</p>
                          </div>
                        </div>
                      ))}

                      {/* Events */}
                      {selectedDayEvents.events.map(event => {
                        const IconComponent = AVAILABLE_ICONS[event.icon] || Calendar;
                        return (
                          <div
                            key={event.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              event.isPublic
                                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                              event.isPublic ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-gray-900 dark:text-white">{event.title}</p>
                                {event.eventTime && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {event.eventTime}
                                  </span>
                                )}
                                {!event.isPublic && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                                    {t.eventPrivate || 'Private'}
                                  </span>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 break-words overflow-wrap-anywhere">
                                  {renderTextWithLinks(event.description)}
                                </p>
                              )}
                              {!event.isPublic && isAdmin && (event.createdByName || event.createdByEmail) && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {t.eventAddedBy || 'Added by'} {event.createdByName || event.createdByEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {t.contactClose || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarModal;
