# Исправление: Проблема с Custom Domain для Worker

## Проблема

При попытке добавить `auth.ccplearn.pages.dev` как Custom Domain для Worker появляется ошибка:
> "Only domains active on your Cloudflare account can be added."

## Почему это происходит?

`*.pages.dev` домены - это автоматически генерируемые домены от Cloudflare Pages. Они **не являются управляемыми DNS зонами** в вашем Cloudflare аккаунте, поэтому их нельзя использовать как Custom Domain для Workers.

## Решения

### ✅ Решение 1: Использовать Workers Routes (Если есть кастомный домен)

Если у вас есть кастомный домен (например, `yourdomain.com`), который добавлен в Cloudflare:

1. В Cloudflare Dashboard, перейдите в ваш домен (не Worker)
2. Перейдите в **Workers Routes**
3. Нажмите **Add route**
4. Настройте:
   - **Route**: `auth.yourdomain.com/*`
   - **Worker**: выберите `supabase-auth-proxy`
5. Сохраните

Теперь Worker будет доступен по адресу `https://auth.yourdomain.com`

### ✅ Решение 2: Использовать Cloudflare Pages Functions (Проще!)

Вместо отдельного Worker, можно использовать **Cloudflare Pages Functions** прямо в вашем Pages проекте:

1. В вашем репозитории создайте папку `functions/auth/v1/`
2. Создайте файл `functions/auth/v1/callback.ts`:

```typescript
export async function onRequest(context: EventContext) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Получаем Supabase URL из переменных окружения
  const SUPABASE_URL = env.SUPABASE_URL || 'https://ugezbyszafkijwqifqlg.supabase.co';
  
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
          // Заменяем домен Supabase на наш
          const newLocation = `${url.origin}${locationUrl.pathname}${locationUrl.search}`;
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Location', newLocation);
          return new Response(null, {
            status: response.status,
            headers: newHeaders,
          });
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }
  }
  
  return response;
}
```

3. В Cloudflare Pages, добавьте переменные окружения:
   - `SUPABASE_URL`: `https://ugezbyszafkijwqifqlg.supabase.co`
   - `SITE_URL`: `https://ccplearn.pages.dev`

4. Теперь OAuth callback будет работать через `https://ccplearn.pages.dev/auth/v1/callback`

### ✅ Решение 3: Использовать Worker с workers.dev доменом

Можно использовать стандартный `*.workers.dev` домен Worker:

1. Worker уже создан и доступен по адресу: `supabase-auth-proxy.blackproff.workers.dev`
2. Используйте этот адрес в настройках OAuth:
   - Google Cloud Console: `https://supabase-auth-proxy.blackproff.workers.dev/auth/v1/callback`
   - Supabase: `https://supabase-auth-proxy.blackproff.workers.dev/**`

**Плюсы:**
- Работает сразу, без дополнительной настройки
- Бесплатно

**Минусы:**
- Google будет показывать `workers.dev` вместо вашего домена (но это лучше, чем `supabase.co`)

### ✅ Решение 4: Добавить кастомный домен в Cloudflare

Если у вас есть свой домен (например, `yourdomain.com`):

1. В Cloudflare Dashboard → **Add a Site**
2. Добавьте ваш домен
3. Настройте DNS записи
4. После этого можно использовать `auth.yourdomain.com` как Custom Domain для Worker

## Рекомендация

**Для быстрого решения:** Используйте **Решение 2 (Cloudflare Pages Functions)** - это самое простое и не требует отдельного Worker.

**Если нужен отдельный Worker:** Используйте **Решение 3** с `workers.dev` доменом - это работает сразу без дополнительной настройки.

## Обновление инструкций

После выбора решения, обновите настройки:

### Google OAuth:
- **Authorized redirect URIs**: 
  - `https://ccplearn.pages.dev/auth/v1/callback` (если используете Pages Functions)
  - или `https://supabase-auth-proxy.blackproff.workers.dev/auth/v1/callback` (если используете Worker)

### Supabase:
- **Site URL**: `https://ccplearn.pages.dev`
- **Redirect URLs**: 
  - `https://ccplearn.pages.dev/**` (если используете Pages Functions)
  - или `https://supabase-auth-proxy.blackproff.workers.dev/**` (если используете Worker)
