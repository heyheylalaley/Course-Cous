# Инструкции по исправлению уязвимостей безопасности

## ✅ Исправление 1: XSS уязвимость в index.tsx (ВЫПОЛНЕНО)

**Файл:** `index.tsx`

**Изменения:**
- Заменен `innerHTML` на безопасное создание DOM элементов
- Используется `textContent` вместо интерполяции строк
- Предотвращена возможность выполнения вредоносного JavaScript

---

## 🔧 Исправление 2: Перемещение API ключей на backend

### ⚠️ Почему секреты в Cloudflare Pages не решают проблему

Хотя вы храните ключи как секреты в Cloudflare Pages (Variables and Secrets), это **не защищает их от доступа в браузере**:

1. **Vite встраивает `VITE_*` переменные в бандл** - во время сборки все переменные с префиксом `VITE_` заменяются на их значения
2. **Ключи становятся частью JavaScript файлов** - после сборки значения ключей находятся в минифицированном коде
3. **Доступны в браузере** - любой пользователь может открыть DevTools → Sources → найти ключи в коде
4. **Секреты защищают только Git** - они предотвращают попадание ключей в репозиторий, но не защищают от доступа в production бандле

**Решение:** Использовать backend proxy, где ключи остаются на сервере и никогда не попадают в клиентский код.

---

### Вариант A: Использование Cloudflare Workers (Рекомендуется для Cloudflare Pages)

#### Шаг 1: Создать Edge Function для Gemini API

1. Создайте файл `supabase/functions/gemini-proxy/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai@1.34.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  // Проверка метода
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Проверка API ключа
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { message, language } = await req.json();
    
    // Валидация входных данных
    if (!message || typeof message !== "string" || message.length > 10000) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Инициализация Gemini клиента
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    // Здесь добавьте логику инициализации чата и отправки сообщения
    // (адаптируйте из geminiService.ts)
    
    return new Response(JSON.stringify({ result: "Success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
```

#### Шаг 2: Установить секреты в Supabase

```bash
supabase secrets set GEMINI_API_KEY=your-actual-api-key-here
```

#### Шаг 3: Обновить `services/geminiService.ts`

```typescript
// Вместо прямого использования API ключа
export const sendMessageToGemini = async function* (message: string, ...) {
  // Вызов Edge Function вместо прямого API
  const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ message, language })
  });
  
  // Обработка ответа...
};
```

### Вариант A: Использование Cloudflare Workers (Рекомендуется для Cloudflare Pages)

#### Шаг 1: Создать Worker в Cloudflare Dashboard

1. Перейдите в **Cloudflare Dashboard** → **Workers & Pages** → **Create application**
2. Выберите **Create Worker**
3. Назовите worker (например, `gemini-proxy`)
4. Вставьте следующий код:

```javascript
export default {
  async fetch(request, env) {
    // CORS headers для разрешения запросов с вашего домена
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // Замените на ваш домен в production
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Обработка preflight запросов
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      const { message, language, chatHistory } = await request.json();
      
      // Валидация
      if (!message || typeof message !== 'string' || message.length > 10000) {
        return new Response(JSON.stringify({ error: 'Invalid message' }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Вызов Gemini API (ключ берется из env, который настроен в секретах)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: message }] }]
          })
        }
      );

      const data = await response.json();
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
}
```

#### Шаг 2: Добавить секрет в Worker

1. В настройках Worker перейдите в **Settings** → **Variables**
2. В разделе **Environment Variables** добавьте:
   - **Variable name:** `GEMINI_API_KEY`
   - **Value:** ваш Gemini API ключ
   - **Type:** Secret (важно!)

#### Шаг 3: Получить URL Worker

После создания Worker вы получите URL вида: `https://gemini-proxy.your-subdomain.workers.dev`

#### Шаг 4: Обновить клиентский код

Обновите `services/geminiService.ts`:

```typescript
// Удалить использование VITE_GEMINI_API_KEY
// const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // УДАЛИТЬ

// Добавить URL Worker (можно хранить в env или константе)
const GEMINI_WORKER_URL = import.meta.env.VITE_GEMINI_WORKER_URL || 
  'https://gemini-proxy.your-subdomain.workers.dev';

export const sendMessageToGemini = async function* (message: string, ...) {
  // Вызов через Worker вместо прямого API
  const response = await fetch(GEMINI_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, language })
  });

  if (!response.ok) {
    throw new Error('Failed to get response from Gemini API');
  }

  const data = await response.json();
  // Обработка ответа...
};
```

