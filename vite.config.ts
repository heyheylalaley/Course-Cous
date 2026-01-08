import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
        }
      }
    };
});
