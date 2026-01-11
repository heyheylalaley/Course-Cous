-- Add RLS policy to allow admins to insert registrations for any user
-- This allows admins to add users to courses through the admin panel

DROP POLICY IF EXISTS "Admins can insert registrations" ON registrations;
CREATE POLICY "Admins can insert registrations" ON registrations
  FOR INSERT WITH CHECK (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can update registrations" ON registrations;
CREATE POLICY "Admins can update registrations" ON registrations
  FOR UPDATE USING (is_admin_user() = TRUE);

DROP POLICY IF EXISTS "Admins can delete registrations" ON registrations;
CREATE POLICY "Admins can delete registrations" ON registrations
  FOR DELETE USING (is_admin_user() = TRUE);
