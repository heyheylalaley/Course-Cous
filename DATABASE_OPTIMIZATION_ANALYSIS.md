# Анализ производительности базы данных и рекомендации по оптимизации

## 📊 Анализ CSV данных о производительности запросов

### Ключевые метрики из CSV:

1. **realtime.list_changes** - 790,224 вызовов, 97.24% общего времени
   - Это нормально для realtime подписок Supabase
   - Не требует оптимизации

2. **SELECT name FROM pg_timezone_names** - 82 вызова, среднее время 309ms
   - Медленный запрос, но это системный запрос Supabase
   - Не критично для оптимизации

3. **chat_messages INSERT** - 888 вызовов, среднее время 2.67ms
   - ✅ Хорошая производительность

4. **get_course_queue_counts()** - 1,932 вызова, среднее время 1.16ms
   - ✅ Отличная производительность

---

## 🔍 Выявленные проблемы в коде

### 1. ❌ N+1 проблема: Множественные UPDATE запросы в циклах

**Проблемные места:**

#### `removeRegistration` (строки 562-575)
```typescript
// ПРОБЛЕМА: N запросов для N регистраций
await Promise.all(
  remainingRegs.map((reg, index) =>
    supabase
      .from('registrations')
      .update({ priority: index + 1 })
      .eq('user_id', session.id)
      .eq('course_id', reg.courseId)
  )
);
```

#### `updateRegistrationPriority` (строки 604-612)
```typescript
// ПРОБЛЕМА: N запросов для N регистраций
const updateResults = await Promise.all(
  regs.map((reg, index) =>
    supabase
      .from('registrations')
      .update({ priority: index + 1 })
      .eq('user_id', session.id)
      .eq('course_id', reg.courseId)
  )
);
```

**Решение:** Использовать SQL функцию для batch update или один запрос с CASE WHEN.

---

### 2. ❌ Отдельные запросы вместо JOIN

#### `getAdminStudentDetails` (строки 1032-1051)
```typescript
// ПРОБЛЕМА: 2 отдельных запроса вместо JOIN
const { data: registrations } = await supabase
  .from('registrations')
  .select('user_id, registered_at, priority')
  .eq('course_id', courseId);

const { data: profiles } = await supabase
  .from('profiles')
  .select('*')
  .in('id', userIds);
```

**Решение:** Использовать JOIN через Supabase или создать SQL функцию.

#### `getAllUsersWithDetails` (строки 944-961)
```typescript
// ПРОБЛЕМА: 3 отдельных запроса
const { data: profiles } = await supabase.from('profiles').select('*');
const { data: registrations } = await supabase.from('registrations').select('user_id, course_id');
const { data: completions } = await supabase.from('course_completions').select('user_id, course_id');
```

**Решение:** Создать SQL функцию с JOIN для получения всех данных за один запрос.

---

### 3. ❌ Отдельный запрос для переводов курсов

#### `getAllCourses` и `getActiveCourses` (строки 1142-1146, 1229-1233)
```typescript
// ПРОБЛЕМА: Отдельный запрос для переводов
const { data: translationsData } = await supabase
  .from('course_translations')
  .select('course_id, language, title, description')
  .in('course_id', courseIds)
  .eq('language', language);
```

**Решение:** Использовать JOIN или включить переводы в основной запрос через Supabase.

---

### 4. ❌ Отдельный запрос для профилей создателей событий

#### `getCalendarEvents` (строки 2253-2256)
```typescript
// ПРОБЛЕМА: Отдельный запрос для профилей
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, first_name, last_name, email')
  .in('id', creatorIds);
```

**Решение:** Использовать JOIN в SQL функции или включить через Supabase.

---

### 5. ❌ Два запроса в `getCourseQueues`

#### `getCourseQueues` (строки 641-656)
```typescript
// ПРОБЛЕМА: 2 запроса вместо одного
const { data: queueData } = await supabase.rpc('get_course_queue_counts');
const { data: coursesData } = await supabase
  .from('courses')
  .select('id')
  .eq('is_active', true);
```

**Решение:** Модифицировать SQL функцию `get_course_queue_counts` чтобы возвращать только активные курсы.

---

### 6. ⚠️ Отсутствие кеширования

- Часто запрашиваемые данные (курсы, категории, настройки) не кешируются
- Каждый раз выполняется запрос к БД

**Решение:** Добавить кеширование на уровне приложения (React Context, React Query, или простой Map).

---

### 7. ⚠️ Загрузка всех полей вместо нужных

#### `getAllProfiles` (строка 882)
```typescript
// ПРОБЛЕМА: Загружаются все поля, включая ненужные
.select('*')
```

