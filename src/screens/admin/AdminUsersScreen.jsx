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
  const [tab, setTab] = useState('users') // 'users' | 'feedback'
  const [feedback, setFeedback] = useState([])
  const [feedbackLoading, setFeedbackLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteLimit, setInviteLimit] = useState('20')
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteSuccess, setInviteSuccess] = useState(null)

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

  const fetchFeedback = async () => {
    setFeedbackLoading(true)
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-feedback`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`,
      },
    })
    const data = await res.json()
    setFeedback(data.feedback ?? [])
    setFeedbackLoading(false)
  }

  useEffect(() => {
    if (session) fetchUsers()
  }, [session])

  useEffect(() => {
    if (session && tab === 'feedback') fetchFeedback()
  }, [session, tab])

  const formatDate = (iso) => new Date(iso).toLocaleString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

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

  const inviteUser = async (e) => {
    e.preventDefault()
    setInviteSubmitting(true)
    setInviteError(null)
    setInviteSuccess(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: inviteEmail,
          displayName: inviteName || null,
          sessionLimit: inviteLimit === '' ? null : parseInt(inviteLimit, 10),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || 'Einladung fehlgeschlagen.')
        return
      }
      setInviteSuccess(`Einladung an ${inviteEmail} verschickt.`)
      setInviteEmail('')
      setInviteName('')
      setInviteLimit('20')
      fetchUsers()
    } catch {
      setInviteError('Einladung fehlgeschlagen — Netzwerkfehler.')
    } finally {
      setInviteSubmitting(false)
    }
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
        <p className="text-[14px] text-ink-2 mb-4">
          {tab === 'users' ? `${users.length} Nutzer` : `${feedback.length} Rückmeldungen`}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('users')}
            className={`text-[13px] px-4 py-1.5 rounded-full border ${
              tab === 'users' ? 'bg-accent text-white border-accent' : 'bg-surface border-[var(--color-border)] text-ink-2'
            }`}
          >
            Nutzer
          </button>
          <button
            onClick={() => setTab('feedback')}
            className={`text-[13px] px-4 py-1.5 rounded-full border ${
              tab === 'feedback' ? 'bg-accent text-white border-accent' : 'bg-surface border-[var(--color-border)] text-ink-2'
            }`}
          >
            Feedback
          </button>
        </div>

        {tab === 'users' && (
          <div className="mt-4">
            {!inviteOpen && (
              <button
                onClick={() => { setInviteOpen(true); setInviteError(null); setInviteSuccess(null) }}
                className="text-[13px] text-accent font-medium"
              >
                + Per E-Mail einladen
              </button>
            )}

            {inviteOpen && (
              <form onSubmit={inviteUser} className="bg-surface border border-[var(--color-border)] rounded-xl p-4 flex flex-col gap-3 mt-2">
                <input
                  type="email"
                  required
                  placeholder="E-Mail-Adresse"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-[14px]"
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-[14px]"
                />
                <label className="flex items-center gap-2 text-[13px] text-ink-2">
                  Gesprächs-Limit:
                  <input
                    type="number"
                    min="0"
                    placeholder="∞"
                    value={inviteLimit}
                    onChange={(e) => setInviteLimit(e.target.value)}
                    className="w-20 border border-[var(--color-border)] rounded px-2 py-1 text-[13px]"
                  />
                </label>

                {inviteError && <p className="text-[13px] text-red-600">{inviteError}</p>}
                {inviteSuccess && <p className="text-[13px] text-accent">{inviteSuccess}</p>}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="bg-accent text-white text-[13px] font-medium px-4 py-2 rounded-full"
                  >
                    {inviteSubmitting ? 'Sende …' : 'Einladen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteOpen(false)}
                    className="text-[13px] text-ink-3 px-4 py-2"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pb-24">
        {tab === 'users' && loading && <p className="text-ink-3 text-[14px]">Lädt …</p>}

        {tab === 'users' && !loading && (
          <div className="flex flex-col gap-3">
            {users.map(u => (
              <div key={u.id} className="bg-surface border border-[var(--color-border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[14px] font-medium text-ink">{u.display_name || '(kein Name)'}</p>
                    <p className="text-[12px] text-ink-3">{u.email}</p>
                    {u.invited_at && (
                      <p className="text-[11px] text-ink-3 mt-1">
                        Eingeladen am {formatDate(u.invited_at)}
                        {!u.last_sign_in_at && ' — noch nicht angenommen'}
                      </p>
                    )}
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

        {tab === 'feedback' && (
          <div className="flex flex-col gap-3">
            {feedbackLoading && <p className="text-ink-3 text-[14px]">Lädt …</p>}
            {!feedbackLoading && feedback.length === 0 && (
              <p className="text-ink-3 text-[14px]">Noch keine Rückmeldungen.</p>
            )}
            {!feedbackLoading && feedback.map(f => (
              <div key={f.id} className="bg-surface border border-[var(--color-border)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[14px] font-medium text-ink">{f.display_name || f.email || '(unbekannt)'}</p>
                    <p className="text-[12px] text-ink-3">{formatDate(f.created_at)}</p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-ink-3">
                    {f.feedback_type}
                  </span>
                </div>
                <p className="text-[14px] text-ink-2 leading-relaxed">{f.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
