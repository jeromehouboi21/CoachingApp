# Paket P (PWA installierbar) – Phase 0: Bestandsaufnahme

**Stand:** 20.11.2026 · Grundlage: `docs/Neues_Zielbild/handoff-pwa-installierbar.md` Abschnitt 2

| # | Frage | Befund |
|---|---|---|
| 1 | Service Worker | `vite-plugin-pwa` **0.20.5** (`package.json` mit `^0.20.5` – entgegen der Regel „feste Versionen“ mit Caret). `registerType: 'autoUpdate'`, `injectRegister` nicht gesetzt (Standard → `registerSW.js` wird eingebunden). `workbox`: `globPatterns ['**/*.{js,css,html,ico,png,svg,woff2}']`, `navigateFallbackDenylist [/\.pdf$/]` (seit Paket K), **kein `runtimeCaching`**, kein `cleanupOutdatedCaches`. `dist/sw.js` enthält nur die Navigations-Route auf `index.html` (Denylist `.pdf`), keine Route für Supabase oder Fremd-Origins. Erzeugt: `dist/sw.js`, `dist/workbox-*.js`, `dist/registerSW.js`. |
| 2 | Manifest | Im Plugin (`vite.config.js`): `name`/`short_name` „Friedensstifter“, `description` „Fragen, die dich anders denken lassen.“, `theme_color #2D5A4E`, `background_color #F5F3EF`, `display standalone`, `orientation portrait`, `start_url /`. **Kein `id`, `scope`, `lang`.** Icons: `icon-192.png` (ohne `purpose`), `icon-512.png` **nur `maskable`** – es fehlt ein 512er mit `purpose any`. `includeAssets: ['favicon.ico', 'icons/*.png']`, aber **`public/favicon.ico` fehlt**. |
| 2b | Icons | `public/icons/icon-192.png`, `icon-512.png` (Stand März 2026): Serifen-„F.“ weiß auf Waldgrün mit hellerem Kreis oben rechts, **abgerundete transparente Ecken**. Für `maskable` ungeeignet (Android schneidet selbst zu, die transparenten Ecken werden sichtbar) und für iOS (Transparenz → schwarz). Kein `apple-touch-icon`. |
| 3 | `index.html` | `viewport` mit `viewport-fit=cover` ✓, `theme-color #2D5A4E` ✓, `apple-mobile-web-app-capable` (veraltet, Konsole warnt; `mobile-web-app-capable` fehlt), `apple-mobile-web-app-status-bar-style default` ✓. **Kein `apple-touch-icon`, kein `apple-mobile-web-app-title`.** Favicon-Link zeigt auf `/favicon.ico` mit `type image/svg+xml` (falscher Typ, Datei fehlt). Kein Inline-Script. |
| 4 | `vercel.json` / Header | CSP enthält bereits `worker-src 'self'` und `manifest-src 'self'`. `Cache-Control`: `/sw.js` → `no-cache` (live bestätigt), `/(.*).html` und `/` → `no-cache, no-store, must-revalidate`, `/assets/*` → 1 Jahr immutable. `/manifest.webmanifest` und `/registerSW.js` live: `public, max-age=0, must-revalidate`, Manifest mit `Content-Type: application/manifest+json` (Vercel-Standard, keine eigene Regel). |
| 5 | Design-Tokens | Waldgrün `--color-accent #2D5A4E`, Off-White `--color-bg #F5F3EF` (`src/styles/tokens.css`). |
| 6 | Anmeldewege | Passwort (`AuthScreen`), **Magic Link** (`AuthScreen` Modus `magic`, `signInWithOtp` mit `shouldCreateUser: false`), Einladungslink (`admin-invite-user`), Passwort-Reset (`/passwort-neu`), E-Mail-Bestätigung bei Registrierung (seit 20.11.2026 an). Vorlagen in `supabase/templates/` – `magic_link.html` enthält nur `{{ .ConfirmationURL }}`, **keinen `{{ .Token }}`**. Supabase-Client ohne Optionen (`src/lib/supabase.js`) → Sitzung in `localStorage`, impliziter Flow. |
| 7 | `409 client_outdated` | `useChat.js` (Zeilen ~34, 165, 405): erkannt und als `client_outdated` geloggt. Ein automatisches Neuladen oder Event gibt es nicht. |
| 8 | Laufendes Gespräch | `isLoading` in `useChat.js` (Z. 101), über den Hook-Rückgabewert im `CoachScreen` verfügbar. |
| 9 | Layout | `BottomNav`: `fixed bottom-0` mit `pb-[env(safe-area-inset-bottom)]` ✓. `CoachScreen`: `h-screen` (=100vh), Kopf `sticky top-0` mit `pt-12`, Eingabe `sticky bottom-0` (ohne Safe-Area). `HowItWorksScreen`: `h-screen`. `LandingScreen`: Button-Leiste `fixed bottom-0` mit `pb-8`. 27 Dateien mit `min-h-screen` (unkritisch, wächst mit). |
| 10 | Frontend-Logger | `createLogger(source)` (`src/lib/logger.ts`) mit `debug/info/warn/error(message, data)`. Die im Handoff genannten `logClientError`/`logClientEvent` gibt es nicht → `createLogger('pwa')` mit `warn`/`info`. |
| 11 | Abgeschlossene Gespräche | `HomeScreen` lädt `get_conversation_history` (inkl. `message_count`); `todayState.js` zählt ein Gespräch ab `message_count >= 3`. Diese Definition passt für P-3 ohne neue Abfrage. |

## Weitere Befunde

- `public/offline.html` existiert, ist aber nicht eingebunden (keine `navigateFallback`-Regel dafür) und enthält ein „—“ und „Kein Netz gerade.“. Wird mit P-5 überflüssig bzw. kann entfallen.
- **Paket V** (Spracheingabe über Mistral, auf das P-1 verweist) gibt es noch nicht als Handoff; die Spracheingabe ist seit Paket K aus.
- Das Handoff nennt Angriffstest-Nummern 45–48; frei sind sie (höchste vergebene Nummer: 38).
