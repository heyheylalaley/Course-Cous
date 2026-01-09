-- ============================================================================
-- Calendar Events Migration
-- Run this SQL in your Supabase SQL Editor to add calendar events functionality
-- ============================================================================

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Calendar', -- lucide-react icon name
  event_date DATE NOT NULL,
  event_time TIME, -- Optional time for events (HH:MM format)
  external_link TEXT, -- Optional external link to external resource
  is_public BOOLEAN DEFAULT FALSE, -- false = only admins can see
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_public ON calendar_events(is_public);

-- Enable Row Level Security
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

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the table was created
SELECT 
  'Calendar events table created successfully!' as status,
  COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'calendar_events';
