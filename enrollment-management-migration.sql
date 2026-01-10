-- ============================================================================
-- ENROLLMENT MANAGEMENT MIGRATION
-- Course Sessions and User Invites
-- ============================================================================

-- ============================================================================
-- PART 1: Course Sessions Table
-- ============================================================================

-- Create course_sessions table for managing multiple date sessions per course
CREATE TABLE IF NOT EXISTS course_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 20 CHECK (max_capacity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, session_date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_sessions_course_id ON course_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_date ON course_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_course_sessions_status ON course_sessions(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_course_sessions_updated_at ON course_sessions;
CREATE TRIGGER update_course_sessions_updated_at BEFORE UPDATE ON course_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active sessions (for users to see available dates)
DROP POLICY IF EXISTS "Anyone can read active sessions" ON course_sessions;
CREATE POLICY "Anyone can read active sessions" ON course_sessions
  FOR SELECT USING (status = 'active');

-- Admins can read all sessions
DROP POLICY IF EXISTS "Admins can read all sessions" ON course_sessions;
CREATE POLICY "Admins can read all sessions" ON course_sessions
  FOR SELECT USING (is_admin_user() = TRUE);

-- Admins can insert sessions
DROP POLICY IF EXISTS "Admins can insert sessions" ON course_sessions;
CREATE POLICY "Admins can insert sessions" ON course_sessions
  FOR INSERT WITH CHECK (is_admin_user() = TRUE);

-- Admins can update sessions
DROP POLICY IF EXISTS "Admins can update sessions" ON course_sessions;
CREATE POLICY "Admins can update sessions" ON course_sessions
  FOR UPDATE USING (is_admin_user() = TRUE);

-- Admins can delete sessions
DROP POLICY IF EXISTS "Admins can delete sessions" ON course_sessions;
CREATE POLICY "Admins can delete sessions" ON course_sessions
  FOR DELETE USING (is_admin_user() = TRUE);

-- ============================================================================
-- PART 2: Extend Registrations Table
-- ============================================================================

-- Add invite-related fields to registrations
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS is_invited BOOLEAN DEFAULT FALSE;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS assigned_session_id UUID REFERENCES course_sessions(id) ON DELETE SET NULL;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS user_selected_session_id UUID REFERENCES course_sessions(id) ON DELETE SET NULL;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- Index for finding invited users
CREATE INDEX IF NOT EXISTS idx_registrations_invited ON registrations(is_invited) WHERE is_invited = TRUE;
CREATE INDEX IF NOT EXISTS idx_registrations_assigned_session ON registrations(assigned_session_id) WHERE assigned_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registrations_selected_session ON registrations(user_selected_session_id) WHERE user_selected_session_id IS NOT NULL;

-- ============================================================================
-- PART 3: Functions for Session Enrollment Management
-- ============================================================================

-- Function to get enrollment count for a session
-- Counts users who have either been assigned to this session or selected it
CREATE OR REPLACE FUNCTION get_session_enrollment_count(p_session_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enrollment_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO enrollment_count
  FROM registrations
  WHERE (assigned_session_id = p_session_id OR 
         (user_selected_session_id = p_session_id AND assigned_session_id IS NULL));
  
  RETURN COALESCE(enrollment_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_session_enrollment_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_enrollment_count(UUID) TO anon;

-- Function to get all sessions for a course with enrollment counts
CREATE OR REPLACE FUNCTION get_course_sessions_with_enrollment(p_course_id TEXT)
RETURNS TABLE (
  id UUID,
  course_id TEXT,
  session_date DATE,
  max_capacity INTEGER,
  status TEXT,
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
    get_session_enrollment_count(cs.id) as current_enrollment,
    cs.created_at,
    cs.updated_at
  FROM course_sessions cs
  WHERE cs.course_id = p_course_id
  ORDER BY cs.session_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_sessions_with_enrollment(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_course_sessions_with_enrollment(TEXT) TO anon;

-- Function to get available sessions for user selection (only active, not full)
CREATE OR REPLACE FUNCTION get_available_sessions_for_user(p_course_id TEXT)
RETURNS TABLE (
  id UUID,
  session_date DATE,
  max_capacity INTEGER,
  current_enrollment INTEGER,
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.session_date,
    cs.max_capacity,
    get_session_enrollment_count(cs.id) as current_enrollment,
    (get_session_enrollment_count(cs.id) < cs.max_capacity) as is_available
  FROM course_sessions cs
  WHERE cs.course_id = p_course_id
    AND cs.status = 'active'
    AND cs.session_date >= CURRENT_DATE
  ORDER BY cs.session_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_available_sessions_for_user(TEXT) TO authenticated;

-- Function to check if a session has available capacity
CREATE OR REPLACE FUNCTION check_session_capacity(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record RECORD;
  current_count INTEGER;
BEGIN
  SELECT * INTO session_record FROM course_sessions WHERE id = p_session_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  current_count := get_session_enrollment_count(p_session_id);
  
  RETURN current_count < session_record.max_capacity;
END;
$$;

GRANT EXECUTE ON FUNCTION check_session_capacity(UUID) TO authenticated;

-- ============================================================================
-- PART 4: Update get_course_student_details to include invite fields
-- ============================================================================

-- Drop and recreate the function to include new fields
DROP FUNCTION IF EXISTS get_course_student_details(TEXT);

CREATE OR REPLACE FUNCTION get_course_student_details(p_course_id TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  mobile_number TEXT,
  address TEXT,
  eircode TEXT,
  date_of_birth DATE,
  english_level TEXT,
  registered_at TIMESTAMPTZ,
  priority INTEGER,
  ldc_ref TEXT,
  iris_id TEXT,
  is_invited BOOLEAN,
  invited_at TIMESTAMPTZ,
  assigned_session_id UUID,
  assigned_session_date DATE,
  user_selected_session_id UUID,
  user_selected_session_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    p.email,
    p.first_name,
    p.last_name,
    p.mobile_number,
    p.address,
    p.eircode,
    p.date_of_birth,
    p.english_level,
    r.registered_at,
    r.priority,
    p.ldc_ref,
    p.iris_id,
    COALESCE(r.is_invited, FALSE) as is_invited,
    r.invited_at,
    r.assigned_session_id,
    cs_assigned.session_date as assigned_session_date,
    r.user_selected_session_id,
    cs_selected.session_date as user_selected_session_date
  FROM registrations r
  INNER JOIN profiles p ON r.user_id = p.id
  LEFT JOIN course_sessions cs_assigned ON r.assigned_session_id = cs_assigned.id
  LEFT JOIN course_sessions cs_selected ON r.user_selected_session_id = cs_selected.id
  WHERE r.course_id = p_course_id
  ORDER BY r.priority ASC NULLS LAST, r.registered_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_student_details(TEXT) TO authenticated;

-- ============================================================================
-- PART 5: Function to set user invite status
-- ============================================================================

CREATE OR REPLACE FUNCTION set_user_invite(
  p_user_id UUID,
  p_course_id TEXT,
  p_is_invited BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE registrations
  SET 
    is_invited = p_is_invited,
    invited_at = CASE WHEN p_is_invited THEN NOW() ELSE NULL END
  WHERE user_id = p_user_id AND course_id = p_course_id;
END;
$$;

GRANT EXECUTE ON FUNCTION set_user_invite(UUID, TEXT, BOOLEAN) TO authenticated;

-- ============================================================================
-- PART 6: Function to assign session by admin
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_user_session(
  p_user_id UUID,
  p_course_id TEXT,
  p_session_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If assigning a session, verify it belongs to the course
  IF p_session_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM course_sessions 
      WHERE id = p_session_id AND course_id = p_course_id
    ) THEN
      RAISE EXCEPTION 'Session does not belong to this course';
    END IF;
  END IF;

  UPDATE registrations
  SET assigned_session_id = p_session_id
  WHERE user_id = p_user_id AND course_id = p_course_id;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_user_session(UUID, TEXT, UUID) TO authenticated;

-- ============================================================================
-- PART 7: Function for user to select session
-- ============================================================================

CREATE OR REPLACE FUNCTION select_user_session(
  p_course_id TEXT,
  p_session_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_invited BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is invited for this course
  SELECT is_invited INTO v_is_invited
  FROM registrations
  WHERE user_id = v_user_id AND course_id = p_course_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not registered for this course';
  END IF;
  
  IF NOT COALESCE(v_is_invited, FALSE) THEN
    RAISE EXCEPTION 'Not invited to select a date for this course';
  END IF;

  -- If selecting a session, verify it's valid and has capacity
  IF p_session_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM course_sessions 
      WHERE id = p_session_id 
        AND course_id = p_course_id 
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Session is not available';
    END IF;
    
    IF NOT check_session_capacity(p_session_id) THEN
      RAISE EXCEPTION 'Session is full';
    END IF;
  END IF;

  UPDATE registrations
  SET user_selected_session_id = p_session_id
  WHERE user_id = v_user_id AND course_id = p_course_id;
END;
$$;

GRANT EXECUTE ON FUNCTION select_user_session(TEXT, UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table was created
SELECT 
  'course_sessions table created' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'course_sessions';

-- Verify registrations has new columns
SELECT 
  'registrations extended' as status,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'registrations'
  AND column_name IN ('is_invited', 'assigned_session_id', 'user_selected_session_id', 'invited_at');

-- Verify functions
SELECT 
  'Functions created' as status,
  routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_session_enrollment_count',
    'get_course_sessions_with_enrollment',
    'get_available_sessions_for_user',
    'check_session_capacity',
    'set_user_invite',
    'assign_user_session',
    'select_user_session'
  )
ORDER BY routine_name;
