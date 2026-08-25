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
      // Art geometry and palette shared with the mobile client. Lives outside
      // web/, so Vite needs both the alias and fs.allow below to serve it.
      '@art': fileURLToPath(new URL('../shared/art', import.meta.url)),
    },
  },
  server: {
    fs: { allow: ['..'] },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  preview: {
    port: 5273,
    host: true,
  },
});
