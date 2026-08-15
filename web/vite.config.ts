import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sensei is served from a subpath (https://host/sensei/). Every asset URL and the
// router basename derive from this constant.
export const BASE_PATH = '/sensei/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5273,
    host: true,
  },
  preview: {
    port: 5273,
    host: true,
  },
});
