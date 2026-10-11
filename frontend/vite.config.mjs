import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'frontend-csp',
      transformIndexHtml: (_html, context) => context.server ? [] : [{
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
        injectTo: 'head-prepend',
      }],
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:5000', '/uploads': 'http://127.0.0.1:5000' },
  },
  build: { outDir: 'dist' },
});
