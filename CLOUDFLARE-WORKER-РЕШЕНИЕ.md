# Решение проблемы с Custom Domain

## Проблема

Нельзя добавить `auth.ccplearn.pages.dev` как Custom Domain, потому что `*.pages.dev` не является управляемой DNS зоной.

## ✅ Простое решение: Использовать workers.dev домен

Ваш Worker уже доступен по адресу:
```
https://supabase-auth-proxy.blackproff.workers.dev
```

### Настройка:

1. **Google Cloud Console:**
   - **Authorized redirect URIs**: 
     ```
     https://supabase-auth-proxy.blackproff.workers.dev/auth/v1/callback
     ```

2. **Supabase Dashboard:**
   - **Authentication** → **URL Configuration**
   - **Site URL**: `https://ccplearn.pages.dev`
   - **Redirect URLs**: 
     ```
     https://supabase-auth-proxy.blackproff.workers.dev/**
     https://ccplearn.pages.dev/**
     ```

3. **Готово!** Теперь Google будет показывать `workers.dev` вместо `supabase.co` (лучше, чем было!)

## 🎯 Лучшее решение: Cloudflare Pages Functions

Если хотите использовать ваш домен `ccplearn.pages.dev`, используйте **Pages Functions** вместо отдельного Worker.

### Шаг 1: Создайте функцию

В корне вашего проекта создайте структуру:
```
functions/
  auth/
    v1/
      callback.ts
```

### Шаг 2: Код функции (`functions/auth/v1/callback.ts`):

```typescript
export async function onRequest(context: EventContext) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const SUPABASE_URL = env.SUPABASE_URL || 'https://ugezbyszafkijwqifqlg.supabase.co';
  const SITE_URL = env.SITE_URL || url.origin;
  
  // Проксируем запрос на Supabase
  const supabaseUrl = `${SUPABASE_URL}${url.pathname}${url.search}`;
  
  const response = await fetch(supabaseUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'manual',
  });
  
  // Обрабатываем редиректы
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('Location');
    if (location) {
      try {
        const locationUrl = new URL(location);
        if (locationUrl.hostname.includes('supabase.co')) {
          const newLocation = `${SITE_URL}${locationUrl.pathname}${locationUrl.search}`;
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Location', newLocation);
          return new Response(null, {
            status: response.status,
            headers: newHeaders,
          });
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }
  }
  
  return response;
}
```

### Шаг 3: Добавьте переменные окружения в Cloudflare Pages

В Cloudflare Pages → ваш проект → **Settings** → **Environment Variables**:
- `SUPABASE_URL`: `https://ugezbyszafkijwqifqlg.supabase.co`
- `SITE_URL`: `https://ccplearn.pages.dev`

### Шаг 4: Настройте OAuth

1. **Google Cloud Console:**
   - **Authorized redirect URIs**: 
     ```
     https://ccplearn.pages.dev/auth/v1/callback
     ```

2. **Supabase:**
   - **Site URL**: `https://ccplearn.pages.dev`
   - **Redirect URLs**: 
     ```
     https://ccplearn.pages.dev/**
     ```

### Шаг 5: Деплой

Закоммитьте изменения и задеплойте. Теперь OAuth callback будет работать через ваш домен!

## Сравнение решений

| Решение | Домен в Google | Сложность | Рекомендация |
|---------|----------------|-----------|--------------|
| workers.dev | `workers.dev` | ⭐ Легко | ✅ Быстро работает |
| Pages Functions | `ccplearn.pages.dev` | ⭐⭐ Средне | ✅✅ Лучший вариант |
| Custom Domain | Ваш домен | ⭐⭐⭐ Сложно | Требует свой домен |

## Рекомендация

**Используйте Pages Functions** - это позволит Google показывать ваш домен `ccplearn.pages.dev` вместо `supabase.co`!
