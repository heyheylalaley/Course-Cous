/**
 * Cloudflare Pages Function для проксирования Supabase OAuth через ваш домен
 * 
 * Этот файл должен быть в папке: functions/auth/v1/callback.ts
 * 
 * После деплоя, OAuth callback будет работать через:
 * https://ccplearn.pages.dev/auth/v1/callback
 * 
 * Google будет показывать ваш домен вместо supabase.co!
 */

export async function onRequest(context: EventContext) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Получаем URL из переменных окружения
  const SUPABASE_URL = env.SUPABASE_URL || 'https://ugezbyszafkijwqifqlg.supabase.co';
  const SITE_URL = env.SITE_URL || url.origin;
  
  // Проксируем запрос на Supabase
  const supabaseUrl = `${SUPABASE_URL}${url.pathname}${url.search}`;
  
  // Копируем заголовки
  const headers = new Headers(request.headers);
  headers.set('Host', new URL(SUPABASE_URL).host);
  
  try {
    const response = await fetch(supabaseUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'manual', // Обрабатываем редиректы вручную
    });
    
    // Обрабатываем редиректы
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        try {
          const locationUrl = new URL(location);
          
          // Если редирект идет на Supabase, заменяем на наш домен
          if (locationUrl.hostname.includes('supabase.co')) {
            const newLocation = `${SITE_URL}${locationUrl.pathname}${locationUrl.search}`;
            const newHeaders = new Headers(response.headers);
            newHeaders.set('Location', newLocation);
            
            return new Response(null, {
              status: response.status,
              statusText: response.statusText,
              headers: newHeaders,
            });
          }
          
          // Если редирект идет на наш сайт, оставляем как есть
          if (locationUrl.hostname === new URL(SITE_URL).hostname) {
            return response;
          }
          
          // Для других доменов заменяем на наш сайт
          const newLocation = `${SITE_URL}${locationUrl.pathname}${locationUrl.search}`;
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Location', newLocation);
          
          return new Response(null, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        } catch (e) {
          // Если не удалось распарсить URL, возвращаем как есть
          console.error('Error parsing location URL:', e);
        }
      }
    }
    
    // Для всех остальных ответов возвращаем как есть
    return response;
  } catch (error: any) {
    return new Response(`Error: ${error.message}`, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
