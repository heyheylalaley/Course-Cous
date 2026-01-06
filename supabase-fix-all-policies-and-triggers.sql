-- ============================================================================
-- Fix All Policies and Triggers - Safe Re-run Script
-- ============================================================================
-- This script safely drops and recreates all RLS policies and triggers
-- Run this BEFORE running supabase-complete-schema.sql if you get errors
-- about existing policies or triggers
-- ============================================================================

-- Drop all triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_course_queues_updated_at ON course_queues;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
DROP TRIGGER IF EXISTS update_course_translations_updated_at ON course_translations;
DROP TRIGGER IF EXISTS update_bot_instructions_updated_at ON bot_instructions;

-- Drop all policies for profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Drop all policies for registrations
DROP POLICY IF EXISTS "Users can read own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can insert own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can update own registrations" ON registrations;
DROP POLICY IF EXISTS "Users can delete own registrations" ON registrations;
DROP POLICY IF EXISTS "Admins can read all registrations" ON registrations;

-- Drop all policies for course_queues
DROP POLICY IF EXISTS "Anyone can read course queues" ON course_queues;
DROP POLICY IF EXISTS "Authenticated users can insert course queues" ON course_queues;
DROP POLICY IF EXISTS "Authenticated users can update course queues" ON course_queues;

-- Drop all policies for courses
DROP POLICY IF EXISTS "Anyone can read active courses" ON courses;
DROP POLICY IF EXISTS "Admins can read all courses" ON courses;
DROP POLICY IF EXISTS "Admins can insert courses" ON courses;
DROP POLICY IF EXISTS "Admins can update courses" ON courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON courses;

-- Drop all policies for chat_messages
DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON chat_messages;

-- Drop all policies for course_translations
DROP POLICY IF EXISTS "Anyone can view course translations" ON course_translations;
DROP POLICY IF EXISTS "Admins can manage course translations" ON course_translations;

-- Drop all policies for bot_instructions
DROP POLICY IF EXISTS "Anyone can read bot instructions" ON bot_instructions;
DROP POLICY IF EXISTS "Admins can insert bot instructions" ON bot_instructions;
DROP POLICY IF EXISTS "Admins can update bot instructions" ON bot_instructions;
DROP POLICY IF EXISTS "Admins can delete bot instructions" ON bot_instructions;

-- ============================================================================
-- Done! Now you can safely run supabase-complete-schema.sql
-- ============================================================================

SELECT 'All policies and triggers dropped. Now run supabase-complete-schema.sql' as status;
