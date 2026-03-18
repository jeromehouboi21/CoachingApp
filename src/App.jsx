import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AppShell } from './components/layout/AppShell'
import { OnboardingFlow } from './screens/onboarding/OnboardingFlow'
import { HomeScreen } from './screens/home/HomeScreen'
import { CoachScreen } from './screens/coach/CoachScreen'
import { ProfileScreen } from './screens/profile/ProfileScreen'

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
  if (!user) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={user ? <Navigate to="/home" replace /> : <OnboardingFlow />}
      />
      <Route element={<AppShell />}>
        <Route
          path="/home"
          element={<ProtectedRoute><HomeScreen /></ProtectedRoute>}
        />
        <Route
          path="/coach"
          element={<ProtectedRoute><CoachScreen /></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>}
        />
      </Route>
      <Route
        path="*"
        element={
          loading ? <LoadingScreen /> :
          user ? <Navigate to="/home" replace /> :
          <Navigate to="/onboarding" replace />
        }
      />
    </Routes>
  )
}
