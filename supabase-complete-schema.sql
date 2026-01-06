-- Course-Cous Complete Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the entire database
-- This file contains all migrations in the correct order

-- ============================================================================
-- PART 1: Main Schema
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  english_level TEXT DEFAULT 'None' CHECK (english_level IN ('None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  name TEXT, -- Deprecated - kept for backward compatibility
  first_name TEXT,
  last_name TEXT,
  mobile_number TEXT,
  address TEXT,
  eircode TEXT,
  date_of_birth DATE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrations table (user course registrations)
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 3),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Course queues table (global queue for each course)
CREATE TABLE IF NOT EXISTS course_queues (
  course_id TEXT PRIMARY KEY,
  queue_length INTEGER NOT NULL DEFAULT 0 CHECK (queue_length >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_course_id ON registrations(course_id);
CREATE INDEX IF NOT EXISTS idx_registrations_priority ON registrations(user_id, priority);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_queues_updated_at ON course_queues;
CREATE TRIGGER update_course_queues_updated_at BEFORE UPDATE ON course_queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_queues ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Registrations policies
DROP POLICY IF EXISTS "Users can read own registrations" ON registrations;
CREATE POLICY "Users can read own registrations" ON registrations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own registrations" ON registrations;
CREATE POLICY "Users can insert own registrations" ON registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own registrations" ON registrations;
CREATE POLICY "Users can update own registrations" ON registrations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own registrations" ON registrations;
CREATE POLICY "Users can delete own registrations" ON registrations
  FOR DELETE USING (auth.uid() = user_id);

-- Course queues policies
DROP POLICY IF EXISTS "Anyone can read course queues" ON course_queues;
CREATE POLICY "Anyone can read course queues" ON course_queues
  FOR SELECT USING (true);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, english_level)
  VALUES (NEW.id, NEW.email, 'None');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Initialize course queues with default values
INSERT INTO course_queues (course_id, queue_length) VALUES
  ('c1', 0), ('c2', 0), ('c3', 0), ('c4', 0), ('c5', 0),
  ('c6', 0), ('c7', 0), ('c8', 0), ('c9', 0), ('c10', 0), ('c11', 0)
ON CONFLICT (course_id) DO NOTHING;

-- ============================================================================
-- PART 2: Admin Functionality
-- ============================================================================

-- Function to check if current user is admin (avoids recursion in RLS)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = TRUE
  );
END;
$$;

-- Admin RLS policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all registrations" ON registrations;

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (is_admin_user() = TRUE);

CREATE POLICY "Admins can read all registrations" ON registrations
  FOR SELECT USING (is_admin_user() = TRUE);

-- ============================================================================
-- PART 3: Courses Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  link TEXT NOT NULL DEFAULT '#',
  min_english_level TEXT CHECK (min_english_level IN ('None', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_is_active ON courses(is_active);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active courses" ON courses;
CREATE POLICY "Anyone can read active courses" ON courses
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can read all courses" ON courses;
CREATE POLICY "Admins can read all courses" ON courses
  FOR SELECT USING (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can insert courses" ON courses;
CREATE POLICY "Admins can insert courses" ON courses
  FOR INSERT WITH CHECK (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can update courses" ON courses;
CREATE POLICY "Admins can update courses" ON courses
  FOR UPDATE USING (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can delete courses" ON courses;
CREATE POLICY "Admins can delete courses" ON courses
  FOR DELETE USING (is_admin_user() = TRUE);

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: Chat History and Translations
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'model')),
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(user_id, timestamp);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
CREATE POLICY "Users can view their own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own chat messages" ON chat_messages;
CREATE POLICY "Users can insert their own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chat messages" ON chat_messages;
CREATE POLICY "Users can delete their own chat messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS course_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'ua', 'ru', 'ar')),
  title TEXT,
  description TEXT NOT NULL,
  translated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, language)
);

CREATE INDEX IF NOT EXISTS idx_course_translations_course_id ON course_translations(course_id);
CREATE INDEX IF NOT EXISTS idx_course_translations_language ON course_translations(language);

CREATE OR REPLACE FUNCTION update_course_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_course_translations_updated_at ON course_translations;
CREATE TRIGGER update_course_translations_updated_at 
  BEFORE UPDATE ON course_translations
  FOR EACH ROW 
  EXECUTE FUNCTION update_course_translations_updated_at();

ALTER TABLE course_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view course translations" ON course_translations;
CREATE POLICY "Anyone can view course translations"
  ON course_translations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage course translations" ON course_translations;
CREATE POLICY "Admins can manage course translations"
  ON course_translations FOR ALL
  USING (is_admin_user() = TRUE);

-- ============================================================================
-- PART 5: Bot Instructions
-- ============================================================================

CREATE TABLE IF NOT EXISTS bot_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ua', 'ru', 'ar')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section, language)
);

CREATE INDEX IF NOT EXISTS idx_bot_instructions_section ON bot_instructions(section);
CREATE INDEX IF NOT EXISTS idx_bot_instructions_language ON bot_instructions(language);

ALTER TABLE bot_instructions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read bot instructions" ON bot_instructions;
CREATE POLICY "Anyone can read bot instructions" ON bot_instructions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert bot instructions" ON bot_instructions;
CREATE POLICY "Admins can insert bot instructions" ON bot_instructions
  FOR INSERT WITH CHECK (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can update bot instructions" ON bot_instructions;
CREATE POLICY "Admins can update bot instructions" ON bot_instructions
  FOR UPDATE USING (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can delete bot instructions" ON bot_instructions;
CREATE POLICY "Admins can delete bot instructions" ON bot_instructions
  FOR DELETE USING (is_admin_user() = TRUE);

DROP TRIGGER IF EXISTS update_bot_instructions_updated_at ON bot_instructions;
CREATE TRIGGER update_bot_instructions_updated_at BEFORE UPDATE ON bot_instructions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert empty default instructions - admin must configure them via admin panel
INSERT INTO bot_instructions (section, content, language) VALUES
  ('main', '', 'en'),
  ('contacts', '', 'en'),
  ('external_links', '', 'en')
ON CONFLICT (section, language) DO NOTHING;

-- ============================================================================
-- PART 6: Course Queues RLS Fix
-- ============================================================================

-- Note: These policies are already dropped above, but we drop them again here to be safe
DROP POLICY IF EXISTS "Anyone can read course queues" ON course_queues;
DROP POLICY IF EXISTS "Authenticated users can insert course queues" ON course_queues;
DROP POLICY IF EXISTS "Authenticated users can update course queues" ON course_queues;

CREATE POLICY "Anyone can read course queues" ON course_queues
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert course queues" ON course_queues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update course queues" ON course_queues
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- PART 7: Database Functions (Optional)
-- ============================================================================

-- Function to get course queue counts (bypasses RLS)
CREATE OR REPLACE FUNCTION get_course_queue_counts()
RETURNS TABLE(course_id TEXT, queue_length BIGINT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.course_id::TEXT,
    COUNT(*)::BIGINT as queue_length
  FROM registrations r
  GROUP BY r.course_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_queue_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_course_queue_counts() TO anon;

-- ============================================================================
-- COMPLETE!
-- ============================================================================

-- Verify all tables were created
SELECT 
  'Database setup complete!' as status,
  COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