**Решение:** Выбирать только нужные поля.

---

## ✅ Рекомендации по оптимизации

### Приоритет 1: Критические оптимизации

#### 1.1. Создать SQL функцию для batch update приоритетов

```sql
CREATE OR REPLACE FUNCTION update_registration_priorities(
  p_user_id UUID,
  p_priorities JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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
```

#### 1.2. Создать SQL функцию для `getAdminStudentDetails` с JOIN

```sql
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
  priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    r.priority
  FROM registrations r
  INNER JOIN profiles p ON r.user_id = p.id
  WHERE r.course_id = p_course_id
  ORDER BY r.priority ASC, r.registered_at ASC;
END;
$$;
```

#### 1.3. Создать SQL функцию для `getAllUsersWithDetails` с JOIN

```sql
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
  is_profile_complete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    END AS is_profile_complete
  FROM profiles p
  LEFT JOIN registrations r ON p.id = r.user_id
  LEFT JOIN course_completions c ON p.id = c.user_id
  GROUP BY p.id, p.email, p.first_name, p.last_name, p.mobile_number, 
           p.address, p.eircode, p.date_of_birth, p.english_level, 
           p.is_admin, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;
```

#### 1.4. Модифицировать `get_course_queue_counts` для включения только активных курсов

```sql
CREATE OR REPLACE FUNCTION get_course_queue_counts()
RETURNS TABLE(course_id TEXT, queue_length BIGINT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.course_id::TEXT,
    COUNT(*)::BIGINT as queue_length
  FROM registrations r
  INNER JOIN courses c ON r.course_id = c.id
  WHERE c.is_active = TRUE
  GROUP BY r.course_id;
END;
$$;
```

### Приоритет 2: Важные оптимизации

#### 2.1. Добавить кеширование для часто запрашиваемых данных

Создать простой кеш-менеджер:

```typescript
// utils/cache.ts
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

export const cacheManager = {
  get: (key: string) => {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      cache.delete(key);
      return null;
    }
    return item.data;
  },
  set: (key: string, data: any, ttl: number = CACHE_TTL) => {
    cache.set(key, { data, expires: Date.now() + ttl });
  },
  clear: (pattern?: string) => {
    if (!pattern) {
      cache.clear();
      return;
    }
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }
};
```

#### 2.2. Использовать SELECT только нужных полей

```typescript
// Вместо .select('*')
.select('id, email, first_name, last_name, mobile_number, address, eircode, date_of_birth, english_level, is_admin')
```

#### 2.3. Добавить индексы для часто используемых запросов

Проверить наличие индексов:
- `profiles.email` - для поиска по email
- `registrations(course_id, user_id)` - составной индекс
- `course_completions(user_id, course_id)` - составной индекс

---

## 📈 Ожидаемые улучшения

После внедрения оптимизаций:

1. **Уменьшение количества запросов:**
   - `removeRegistration`: с N запросов до 1 запроса
   - `updateRegistrationPriority`: с N запросов до 1 запроса
   - `getAdminStudentDetails`: с 2 запросов до 1 запроса
   - `getAllUsersWithDetails`: с 3 запросов до 1 запроса

2. **Улучшение производительности:**
   - Снижение времени ответа на 50-70% для админских запросов
   - Уменьшение нагрузки на БД на 40-60%
   - Улучшение UX за счет более быстрой загрузки данных

3. **Масштабируемость:**
   - Приложение сможет обрабатывать больше пользователей без деградации производительности

---

## 🚀 План внедрения

1. **Этап 1:** Создать SQL функции (1-2 часа)
2. **Этап 2:** Обновить код в `services/db.ts` для использования функций (2-3 часа)
3. **Этап 3:** Добавить кеширование (1-2 часа)
4. **Этап 4:** Тестирование и оптимизация SELECT запросов (1 час)
5. **Этап 5:** Мониторинг производительности после внедрения

**Общее время:** 5-8 часов работы

---

## 📝 Дополнительные рекомендации

1. **Мониторинг:** Настроить мониторинг медленных запросов в Supabase Dashboard
2. **Connection Pooling:** Убедиться, что используется connection pooling
3. **RLS оптимизация:** Проверить, что RLS политики не замедляют запросы
4. **Партиционирование:** Для больших таблиц (chat_messages) рассмотреть партиционирование по дате

---

## ⚠️ Важные замечания

- Все SQL функции должны использовать `SECURITY DEFINER` для обхода RLS
- Не забыть добавить `GRANT EXECUTE` для нужных ролей
- Протестировать все изменения на тестовой среде перед продакшеном
- Сделать backup базы данных перед применением изменений
