import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Плагин для удаления console.log и console.debug из production
// Используем esbuild для более надежного удаления
const removeConsolePlugin = (isProduction: boolean) => {
  return {
    name: 'remove-console',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      // Применяем только в production и только к исходным файлам (не к node_modules)
      if (isProduction && !id.includes('node_modules') && (id.endsWith('.ts') || id.endsWith('.tsx') || id.endsWith('.js') || id.endsWith('.jsx'))) {
        // Удаляем console.log и console.debug, но оставляем console.error и console.warn
        // Используем более точные регулярные выражения для многострочных случаев
        let newCode = code;
        
        // Удаляем console.log (включая многострочные)
        newCode = newCode.replace(/console\.log\s*\([^)]*\)\s*;?/g, '');
        newCode = newCode.replace(/console\.log\s*\([^)]*$/gm, ''); // Для незакрытых скобок
        
        // Удаляем console.debug
        newCode = newCode.replace(/console\.debug\s*\([^)]*\)\s*;?/g, '');
        newCode = newCode.replace(/console\.debug\s*\([^)]*$/gm, '');
        
        if (newCode !== code) {
          return {
            code: newCode,
            map: null
          };
        }
      }
      return null;
    }
  };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Use '/' for Cloudflare/Vercel/Netlify, '/Course-Cous/' for GitHub Pages
    const base = env.VITE_BASE_URL || (env.CF_PAGES ? '/' : '/Course-Cous/');
    return {
      base,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        // Удаляем console.log и console.debug в production
        ...(mode === 'production' ? [removeConsolePlugin(true)] : [])
      ],
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
        sourcemap: false,
        minify: 'esbuild'
      }
    };
});
