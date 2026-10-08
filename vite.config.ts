import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        clientsClaim: true,
        skipWaiting: false,
      },
    }),
  ],
});
