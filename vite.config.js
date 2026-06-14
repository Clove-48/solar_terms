import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2015',
    cssCodeSplit: false,
    assetsInlineLimit: 4096
  },
  server: {
    host: true,
    port: 5173
  }
});