import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Paket K W1: Link „Neues Passwort“ erkennen, bevor der Supabase-Client das URL-Fragment verarbeitet
import './lib/passwordRecovery'
// Paket P: Installations-Angebot des Browsers abfangen, bevor React rendert
import './lib/installPrompt'
import App from './App.jsx'
import { UpdateBanner } from './components/app/UpdateBanner'
import { OfflineBar } from './components/app/OfflineBar'
import { logStandaloneLaunchOnce } from './hooks/useInstallPrompt'
// Schriften lokal statt Google Fonts (S-10): keine Drittanbieter-Anfrage, schlankere CSP
import '@fontsource/dm-sans/300.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-serif-display/400.css'
import '@fontsource/dm-serif-display/400-italic.css'
import './styles/globals.css'

logStandaloneLaunchOnce()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/* Paket P: auf allen Screens, auch vor der Anmeldung */}
      <UpdateBanner />
      <OfflineBar />
    </BrowserRouter>
  </React.StrictMode>
)
