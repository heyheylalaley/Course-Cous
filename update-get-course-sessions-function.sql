-- ============================================================================
-- UPDATE get_course_sessions_with_enrollment FUNCTION
-- Add address and session_time fields to the function return
-- ============================================================================

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_course_sessions_with_enrollment(TEXT);

-- Create the function with updated return type including address and session_time
CREATE FUNCTION get_course_sessions_with_enrollment(p_course_id TEXT)
RETURNS TABLE (
  id UUID,
  course_id TEXT,
  session_date DATE,
  max_capacity INTEGER,
  status TEXT,
  address TEXT,
  session_time TEXT,
  current_enrollment INTEGER,
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
    cs.id,
    cs.course_id,
    cs.session_date,
    cs.max_capacity,
    cs.status,
    cs.address,
    cs.session_time,
    get_session_enrollment_count(cs.id) as current_enrollment,
    cs.created_at,
    cs.updated_at
  FROM course_sessions cs
  WHERE cs.course_id = p_course_id
  ORDER BY cs.session_date ASC, cs.created_at ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_course_sessions_with_enrollment(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_course_sessions_with_enrollment(TEXT) TO anon;
