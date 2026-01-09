-- Migration: Add event_time field to calendar_events table
-- Run this SQL in your Supabase SQL Editor

-- Add event_time column to calendar_events table
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS event_time TIME;

-- Update the get_calendar_events_with_creators function to include event_time
CREATE OR REPLACE FUNCTION get_calendar_events_with_creators(p_is_admin BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  icon TEXT,
  event_date DATE,
  event_time TIME,
  is_public BOOLEAN,
  created_by UUID,
  created_by_name TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.title,
    ce.description,
    ce.icon,
    ce.event_date,
    ce.event_time,
    ce.is_public,
    ce.created_by,
    COALESCE(p.first_name || ' ' || p.last_name, p.first_name, p.last_name, NULL) as created_by_name,
    p.email as created_by_email,
    ce.created_at,
    ce.updated_at
  FROM calendar_events ce
  LEFT JOIN profiles p ON ce.created_by = p.id
  WHERE (p_is_admin = TRUE OR ce.is_public = TRUE)
  ORDER BY ce.event_date ASC, ce.event_time ASC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_calendar_events_with_creators(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_calendar_events_with_creators(BOOLEAN) TO anon;

-- Verify the migration
SELECT 
  'Migration complete! event_time column added to calendar_events' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'calendar_events'
  AND column_name = 'event_time';
