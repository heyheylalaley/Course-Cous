-- ============================================================================
-- SECURITY FIX: Function Search Path Mutable
-- ============================================================================
-- This migration fixes security warnings by adding SET search_path to all functions
-- This prevents search path manipulation attacks in PostgreSQL/Supabase
--
-- Run this in Supabase SQL Editor to fix the 5 "Function Search Path Mutable" warnings
-- ============================================================================

-- Fix 1: update_updated_at_column()
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 2: handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, english_level)
  VALUES (NEW.id, NEW.email, 'None');
  RETURN NEW;
END;
$$;

-- Fix 3: update_course_translations_updated_at()
CREATE OR REPLACE FUNCTION update_course_translations_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 4: get_course_queue_counts()
CREATE OR REPLACE FUNCTION get_course_queue_counts()
RETURNS TABLE(course_id TEXT, queue_length BIGINT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix 5: setup_demo_user()
CREATE OR REPLACE FUNCTION setup_demo_user(demo_email TEXT DEFAULT 'demo@example.com')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, check Security Advisor again.
-- The 5 "Function Search Path Mutable" warnings should be resolved.
--
-- NOTE: The "Leaked Password Protection Disabled" warning must be fixed
-- in Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Enable "Leaked Password Protection"
-- ============================================================================
