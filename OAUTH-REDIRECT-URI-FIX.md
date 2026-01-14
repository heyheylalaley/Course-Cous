# Исправление ошибки redirect_uri_mismatch

## Проблема

Ошибка `Ошибка 400: redirect_uri_mismatch` означает, что redirect URI, который отправляет приложение, не совпадает с теми, что настроены в Google Cloud Console.

## Причина

Supabase SDK автоматически генерирует OAuth URL с доменом Supabase (`https://ugezbyszafkijwqifqlg.supabase.co/auth/v1/callback`), но в Google Cloud Console может быть настроен другой redirect URI.

## ✅ Решение: Добавить оба redirect URI в Google Cloud Console

Вам нужно добавить **оба** redirect URI в Google Cloud Console:

1. **Перейдите в [Google Cloud Console](https://console.cloud.google.com/)**
2. **APIs & Services** → **Credentials** → ваш OAuth 2.0 Client ID
3. В **Authorized redirect URIs** добавьте **ОБА** URI:

```
https://ugezbyszafkijwqifqlg.supabase.co/auth/v1/callback
https://ccplearn.pages.dev/auth/v1/callback
```

**ВАЖНО:** 
- Первый URI (`supabase.co`) - это то, что Supabase SDK использует по умолчанию
- Второй URI (`ccplearn.pages.dev`) - это для Cloudflare Pages Function (если используете)

## Альтернативное решение: Использовать только Supabase URI

Если вы **НЕ используете** Cloudflare Pages Function, просто используйте стандартный Supabase redirect URI:

1. В Google Cloud Console, оставьте только:
   ```
   https://ugezbyszafkijwqifqlg.supabase.co/auth/v1/callback
   ```

2. Убедитесь, что в Supabase Dashboard правильно настроены Redirect URLs:
   - **Site URL**: `https://ccplearn.pages.dev`
   - **Redirect URLs**: `https://ccplearn.pages.dev/**`

## Проверка

После добавления redirect URI:

1. **Сохраните изменения** в Google Cloud Console
2. **Подождите 1-2 минуты** (Google может кешировать настройки)
3. **Очистите кеш браузера** или используйте режим инкогнито
4. Попробуйте авторизоваться снова

## Если используете Cloudflare Pages Function

Если вы настроили Cloudflare Pages Function (`functions/auth/v1/callback.ts`), то:

1. Убедитесь, что функция задеплоена (проверьте в Cloudflare Dashboard)
2. Добавьте **оба** redirect URI в Google Cloud Console:
   - `https://ugezbyszafkijwqifqlg.supabase.co/auth/v1/callback`
   - `https://ccplearn.pages.dev/auth/v1/callback`

3. В Supabase Dashboard → **Authentication** → **URL Configuration**:
   - **Site URL**: `https://ccplearn.pages.dev`
   - **Redirect URLs**: 
     ```
     https://ccplearn.pages.dev/**
     https://ugezbyszafkijwqifqlg.supabase.co/**
     ```

## Почему нужны оба URI?

- **Supabase URI** (`supabase.co`) - используется Supabase SDK при генерации OAuth URL
- **Pages Function URI** (`ccplearn.pages.dev`) - используется для проксирования через Cloudflare Pages Function (если настроено)

Если вы используете только стандартный Supabase OAuth (без Pages Function), достаточно только Supabase URI.

## Troubleshooting

### Ошибка все еще появляется
- Убедитесь, что URI добавлены **точно** как указано (с `https://`, без лишних слэшей в конце)
- Проверьте, что изменения сохранены в Google Cloud Console
- Подождите несколько минут и попробуйте снова
- Очистите кеш браузера

### Какой URI использовать?
- Если **НЕ используете** Cloudflare Pages Function → используйте только `https://ugezbyszafkijwqifqlg.supabase.co/auth/v1/callback`
- Если **используете** Cloudflare Pages Function → добавьте оба URI
