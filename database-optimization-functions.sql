-- ============================================================================
-- DATABASE OPTIMIZATION FUNCTIONS
-- ============================================================================
-- Этот файл содержит SQL функции для оптимизации производительности БД
-- Применяйте эти функции после анализа производительности
--
-- ВАЖНО: Сделайте backup базы данных перед применением!
-- ============================================================================

-- ============================================================================
-- 1. Функция для batch update приоритетов регистраций
-- ============================================================================
-- Заменяет множественные UPDATE запросы одним вызовом функции
-- Использование: SELECT update_registration_priorities(user_id, '[
--   {"course_id": "c1", "priority": 1},
--   {"course_id": "c2", "priority": 2}
-- ]'::jsonb);

CREATE OR REPLACE FUNCTION update_registration_priorities(
  p_user_id UUID,
  p_priorities JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_priorities)
  LOOP
    UPDATE registrations
    SET priority = (item->>'priority')::INTEGER,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND course_id = item->>'course_id';
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION update_registration_priorities(UUID, JSONB) TO authenticated;

-- ============================================================================
-- 2. Функция для получения деталей студентов курса с JOIN
-- ============================================================================
-- Заменяет 2 отдельных запроса одним с JOIN
-- Использование: SELECT * FROM get_course_student_details('course_id');

-- Drop existing function first to allow changing return type
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
  iris_id TEXT
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
    p.iris_id
  FROM registrations r
  INNER JOIN profiles p ON r.user_id = p.id
  WHERE r.course_id = p_course_id
  ORDER BY r.priority ASC NULLS LAST, r.registered_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_student_details(TEXT) TO authenticated;

-- ============================================================================
-- 3. Функция для получения всех пользователей с деталями (JOIN)
-- ============================================================================
-- Заменяет 3 отдельных запроса одним с JOIN
-- Использование: SELECT * FROM get_all_users_with_details();

-- Drop existing function first to allow changing return type
DROP FUNCTION IF EXISTS get_all_users_with_details();

CREATE OR REPLACE FUNCTION get_all_users_with_details()
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
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  registered_courses TEXT[],
  completed_courses TEXT[],
  is_profile_complete BOOLEAN,
  ldc_ref TEXT,
  iris_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.email,
    p.first_name,
    p.last_name,
    p.mobile_number,
    p.address,
    p.eircode,
    p.date_of_birth,
    p.english_level,
    p.is_admin,
    p.created_at,
    COALESCE(
      array_agg(DISTINCT r.course_id) FILTER (WHERE r.course_id IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS registered_courses,
    COALESCE(
      array_agg(DISTINCT c.course_id) FILTER (WHERE c.course_id IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS completed_courses,
    CASE
      WHEN p.first_name IS NOT NULL AND p.first_name != ''
        AND p.last_name IS NOT NULL AND p.last_name != ''
        AND p.mobile_number IS NOT NULL AND p.mobile_number != ''
        AND p.address IS NOT NULL AND p.address != ''
        AND p.eircode IS NOT NULL AND p.eircode != ''
        AND p.date_of_birth IS NOT NULL
      THEN TRUE
      ELSE FALSE
    END AS is_profile_complete,
    p.ldc_ref,
    p.iris_id
  FROM profiles p
  LEFT JOIN registrations r ON p.id = r.user_id
  LEFT JOIN course_completions c ON p.id = c.user_id
  GROUP BY p.id, p.email, p.first_name, p.last_name, p.mobile_number, 
           p.address, p.eircode, p.date_of_birth, p.english_level, 
           p.is_admin, p.created_at, p.ldc_ref, p.iris_id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_users_with_details() TO authenticated;

-- ============================================================================
-- 4. Оптимизированная функция для получения очередей курсов
-- ============================================================================
-- Включает только активные курсы, убирая необходимость второго запроса
-- Использование: SELECT * FROM get_course_queue_counts();

DROP FUNCTION IF EXISTS get_course_queue_counts();

CREATE OR REPLACE FUNCTION get_course_queue_counts()
RETURNS TABLE(course_id TEXT, queue_length BIGINT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.course_id::TEXT,
    COUNT(*)::BIGINT as queue_length
  FROM registrations r
  INNER JOIN courses c ON r.course_id = c.id
  WHERE c.is_active = TRUE
  GROUP BY r.course_id
  ORDER BY r.course_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_course_queue_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_course_queue_counts() TO anon;

-- ============================================================================
-- 5. Функция для получения событий календаря с информацией о создателе
-- ============================================================================
-- Заменяет отдельный запрос для профилей создателей
-- Использование: SELECT * FROM get_calendar_events_with_creators(true);

CREATE OR REPLACE FUNCTION get_calendar_events_with_creators(p_is_admin BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  icon TEXT,
  event_date DATE,
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
    ce.is_public,
    ce.created_by,
    CASE
      WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL
        THEN p.first_name || ' ' || p.last_name
      WHEN p.first_name IS NOT NULL THEN p.first_name
      WHEN p.last_name IS NOT NULL THEN p.last_name
      ELSE NULL
    END AS created_by_name,
    p.email AS created_by_email,
    ce.created_at,
    ce.updated_at
  FROM calendar_events ce
  LEFT JOIN profiles p ON ce.created_by = p.id
  WHERE (p_is_admin = TRUE OR ce.is_public = TRUE)
  ORDER BY ce.event_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_calendar_events_with_creators(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_calendar_events_with_creators(BOOLEAN) TO anon;

-- ============================================================================
-- 6. Дополнительные индексы для оптимизации
-- ============================================================================

-- Индекс для поиска по email (если еще не создан)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Составной индекс для registrations (course_id, user_id)
CREATE INDEX IF NOT EXISTS idx_registrations_course_user ON registrations(course_id, user_id);

-- Составной индекс для course_completions (user_id, course_id)
CREATE INDEX IF NOT EXISTS idx_completions_user_course ON course_completions(user_id, course_id);

-- Индекс для chat_messages по timestamp (для сортировки)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_timestamp ON chat_messages(user_id, timestamp DESC);

-- ============================================================================
-- 7. Функция для получения курсов с переводами (опционально)
-- ============================================================================
-- Если нужно получать курсы с переводами за один запрос
-- Использование: SELECT * FROM get_courses_with_translations('en', false);

CREATE OR REPLACE FUNCTION get_courses_with_translations(
  p_language TEXT DEFAULT 'en',
  p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  category TEXT,
  description TEXT,
  difficulty TEXT,
  next_course_date DATE,
  min_english_level TEXT,
  is_active BOOLEAN,
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
    c.id,
    c.title, -- Всегда оригинальное название
    c.category,
    COALESCE(ct.description, c.description) AS description,
    c.difficulty,
    c.next_course_date,
    c.min_english_level,
    c.is_active,
    c.created_at,
    c.updated_at
  FROM courses c
  LEFT JOIN course_translations ct ON c.id = ct.course_id AND ct.language = p_language
  WHERE (p_include_inactive = TRUE OR c.is_active = TRUE)
  ORDER BY c.title ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_courses_with_translations(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_courses_with_translations(TEXT, BOOLEAN) TO anon;

-- ============================================================================
-- ПРОВЕРКА: Убедитесь, что все функции созданы успешно
-- ============================================================================

-- Проверить созданные функции
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_registration_priorities',
    'get_course_student_details',
    'get_all_users_with_details',
    'get_course_queue_counts',
    'get_calendar_events_with_creators',
    'get_courses_with_translations'
  )
ORDER BY routine_name;

-- ============================================================================
-- КОНЕЦ ФАЙЛА
-- ============================================================================
