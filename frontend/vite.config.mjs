import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:5000';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'frontend-csp',
      transformIndexHtml: (_html, context) =>
        context.server
          ? []
          : [
              {
                tag: 'meta',
                attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
                injectTo: 'head-prepend',
              },
            ],
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: false },
      '/uploads': { target: apiTarget, changeOrigin: false },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
