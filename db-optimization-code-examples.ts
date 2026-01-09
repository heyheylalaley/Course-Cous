// ============================================================================
// ПРИМЕРЫ ОПТИМИЗИРОВАННОГО КОДА ДЛЯ services/db.ts
// ============================================================================
// Эти примеры показывают, как обновить методы в db.ts для использования
// новых SQL функций из database-optimization-functions.sql
// ============================================================================

// ============================================================================
// 1. ОПТИМИЗАЦИЯ: removeRegistration
// ============================================================================
// БЫЛО: N запросов UPDATE в цикле
// СТАЛО: 1 вызов SQL функции

// ЗАМЕНИТЬ в removeRegistration (после строки 562):
/*
  // СТАРЫЙ КОД (удалить):
  // Recalculate priorities for remaining registrations using batch update
  const remainingRegs = await db.getRegistrations();
  if (remainingRegs.length > 0) {
    // Update all priorities in parallel
    await Promise.all(
      remainingRegs.map((reg, index) =>
        supabase
          .from('registrations')
          .update({ priority: index + 1 })
          .eq('user_id', session.id)
          .eq('course_id', reg.courseId)
      )
    );
  }
*/

// НОВЫЙ КОД (вставить):
if (supabase) {
  // Recalculate priorities for remaining registrations using SQL function
  const remainingRegs = await db.getRegistrations();
  if (remainingRegs.length > 0) {
    // Prepare priorities JSON
    const priorities = remainingRegs.map((reg, index) => ({
      course_id: reg.courseId,
      priority: index + 1
    }));

    const { error } = await supabase.rpc('update_registration_priorities', {
      p_user_id: session.id,
      p_priorities: priorities
    });

    if (error) throw new Error(error.message);
  }
  return;
}

// ============================================================================
// 2. ОПТИМИЗАЦИЯ: updateRegistrationPriority
// ============================================================================
// БЫЛО: N запросов UPDATE в цикле
// СТАЛО: 1 вызов SQL функции

// ЗАМЕНИТЬ в updateRegistrationPriority (после строки 602):
/*
  // СТАРЫЙ КОД (удалить):
  // Update all priorities in database using batch update
  const updateResults = await Promise.all(
    regs.map((reg, index) =>
      supabase
        .from('registrations')
        .update({ priority: index + 1 })
        .eq('user_id', session.id)
        .eq('course_id', reg.courseId)
    )
  );
  
  // Check for any errors
  const failedUpdate = updateResults.find(r => r.error);
  if (failedUpdate?.error) throw new Error(failedUpdate.error.message);
*/

// НОВЫЙ КОД (вставить):
if (supabase) {
  // Update all priorities using SQL function
  const priorities = regs.map((reg, index) => ({
    course_id: reg.courseId,
    priority: index + 1
  }));

  const { error } = await supabase.rpc('update_registration_priorities', {
    p_user_id: session.id,
    p_priorities: priorities
  });

  if (error) throw new Error(error.message);
  return;
}

// ============================================================================
// 3. ОПТИМИЗАЦИЯ: getAdminStudentDetails
// ============================================================================
// БЫЛО: 2 отдельных запроса (registrations + profiles)
// СТАЛО: 1 вызов SQL функции с JOIN

