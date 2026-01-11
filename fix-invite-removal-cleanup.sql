-- ============================================================================
-- FIX: Clean up user_selected_session_id when invite is removed
-- ============================================================================
-- When an invite is removed (is_invited = FALSE), we should also clear
-- the user_selected_session_id field since the session selection was
-- tied to the invite. This prevents users from keeping a session slot
-- after their invite has been removed.
-- ============================================================================

-- Update the set_user_invite function to clear user_selected_session_id when invite is removed
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
    invited_at = CASE WHEN p_is_invited THEN NOW() ELSE NULL END,
    -- Clear user_selected_session_id when invite is removed
    user_selected_session_id = CASE WHEN p_is_invited THEN user_selected_session_id ELSE NULL END
  WHERE user_id = p_user_id AND course_id = p_course_id;
END;
$$;

-- Grant execute permission (in case it's missing)
GRANT EXECUTE ON FUNCTION set_user_invite(UUID, TEXT, BOOLEAN) TO authenticated;

-- Verify the function was updated
SELECT 
  'Function updated successfully' as status,
  routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'set_user_invite';
