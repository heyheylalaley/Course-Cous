-- Migration: Add LDC Ref and IRIS ID fields to profiles table (admin only fields)
-- Run this SQL in your Supabase SQL Editor

-- Add ldc_ref column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'ldc_ref'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ldc_ref TEXT;
    RAISE NOTICE 'Column ldc_ref added to profiles table';
  ELSE
    RAISE NOTICE 'Column ldc_ref already exists in profiles table';
  END IF;
END $$;

-- Add iris_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'iris_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN iris_id TEXT;
    RAISE NOTICE 'Column iris_id added to profiles table';
  ELSE
    RAISE NOTICE 'Column iris_id already exists in profiles table';
  END IF;
END $$;

-- Update the complete schema file reference
-- These fields are admin-only and should not be visible to regular users
