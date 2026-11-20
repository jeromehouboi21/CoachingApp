import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Paket P (P-2): Nutzer entscheidet, wann neu geladen wird (UpdateBanner); automatisch nur bei client_outdated.
      registerType: 'prompt',
      // Registrierung über useRegisterSW (UpdateBanner) – registerSW.js entfällt
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon-180.png'],
      manifest: {
        id: '/',
        name: 'Friedensstifter',
        short_name: 'Friedensstifter',
        description: 'Fragen, die dich anders denken lassen.',
        lang: 'de',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#2D5A4E',        // --color-accent
        background_color: '#F5F3EF',   // --color-bg
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Nur statische Build-Dateien. Schriften liegen lokal (S-10) und werden über woff2 vorgeladen.
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        // Dateien wie /supabase-dpa.pdf direkt laden, nicht von der App-Navigation abfangen lassen
        navigateFallbackDenylist: [/\.pdf$/],
        cleanupOutdatedCaches: true,
        // BEWUSST LEER: keine API-Antworten, keine Nutzerdaten (Paket P, Regel 0.2; geprüft von check-sw.mjs)
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    })
  ]
})
