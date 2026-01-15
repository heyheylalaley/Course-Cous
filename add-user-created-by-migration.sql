-- Migration: Add created_by field to profiles table
-- This allows tracking which admin created each user

-- Add created_by column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON profiles(created_by) WHERE created_by IS NOT NULL;

-- Update the get_all_users_with_details function to include creator information
DROP FUNCTION IF EXISTS get_all_users_with_details();

CREATE OR REPLACE FUNCTION get_all_users_with_details()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  mobile_number TEXT,
  address TEXT,
  eircode TEXT,
  date_of_birth DATE,
  english_level TEXT,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  registered_courses TEXT[],
  completed_courses TEXT[],
  is_profile_complete BOOLEAN,
  ldc_ref TEXT,
  iris_id TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_by_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.email,
    p.first_name,
    p.last_name,
    p.mobile_number,
    p.address,
    p.eircode,
    p.date_of_birth,
    p.english_level,
    p.is_admin,
    p.created_at,
    COALESCE(
      array_agg(DISTINCT r.course_id) FILTER (WHERE r.course_id IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS registered_courses,
    COALESCE(
      array_agg(DISTINCT c.course_id) FILTER (WHERE c.course_id IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS completed_courses,
    CASE
      WHEN p.first_name IS NOT NULL AND p.first_name != ''
        AND p.last_name IS NOT NULL AND p.last_name != ''
        AND p.mobile_number IS NOT NULL AND p.mobile_number != ''
        AND p.address IS NOT NULL AND p.address != ''
        AND p.eircode IS NOT NULL AND p.eircode != ''
        AND p.date_of_birth IS NOT NULL
      THEN TRUE
      ELSE FALSE
    END AS is_profile_complete,
    p.ldc_ref,
    p.iris_id,
    p.created_by,
    COALESCE(
      creator.first_name || ' ' || creator.last_name,
      creator.first_name,
      creator.last_name,
      NULL
    ) AS created_by_name,
    creator.email AS created_by_email
  FROM profiles p
  LEFT JOIN registrations r ON p.id = r.user_id
  LEFT JOIN course_completions c ON p.id = c.user_id
  LEFT JOIN profiles creator ON p.created_by = creator.id
  GROUP BY p.id, p.email, p.first_name, p.last_name, p.mobile_number, 
           p.address, p.eircode, p.date_of_birth, p.english_level, 
           p.is_admin, p.created_at, p.ldc_ref, p.iris_id, p.created_by,
           creator.first_name, creator.last_name, creator.email
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_users_with_details() TO authenticated;
