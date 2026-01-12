import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    // Use '/' for Cloudflare/Vercel/Netlify, '/Course-Cous/' for GitHub Pages
    const base = env.VITE_BASE_URL || (env.CF_PAGES ? '/' : '/Course-Cous/');
    return {
      base,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY)
        // VITE_ prefixed variables are automatically available via import.meta.env
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        include: ['xlsx']
      },
      build: {
        commonjsOptions: {
          include: [/xlsx/, /node_modules/]
        },
        // Отключаем source maps в production для безопасности
        // ВАЖНО: source maps позволяют восстановить исходный код, поэтому они отключены
        sourcemap: false,
        // Используем esbuild для минификации (встроен в Vite, не требует доп. зависимостей)
        minify: 'esbuild',
        // Максимально агрессивная минификация и обфускация
        esbuild: {
          drop: isProduction ? ['console', 'debugger'] : [],
          legalComments: 'none', // Удаляем ВСЕ комментарии включая лицензионные
          minifyIdentifiers: isProduction, // Минифицируем имена переменных
          minifySyntax: isProduction, // Минифицируем синтаксис
          minifyWhitespace: isProduction, // Удаляем все пробелы
          treeShaking: true, // Удаляем неиспользуемый код
        },
        // Дополнительные настройки для безопасности и оптимизации
        rollupOptions: {
          output: {
            // Компактный вывод без форматирования
            compact: isProduction,
            // Генерируем файлы с хешами для кеширования и безопасности
            entryFileNames: isProduction ? 'assets/[name]-[hash].js' : 'assets/[name].js',
            chunkFileNames: isProduction ? 'assets/[name]-[hash].js' : 'assets/[name].js',
            assetFileNames: isProduction ? 'assets/[name]-[hash].[ext]' : 'assets/[name].[ext]',
            // Удаляем комментарии из выходных файлов
            banner: undefined,
            footer: undefined,
          },
          // Дополнительная минификация через плагины Rollup
          plugins: isProduction ? [
            // Удаляем все комментарии из кода
            {
              name: 'remove-comments',
              renderChunk(code) {
                // Удаляем все однострочные и многострочные комментарии
                return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
              }
            }
          ] : []
        },
        // Дополнительные настройки безопасности
        cssCodeSplit: true, // Разделяем CSS для лучшей минификации
        reportCompressedSize: false, // Отключаем отчет о размере для ускорения сборки
      }
    };
});
