-- ============================================================================
-- ADD SESSION ADDRESS AND TIME MIGRATION
-- Add address and session_time fields to course_sessions table
-- ============================================================================

-- Add address column (TEXT, nullable)
ALTER TABLE course_sessions 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add session_time column (TEXT, nullable - e.g., "10:00", "14:30")
ALTER TABLE course_sessions 
ADD COLUMN IF NOT EXISTS session_time TEXT;

-- Add comments for documentation
COMMENT ON COLUMN course_sessions.address IS 'Address where the course session will take place';
COMMENT ON COLUMN course_sessions.session_time IS 'Time when the course session starts (format: HH:MM)';
