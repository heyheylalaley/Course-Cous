-- Setup Storage Bucket and RLS Policies for Word Templates
-- Run this in Supabase SQL Editor after creating the bucket manually

-- First, create the bucket manually in Supabase Dashboard:
-- Storage → New bucket → Name: word-templates → Private → Create

-- Then run these policies:

-- Drop existing policies if they exist (optional, for clean setup)
DROP POLICY IF EXISTS "Admins can upload word templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read word templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete word templates" ON storage.objects;

-- Allow authenticated admin users to upload files to word-templates bucket
CREATE POLICY "Admins can upload word templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'word-templates' AND
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- Allow authenticated admin users to read files from word-templates bucket
CREATE POLICY "Admins can read word templates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'word-templates' AND
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- Allow authenticated admin users to delete files from word-templates bucket
CREATE POLICY "Admins can delete word templates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'word-templates' AND
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- Note: If your profiles table uses a different field name (e.g., isAdmin instead of is_admin),
-- replace "is_admin" in the queries above with the correct field name.
-- Common variations: is_admin, isAdmin, admin, role = 'admin'
