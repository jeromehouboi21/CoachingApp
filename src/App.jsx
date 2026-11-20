import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AppShell } from './components/layout/AppShell'
import { LandingScreen } from './screens/landing/LandingScreen'
import { AuthScreen } from './screens/landing/AuthScreen'
import { WelcomeScreen } from './screens/landing/WelcomeScreen'
import { StartFlow } from './screens/start/StartFlow'
import { ConsentGateScreen } from './screens/start/ConsentGateScreen'
import { HomeScreen } from './screens/home/HomeScreen'
import { CoachScreen } from './screens/coach/CoachScreen'
import { MirrorScreen } from './screens/mirror/MirrorScreen'
import { ProfileScreen } from './screens/profile/ProfileScreen'
import { HowItWorksScreen } from './screens/howto/HowItWorksScreen'
import { WellnessCheckScreen } from './screens/wellness/WellnessCheckScreen'
import { BegleitungScreen } from './screens/begleitung/BegleitungScreen'
import { AdminUsersScreen } from './screens/admin/AdminUsersScreen'
import { AdminMfaScreen } from './screens/admin/AdminMfaScreen'
import { useAdminMfa, AdminMfaContext } from './hooks/useAdminMfa'
import { PatternDetailScreen } from './screens/mirror/PatternDetailScreen'
import { HistoryScreen } from './screens/history/HistoryScreen'
import { BetaSurveyScreen } from './screens/feedback/BetaSurveyScreen'
import { ImpressumScreen } from './screens/legal/ImpressumScreen'
import { DatenschutzScreen } from './screens/legal/DatenschutzScreen'
import { CoachingAgreementScreen } from './screens/legal/CoachingAgreementScreen'
import { MfaChallengeScreen } from './screens/auth/MfaChallengeScreen'
import { PasswordChangeScreen } from './screens/account/PasswordChangeScreen'
import { PasswordResetScreen } from './screens/account/PasswordResetScreen'
import { SecurityInfoScreen } from './screens/legal/SecurityInfoScreen'
import { ProfileMissingScreen } from './screens/start/ProfileMissingScreen'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex gap-1">
        {[0,1,2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

// /verstehen/:key → /mirror/muster/:key (U2)
function LegacyPatternRedirect() {
  const { key } = useParams()
  return <Navigate to={`/mirror/muster/${encodeURIComponent(key ?? '')}`} replace />
}

function ProtectedRoute({ children }) {
  const { user, profile, loading, mfaGate, checkLegalConsent } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/landing" replace />
  // S-06b: Code-Abfrage vor allem anderen – ein leeres Profil heißt hier NICHT „Onboarding“
  if (mfaGate === 'required') return <MfaChallengeScreen />
  // Paket K W3: ohne Zustimmung v2.0 entscheidet die Sperre in App (ConsentGateScreen).
  // Zweite Linie, falls diese Instanz schneller lädt: nichts von der App zeigen.
  if (checkLegalConsent(profile) !== 'valid') return <LoadingScreen />
  return children
}

// Admin-Bereich nur mit zweitem Faktor (S-06). Maßgeblich ist der Server (requireAdmin → aal2);
// hier wird nur die Bedienung gesteuert.
function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const mfa = useAdminMfa()
  if (loading || mfa.loading) return <LoadingScreen />
  if (!user) return <Navigate to="/landing" replace />
  if (!profile?.is_admin) return <Navigate to="/home" replace />
  if (mfa.level !== 'aal2' || mfa.enrolledJustNow || mfa.addingDevice) return <AdminMfaScreen mfa={mfa} />
  return <AdminMfaContext.Provider value={mfa}>{children}</AdminMfaContext.Provider>
}

export default function App() {
  const { user, profile, profileReady, loading, mfaGate, checkLegalConsent, acceptConsentV2, refreshProfile, signOut } = useAuth()

  if (loading) return <LoadingScreen />

  // S-06b: Angemeldet mit aal1, aber zweiter Faktor vorhanden → nur Code-Abfrage und Rechtliches.
  // Steht hier (nicht nur in ProtectedRoute), damit /onboarding mit leerem Profil nicht greift.
  if (user && mfaGate === 'required') {
    return (
      <Routes>
        <Route path="/impressum" element={<ImpressumScreen />} />
        <Route path="/datenschutz" element={<DatenschutzScreen />} />
        <Route path="/sicherheit" element={<SecurityInfoScreen />} />
        <Route path="*" element={<MfaChallengeScreen />} />
      </Routes>
    )
  }

  // Paket K W3: erst entscheiden, wenn das Profil dieses Nutzers geladen ist (kein Aufblitzen nach Login/Registrierung)
  if (user && !profileReady) return <LoadingScreen />

  // W4-Befund: angemeldet, aber kein Profil (Ladefehler oder unvollständiges Konto) → nicht in die
  // Zustimmung schicken, die hier nicht gespeichert werden kann. Rechtliches bleibt erreichbar.
  if (user && !profile) {
    return (
      <Routes>
        <Route path="/impressum" element={<ImpressumScreen />} />
        <Route path="/datenschutz" element={<DatenschutzScreen />} />
        <Route path="/sicherheit" element={<SecurityInfoScreen />} />
        <Route path="*" element={<ProfileMissingScreen onSignOut={signOut} />} />
      </Routes>
    )
  }

  // Paket K W3 (Handoff 5.5): angemeldet ohne Zustimmung v2.0 → Sperre vor der App.
  // Reihenfolge: Code-Abfrage (oben) → 18+ → Zustimmung (beides im ConsentGateScreen).
  // Erreichbar bleiben Rechtliches und das Profil (Export, Konto löschen).
  const consentState = user ? checkLegalConsent(profile) : null
  if (user && consentState !== 'valid') {
    return (
      <Routes>
        <Route path="/impressum" element={<ImpressumScreen />} />
        <Route path="/datenschutz" element={<DatenschutzScreen />} />
        <Route path="/sicherheit" element={<SecurityInfoScreen />} />
        <Route path="/passwort-neu" element={<PasswordResetScreen />} />
        <Route element={<AppShell />}>
          <Route path="/profile" element={<ProfileScreen />} />
        </Route>
        <Route path="*" element={
          <ConsentGateScreen
            user={user}
            profile={profile}
            consentState={consentState}
            acceptConsentV2={acceptConsentV2}
            refreshProfile={refreshProfile}
            signOut={signOut}
          />
        } />
      </Routes>
    )
  }

  return (
    <Routes>
      {/* Öffentliche Einstiegs-Screens */}
      <Route path="/landing" element={user ? <Navigate to="/home" replace /> : <LandingScreen />} />
      <Route path="/auth" element={user ? <Navigate to="/home" replace /> : <AuthScreen />} />
      {/* Paket K W3: neuer Einstieg; /onboarding bleibt als Weiterleitung (alte Links, Einladungs-Mails) */}
      <Route path="/start/:step" element={user ? <Navigate to="/home" replace /> : <StartFlow />} />
      <Route path="/start" element={<Navigate to="/start/1" replace />} />
      <Route path="/onboarding" element={<Navigate to={user ? '/home' : '/start/1'} replace />} />
      <Route path="/welcome" element={<ProtectedRoute><WelcomeScreen /></ProtectedRoute>} />

      {/* "Wie es funktioniert" — kein AppShell, eigenes Layout */}
      <Route path="/howto" element={<ProtectedRoute><HowItWorksScreen /></ProtectedRoute>} />
      <Route path="/wellness" element={<ProtectedRoute><WellnessCheckScreen /></ProtectedRoute>} />
      {/* U4: Info-Seite Begleitung; /premium bleibt als Weiterleitung für alte Links */}
      <Route path="/begleitung" element={<ProtectedRoute><BegleitungScreen /></ProtectedRoute>} />
      <Route path="/premium" element={<Navigate to="/begleitung" replace />} />

      {/* Muster-Detail (U2): Vollbild ohne BottomNav, eigener Zurück-Button → /mirror/muster */}
      <Route path="/mirror/muster/:key" element={<ProtectedRoute><PatternDetailScreen /></ProtectedRoute>} />

      {/* Alte Verstehen-/Stimmen-Adressen leiten in den Spiegel (U2, Lesezeichen der Beta-Tester) */}
      <Route path="/verstehen" element={<Navigate to="/mirror/muster" replace />} />
      <Route path="/verstehen/aus-gespraechen" element={<Navigate to="/mirror/muster" replace />} />
      <Route path="/verstehen/:key" element={<LegacyPatternRedirect />} />
      <Route path="/stimmen" element={<Navigate to="/mirror/muster" replace />} />

      {/* Gesprächsverlauf: gehört zum Gespräch (U1), eigenes Vollbild-Layout ohne BottomNav.
          /verlauf bleibt als Weiterleitung für alte Lesezeichen. */}
      <Route path="/coach/verlauf" element={<ProtectedRoute><HistoryScreen /></ProtectedRoute>} />
      <Route path="/verlauf" element={<Navigate to="/coach/verlauf" replace />} />

      {/* Coaching-Vereinbarung: nachträglicher Rückblick inkl. Zustimmungsdatum, nur eingeloggt sinnvoll */}
      <Route path="/vereinbarung" element={<ProtectedRoute><CoachingAgreementScreen /></ProtectedRoute>} />

      {/* Paket K W1: Passwort ändern (geschützt) und neues Passwort nach dem Reset-Link (eigene Sitzungsprüfung) */}
      <Route path="/profil/passwort" element={<ProtectedRoute><PasswordChangeScreen /></ProtectedRoute>} />
      <Route path="/passwort-neu" element={<PasswordResetScreen />} />

      {/* Startadresse: angemeldet → Heute (/home), sonst Landing (U1, E-U1-1) */}
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <Navigate to="/landing" replace />} />

      {/* Haupt-App mit BottomNav: Heute · Gespräch · Spiegel. Profil über den Avatar (ProfileButton). */}
      <Route element={<AppShell />}>
        <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
        <Route path="/coach" element={<ProtectedRoute><CoachScreen /></ProtectedRoute>} />
        <Route path="/mirror" element={<ProtectedRoute><MirrorScreen level="erkenntnisse" /></ProtectedRoute>} />
        <Route path="/mirror/muster" element={<ProtectedRoute><MirrorScreen level="muster" /></ProtectedRoute>} />
        <Route path="/mirror/entwicklung" element={<ProtectedRoute><MirrorScreen level="entwicklung" /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute><BetaSurveyScreen /></ProtectedRoute>} />
      </Route>

      {/* Admin-Nutzerverwaltung — eigenständiger Vollbild-Screen, kein Bestandteil der normalen Nutzer-Navigation */}
      <Route path="/admin/users" element={<AdminRoute><AdminUsersScreen /></AdminRoute>} />

      {/* Rechtliches — öffentlich zugänglich */}
      <Route path="/impressum" element={<ImpressumScreen />} />
      <Route path="/datenschutz" element={<DatenschutzScreen />} />
      {/* Paket K W2: öffentlich, ohne Datenbankaufrufe, keine Umleitung für Angemeldete */}
      <Route path="/sicherheit" element={<SecurityInfoScreen />} />

      {/* Fallback */}
      <Route
        path="*"
        element={user ? <Navigate to="/home" replace /> : <Navigate to="/landing" replace />}
      />
    </Routes>
  )
}
