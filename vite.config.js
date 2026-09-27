import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root: 'web', plugins: [react()], base: './',
  build: { outDir: '../dist', emptyOutDir: true },
  server: { host: '127.0.0.1', proxy: { '/api': 'http://localhost:3000' } },
});
