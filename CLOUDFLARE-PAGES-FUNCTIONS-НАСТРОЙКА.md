# Настройка Cloudflare Pages Functions для OAuth (ПРОСТОЕ РЕШЕНИЕ)

## Проблема решена!

Вместо отдельного Worker с Custom Domain, используем **Cloudflare Pages Functions** - это работает прямо на вашем домене `ccplearn.pages.dev`!

## ✅ Что уже сделано

Создан файл `functions/auth/v1/callback.ts` - это Cloudflare Pages Function, который будет проксировать OAuth запросы.

## Шаг 1: Добавьте переменные окружения в Cloudflare Pages

1. В Cloudflare Dashboard → **Workers & Pages** → ваш проект `ccplearn`
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте переменные:
   - **Variable name**: `SUPABASE_URL`
     **Value**: `https://ugezbyszafkijwqifqlg.supabase.co`
   - **Variable name**: `SITE_URL`
     **Value**: `https://ccplearn.pages.dev`
4. **ВАЖНО**: Добавьте для всех окружений (Production, Preview)

## Шаг 2: Закоммитьте и задеплойте

1. Закоммитьте файл `functions/auth/v1/callback.ts` в репозиторий
2. Cloudflare Pages автоматически задеплоит функцию
3. После деплоя функция будет доступна по адресу: `https://ccplearn.pages.dev/auth/v1/callback`

## Шаг 3: Настройте Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials** → ваш OAuth 2.0 Client ID
3. В **Authorized redirect URIs** добавьте:
   ```
   https://ccplearn.pages.dev/auth/v1/callback
   ```
4. Сохраните изменения

## Шаг 4: Настройте Supabase

1. В Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL**: `https://ccplearn.pages.dev`
3. **Redirect URLs**, добавьте:
   ```
   https://ccplearn.pages.dev/**
   http://localhost:5173/**
   ```
4. Сохраните изменения

## ✅ Готово!

Теперь:
- ✅ OAuth callback работает через ваш домен `ccplearn.pages.dev`
- ✅ Google будет показывать ваш домен вместо `supabase.co`
- ✅ Не нужен отдельный Worker
- ✅ Не нужен Custom Domain

## Проверка

1. Откройте ваш сайт: `https://ccplearn.pages.dev`
2. Нажмите "Sign in with Google"
3. **Проверьте**: В интерфейсе Google должно быть "to continue to **ccplearn.pages.dev**" ✅

## Структура файлов

```
your-project/
├── functions/
│   └── auth/
│       └── v1/
│           └── callback.ts  ← Этот файл уже создан!
├── ...
```

## Troubleshooting

### Функция не работает
- Убедитесь, что файл находится в правильной папке: `functions/auth/v1/callback.ts`
- Проверьте, что переменные окружения добавлены в Cloudflare Pages
- Проверьте логи деплоя в Cloudflare Dashboard

### OAuth все еще показывает Supabase
- Убедитесь, что в Google Cloud Console добавлен правильный redirect URI
- Проверьте, что функция задеплоена (после коммита может потребоваться несколько минут)
- Очистите кеш браузера

### 404 ошибка
- Убедитесь, что файл называется точно `callback.ts` (не `callback.js`)
- Проверьте структуру папок: `functions/auth/v1/`
- Перезадеплойте проект

## Преимущества этого решения

✅ Работает на вашем домене `ccplearn.pages.dev`  
✅ Не требует отдельного Worker  
✅ Не требует Custom Domain  
✅ Проще в настройке  
✅ Бесплатно  

## Альтернатива: Использовать workers.dev домен

Если не хотите использовать Pages Functions, можно просто использовать Worker с `workers.dev` доменом:

1. Worker уже доступен: `https://supabase-auth-proxy.blackproff.workers.dev`
2. Настройте Google OAuth: `https://supabase-auth-proxy.blackproff.workers.dev/auth/v1/callback`
3. Настройте Supabase: `https://supabase-auth-proxy.blackproff.workers.dev/**`

Google будет показывать `workers.dev` вместо `supabase.co` (лучше, чем было!)