#### Шаг 5: Добавить Worker URL в Cloudflare Pages Secrets

В **Cloudflare Pages** → **Settings** → **Environment variables**:
- Добавьте `VITE_GEMINI_WORKER_URL` = `https://gemini-proxy.your-subdomain.workers.dev`
- Это НЕ секрет, это просто URL

#### Аналогично для Google Translate API

Создайте второй Worker `translate-proxy` с аналогичной логикой для Google Translate API.

---

## 🔧 Исправление 3: Улучшение обработки ошибок

### Шаг 1: Создать утилиту для безопасного логирования

Создайте файл `utils/errorHandler.ts`:

```typescript
/**
 * Безопасное логирование ошибок без раскрытия чувствительной информации
 */
export const safeLogError = (context: string, error: unknown) => {
  if (import.meta.env.DEV) {
    // В development режиме логируем полную информацию
    console.error(`[${context}]`, error);
  } else {
    // В production логируем только безопасную информацию
    const safeError = error instanceof Error 
      ? {
          name: error.name,
          message: sanitizeErrorMessage(error.message),
          stack: undefined // Не логируем stack в production
        }
      : { message: 'Unknown error' };
    
    console.error(`[${context}]`, safeError);
    
    // Отправить в сервис мониторинга (Sentry, LogRocket и т.д.)
    // reportErrorToMonitoring(context, safeError);
  }
};

/**
 * Удаляет чувствительную информацию из сообщений об ошибках
 */
const sanitizeErrorMessage = (message: string): string => {
  // Удаляем возможные API ключи
  let sanitized = message.replace(/[A-Za-z0-9]{32,}/g, '[REDACTED]');
  
  // Удаляем пути к файлам
  sanitized = sanitized.replace(/\/[^\s]+/g, '[PATH]');
  
  // Удаляем email адреса
  sanitized = sanitized.replace(/[^\s]+@[^\s]+/g, '[EMAIL]');
  
  return sanitized;
};

/**
 * Безопасное создание сообщения об ошибке для пользователя
 */
export const getUserFriendlyError = (error: unknown): string => {
  if (error instanceof Error) {
    // Не показываем технические детали пользователю
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Authentication required. Please log in again.';
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return 'Access denied.';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'Resource not found.';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'Too many requests. Please try again later.';
    }
    
    // Общее сообщение для неизвестных ошибок
    return 'An error occurred. Please try again later.';
  }
  
  return 'An unexpected error occurred.';
};
```

### Шаг 2: Обновить `services/geminiService.ts`

```typescript
import { safeLogError, getUserFriendlyError } from '../utils/errorHandler';

// Заменить все console.error на:
safeLogError('Gemini API', error);

// Заменить throw new Error на:
throw new Error(getUserFriendlyError(error));
```

### Шаг 3: Обновить другие сервисы

Применить тот же паттерн в:
- `services/db.ts`
- `services/translateService.ts`
- Все компоненты с обработкой ошибок

---

## 🔧 Исправление 4: Добавление валидации входных данных

### Шаг 1: Установить библиотеку валидации

```bash
npm install zod
```

### Шаг 2: Создать схемы валидации

Создайте файл `utils/validation.ts`:

```typescript
import { z } from 'zod';

// Валидация email
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email is too long');

// Валидация пароля
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Валидация имени
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Zа-яА-ЯёЁ\s'-]+$/, 'Name contains invalid characters');

// Валидация телефона
export const phoneSchema = z
  .string()
  .min(10, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .regex(/^[\d\s\-\+\(\)]+$/, 'Phone number contains invalid characters');

// Валидация адреса
export const addressSchema = z
  .string()
  .min(5, 'Address is too short')
  .max(500, 'Address is too long');

// Валидация сообщения чата
export const chatMessageSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(10000, 'Message is too long');

// Валидация профиля пользователя
export const profileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  mobileNumber: phoneSchema,
  address: addressSchema,
  eircode: z.string().min(1).max(20),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
});
```

### Шаг 3: Использовать в компонентах

Обновить `components/ProfileInfoModal.tsx`:

