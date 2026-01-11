# Supabase Storage Setup for Word Templates

## Creating the Storage Bucket

To use the Word document template feature, you need to create a storage bucket in your Supabase project.

### Steps:

1. **Go to Supabase Dashboard**
   - Log in to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar

3. **Create a New Bucket**
   - Click "New bucket" or "Create bucket" button
   - Name: `word-templates` (must be exactly this name)
   - **Important**: Set the bucket as **Private** (not public)
   - Click "Create bucket"

4. **Configure Bucket Settings (Optional)**
   - File size limit: 5MB (recommended)
   - Allowed MIME types: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (optional, for additional security)

### Bucket Configuration:

- **Name**: `word-templates` (required - must match exactly)
- **Visibility**: Private (required)
- **File size limit**: 5MB (recommended)
- **MIME types**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (optional)

### Setting Up RLS Policies (REQUIRED)

**Important**: You MUST set up RLS policies after creating the bucket, otherwise you'll get "new row violates row-level security policy" error.

#### Quick Setup (Recommended):

1. Create the bucket first (see steps above)
2. Go to Supabase Dashboard → SQL Editor
3. Copy and run the SQL script from `setup-word-templates-storage.sql` file

#### Manual Setup:

1. Go to Storage → Policies
2. Select the `word-templates` bucket
3. Add policies for admin users to upload/download files

Or use SQL Editor with this script:

```sql
-- Allow authenticated admin users to upload files
CREATE POLICY "Admins can upload word templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'word-templates' AND
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- Allow authenticated admin users to read files
CREATE POLICY "Admins can read word templates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'word-templates' AND
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- Allow authenticated admin users to delete files
CREATE POLICY "Admins can delete word templates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'word-templates' AND
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
```

**Note**: If your `profiles` table uses a different field name for admin status (e.g., `isAdmin`, `admin`, or `role = 'admin'`), adjust the SQL queries accordingly.

### Free Tier Limitations

Supabase Free tier includes:
- **1 GB** of file storage
- **5 GB/month** of egress (data transfer out)

For Word templates:
- A typical template file is 10-500 KB
- 1 GB = ~2,000-100,000 templates (plenty for most use cases)
- Egress is only used when downloading templates (minimal usage)

### Troubleshooting

**Error: "Bucket not found"**
- Make sure the bucket is named exactly `word-templates`
- Check that the bucket exists in Supabase Dashboard → Storage

**Error: "new row violates row-level security policy"**
- **This is the most common error** - you need to set up RLS policies
- Run the SQL script from `setup-word-templates-storage.sql` in Supabase SQL Editor
- Make sure the bucket exists and is named exactly `word-templates`
- Verify that your user has `is_admin = true` in the `profiles` table

**Error: "Permission denied"**
- Verify the bucket is set to Private
- Check RLS policies - they must be set up (see "Setting Up RLS Policies" above)
- Ensure the user is authenticated as an admin
- Verify `is_admin = true` in your `profiles` table for your user

**Error: "File size too large"**
- Template files should be under 5MB
- Check file size before uploading
