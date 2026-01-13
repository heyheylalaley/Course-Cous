import React, { memo, useMemo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { Message, Course } from '../types';
import { Bot, User, ExternalLink } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  courses?: Course[];
  onCourseClick?: (courseId: string, courseTitle: string) => void;
}

// Helper function to extract base course title (without level tags and language suffixes)
const getBaseCourseTitle = (title: string): string => {
  // Remove English level tags like [A2+], [B1+], [B2+], etc.
  let base = title.replace(/\s*\[[A-Z0-9]+\+?\]\s*/gi, '').trim();
  // Remove language suffixes like (Ukrainian), (Arabic), etc.
  base = base.replace(/\s*\([^)]+\)\s*$/gi, '').trim();
  return base;
};

// Helper function to extract language suffix from title
const getLanguageSuffix = (title: string): string | null => {
  const match = title.match(/\s*\(([^)]+)\)\s*$/i);
  return match ? match[1].toLowerCase() : null;
};

// Helper function to extract level tag from title
const getLevelTag = (title: string): string | null => {
  const match = title.match(/\s*\[([A-Z0-9]+\+?)\]\s*/i);
  return match ? match[1].toUpperCase() : null;
};

export const MessageBubble: React.FC<MessageBubbleProps> = memo(({ message, courses, onCourseClick }) => {
  const isBot = message.role === 'model';

  // Create comprehensive maps for course lookup
  const { courseTitleMap, coursesByBaseTitle } = useMemo(() => {
    const titleMap = new Map<string, { id: string; title: string; baseTitle: string; languageSuffix: string | null; levelTag: string | null }>();
    const baseTitleMap = new Map<string, Array<{ id: string; title: string; baseTitle: string; languageSuffix: string | null; levelTag: string | null }>>();
    
    if (courses) {
      courses.forEach(course => {
        const baseTitle = getBaseCourseTitle(course.title);
        const languageSuffix = getLanguageSuffix(course.title);
        const levelTag = getLevelTag(course.title);
        
        const courseInfo = {
          id: course.id,
          title: course.title,
          baseTitle,
          languageSuffix,
          levelTag
        };
        
        // Add exact title (original) - case sensitive and case insensitive
        titleMap.set(course.title.toLowerCase(), courseInfo);
        titleMap.set(course.title, courseInfo);
        
        // Group courses by base title for smart matching
        const baseKey = baseTitle.toLowerCase();
        if (!baseTitleMap.has(baseKey)) {
          baseTitleMap.set(baseKey, []);
        }
        baseTitleMap.get(baseKey)!.push(courseInfo);
      });
    }
    
    return { courseTitleMap: titleMap, coursesByBaseTitle: baseTitleMap };
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
      
      if (!text) {
        return <strong {...props}>{children}</strong>;
      }
      
      // Step 1: Try exact match first (case sensitive, then case insensitive)
      let courseMatch = courseTitleMap.get(text) || courseTitleMap.get(text.toLowerCase());
      
      // Step 2: If no exact match, try smart matching based on text content
      if (!courseMatch) {
        const textLanguageSuffix = getLanguageSuffix(text);
        const textLevelTag = getLevelTag(text);
        const textBaseTitle = getBaseCourseTitle(text);
        
        // Find all courses with matching base title
        const matchingCourses = coursesByBaseTitle.get(textBaseTitle.toLowerCase()) || [];
        
        if (matchingCourses.length > 0) {
          // If text has language suffix, prefer course with matching language suffix
          if (textLanguageSuffix) {
            const languageMatch = matchingCourses.find(c => 
              c.languageSuffix && c.languageSuffix.toLowerCase() === textLanguageSuffix
            );
            if (languageMatch) {
              courseMatch = languageMatch;
            }
          }
          
          // If text has level tag and no language match found, prefer course with matching level tag
          if (!courseMatch && textLevelTag) {
            const levelMatch = matchingCourses.find(c => 
              c.levelTag && c.levelTag.toUpperCase() === textLevelTag
            );
            if (levelMatch) {
              courseMatch = levelMatch;
            }
          }
          
          // If still no match, prefer course without language suffix (base course)
          if (!courseMatch) {
            const baseMatch = matchingCourses.find(c => !c.languageSuffix);
            if (baseMatch) {
              courseMatch = baseMatch;
            } else {
              // Fallback to first matching course
              courseMatch = matchingCourses[0];
            }
          }
        }
      }
      
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
    },
    // Custom list styling for beautiful bullet points
    ul: ({ children, ...props }) => {
      return (
        <ul className="list-none space-y-1.5 my-2 pl-0" {...props}>
          {children}
        </ul>
      );
    },
    li: ({ children, ...props }) => {
      return (
        <li className="flex items-start gap-2.5" {...props}>
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-1.5"></span>
          <span className="flex-1">{children}</span>
        </li>
      );
    }
  }), [courseTitleMap, coursesByBaseTitle, onCourseClick]);

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