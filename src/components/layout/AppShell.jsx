import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { AgeConfirmSheet } from './AgeConfirmSheet'
import { useAuth } from '../../hooks/useAuth'

export function AppShell() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  // „Ich bin jünger“ → Profil (Löschweg) ohne erneutes Sheet in dieser Sitzung (S-11)
  const [ageSheetDeferred, setAgeSheetDeferred] = useState(false)
  const needsAgeConfirmation = !!profile && !profile.age_confirmed_at && !ageSheetDeferred

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto relative">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <BottomNav />
      {needsAgeConfirmation && (
        <AgeConfirmSheet
          onConfirmed={() => refreshProfile()}
          onGoToProfile={() => { setAgeSheetDeferred(true); navigate('/profile') }}
        />
      )}
    </div>
  )
}
