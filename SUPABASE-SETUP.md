# Supabase Setup Guide

This guide will help you set up Supabase for the Course-Cous application.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Course-Cous (or any name you prefer)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 3: Run Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-complete-schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. You should see "Database setup complete!" with the number of tables created

**This single file contains all database setup including:**
- Base tables (profiles, registrations, course_queues)
- Admin functionality
- Courses table
- Chat history and translations
- Bot instructions
- All RLS policies
- Database functions

**Note:** This is safe to run multiple times - it uses `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS` to avoid conflicts.

## Step 3.5: Run the Database Functions (IMPORTANT!)

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-functions.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

**This step is required for the course queue counter to work correctly!**

## Step 3.6: Run Migration for New Profile Fields (REQUIRED!)

If you're updating an existing database or getting "Could not find column" errors, run this migration:

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-migration-add-profile-fields.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. You should see success messages for each column added

**This migration adds the following columns to the profiles table:**
- `first_name` - User's first name
- `last_name` - User's last name
- `mobile_number` - User's mobile phone number
- `address` - User's address
- `eircode` - User's Eircode (Irish postal code)
- `date_of_birth` - User's date of birth

**Note:** This migration is safe to run multiple times - it checks if columns exist before adding them.

## Step 3.7: Enable Admin Functionality (Optional)

To enable admin dashboard features:

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-migration-add-admin-field.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)
6. To make a user an admin, run this SQL (replace with actual email):
   ```sql
   UPDATE profiles SET is_admin = TRUE WHERE email = 'admin@example.com';
   ```

**Admin features include:**
- View total registrants per course
- Access detailed student lists for each course
- Export student data to CSV/Excel format

**IMPORTANT:** After enabling admin functionality, you MUST run the admin RLS policies migration:

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-migration-fix-admin-policies.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)

**This step is REQUIRED for admins to view student details!** 

**If you see "infinite recursion" errors**, you need to run `supabase-migration-fix-admin-policies.sql` which fixes the recursion issue by using a SECURITY DEFINER function.

**Note:** This migration creates admin RLS policies using a SECURITY DEFINER function to avoid infinite recursion issues.

## Step 3.8: Create Courses Table (REQUIRED for Course Management!)

To enable admin course management features:

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-migration-create-courses-table.sql`
4. Paste it into the SQL Editor
5. Click "Run" (or press Ctrl+Enter)

**This migration will:**
- Create the `courses` table for storing course information
- Add `min_english_level` field for English level requirements
- Migrate existing courses from constants to the database
- Set up RLS policies for course access

**After running this migration:**
- Admins can add, edit, delete, and manage courses
- Courses can have minimum English level requirements
- Bot will filter course recommendations based on user's English level

This will create:
- `profiles` table (user profiles with English level)
- `registrations` table (user course registrations)
- `course_queues` table (queue lengths for each course)
- Row Level Security (RLS) policies
- Triggers for automatic profile creation

## Step 4: Configure Environment Variables

### For Local Development

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### For GitHub Pages Deployment

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `GEMINI_API_KEY` - Your Gemini API key (if not already added)

The GitHub Actions workflow will automatically use these secrets during deployment.

## Step 5: Configure Authentication

### Option A: Email/Password Authentication (Recommended)

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure email settings:
   - **Enable email confirmations**: Optional (recommended for production)
   - **Site URL**: `https://yourusername.github.io/Course-Cous/`
   - **Redirect URLs**: Add your production URL

### Option B: Magic Link (Passwordless)

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. The app will automatically use magic links if no password is provided

## Step 6: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Try to sign up with a new email
3. Check your Supabase dashboard:
   - **Authentication** → **Users** - Should see your new user
   - **Table Editor** → **profiles** - Should see your profile
   - **Table Editor** → **registrations** - Should be empty initially

## Troubleshooting

### "Invalid API key" error
- Make sure you're using the **anon public** key, not the service_role key
- Check that your `.env.local` file is in the project root
- Restart your dev server after changing environment variables

### "Row Level Security policy violation"
- Make sure you ran the `supabase-schema.sql` file completely
- Check that RLS policies are enabled in Supabase dashboard
- Verify that you're authenticated (check browser console for session)

### "Could not find column 'address' (or other column) in schema cache"
- Run the migration script `supabase-migration-add-profile-fields.sql` in SQL Editor
- Refresh your Supabase dashboard
- Clear browser cache and reload the application
- The migration script checks if columns exist before adding them, so it's safe to run multiple times

### Users not appearing in profiles table
- Check that the trigger `on_auth_user_created` exists
- Manually create a profile if needed:
  ```sql
  INSERT INTO profiles (id, email, english_level)
  VALUES ('user-uuid', 'user@example.com', 'None');
  ```

### Session not persisting
- Check browser console for errors
- Make sure cookies/localStorage are enabled
- Verify Supabase client configuration in `services/db.ts`

## Security Notes

- The `anon` key is safe to use in client-side code (it's public)
- Never commit your `.env.local` file to git
- RLS policies ensure users can only access their own data
- The service_role key should NEVER be used in client-side code

## Next Steps

Once Supabase is set up:
1. Test user registration and login
2. Test course registration
3. Test priority management
4. Monitor your Supabase dashboard for data

For production, consider:
- Setting up email templates in Supabase
- Configuring custom domains
- Setting up database backups
- Monitoring usage and performance