// ЗАМЕНИТЬ весь блок getAdminStudentDetails (строки 1030-1093):
/*
  // СТАРЫЙ КОД (удалить весь блок):
  if (supabase) {
    // Get all registrations for this course with user profiles
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('user_id, registered_at, priority')
      .eq('course_id', courseId)
      .order('registered_at', { ascending: true });

    if (regError) throw new Error(regError.message);

    if (!registrations || registrations.length === 0) {
      return [];
    }

    // Get user IDs
    const userIds = registrations.map((r: any) => r.user_id);

    // Get profiles for these users
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw new Error(profileError.message);
    }

    // Log only in development mode
    if (import.meta.env.DEV) {
      console.log(`Fetched ${profiles?.length || 0} profiles`);
    }

    // Combine registration and profile data
    const details: AdminStudentDetail[] = (registrations || []).map((reg: any) => {
      const profile = (profiles || []).find((p: any) => p.id === reg.user_id);
      
      // Migrate old name format if needed
      let firstName = profile?.first_name;
      let lastName = profile?.last_name;
      if (!firstName && !lastName && profile?.name) {
        const nameParts = profile.name.trim().split(/\s+/);
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      return {
        userId: reg.user_id,
        email: profile?.email || '',
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        mobileNumber: profile?.mobile_number || undefined,
        address: profile?.address || undefined,
        eircode: profile?.eircode || undefined,
        dateOfBirth: profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : undefined,
        englishLevel: (profile?.english_level as EnglishLevel) || 'None',
        registeredAt: new Date(reg.registered_at),
        priority: reg.priority || 999
      };
    });

    return details.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }
*/

// НОВЫЙ КОД (вставить):
if (supabase) {
  // Get all student details for this course using SQL function with JOIN
  const { data, error } = await supabase.rpc('get_course_student_details', {
    p_course_id: courseId
  });

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    return [];
  }

  // Map to AdminStudentDetail format
  return data.map((row: any) => {
    // Migrate old name format if needed (shouldn't be needed with new schema, but keep for safety)
    let firstName = row.first_name;
    let lastName = row.last_name;

    return {
      userId: row.user_id,
      email: row.email || '',
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      mobileNumber: row.mobile_number || undefined,
      address: row.address || undefined,
      eircode: row.eircode || undefined,
      dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : undefined,
      englishLevel: (row.english_level as EnglishLevel) || 'None',
      registeredAt: new Date(row.registered_at),
      priority: row.priority || 999
    };
  });
}

// ============================================================================
// 4. ОПТИМИЗАЦИЯ: getAllUsersWithDetails
// ============================================================================
// БЫЛО: 3 отдельных запроса (profiles + registrations + completions)
// СТАЛО: 1 вызов SQL функции с JOIN

// ЗАМЕНИТЬ весь блок getAllUsersWithDetails (строки 942-1015):
/*
  // СТАРЫЙ КОД (удалить весь блок):
  if (supabase) {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw new Error(profilesError.message);

    // Get all registrations
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('user_id, course_id');

    if (regError) throw new Error(regError.message);

    // Get all completions
    const { data: completions, error: compError } = await supabase
      .from('course_completions')
      .select('user_id, course_id');

    // Build maps for quick lookup
    const registrationsMap = new Map<string, string[]>();
    (registrations || []).forEach((r: any) => {
      if (!registrationsMap.has(r.user_id)) {
        registrationsMap.set(r.user_id, []);
      }
      registrationsMap.get(r.user_id)!.push(r.course_id);
    });

    const completionsMap = new Map<string, string[]>();
    (completions || []).forEach((c: any) => {
      if (!completionsMap.has(c.user_id)) {
        completionsMap.set(c.user_id, []);
      }
      completionsMap.get(c.user_id)!.push(c.course_id);
    });

    return (profiles || []).map((p: any) => {
      // ... mapping code ...
    });
  }
*/

// НОВЫЙ КОД (вставить):
if (supabase) {
  // Get all users with details using SQL function with JOIN
  const { data, error } = await supabase.rpc('get_all_users_with_details');

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => {
    // Migrate old name format if needed
    let firstName = row.first_name;
    let lastName = row.last_name;

    return {
      userId: row.user_id,
      email: row.email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      mobileNumber: row.mobile_number || undefined,
      address: row.address || undefined,
      eircode: row.eircode || undefined,
      dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth).toISOString().split('T')[0] : undefined,
      englishLevel: (row.english_level as EnglishLevel) || 'None',
      isAdmin: row.is_admin || false,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      registeredCourses: row.registered_courses || [],
      completedCourses: row.completed_courses || [],
      isProfileComplete: row.is_profile_complete || false
    };
  });
}

