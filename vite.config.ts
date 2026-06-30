import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['img/favicon.ico', 'img/icon-192.png', 'img/icon-512.png'],
      manifest: {
        name: '消灭星星 Pop Star',
        short_name: '消灭星星',
        description: '经典消灭星星小游戏，支持离线游玩',
        start_url: './index.html',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#1a0a3c',
        icons: [
          { src: 'img/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,ogg,ttf,woff,ico}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|ogg|ttf|woff|woff2|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-assets',
              expiration: { maxEntries: 50 },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-shell',
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
