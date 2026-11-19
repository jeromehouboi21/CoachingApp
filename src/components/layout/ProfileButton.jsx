import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../ui/Avatar'

// Avatar oben rechts in den Headern von Heute, Gespräch und Spiegel → Profil (U1, E-U1-3).
// Das Profil ist Verwaltung und deshalb kein Tab.
export function ProfileButton({ size = 'sm', className = '' }) {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const name = profile?.display_name || user?.email?.split('@')[0] || 'Du'

  return (
    <button
      type="button"
      onClick={() => navigate('/profile')}
      aria-label="Profil öffnen"
      title="Profil"
      className={`flex-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${className}`}
    >
      <Avatar name={name} size={size} />
    </button>
  )
}
