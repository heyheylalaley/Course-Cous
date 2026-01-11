-- ============================================================================
-- FIX: Admin User Deletion
-- ============================================================================
-- This migration fixes the issue where admins cannot fully delete users
-- 
-- Changes:
-- 1. Adds RLS policy to allow admins to delete profiles
-- 2. Creates RPC function to delete users from auth.users
-- ============================================================================

-- ============================================================================
-- PART 1: Add RLS Policy for Admin Profile Deletion
-- ============================================================================

-- Add policy to allow admins to delete profiles
DROP POLICY IF EXISTS "Admins can delete all profiles" ON profiles;
CREATE POLICY "Admins can delete all profiles" ON profiles
  FOR DELETE USING (is_admin_user() = TRUE);

-- ============================================================================
-- PART 2: Create Function to Delete User from auth.users
-- ============================================================================

-- Function to delete user from auth.users (Admin only)
-- This function deletes a user completely including from auth.users
-- It should be called after deleting all related data
CREATE OR REPLACE FUNCTION delete_user_from_auth(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Prevent self-deletion
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Delete from auth.users (this will cascade to profiles and related tables)
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_from_auth(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify policy was created
SELECT 
  'Profile deletion policy created' as status,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND policyname = 'Admins can delete all profiles';

-- Verify function was created
SELECT 
  'User deletion function created' as status,
  routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'delete_user_from_auth';
