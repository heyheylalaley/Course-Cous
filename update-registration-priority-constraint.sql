-- ============================================================================
-- UPDATE REGISTRATION PRIORITY CONSTRAINT
-- ============================================================================
-- Этот файл обновляет ограничение CHECK на поле priority в таблице registrations
-- с максимального значения 3 до 100, чтобы поддерживать динамическое
-- максимальное количество регистраций, настраиваемое администратором
-- ============================================================================

-- ============================================================================
-- 1. Удаление старого ограничения CHECK
-- ============================================================================
-- PostgreSQL автоматически генерирует имя для ограничений CHECK в формате
-- {table}_{column}_check, поэтому имя должно быть registrations_priority_check

-- Сначала попробуем удалить ограничение, если оно существует с ожидаемым именем
ALTER TABLE registrations 
  DROP CONSTRAINT IF EXISTS registrations_priority_check;

-- Также удаляем ограничение, если оно было создано без явного имени
-- (PostgreSQL может сгенерировать другое имя)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Найти имя ограничения CHECK на колонке priority в таблице registrations
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'registrations'::regclass
    AND contype = 'c'
    AND conkey::text LIKE '%' || (
      SELECT attnum::text 
      FROM pg_attribute 
      WHERE attrelid = 'registrations'::regclass 
        AND attname = 'priority'
    ) || '%';
  
  -- Если нашли ограничение, удаляем его
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE registrations DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

-- ============================================================================
-- 2. Добавление нового ограничения CHECK с верхним пределом 100
-- ============================================================================
-- Новое ограничение позволяет значениям от 1 до 100, что соответствует
-- максимальному значению, разрешенному в интерфейсе администратора

ALTER TABLE registrations 
  ADD CONSTRAINT registrations_priority_check 
  CHECK (priority >= 1 AND priority <= 100);

-- ============================================================================
-- ПРОВЕРКА: Убедитесь, что изменения применены
-- ============================================================================

-- Проверить, что новое ограничение создано
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'registrations'::regclass
  AND conname = 'registrations_priority_check';

-- ============================================================================
-- КОНЕЦ ФАЙЛА
-- ============================================================================
