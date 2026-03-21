import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { ChevronRight, LogOut, Shield, CreditCard, User, HelpCircle, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function ProfileScreen() {
  const { profile, user, signOut, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [insightCount, setInsightCount] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showBetaModal, setShowBetaModal] = useState(false)
  const [betaFeedback, setBetaFeedback] = useState('')
  const [betaSent, setBetaSent] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('insights')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .then(({ count }) => setInsightCount(count || 0))
  }, [user])
  const name = profile?.display_name || user?.email?.split('@')[0] || 'Unbekannt'

  const handleSignOut = async () => {
    await signOut()
    navigate('/onboarding')
  }

  return (
    <div className="px-5 pt-12 pb-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <Avatar name={name} size="lg" className="mb-4" />
        <h1 className="font-display text-[22px] text-ink mb-2">{name}</h1>
        {profile?.plan === 'tester' ? (
          <span className="text-[12px] font-medium px-3 py-1 rounded-full bg-accent-light text-accent">Beta</span>
        ) : (
          <Badge variant={profile?.plan === 'premium' ? 'premium' : 'free'}>
            {profile?.plan === 'premium' ? 'Premium' : 'Kostenlos'}
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 text-center">
          <p className="text-[24px] font-display text-ink">{profile?.streak_count || 0}</p>
          <p className="text-[12px] text-ink-3">Tage Streak</p>
        </div>
        <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 text-center">
          <p className="text-[24px] font-display text-ink">{profile?.sessions_used_this_month || 0}</p>
          <p className="text-[12px] text-ink-3">Gespräche</p>
        </div>
        <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 text-center">
          <p className="text-[24px] font-display text-ink">{insightCount}</p>
          <p className="text-[12px] text-ink-3">Erkenntnisse</p>
        </div>
      </div>

      {/* Beta-Hinweis für Tester */}
      {profile?.plan === 'tester' && (
        <div className="bg-accent-light rounded-xl p-4 mb-6">
          <p className="text-[13px] text-accent font-medium mb-1">Du nimmst an der Beta teil.</p>
          <p className="text-[12px] text-ink-2">Danke für dein Feedback — es hilft, Friedensstifter besser zu machen.</p>
        </div>
      )}

      {/* Jerome's CTA Card */}
      <div className="bg-accent rounded-xl p-5 mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full translate-x-6 -translate-y-6" />
        <p className="text-[11px] text-white/70 uppercase tracking-[0.08em] mb-2">Echtes Coaching</p>
        <h2 className="font-display text-[20px] text-white leading-[1.3] mb-2">Bereit für den nächsten Schritt?</h2>
        <p className="text-[13px] text-white/80 mb-4">Arbeite persönlich mit Jerome — zertifizierter systemischer Coach · Paracelsus · 160 Unterrichtsstunden.</p>
        <a
          href="https://www.friedensstifter.coach/contact/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-white text-accent text-[13px] font-medium px-4 py-2 rounded-full hover:bg-accent-light transition-colors"
        >
          Termin buchen →
        </a>
      </div>

      {/* Settings */}
      <div className="bg-surface border border-[var(--color-border)] rounded-lg overflow-hidden">
        {[
          { icon: User, label: 'Profil bearbeiten', action: () => { setEditName(profile?.display_name || ''); setShowEditModal(true) } },
          { icon: HelpCircle, label: 'Wie es funktioniert', action: () => navigate('/howto') },
          ...(profile?.plan !== 'tester' ? [{ icon: CreditCard, label: 'Plan & Abonnement', action: () => navigate('/premium') }] : []),
          ...(profile?.plan === 'tester' ? [{ icon: MessageSquare, label: 'Beta-Feedback geben', action: () => { setBetaFeedback(''); setBetaSent(false); setShowBetaModal(true) } }] : []),
          { icon: Shield, label: 'Datenschutzerklärung', action: () => setShowPrivacyModal(true) },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={action}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-[var(--color-border)] last:border-0 hover:bg-surface-2 transition-colors text-left"
          >
            <Icon size={18} color="var(--color-ink-2)" />
            <span className="flex-1 text-[15px] text-ink">{label}</span>
            <ChevronRight size={16} color="var(--color-ink-3)" />
          </button>
        ))}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface-2 transition-colors text-left"
        >
          <LogOut size={18} color="var(--color-coral)" />
          <span className="flex-1 text-[15px] text-coral">Abmelden</span>
        </button>
      </div>

      <p className="text-[11px] text-ink-3 text-center mt-6">Alles, was du hier teilst, bleibt bei dir.</p>

      {/* Profil bearbeiten Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6">
            <h3 className="font-display text-[22px] text-ink mb-4">Profil bearbeiten</h3>
            <label className="text-[13px] text-ink-3 mb-1 block">Anzeigename</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-[15px] text-ink bg-bg mb-5 focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  if (editName.trim()) await updateProfile({ display_name: editName.trim() })
                  setShowEditModal(false)
                }}
                className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors"
              >
                Speichern
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-[13px] text-ink-3 text-center"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beta-Feedback Modal */}
      {showBetaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6">
            <h3 className="font-display text-[22px] text-ink mb-2">Beta-Feedback</h3>
            <p className="text-[13px] text-ink-3 mb-4">Was fällt dir auf? Was fehlt? Was funktioniert gut?</p>
            {betaSent ? (
              <div className="text-center py-6">
                <p className="text-[28px] mb-3">🙏</p>
                <p className="text-[15px] text-ink font-medium">Danke für dein Feedback!</p>
                <p className="text-[13px] text-ink-3 mt-1">Es hilft wirklich.</p>
                <button
                  onClick={() => setShowBetaModal(false)}
                  className="mt-5 text-[13px] text-ink-3"
                >
                  Schließen
                </button>
              </div>
            ) : (
              <>
                <textarea
                  value={betaFeedback}
                  onChange={e => setBetaFeedback(e.target.value)}
                  placeholder="Dein Feedback..."
                  rows={5}
                  className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-[15px] text-ink bg-bg mb-4 focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
                />
                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      if (!betaFeedback.trim() || !user) return
                      await supabase.from('user_feedback').insert({
                        user_id: user.id,
                        feedback_type: 'beta',
                        content: betaFeedback.trim(),
                        consent_given: true,
                      })
                      setBetaSent(true)
                    }}
                    disabled={!betaFeedback.trim()}
                    className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors disabled:opacity-40"
                  >
                    Feedback senden
                  </button>
                  <button
                    onClick={() => setShowBetaModal(false)}
                    className="text-[13px] text-ink-3 text-center"
                  >
                    Abbrechen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Datenschutzerklärung Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="font-display text-[22px] text-ink mb-4">Datenschutzerklärung</h3>
            <div className="bg-accent-light rounded-xl p-4 mb-5">
              <p className="text-[14px] text-ink font-medium mb-3">Dein Raum gehört dir</p>
              <ul className="flex flex-col gap-2">
                {[
                  'Deine Gespräche werden nur für dich gespeichert.',
                  'Keine Weitergabe an Dritte — niemals.',
                  'Keine Werbung, kein Tracking deines Verhaltens.',
                  'Deine Daten werden nicht zum Training von KI-Modellen verwendet.',
                  'Du kannst dein Konto und alle Daten jederzeit löschen.',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-[14px] text-ink-2">
                    <span className="text-accent mt-0.5">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[13px] text-ink-2 mb-5 leading-relaxed">
              Diese App speichert deine Konversationen und Erkenntnisse in einer sicheren Datenbank (Supabase, EU-Server), die ausschließlich dir zugänglich ist. Der KI-Coach wird über die Anthropic API betrieben. Deine Inhalte werden nicht für das Training von KI-Modellen verwendet. Bei Fragen: info@friedensstifter.coach
            </p>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="w-full bg-accent text-white py-3 rounded-full font-medium hover:bg-accent-2 transition-colors"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