// ============================================================================
// 5. ОПТИМИЗАЦИЯ: getCourseQueues
// ============================================================================
// БЫЛО: 2 запроса (get_course_queue_counts + courses)
// СТАЛО: 1 запрос (обновленная функция уже включает только активные курсы)

// УПРОСТИТЬ getCourseQueues (строки 637-724):
// Удалить второй запрос к courses, так как функция уже возвращает только активные курсы

// ЗАМЕНИТЬ блок после успешного вызова функции (строки 645-664):
/*
  // СТАРЫЙ КОД (удалить):
  // Get courses from database to build queue list
  const { data: coursesData } = await supabase
    .from('courses')
    .select('id')
    .eq('is_active', true);

  const courseIds = coursesData ? coursesData.map((c: any) => c.id) : [];
  const queues: CourseQueue[] = courseIds.map((courseId: string) => ({
    courseId,
    queueLength: queueCounts.get(courseId) || 0
  }));
*/

// НОВЫЙ КОД (вставить):
// Function already returns only active courses, so we can use the results directly
const queues: CourseQueue[] = (queueData || []).map((q: any) => ({
  courseId: q.course_id,
  queueLength: Number(q.queue_length) || 0
}));

// ============================================================================
// 6. ОПТИМИЗАЦИЯ: getCalendarEvents (опционально)
// ============================================================================
// БЫЛО: 2 запроса (events + profiles)
// СТАЛО: 1 вызов SQL функции с JOIN

// ЗАМЕНИТЬ весь блок getCalendarEvents (строки 2222-2302):
/*
  // СТАРЫЙ КОД можно заменить на:
*/

// НОВЫЙ КОД (опционально, если хотите использовать функцию):
if (supabase) {
  const { data, error } = await supabase.rpc('get_calendar_events_with_creators', {
    p_is_admin: isAdmin
  });

  if (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }

  return (data || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    description: e.description || undefined,
    icon: e.icon,
    eventDate: e.event_date,
    isPublic: e.is_public,
    createdBy: e.created_by || undefined,
    createdByName: e.created_by_name || undefined,
    createdByEmail: e.created_by_email || undefined,
    createdAt: e.created_at ? new Date(e.created_at) : undefined,
    updatedAt: e.updated_at ? new Date(e.updated_at) : undefined
  }));
}

// ============================================================================
// 7. ОПТИМИЗАЦИЯ: getAllCourses / getActiveCourses (опционально)
// ============================================================================
// Можно использовать функцию get_courses_with_translations для получения
// курсов с переводами за один запрос

// НОВЫЙ КОД (опционально):
if (supabase) {
  const { data, error } = await supabase.rpc('get_courses_with_translations', {
    p_language: language,
    p_include_inactive: includeInactive
  });

  if (error) throw new Error(error.message);

  return (data || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    description: c.description,
    difficulty: c.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
    nextCourseDate: c.next_course_date ? new Date(c.next_course_date).toISOString().split('T')[0] : undefined,
    minEnglishLevel: c.min_english_level as EnglishLevel | undefined,
    isActive: c.is_active,
    createdAt: c.created_at ? new Date(c.created_at) : undefined,
    updatedAt: c.updated_at ? new Date(c.updated_at) : undefined
  }));
}

// ============================================================================
// 8. ДОПОЛНИТЕЛЬНО: Добавить кеширование
// ============================================================================

// Создать файл utils/cache.ts:
/*
export const cacheManager = {
  cache: new Map<string, { data: any; expires: number }>(),
  TTL: 5 * 60 * 1000, // 5 минут

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  },

  set(key: string, data: any, ttl?: number) {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl || this.TTL)
    });
  },

  clear(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
};
*/

// Использовать в методах:
/*
  // В getActiveCourses:
  const cacheKey = `courses_${language}_${includeInactive}`;
  const cached = cacheManager.get(cacheKey);
  if (cached) return cached;

  // ... выполнить запрос ...

  cacheManager.set(cacheKey, courses);
  return courses;
*/

// ============================================================================
// КОНЕЦ ФАЙЛА
// ============================================================================
