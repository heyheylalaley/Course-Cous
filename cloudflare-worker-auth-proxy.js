/**
 * Cloudflare Worker для проксирования Supabase OAuth через кастомный домен
 * 
 * Этот Worker позволяет Google OAuth показывать ваш кастомный домен вместо supabase.co
 * 
 * Инструкция по развертыванию:
 * 1. Создайте новый Worker в Cloudflare Dashboard
 * 2. Скопируйте этот код в Worker
 * 3. Установите переменные окружения:
 *    - SUPABASE_URL: ваш Supabase URL (например, https://ugezbyszafkijwqifqlg.supabase.co)
 *    - SITE_URL: URL вашего сайта (например, https://ccplearn.pages.dev)
 * 4. Настройте маршрут: auth.yourdomain.com/* -> этот Worker
 * 5. Обновите настройки OAuth в Google Cloud Console и Supabase
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Получаем URL из переменных окружения
    const SUPABASE_URL = env.SUPABASE_URL || 'https://ugezbyszafkijwqifqlg.supabase.co';
    const SITE_URL = env.SITE_URL || url.origin;
    
    // Обрабатываем все запросы к /auth/v1/*
    if (url.pathname.startsWith('/auth/v1/')) {
      // Создаем новый URL для Supabase
      const supabaseUrl = `${SUPABASE_URL}${url.pathname}${url.search}`;
      
      // Копируем заголовки, но обновляем Host
      const headers = new Headers(request.headers);
      headers.set('Host', new URL(SUPABASE_URL).host);
      headers.delete('cf-connecting-ip'); // Cloudflare автоматически добавит правильный IP
      
      // Создаем новый запрос к Supabase
      const supabaseRequest = new Request(supabaseUrl, {
        method: request.method,
        headers: headers,
        body: request.body,
        redirect: 'manual', // Обрабатываем редиректы вручную
      });
      
      try {
        // Выполняем запрос к Supabase
        const response = await fetch(supabaseRequest);
        
        // Обрабатываем редиректы
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('Location');
          if (location) {
            try {
              const locationUrl = new URL(location);
              
              // Если редирект идет на Supabase, заменяем на наш домен
              if (locationUrl.hostname.includes('supabase.co')) {
                // Сохраняем путь и параметры, но используем наш домен
                const newLocation = `${url.origin}${locationUrl.pathname}${locationUrl.search}`;
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
      } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }
    
    // Для всех остальных запросов возвращаем 404
    return new Response('Not Found. This Worker only handles /auth/v1/* requests.', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
