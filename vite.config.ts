import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false, // We handle registration manually via workbox-window

        // Dev mode SW disabled to avoid confusion during development
        devOptions: {
          enabled: false,
        },

        // Workbox configuration
        workbox: {
          // Auto-precache all build output (JS, CSS, HTML, fonts, images)
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

          // Skip waiting so new SW activates immediately on autoUpdate
          skipWaiting: true,
          clientsClaim: true,

          // SPA offline navigation fallback
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/v1\//,
            /firestore/,
            /firebase/,
          ],

          // Runtime caching strategies
          runtimeCaching: [
            // Google Fonts stylesheets — CacheFirst (1 year)
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Google Fonts webfonts — CacheFirst (1 year)
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Firebase Storage CDN images — CacheFirst (30 days)
            {
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'firebase-storage-images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Firestore / Firebase Auth — NetworkOnly (NEVER cache live data)
            {
              urlPattern:
                /^https:\/\/(firestore|identitytoolkit|securetoken|fcm)\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            // Firebase Realtime DB — NetworkOnly
            {
              urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            // Internal API endpoints — NetworkOnly
            {
              urlPattern: /\/v1\//,
              handler: 'NetworkOnly',
            },
            // Google Maps — NetworkOnly (dynamic, must be fresh)
            {
              urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            // Local static images — CacheFirst (30 days)
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-images',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // JS/CSS chunks that miss precache — StaleWhileRevalidate
            {
              urlPattern: /\.(?:js|css)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-chunks',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
          ],
        },

        // Web App Manifest (replaces both duplicate manifest.webmanifest files)
        manifest: {
          name: 'OP Media Management',
          short_name: 'OP Media',
          description: 'Professional Media Management & Employee Task Tracking',
          start_url: '/',
          display: 'standalone',
          background_color: '#09090b',
          theme_color: '#09090b',
          orientation: 'any',
          icons: [
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
