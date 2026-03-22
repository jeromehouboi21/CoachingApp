import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AppShell } from './components/layout/AppShell'
import { LandingScreen } from './screens/landing/LandingScreen'
import { AuthScreen } from './screens/landing/AuthScreen'
import { WelcomeScreen } from './screens/landing/WelcomeScreen'
import { OnboardingFlow } from './screens/onboarding/OnboardingFlow'
import { HomeScreen } from './screens/home/HomeScreen'
import { CoachScreen } from './screens/coach/CoachScreen'
import { MirrorScreen } from './screens/mirror/MirrorScreen'
import { ProfileScreen } from './screens/profile/ProfileScreen'
import { HowItWorksScreen } from './screens/howto/HowItWorksScreen'
import { WellnessCheckScreen } from './screens/wellness/WellnessCheckScreen'
import { PremiumScreen } from './screens/premium/PremiumScreen'
import { VorstehenScreen } from './screens/verstehen/VorstehenScreen'
import { MusterDetail } from './screens/verstehen/MusterDetail'
import { AusGespraechen } from './screens/verstehen/AusGespraechen'
import { ImpressumScreen } from './screens/legal/ImpressumScreen'
import { DatenschutzScreen } from './screens/legal/DatenschutzScreen'

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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/landing" replace />
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      {/* Öffentliche Einstiegs-Screens */}
      <Route path="/landing" element={user ? <Navigate to="/home" replace /> : <LandingScreen />} />
      <Route path="/auth" element={user ? <Navigate to="/home" replace /> : <AuthScreen />} />
      <Route path="/onboarding" element={user ? <Navigate to="/home" replace /> : <OnboardingFlow />} />
      <Route path="/welcome" element={<ProtectedRoute><WelcomeScreen /></ProtectedRoute>} />

      {/* "Wie es funktioniert" — kein AppShell, eigenes Layout */}
      <Route path="/howto" element={<ProtectedRoute><HowItWorksScreen /></ProtectedRoute>} />
      <Route path="/wellness" element={<ProtectedRoute><WellnessCheckScreen /></ProtectedRoute>} />
      <Route path="/premium" element={<ProtectedRoute><PremiumScreen /></ProtectedRoute>} />

      {/* Verstehen-Modul */}
      <Route path="/verstehen" element={<ProtectedRoute><VorstehenScreen /></ProtectedRoute>} />
      <Route path="/verstehen/aus-gespraechen" element={<ProtectedRoute><AusGespraechen /></ProtectedRoute>} />
      <Route path="/verstehen/:key" element={<ProtectedRoute><MusterDetail /></ProtectedRoute>} />

      {/* Haupt-App mit BottomNav */}
      <Route element={<AppShell />}>
        <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
        <Route path="/coach" element={<ProtectedRoute><CoachScreen /></ProtectedRoute>} />
        <Route path="/mirror" element={<ProtectedRoute><MirrorScreen /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
      </Route>

      {/* Rechtliches — öffentlich zugänglich */}
      <Route path="/impressum" element={<ImpressumScreen />} />
      <Route path="/datenschutz" element={<DatenschutzScreen />} />

      {/* Fallback */}
      <Route
        path="*"
        element={user ? <Navigate to="/home" replace /> : <Navigate to="/landing" replace />}
      />
    </Routes>
  )
}
