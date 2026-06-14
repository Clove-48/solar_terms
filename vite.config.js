import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2015',
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          tfjs: [
            '@tensorflow/tfjs-core',
            '@tensorflow/tfjs-backend-webgl'
          ],
          handpose: ['@tensorflow-models/handpose']
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
});