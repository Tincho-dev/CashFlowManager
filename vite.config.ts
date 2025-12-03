import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'CashFlow Manager',
        short_name: 'CashFlow',
        description: 'Personal finance management application',
        theme_color: '#1a1a2e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/sql\.js\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sql-js-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Manual chunks for code splitting to reduce bundle size
        manualChunks: {
          // Vendor chunk for React and core libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // MUI components (large library)
          'vendor-mui': ['@mui/material', '@emotion/react', '@emotion/styled'],
          // Data/i18n libraries
          'vendor-data': ['i18next', 'react-i18next', 'date-fns'],
          // File processing libraries (loaded on demand)
          'vendor-xlsx': ['xlsx'],
          // OCR library (heavy, loaded on demand)
          'vendor-ocr': ['tesseract.js'],
          // Database (loaded early but separable)
          'vendor-sql': ['sql.js'],
          // Charts library
          'vendor-charts': ['recharts'],
        },
      },
    },
    // Raise chunk size warning limit slightly since we've optimized
    chunkSizeWarningLimit: 600,
  },
})
