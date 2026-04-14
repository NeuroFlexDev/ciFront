import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: {
      resolveDependencies: (_filename, deps) => deps.filter((dep) => (
        !dep.includes('canvas-')
        && !dep.includes('export-')
        && !dep.includes('editor-')
      )),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom')) return 'router';
            if (id.includes('@xyflow/react')) return 'canvas';
            if (id.includes('@tiptap')) return 'editor';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'export';
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
