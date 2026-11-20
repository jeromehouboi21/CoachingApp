import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Friedensstifter',
        short_name: 'Friedensstifter',
        description: 'Fragen, die dich anders denken lassen.',
        theme_color: '#2D5A4E',
        background_color: '#F5F3EF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Schriften liegen lokal (S-10) und werden über globPatterns (woff2) vorgeladen
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Dateien wie /supabase-dpa.pdf direkt laden, nicht von der App-Navigation abfangen lassen
        navigateFallbackDenylist: [/\.pdf$/],
      }
    })
  ]
})
