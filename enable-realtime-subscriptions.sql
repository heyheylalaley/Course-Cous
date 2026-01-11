-- ============================================================================
-- Enable Realtime Subscriptions for Tables
-- ============================================================================
-- This script enables realtime subscriptions for tables that need
-- real-time updates in the application UI
--
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- ALREADY ENABLED (currently used in code)
-- ============================================================================
-- courses - enabled in CoursesContext.tsx
-- registrations - enabled in CoursesContext.tsx and AdminStudentList.tsx

-- ============================================================================
-- RECOMMENDED: Enable for these tables
-- ============================================================================

-- 1. calendar_events
-- Used in: AdminCalendarEvents.tsx, CalendarModal.tsx
-- Reason: Events are managed by admins and viewed by users - real-time updates needed
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;

-- 2. profiles  
-- Used in: AdminAllUsers.tsx
-- Reason: Multiple admins may manage users simultaneously - real-time sync needed
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 3. course_sessions
-- Used in: AdminCourseSessionsModal.tsx, AdminStudentList.tsx
-- Reason: Session management needs real-time updates when admins modify sessions
ALTER PUBLICATION supabase_realtime ADD TABLE course_sessions;

-- 4. course_completions
-- Used in: AdminStudentList.tsx, Dashboard.tsx
-- Reason: When admin marks course as completed, user should see it immediately
ALTER PUBLICATION supabase_realtime ADD TABLE course_completions;

-- 5. course_categories
-- Used in: AdminCategoryManagement.tsx, CoursesContext.tsx
-- Reason: Category changes should reflect in courses list immediately
ALTER PUBLICATION supabase_realtime ADD TABLE course_categories;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check which tables are enabled for realtime
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Make sure RLS (Row Level Security) policies are correctly set up
--    for all these tables, as realtime respects RLS policies
--
-- 2. Tables that DON'T need realtime (not included):
--    - chat_messages: User-specific, doesn't need realtime
--    - course_translations: Rarely changed
--    - bot_instructions: Rarely changed, admin-only
--    - app_settings: Rarely changed
--
-- 3. If you need to disable realtime for a table later:
--    ALTER PUBLICATION supabase_realtime DROP TABLE table_name;
-- ============================================================================
