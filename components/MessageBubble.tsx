import React, { memo, useMemo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { Message, Course } from '../types';
import { Bot, User, ExternalLink } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  courses?: Course[];
  onCourseClick?: (courseId: string, courseTitle: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({ message, courses, onCourseClick }) => {
  const isBot = message.role === 'model';

  // Create a map of course titles to course IDs for quick lookup
  const courseTitleMap = useMemo(() => {
    const map = new Map<string, { id: string; title: string }>();
    if (courses) {
      courses.forEach(course => {
        // Add both exact title and lowercase version for matching
        map.set(course.title.toLowerCase(), { id: course.id, title: course.title });
        map.set(course.title, { id: course.id, title: course.title });
      });
    }
    return map;
  }, [courses]);

  // Custom markdown components to make course names clickable and style external links
  const markdownComponents: Components = useMemo(() => ({
    // Override strong (bold) elements to check if they're course names
    strong: ({ children, ...props }) => {
      const text = typeof children === 'string' 
        ? children 
        : Array.isArray(children) 
          ? children.map(c => typeof c === 'string' ? c : '').join('')
          : '';
      
      // Check if this bold text matches a course title
      const courseMatch = courseTitleMap.get(text) || courseTitleMap.get(text.toLowerCase());
      
      if (courseMatch && onCourseClick) {
        return (
          <button
            onClick={() => onCourseClick(courseMatch.id, courseMatch.title)}
            className="font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline cursor-pointer transition-colors inline"
            title={`Нажмите, чтобы зарегистрироваться на курс "${courseMatch.title}"`}
          >
            {children}
          </button>
        );
      }
      
      // Regular bold text
      return <strong {...props}>{children}</strong>;
    },
    // Override anchor elements to open in new tab and style prominently
    a: ({ href, children, ...props }) => {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-800/40 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 border border-blue-200 dark:border-blue-700/50 no-underline hover:no-underline"
          {...props}
        >
          {children}
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
        </a>
      );
    }
  }), [courseTitleMap, onCourseClick]);

  return (
    <div className={`flex w-full mb-4 sm:mb-6 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[90%] sm:max-w-[85%] md:max-w-[75%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center mt-1 ${
          isBot ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 mr-2 sm:mr-3' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 ml-2 sm:ml-3'
        }`}>
          {isBot ? <Bot size={16} className="sm:w-[18px] sm:h-[18px]" /> : <User size={16} className="sm:w-[18px] sm:h-[18px]" />}
        </div>

        {/* Bubble */}
        <div className={`relative px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
          message.isError
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-tl-none'
            : isBot 
              ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-none' 
              : 'bg-indigo-600 dark:bg-indigo-700 text-white rounded-tr-none'
        }`}>
          {isBot ? (
            <div className="markdown-content prose prose-sm dark:prose-invert max-w-none prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:font-semibold prose-p:my-1 prose-ul:my-2 prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-bold">
              <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
          
          {message.isStreaming && (
             <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-indigo-400 dark:bg-indigo-300 animate-pulse"></span>
          )}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';