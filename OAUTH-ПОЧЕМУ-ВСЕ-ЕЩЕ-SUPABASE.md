# Почему Google все еще показывает Supabase домен?

## Важное понимание

**Google показывает домен из OAuth authorization request**, а не из redirect URI!

Supabase SDK автоматически генерирует OAuth URL с доменом Supabase:
```
https://ugezbyszafkijwqifqlg.supabase.co/auth/v1/authorize?...
```

Поэтому Google **всегда** будет показывать `supabase.co` в интерфейсе выбора аккаунта, даже если вы добавили оба redirect URI.

## Проблема с текущей настройкой

В Google Cloud Console у вас добавлен:
```
https://ccplearn.pages.dev/api/auth/v1/callback
```

Но Cloudflare Pages Function должна быть на:
```
https://ccplearn.pages.dev/auth/v1/callback
```

**Обратите внимание:** разница в `/api/` - его быть не должно!

## ✅ Решение 1: Исправить redirect URI в Google Cloud Console

1. Удалите неправильный URI: `https://ccplearn.pages.dev/api/auth/v1/callback`
2. Добавьте правильный URI: `https://ccplearn.pages.dev/auth/v1/callback` (без `/api/`)

## ⚠️ Но это не решит проблему полностью!

Даже с правильным redirect URI, Google все равно будет показывать Supabase домен, потому что:

1. Supabase SDK генерирует OAuth URL с доменом Supabase
2. Google видит этот домен в authorization request
3. Google показывает этот домен в интерфейсе

## ✅ Решение 2: Изменить OAuth запрос (Сложнее)

Чтобы Google показывал ваш домен, нужно, чтобы OAuth запрос использовал ваш домен. Это требует изменения кода:

### Вариант A: Использовать кастомный fetch для OAuth

Обновите `services/db.ts`:

```typescript
signInWithGoogle: async (): Promise<{ error: string | null }> => {
  if (!supabase) {
    return { error: 'Supabase is not configured' };
  }

  try {
    // Переопределяем fetch для проксирования OAuth запросов через наш домен
    const customFetch = async (url: string, options?: any) => {
      // Если это OAuth authorization запрос, проксируем через наш домен
      if (url.includes('/auth/v1/authorize')) {
        const customUrl = url.replace(
          'https://ugezbyszafkijwqifqlg.supabase.co',
          'https://ccplearn.pages.dev'
        );
        return fetch(customUrl, options);
      }
      return fetch(url, options);
    };

    // Временно переопределяем глобальный fetch
    const originalFetch = window.fetch;
    window.fetch = customFetch as any;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });

    // Восстанавливаем оригинальный fetch
    window.fetch = originalFetch;

    if (error) return { error: error.message };
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Google sign-in failed' };
  }
},
```

**Но это не сработает**, потому что Supabase SDK делает редирект на сервер, а не fetch запрос.

### Вариант B: Использовать прямой OAuth URL (Рекомендуется)

Создайте кастомную функцию OAuth, которая использует ваш домен:

```typescript
signInWithGoogle: async (): Promise<{ error: string | null }> => {
  if (!supabase) {
    return { error: 'Supabase is not configured' };
  }

  try {
    // Получаем OAuth URL от Supabase
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        skipBrowserRedirect: true, // Не делаем автоматический редирект
      }
    });

    if (oauthError) return { error: oauthError.message };
    
    // Заменяем домен Supabase на наш домен в OAuth URL
    if (data?.url) {
      const customUrl = data.url.replace(
        'https://ugezbyszafkijwqifqlg.supabase.co/auth/v1/authorize',
        'https://ccplearn.pages.dev/auth/v1/authorize'
      );
      
      // Делаем редирект на кастомный URL
      window.location.href = customUrl;
    }

    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Google sign-in failed' };
  }
},
```

**Но это тоже не сработает**, потому что `/auth/v1/authorize` должен обрабатываться Supabase, а не вашим сайтом.

## 🎯 Реальное решение: Принять ограничение

К сожалению, **на бесплатном плане Supabase невозможно заставить Google показывать ваш домен** вместо Supabase, потому что:

1. OAuth authorization endpoint (`/auth/v1/authorize`) должен быть на Supabase
2. Google показывает домен из authorization request
3. Supabase SDK всегда использует Supabase домен для authorization

## ✅ Что МОЖНО сделать:

1. **Исправить redirect URI** в Google Cloud Console (убрать `/api/`)
2. **Убедиться, что после авторизации пользователь редиректится на ваш сайт** (это уже работает)
3. **Принять, что Google будет показывать Supabase домен** (это стандартное поведение)

## Альтернатива: Платный план Supabase

Только с платным планом Supabase и кастомным доменом для Auth можно заставить Google показывать ваш домен.

## Проверка текущей настройки

1. ✅ Убедитесь, что redirect URI правильный: `https://ccplearn.pages.dev/auth/v1/callback` (без `/api/`)
2. ✅ Подождите 5-10 минут после изменения (Google кеширует настройки)
3. ✅ Очистите кеш браузера
4. ✅ Проверьте, что после авторизации пользователь попадает на ваш сайт (это важнее, чем то, что показывает Google)

## Вывод

К сожалению, **на бесплатном плане Supabase невозможно заставить Google показывать ваш домен** в интерфейсе выбора аккаунта. Это ограничение архитектуры OAuth и Supabase.

Но важно: **после авторизации пользователь все равно попадает на ваш сайт**, что является главным.
