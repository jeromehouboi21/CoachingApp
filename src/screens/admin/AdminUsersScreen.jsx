import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ChevronLeft } from 'lucide-react'

export function AdminUsersScreen() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
    })
    const data = await res.json()
    setUsers(data.users ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchUsers()
  }, [session])

  const updateUser = async (userId, patch) => {
    setSavingId(userId)
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, ...patch }),
    })
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...patch } : u)))
    setSavingId(null)
  }

  // Client-seitiger Guard: nur UX, die eigentliche Absicherung passiert
  // in der Edge Function selbst (403 bei fehlender is_admin-Berechtigung).
  if (profile && !profile.is_admin) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <p className="text-ink-2">Kein Zugriff.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-5 pt-12 pb-6">
        <button onClick={() => navigate('/home')} className="flex items-center gap-1 text-ink-3 text-[13px] mb-6">
          <ChevronLeft size={16} />
          Zurück
        </button>
        <h1 className="font-display text-[24px] text-ink mb-2">Nutzerverwaltung</h1>
        <p className="text-[14px] text-ink-2">{users.length} Nutzer</p>
      </div>

      <div className="px-5 pb-24">
        {loading && <p className="text-ink-3 text-[14px]">Lädt …</p>}

        {!loading && (
          <div className="flex flex-col gap-3">
            {users.map(u => (
              <div key={u.id} className="bg-surface border border-[var(--color-border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[14px] font-medium text-ink">{u.display_name || '(kein Name)'}</p>
                    <p className="text-[12px] text-ink-3">{u.email}</p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-ink-3">
                    {u.plan}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <label className="flex items-center gap-2 text-[13px] text-ink-2">
                    <input
                      type="checkbox"
                      checked={u.is_beta_tester}
                      disabled={savingId === u.id}
                      onChange={(e) => updateUser(u.id, { is_beta_tester: e.target.checked })}
                    />
                    Beta-Tester
                  </label>

                  <label className="flex items-center gap-2 text-[13px] text-ink-2">
                    Limit:
                    <input
                      type="number"
                      className="w-16 border border-[var(--color-border)] rounded px-2 py-1 text-[13px]"
                      value={u.session_limit ?? ''}
                      placeholder="∞"
                      disabled={savingId === u.id}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
                        updateUser(u.id, { session_limit: val })
                      }}
                    />
                  </label>

                  <span className="text-[13px] text-ink-3 ml-auto">
                    Genutzt: {u.sessions_used_this_month ?? 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