```typescript
import { profileSchema } from '../utils/validation';

const handleSave = async () => {
  try {
    // Валидация перед отправкой
    const validatedData = profileSchema.parse({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobileNumber: mobileNumber.trim(),
      address: address.trim(),
      eircode: eircode.trim(),
      dateOfBirth: dateOfBirth.trim()
    });
    
    await db.updateProfileInfo(validatedData);
    // ...
  } catch (error) {
    if (error instanceof z.ZodError) {
      setError(error.errors[0].message);
    } else {
      setError('Failed to save profile information.');
    }
  }
};
```

---

## 🔧 Исправление 5: Добавление rate limiting на клиенте

### Шаг 1: Создать утилиту rate limiting

Создайте файл `utils/rateLimiter.ts`:

```typescript
interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(key: string, options: RateLimitOptions): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Удаляем старые запросы
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < options.windowMs
    );
    
    // Проверяем лимит
    if (recentRequests.length >= options.maxRequests) {
      return false;
    }
    
    // Добавляем новый запрос
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    return true;
  }

  getTimeUntilNextRequest(key: string, options: RateLimitOptions): number {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(
      timestamp => now - timestamp < options.windowMs
    );
    
    if (recentRequests.length < options.maxRequests) {
      return 0;
    }
    
    const oldestRequest = Math.min(...recentRequests);
    return options.windowMs - (now - oldestRequest);
  }

  reset(key: string) {
    this.requests.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// Конфигурация для разных типов запросов
export const RATE_LIMITS = {
  chat: { maxRequests: 10, windowMs: 60000 }, // 10 запросов в минуту
  translate: { maxRequests: 20, windowMs: 60000 }, // 20 запросов в минуту
  api: { maxRequests: 30, windowMs: 60000 }, // 30 запросов в минуту
} as const;
```

### Шаг 2: Использовать в `components/ChatInterface.tsx`

```typescript
import { rateLimiter, RATE_LIMITS } from '../utils/rateLimiter';

const handleSendMessage = async (e?: React.FormEvent) => {
  e?.preventDefault();
  if (!inputText.trim() || isLoading) return;

  // Проверка rate limit
  const userId = userProfile?.id || 'anonymous';
  if (!rateLimiter.canMakeRequest(`chat-${userId}`, RATE_LIMITS.chat)) {
    const waitTime = rateLimiter.getTimeUntilNextRequest(
      `chat-${userId}`, 
      RATE_LIMITS.chat
    );
    setAlertModal({
      isOpen: true,
      message: `Too many requests. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
      type: 'error'
    });
    return;
  }

  // Продолжить отправку сообщения...
};
```

---

## 🔧 Исправление 6: Добавление Content Security Policy

### Шаг 1: Обновить `index.html`

Добавьте в `<head>`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://generativelanguage.googleapis.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://translation.googleapis.com;
  frame-src 'self' https://*.supabase.co;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

**Примечание:** `'unsafe-inline'` и `'unsafe-eval'` могут быть необходимы для некоторых зависимостей. Постарайтесь убрать их, используя nonce.

### Шаг 2: Использовать nonce (более безопасно)

```html
<script nonce="<%= nonce %>">
  // Ваш inline скрипт
</script>
```

И в CSP:
```
script-src 'self' 'nonce-<%= nonce %>' https://*.supabase.co;
```

---

## 📋 Чеклист исправлений

- [x] Исправлена XSS уязвимость в index.tsx
- [ ] Перемещен Gemini API ключ на backend
- [ ] Перемещен Google Translate API ключ на backend
- [ ] Добавлена безопасная обработка ошибок
- [ ] Добавлена валидация входных данных
- [ ] Добавлен rate limiting на клиенте
- [ ] Добавлены CSP заголовки
- [ ] Проверены RLS политики в Supabase
- [ ] Настроен мониторинг ошибок

---

## 🔒 Дополнительные рекомендации

1. **Регулярный аудит безопасности:**
   - Используйте инструменты типа Snyk, npm audit
   - Регулярно обновляйте зависимости
   - Проверяйте логи на подозрительную активность

2. **Мониторинг:**
   - Настройте Sentry или аналогичный сервис
   - Мониторьте использование API ключей
   - Настройте алерты на превышение лимитов

3. **Тестирование:**
   - Добавьте тесты безопасности
   - Проводите penetration testing
   - Используйте OWASP ZAP для сканирования

4. **Документация:**
   - Документируйте все API endpoints
   - Описывайте политики безопасности
   - Ведите changelog изменений безопасности
