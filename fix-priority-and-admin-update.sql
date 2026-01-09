-- ============================================================================
-- FIX: Обновление приоритетов курсов и сохранение профилей администратором
-- ============================================================================
-- Этот файл исправляет две проблемы:
-- 1. Ошибка "column updated_at does not exist" при обновлении приоритетов
-- 2. Ошибка "no rows were updated" при сохранении профилей администратором
-- ============================================================================

-- ============================================================================
-- 1. Исправление функции update_registration_priorities
-- ============================================================================
-- Убираем обновление колонки updated_at, которой нет в таблице registrations

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
    SET priority = (item->>'priority')::INTEGER
    WHERE user_id = p_user_id
      AND course_id = item->>'course_id';
  END LOOP;
END;
$$;

-- ============================================================================
-- 2. Добавление RLS политики для обновления профилей администратором
-- ============================================================================
-- Позволяет администраторам обновлять профили любых пользователей

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (is_admin_user() = TRUE);

-- ============================================================================
-- ПРОВЕРКА: Убедитесь, что изменения применены
-- ============================================================================

-- Проверить, что функция обновлена
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_registration_priorities';

-- Проверить, что политика создана
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
  AND policyname = 'Admins can update all profiles';

-- ============================================================================
-- КОНЕЦ ФАЙЛА
-- ============================================================================
