-- ============================================================================
-- FIX: Course Date Options Foreign Key Constraint
-- ============================================================================
-- This migration fixes the foreign key constraint violation when deleting users
-- that have created course_date_options records
-- 
-- Changes:
-- 1. Updates the foreign key constraint to use ON DELETE CASCADE
--    OR deletes records before user deletion (handled in application code)
-- ============================================================================

-- Check if course_date_options table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'course_date_options'
  ) THEN
    -- Drop the existing foreign key constraint if it exists
    ALTER TABLE course_date_options 
    DROP CONSTRAINT IF EXISTS course_date_options_created_by_fkey;

    -- Recreate the foreign key constraint with ON DELETE CASCADE
    -- This ensures that when a user is deleted, their course_date_options are also deleted
    ALTER TABLE course_date_options
    ADD CONSTRAINT course_date_options_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

    RAISE NOTICE 'Foreign key constraint updated for course_date_options.created_by';
  ELSE
    RAISE NOTICE 'Table course_date_options does not exist. Skipping migration.';
  END IF;
END $$;

-- Verify the constraint was created/updated
SELECT 
  'Migration complete!' as status,
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'course_date_options'
  AND constraint_name = 'course_date_options_created_by_fkey';
