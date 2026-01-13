# Настройка Cloudflare Worker для OAuth с кастомным доменом (Бесплатно!)

Это решение позволяет Google OAuth показывать ваш кастомный домен вместо `supabase.co` **бесплатно** используя Cloudflare Workers.

## Как это работает

1. Cloudflare Worker проксирует OAuth запросы через ваш кастомный домен
2. Google видит ваш кастомный домен вместо Supabase
3. Worker перенаправляет запросы на Supabase прозрачно
4. Пользователи видят ваш домен в интерфейсе Google OAuth

## Требования

- ✅ Cloudflare аккаунт (бесплатный)
- ✅ Кастомный домен (или используйте `*.pages.dev` от Cloudflare Pages)
- ✅ Supabase проект (бесплатный план подходит)

## Пошаговая инструкция

### Шаг 1: Создайте Cloudflare Worker

1. Войдите в [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Перейдите в **Workers & Pages**
3. Нажмите **Create application** → **Create Worker**
4. Назовите Worker (например, `supabase-auth-proxy`)
5. Скопируйте код из файла `cloudflare-worker-auth-proxy.js` в редактор
6. Нажмите **Deploy**

### Шаг 2: Настройте переменные окружения

1. В Worker, перейдите на вкладку **Settings**
2. В разделе **Variables** добавьте:
   - **Variable name**: `SUPABASE_URL`
   - **Value**: Ваш Supabase URL (например, `https://ugezbyszafkijwqifqlg.supabase.co`)
3. Сохраните изменения

### Шаг 3: Настройте кастомный домен для Worker

#### Вариант A: Использование поддомена (Рекомендуется)

1. В Worker, перейдите на вкладку **Triggers**
2. Нажмите **Add Custom Domain**
3. Введите поддомен (например, `auth.yourdomain.com` или `auth.ccplearn.pages.dev`)
4. Следуйте инструкциям для настройки DNS (если используете внешний домен)

#### Вариант B: Использование маршрута (Routes)

1. В Cloudflare Dashboard, перейдите в ваш домен
2. Перейдите в **Workers Routes**
3. Добавьте маршрут: `auth.yourdomain.com/*` → выберите ваш Worker

### Шаг 4: Настройте Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. Перейдите в **APIs & Services** → **Credentials**
4. Найдите ваш OAuth 2.0 Client ID
5. В **Authorized redirect URIs** добавьте:
   - `https://auth.yourdomain.com/auth/v1/callback` (или ваш поддомен)
   - **ВАЖНО**: Удалите старый URI с `supabase.co` (или оставьте оба для тестирования)

### Шаг 5: Настройте Supabase

1. В Supabase Dashboard, перейдите в **Authentication** → **URL Configuration**
2. Установите **Site URL**: `https://yourdomain.com` (ваш основной домен)
3. В **Redirect URLs** добавьте:
   - `https://auth.yourdomain.com/**` (ваш поддомен для Worker)
   - `https://yourdomain.com/**` (основной домен)
   - `http://localhost:5173/**` (для разработки)

### Шаг 6: Обновите код приложения

Вам нужно обновить `signInWithGoogle` функцию, чтобы использовать ваш кастомный домен для OAuth:

```typescript
signInWithGoogle: async (): Promise<{ error: string | null }> => {
  if (!supabase) {
    return { error: 'Supabase is not configured' };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Используйте ваш кастомный домен через Worker
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        // Важно: указываем кастомный домен для OAuth callback
        skipBrowserRedirect: false,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Google sign-in failed' };
  }
},
```

**Однако**, Supabase SDK автоматически использует Supabase URL для OAuth. Чтобы использовать кастомный домен, нужно настроить Supabase Client с кастомным URL для auth:

```typescript
// В services/db.ts, обновите создание Supabase клиента:
export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Используйте кастомный домен для auth endpoints
        // Это требует настройки через переменные окружения
      }
    })
  : null;
```

**Альтернативный подход**: Используйте переменную окружения для кастомного auth URL:

```typescript
// В .env.local или переменных окружения Cloudflare Pages:
VITE_SUPABASE_AUTH_URL=https://auth.yourdomain.com

// В services/db.ts:
const SUPABASE_AUTH_URL = import.meta.env.VITE_SUPABASE_AUTH_URL || SUPABASE_URL;

export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Переопределяем auth URL через глобальный объект
        // Это требует дополнительной настройки
      },
      global: {
        // Используем кастомный fetch для проксирования auth запросов
        fetch: async (url, options) => {
          // Если это auth запрос, проксируем через Worker
          if (url.includes('/auth/v1/')) {
            const customUrl = url.replace(SUPABASE_URL, SUPABASE_AUTH_URL);
            return fetch(customUrl, options);
          }
          return fetch(url, options);
        }
      }
    })
  : null;
```

## Упрощенное решение (Рекомендуется)

Вместо изменения кода, можно просто настроить Worker так, чтобы он обрабатывал все запросы к `/auth/v1/callback` и перенаправлял их на Supabase, а затем обратно на ваш сайт.

### Обновленный Worker код:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const SUPABASE_URL = env.SUPABASE_URL;
    
    // Проксируем все запросы к /auth/v1/* на Supabase
    if (url.pathname.startsWith('/auth/v1/')) {
      const supabaseUrl = `${SUPABASE_URL}${url.pathname}${url.search}`;
      
      const response = await fetch(supabaseUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      
      // Если это редирект, заменяем домен на наш
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location && location.includes('supabase.co')) {
          const newLocation = location.replace(
            SUPABASE_URL,
            url.origin
          );
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Location', newLocation);
          return new Response(response.body, {
            status: response.status,
            headers: newHeaders,
          });
        }
      }
      
      return response;
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
```

## Проверка работы

1. Откройте ваш сайт
2. Нажмите "Sign in with Google"
3. В интерфейсе Google OAuth должно быть написано "to continue to **yourdomain.com**" вместо "supabase.co"
4. После авторизации вы должны быть перенаправлены на ваш сайт

## Важные замечания

⚠️ **Ограничения:**
- Google OAuth все равно будет показывать домен, на который настроен callback
- Если вы используете `*.pages.dev`, Google покажет этот домен (что лучше, чем `supabase.co`)
- Для полного контроля нужен кастомный домен

✅ **Преимущества:**
- Полностью бесплатно
- Работает на бесплатном плане Supabase
- Не требует изменений в коде приложения (если правильно настроить Worker)
- Google будет показывать ваш домен вместо Supabase

## Troubleshooting

### Worker не работает
- Проверьте, что Worker развернут и активен
- Убедитесь, что маршрут настроен правильно
- Проверьте переменные окружения

### OAuth все еще показывает Supabase
- Убедитесь, что в Google Cloud Console добавлен правильный redirect URI
- Проверьте, что Worker правильно проксирует запросы
- Очистите кеш браузера

### Редирект не работает
- Проверьте настройки Redirect URLs в Supabase
- Убедитесь, что Site URL установлен правильно
- Проверьте логи Worker в Cloudflare Dashboard

## Альтернатива: Использование Cloudflare Pages Functions

Если вы используете Cloudflare Pages, можно также использовать [Pages Functions](https://developers.cloudflare.com/pages/platform/functions/) для обработки OAuth callback. Это может быть проще, чем отдельный Worker.

## Заключение

Это решение позволяет бесплатно показывать ваш кастомный домен в Google OAuth интерфейсе. Хотя это требует некоторой настройки, результат стоит того - пользователи будут видеть ваш бренд вместо Supabase!
