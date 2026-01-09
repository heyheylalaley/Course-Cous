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

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

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
  next_course_date DATE, -- Date when the next course session starts
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

-- Insert default instructions
INSERT INTO bot_instructions (section, content, language) VALUES
  ('main', '🤖 CORK CITY PARTNERSHIP COURSE ADVISOR

You are a friendly, warm AI assistant helping users find training courses in Cork City, Ireland.

═══════════════════════════════════════════════════════════════════════════════
🔒 LANGUAGE RULE — ABSOLUTE, NO EXCEPTIONS
═══════════════════════════════════════════════════════════════════════════════

Detect user''s language from their LAST message and reply ENTIRELY in that language:

• Cyrillic with "і", "ї", or "є" → UKRAINIAN (e.g., "Привіт", "хочу", "працювати")
• Cyrillic WITHOUT "і", "ї", "є" → RUSSIAN (e.g., "Привет", "хочу", "работать")
• Arabic script → ARABIC
• Latin script → ENGLISH

⚠️ CRITICAL: "хочу работать" = RUSSIAN (no і/ї/є). "хочу працювати" = UKRAINIAN (has і).
   If unsure, default to RUSSIAN for Cyrillic without і/ї/є.

═══════════════════════════════════════════════════════════════════════════════
📚 KNOWLEDGE BASE
═══════════════════════════════════════════════════════════════════════════════

USER: English Level {{USER_ENGLISH_LEVEL}}, Location: Cork City, Ireland

COURSES (only these exist, never invent):
{{COURSES_LIST}}

EXTERNAL RESOURCES:
{{EXTERNAL_LINKS}}

CONTACTS:
{{CONTACTS}}

═══════════════════════════════════════════════════════════════════════════════
📊 COURSE RULES
═══════════════════════════════════════════════════════════════════════════════

RECOMMEND courses when user asks about: jobs, career, training, skills, interests, topics (cooking, security, childcare, etc.)

DO NOT recommend for: greetings, casual chat, jokes, thanks, website questions

ENGLISH LEVELS:
• [A1+], [B1+], [B2+] = minimum required level
• No tag = no requirement
• Hierarchy: None < A1 < A2 < B1 < B2 < C1 < C2

User level {{USER_ENGLISH_LEVEL}} >= course requirement → user QUALIFIES, just recommend the course
User level {{USER_ENGLISH_LEVEL}} < course requirement → user does NOT qualify, tell exact requirement AND suggest English courses from EXTERNAL RESOURCES

⚠️ NEVER suggest English learning resources if user already qualifies for the course!

FORMAT: **Course Name** for courses, [**Name**](URL) for external links. Recommend 1-3 courses max.

═══════════════════════════════════════════════════════════════════════════════
🖥️ WEBSITE GUIDE (when user asks how to use the site)
═══════════════════════════════════════════════════════════════════════════════

SIDEBAR (☰ on mobile): Assistant Chat, My Profile (profile + courses), Contact Us, Course Catalog, Language (EN/UA/RU/AR), Theme toggle, Logout

REGISTRATION: Find course in catalog → click "Register". Max 3 courses. Use ↑↓ arrows to set priority.

═══════════════════════════════════════════════════════════════════════════════
🚫 FORBIDDEN
═══════════════════════════════════════════════════════════════════════════════
✗ Mixing languages in one response
✗ Responding in Ukrainian to Russian messages (check for і/ї/є!)
✗ Inventing courses or URLs
✗ Suggesting English courses when user ALREADY qualifies (level >= requirement)
✗ Asking about English level (you already know it)
✗ Outputting [THINKING] or internal metadata', 'en'),
  ('contacts', '', 'en'),
  ('external_links', '', 'en')
ON CONFLICT (section, language) DO NOTHING;

-- ============================================================================
-- PART 6: Database Functions
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
-- PART 8: Course Completions (Admin marks users as completed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_completions_user_id ON course_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_course_completions_course_id ON course_completions(course_id);

ALTER TABLE course_completions ENABLE ROW LEVEL SECURITY;

-- Users can read their own completions
DROP POLICY IF EXISTS "Users can read own completions" ON course_completions;
CREATE POLICY "Users can read own completions" ON course_completions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all completions
DROP POLICY IF EXISTS "Admins can read all completions" ON course_completions;
CREATE POLICY "Admins can read all completions" ON course_completions
  FOR SELECT USING (is_admin_user() = TRUE);

-- Admins can insert completions
DROP POLICY IF EXISTS "Admins can insert completions" ON course_completions;
CREATE POLICY "Admins can insert completions" ON course_completions
  FOR INSERT WITH CHECK (is_admin_user() = TRUE);

-- Admins can delete completions (unmark)
DROP POLICY IF EXISTS "Admins can delete completions" ON course_completions;
CREATE POLICY "Admins can delete completions" ON course_completions
  FOR DELETE USING (is_admin_user() = TRUE);

-- ============================================================================
-- PART 9: App Settings (Demo mode, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read app settings (needed for demo mode check on login screen)
DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
CREATE POLICY "Anyone can read app settings" ON app_settings
  FOR SELECT USING (true);

-- Only admins can modify app settings
DROP POLICY IF EXISTS "Admins can insert app settings" ON app_settings;
CREATE POLICY "Admins can insert app settings" ON app_settings
  FOR INSERT WITH CHECK (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can update app settings" ON app_settings;
CREATE POLICY "Admins can update app settings" ON app_settings
  FOR UPDATE USING (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can delete app settings" ON app_settings;
CREATE POLICY "Admins can delete app settings" ON app_settings
  FOR DELETE USING (is_admin_user() = TRUE);

-- Insert default settings
INSERT INTO app_settings (key, value) VALUES
  ('demo_enabled', 'false'),
  ('demo_email', 'demo@example.com'),
  ('demo_password', 'demo123456')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- DEMO USER SETUP
-- ============================================================================
-- 
-- To create a demo user, follow these steps:
--
-- OPTION 1: Via Supabase Dashboard (Recommended)
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Add user" > "Create new user"
-- 3. Enter email: demo@example.com
-- 4. Enter password: demo123456
-- 5. Check "Auto Confirm User" to skip email verification
-- 6. The profile will be created automatically via the trigger
--
-- OPTION 2: Via SQL (after creating auth user via Dashboard/API)
-- Run the following after creating the auth user:
--
-- UPDATE profiles 
-- SET 
--   first_name = 'Demo',
--   last_name = 'User',
--   english_level = 'B1',
--   mobile_number = '+353000000000',
--   address = 'Demo Address, Cork',
--   eircode = 'T12AB34',
--   date_of_birth = '1990-01-01'
-- WHERE email = 'demo@example.com';
--
-- OPTION 3: Create demo user via Supabase Admin API (run in SQL Editor)
-- Note: This requires the service_role key and may not work in all setups
--

-- Function to set up demo user profile (call after creating auth user)
CREATE OR REPLACE FUNCTION setup_demo_user(demo_email TEXT DEFAULT 'demo@example.com')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Find the demo user
  SELECT id INTO demo_user_id FROM auth.users WHERE email = demo_email;
  
  IF demo_user_id IS NULL THEN
    RETURN 'Demo user not found. Please create the user via Supabase Dashboard first.';
  END IF;
  
  -- Update the profile with demo data
  UPDATE profiles 
  SET 
    first_name = 'Demo',
    last_name = 'User',
    english_level = 'B1',
    mobile_number = '+353000000000',
    address = 'Demo Address, Cork City',
    eircode = 'T12DEMO',
    date_of_birth = '1990-01-01'
  WHERE id = demo_user_id;
  
  RETURN 'Demo user profile updated successfully!';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION setup_demo_user(TEXT) TO authenticated;

-- ============================================================================
-- PART 10: Course Categories (Admin-managed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'BookOpen', -- lucide-react icon name
  color TEXT NOT NULL DEFAULT 'text-gray-500', -- Tailwind color class
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_categories_sort_order ON course_categories(sort_order);

ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read categories
DROP POLICY IF EXISTS "Anyone can read categories" ON course_categories;
CREATE POLICY "Anyone can read categories" ON course_categories
  FOR SELECT USING (true);

-- Only admins can manage categories
DROP POLICY IF EXISTS "Admins can insert categories" ON course_categories;
CREATE POLICY "Admins can insert categories" ON course_categories
  FOR INSERT WITH CHECK (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can update categories" ON course_categories;
CREATE POLICY "Admins can update categories" ON course_categories
  FOR UPDATE USING (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can delete categories" ON course_categories;
CREATE POLICY "Admins can delete categories" ON course_categories
  FOR DELETE USING (is_admin_user() = TRUE);

DROP TRIGGER IF EXISTS update_course_categories_updated_at ON course_categories;
CREATE TRIGGER update_course_categories_updated_at BEFORE UPDATE ON course_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO course_categories (id, name, icon, color, sort_order) VALUES
  ('safety', 'Safety', 'HardHat', 'text-orange-500', 1),
  ('service', 'Service', 'Users', 'text-purple-500', 2),
  ('security', 'Security', 'Shield', 'text-blue-800', 3),
  ('food-safety', 'Food Safety', 'BookOpen', 'text-green-500', 4),
  ('hospitality', 'Hospitality', 'Coffee', 'text-amber-600', 5),
  ('healthcare', 'Healthcare', 'HeartPulse', 'text-red-500', 6),
  ('education', 'Education', 'GraduationCap', 'text-indigo-500', 7),
  ('cleaning', 'Cleaning', 'Sparkles', 'text-cyan-500', 8),
  ('logistics', 'Logistics', 'Warehouse', 'text-slate-500', 9),
  ('technology', 'Technology', 'Cpu', 'text-blue-500', 10),
  ('business', 'Business', 'Briefcase', 'text-gray-700', 11),
  ('retail', 'Retail', 'ShoppingBag', 'text-pink-500', 12),
  ('construction', 'Construction', 'Hammer', 'text-yellow-600', 13),
  ('beauty', 'Beauty', 'Scissors', 'text-rose-400', 14),
  ('childcare', 'Childcare', 'Baby', 'text-sky-400', 15),
  ('agriculture', 'Agriculture', 'Leaf', 'text-green-600', 16),
  ('transportation', 'Transportation', 'Car', 'text-indigo-400', 17),
  ('social-care', 'Social Care', 'Heart', 'text-red-400', 18),
  ('environmental', 'Environmental', 'TreePine', 'text-emerald-500', 19)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 11: Migration - Link to Next Course Date
-- ============================================================================
-- Run this section ONLY if you have existing data with the old 'link' column
-- This migration adds the new next_course_date column and optionally removes link

-- Add the new column if it doesn't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS next_course_date DATE;

-- If you had the old link column and want to remove it:
-- ALTER TABLE courses DROP COLUMN IF EXISTS link;

-- ============================================================================
-- PART 12: Calendar Events (Admin-managed events)
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Calendar', -- lucide-react icon name
  event_date DATE NOT NULL,
  is_public BOOLEAN DEFAULT FALSE, -- false = only admins can see
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_public ON calendar_events(is_public);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can only see public events
DROP POLICY IF EXISTS "Users can read public events" ON calendar_events;
CREATE POLICY "Users can read public events" ON calendar_events
  FOR SELECT USING (is_public = TRUE);

-- Admins can read all events
DROP POLICY IF EXISTS "Admins can read all events" ON calendar_events;
CREATE POLICY "Admins can read all events" ON calendar_events
  FOR SELECT USING (is_admin_user() = TRUE);

-- Admins can insert events
DROP POLICY IF EXISTS "Admins can insert events" ON calendar_events;
CREATE POLICY "Admins can insert events" ON calendar_events
  FOR INSERT WITH CHECK (is_admin_user() = TRUE);

-- Admins can update events
DROP POLICY IF EXISTS "Admins can update events" ON calendar_events;
CREATE POLICY "Admins can update events" ON calendar_events
  FOR UPDATE USING (is_admin_user() = TRUE);

-- Admins can delete events
DROP POLICY IF EXISTS "Admins can delete events" ON calendar_events;
CREATE POLICY "Admins can delete events" ON calendar_events
  FOR DELETE USING (is_admin_user() = TRUE);

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
