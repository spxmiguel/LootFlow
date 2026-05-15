import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      base: '/LootFlow/',
      scope: '/LootFlow/',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'LootFlow – CS2 Drop Analytics',
        short_name: 'LootFlow',
        description: 'Acompanhe e analise seus drops semanais de CS2',
        theme_color: '#07090f',
        background_color: '#07090f',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/LootFlow/',
        scope: '/LootFlow/',
        lang: 'pt-BR',
        icons: [
          { src: 'pwa-64x64.png',            sizes: '64x64',   type: 'image/png' },
          { src: 'pwa-192x192.png',           sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png',           sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/LootFlow/',
        navigateFallbackDenylist: [/^\/LootFlow\/assets\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/steamcommunity\.com\/market\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'steam-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 1800 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  base: '/LootFlow/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          export: ['xlsx'],
        },
      },
    },
  },
})
