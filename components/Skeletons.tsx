import React from 'react';

// Course Card Skeleton
export const CourseCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-pulse">
    <div className="flex items-start justify-between mb-2 gap-2">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
      </div>
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
    </div>
    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
    <div className="flex items-center gap-1.5 mb-3">
      <div className="w-3.5 h-3.5 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
    </div>
    <div className="flex items-center justify-between mt-auto gap-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-24" />
    </div>
  </div>
);

// Chat Skeleton
export const ChatSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-white dark:bg-gray-900">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg w-9 h-9" />
        <div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
      </div>
    </div>

    {/* Messages Area Skeleton */}
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-gray-50/50 dark:bg-gray-800/50">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Bot message skeleton */}
        <div className="flex w-full justify-start animate-pulse">
          <div className="flex max-w-[85%]">
            <div className="flex-shrink-0 h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full mr-3" />
            <div className="bg-gray-100 dark:bg-gray-700 px-5 py-3.5 rounded-2xl rounded-tl-none">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-64 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-56" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Input Area Skeleton */}
    <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3 bg-gray-100 dark:bg-gray-800 p-2 rounded-2xl">
          <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-xl w-11 h-11" />
        </div>
      </div>
    </div>
  </div>
);

// Dashboard Skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto animate-pulse">
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64" />
      </div>

      {/* Profile Section Skeleton */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
          <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg w-9 h-9" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        </div>
        
        <div className="max-w-sm mb-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
        </div>
        
        <div className="max-w-sm">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-3" />
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex-1" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-24" />
          </div>
        </div>
      </section>

      {/* Courses Section Skeleton */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg w-9 h-9" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-6" />
        </div>
        <div className="space-y-3">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      </section>
    </div>
  </div>
);

// Admin Dashboard Skeleton
export const AdminDashboardSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto animate-pulse">
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg w-10 h-10" />
          <div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-1" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-36" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24" />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-3" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Sidebar Course List Skeleton
export const SidebarCourseListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-2 sm:space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <CourseCardSkeleton key={i} />
    ))}
  </div>
);

// Message Bubble Skeleton
export const MessageBubbleSkeleton: React.FC<{ isBot?: boolean }> = ({ isBot = true }) => (
  <div className={`flex w-full mb-4 sm:mb-6 ${isBot ? 'justify-start' : 'justify-end'} animate-pulse`}>
    <div className={`flex max-w-[85%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full ${isBot ? 'mr-3' : 'ml-3'}`} />
      <div className={`px-5 py-3.5 rounded-2xl ${isBot ? 'bg-gray-100 dark:bg-gray-700 rounded-tl-none' : 'bg-indigo-200 dark:bg-indigo-800 rounded-tr-none'}`}>
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-36" />
      </div>
    </div>
  </div>
);

// Generic Loading Spinner
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };
  
  return (
    <div className={`animate-spin rounded-full border-b-2 border-indigo-600 dark:border-indigo-400 ${sizeClasses[size]}`} />
  );
};

// Full Page Loading
export const FullPageLoading: React.FC = () => (
  <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <LoadingSpinner size="lg" />
  </div>
);
