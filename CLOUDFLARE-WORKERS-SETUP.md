# Настройка Cloudflare Workers для защиты API ключей

## 🎯 Цель

Переместить API ключи (Gemini, Google Translate) из клиентского кода в Cloudflare Workers, чтобы они никогда не попадали в браузер.

## ⚠️ Почему это важно

Даже если ключи хранятся как секреты в Cloudflare Pages (Variables and Secrets), они **все равно попадают в клиентский код**:

1. Vite встраивает все переменные `VITE_*` в бандл во время сборки
2. После сборки значения ключей находятся в JavaScript файлах
3. Любой пользователь может открыть DevTools → Sources и найти ключи

**Решение:** Использовать Cloudflare Workers, где ключи остаются на сервере.

---

## 📋 Пошаговая инструкция

### Шаг 1: Создать Worker для Gemini API

1. Перейдите в **Cloudflare Dashboard** → **Workers & Pages**
2. Нажмите **Create application** → **Create Worker**
3. Назовите worker: `gemini-proxy`
4. Выберите шаблон: **HTTP handler**

### Шаг 2: Написать код Worker

Замените содержимое на:

```javascript
export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // В production замените на ваш домен
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Обработка preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();
      const { message, systemInstruction, chatHistory } = body;

      // Валидация
      if (!message || typeof message !== 'string' || message.length > 10000) {
        return new Response(JSON.stringify({ error: 'Invalid message' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Подготовка запроса к Gemini API
      const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
      const apiKey = env.GEMINI_API_KEY; // Берется из секретов Worker

      const requestBody = {
        contents: chatHistory ? chatHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        })) : [],
        systemInstruction: systemInstruction ? {
          parts: [{ text: systemInstruction }]
        } : undefined
      };

      // Добавить текущее сообщение
      requestBody.contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      // Вызов Gemini API
      const response = await fetch(`${geminiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(JSON.stringify({ 
          error: 'Gemini API error',
          details: errorText 
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
}
```

### Шаг 3: Добавить секрет API ключа

1. В настройках Worker перейдите в **Settings** → **Variables**
2. В разделе **Environment Variables** нажмите **Add variable**
3. Заполните:
   - **Variable name:** `GEMINI_API_KEY`
   - **Value:** ваш Gemini API ключ
   - **Type:** **Secret** (важно выбрать Secret!)
4. Сохраните

### Шаг 4: Деплой Worker

1. Нажмите **Save and deploy**
2. Запомните URL Worker (например: `https://gemini-proxy.your-subdomain.workers.dev`)

### Шаг 5: Создать Worker для Google Translate (аналогично)

1. Создайте новый Worker: `translate-proxy`
2. Используйте код:

```javascript
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const { text, source, target } = await request.json();

      if (!text || typeof text !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid text' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const translateUrl = 'https://translation.googleapis.com/language/translate/v2';
      const apiKey = env.GOOGLE_TRANSLATE_API_KEY;

      const response = await fetch(`${translateUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: source || 'en',
          target: target || 'en',
          format: 'text'
        })
      });

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

3. Добавьте секрет `GOOGLE_TRANSLATE_API_KEY`

---

## 🔧 Обновление клиентского кода

### 1. Обновить `services/geminiService.ts`

```typescript
// УДАЛИТЬ эти строки:
// const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
// return new GoogleGenAI({ apiKey });

// ДОБАВИТЬ:
const GEMINI_WORKER_URL = import.meta.env.VITE_GEMINI_WORKER_URL || 
  'https://gemini-proxy.your-subdomain.workers.dev';

export const sendMessageToGemini = async function* (message: string, ...) {
  // Вызов через Worker
  const response = await fetch(GEMINI_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      systemInstruction: instructions, // если нужно
      chatHistory: [] // если нужно
    })
  });

  if (!response.ok) {
    throw new Error('Failed to get response from Gemini API');
  }

  const data = await response.json();
  // Обработка ответа...
};
```

### 2. Обновить `services/translateService.ts`

```typescript
// УДАЛИТЬ:
// const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;

// ДОБАВИТЬ:
const TRANSLATE_WORKER_URL = import.meta.env.VITE_TRANSLATE_WORKER_URL || 
  'https://translate-proxy.your-subdomain.workers.dev';

export const translateText = async (text: string, targetLanguage: Language, sourceLanguage: Language = 'en'): Promise<string> => {
  if (targetLanguage === sourceLanguage) {
    return text;
  }

  try {
    const response = await fetch(TRANSLATE_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        source: LANGUAGE_CODES[sourceLanguage],
        target: LANGUAGE_CODES[targetLanguage]
      })
    });

    if (!response.ok) {
      return text; // Fallback
    }

    const data = await response.json();
    return data.data?.translations?.[0]?.translatedText || text;
  } catch (error) {
    return text; // Fallback
  }
};
```

### 3. Добавить переменные в Cloudflare Pages

В **Cloudflare Pages** → **Settings** → **Environment variables**:

- `VITE_GEMINI_WORKER_URL` = `https://gemini-proxy.your-subdomain.workers.dev`
- `VITE_TRANSLATE_WORKER_URL` = `https://translate-proxy.your-subdomain.workers.dev`

**Важно:** Это НЕ секреты, это просто URL. Можно хранить как обычные переменные.

### 4. Удалить старые секреты (опционально)

После проверки, что все работает, можно удалить из Cloudflare Pages:
- `VITE_GEMINI_API_KEY` (больше не нужен)
- `VITE_GOOGLE_TRANSLATE_API_KEY` (больше не нужен)

---

## ✅ Проверка

1. Откройте DevTools → Network
2. Отправьте сообщение в чат
3. Проверьте, что запрос идет на Worker URL, а не напрямую к Gemini API
4. Откройте DevTools → Sources
5. Убедитесь, что в коде нет API ключей (должны быть только URL Workers)

---

## 🔒 Безопасность

- ✅ API ключи остаются только в Cloudflare Workers (секреты)
- ✅ Ключи никогда не попадают в клиентский код
- ✅ Можно настроить CORS для ограничения доменов
- ✅ Можно добавить rate limiting в Workers
- ✅ Можно добавить аутентификацию (проверка токена Supabase)

---

## 🚀 Дополнительные улучшения

### Добавить rate limiting в Worker

```javascript
// Простой rate limiting по IP
const rateLimiter = {
  requests: new Map(),
  check(ip, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const key = `${ip}-${Math.floor(now / windowMs)}`;
    const count = this.requests.get(key) || 0;
    
    if (count >= maxRequests) {
      return false;
    }
    
    this.requests.set(key, count + 1);
    return true;
  }
};

// В начале fetch:
const clientIP = request.headers.get('CF-Connecting-IP');
if (!rateLimiter.check(clientIP)) {
  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
    status: 429,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

### Добавить аутентификацию

```javascript
// Проверка токена Supabase
const authHeader = request.headers.get('Authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

const token = authHeader.replace('Bearer ', '');
// Проверить токен через Supabase API
```

---

## 📝 Итог

После настройки:
- ✅ API ключи защищены и не попадают в браузер
- ✅ Все запросы идут через Workers
- ✅ Можно контролировать доступ и rate limiting
- ✅ Более безопасная архитектура
