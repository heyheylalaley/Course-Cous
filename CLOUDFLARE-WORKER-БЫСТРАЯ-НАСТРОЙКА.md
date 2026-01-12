# Быстрая настройка: Google OAuth с вашим доменом (БЕСПЛАТНО)

## Суть решения

Используем Cloudflare Worker для проксирования OAuth через ваш домен. Google будет показывать ваш домен вместо `supabase.co`.

## ⚡ Быстрая настройка (5 минут)

### 1. Создайте Worker

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create Worker**
2. Название: `supabase-auth`
3. Скопируйте код из `cloudflare-worker-auth-proxy.js`
4. **Variables** → Добавьте:
   - `SUPABASE_URL`: `https://ugezbyszafkijwqifqlg.supabase.co`
   - `SITE_URL`: `https://ccplearn.pages.dev`
5. **Deploy**

### 2. Настройте домен

В Worker → **Triggers** → **Add Custom Domain**:
- `auth.ccplearn.pages.dev`

### 3. Настройте Google OAuth

[Google Cloud Console](https://console.cloud.google.com/) → ваш OAuth Client:
- **Authorized redirect URIs**: `https://auth.ccplearn.pages.dev/auth/v1/callback`

### 4. Настройте Supabase

Supabase Dashboard → **Authentication** → **URL Configuration**:
- **Site URL**: `https://ccplearn.pages.dev`
- **Redirect URLs**: 
  - `https://auth.ccplearn.pages.dev/**`
  - `https://ccplearn.pages.dev/**`

## ✅ Готово!

Теперь Google будет показывать `ccplearn.pages.dev` вместо `supabase.co`!

## Как проверить

1. Откройте сайт → "Sign in with Google"
2. В Google должно быть: "to continue to **ccplearn.pages.dev**" ✅

## Важно

⚠️ **Ограничение**: Supabase SDK генерирует OAuth URL с доменом Supabase. Но Google показывает домен из **Authorized redirect URI**, который мы настроили на ваш домен через Worker.

Это означает, что:
- В адресной строке может быть виден Supabase URL при переходе на Google
- Но в интерфейсе Google будет показан ваш домен из redirect URI ✅

## Подробная инструкция

См. `CLOUDFLARE-WORKER-ПРОСТАЯ-НАСТРОЙКА.md` для детальной настройки.
