import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => ({
  define: {"import.meta.env.VITE_APP_SURFACE": JSON.stringify(mode === "admin" ? "admin" : "platform")},
  build: mode === "admin" ? {outDir: "admin-dist", rollupOptions: {input: "admin.html"}} : {},
  plugins: [react(), {
    name: 'admin-entry',
    transformIndexHtml(html) {
      return mode === 'admin' ? html.replace('/src/main.tsx', '/src/admin-main.tsx').replace('Lernium | Платформа курсов для команд', 'Лерниум | Управление платформой') : html;
    },
  }],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL ?? (mode === 'admin' ? 'http://127.0.0.1:8002' : 'http://127.0.0.1:8000'),
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}));
