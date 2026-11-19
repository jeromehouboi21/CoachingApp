import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Avatar } from '../../components/ui/Avatar'
import { useAccessState } from '../../lib/accessState'
import { ChevronRight, LogOut, Shield, CreditCard, User, HelpCircle, MessageSquare, FileText, Trash2, Handshake, ClipboardList, Download, KeyRound, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { LearningConsentCard } from '../../components/profile/LearningConsentCard'
import { DataExportSheet } from '../../components/profile/DataExportSheet'
import { SecurityCard } from '../../components/profile/SecurityCard'
import { functionHeaders, functionUrl } from '../../lib/functions'
import { createLogger } from '../../lib/logger'

const logger = createLogger('ProfileScreen')

// Lokaler Kalendertag (YYYY-MM-DD) – Reflexionstage zählen Tage, nicht Gespräche.
function localDayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}


// U4: Phase in einer ruhigen Zeile (E-U4-5). Begleitung ohne Zahl; Kennenlernen mit „Gespräch n von m“.
function phaseLine(access) {
  if (!access?.phase) return null
  if (access.phase === 'begleitung') return 'Begleitung'
  if (access.phase === 'ruhemodus') return 'Ruhemodus – alles, was du erkannt hast, bleibt sichtbar'
  if (typeof access.starts_limit !== 'number') return 'Kennenlernen'
  const current = Math.min(access.starts_used + 1, access.starts_limit)
  return `Kennenlernen · Gespräch ${current} von ${access.starts_limit}`
}

function ProfileSection({ title, children }) {
  return (
    <section className="mb-6">
      <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-ink-3 mb-2 px-1">{title}</p>
      {children}
    </section>
  )
}

function MenuList({ items }) {
  return (
    <div className="bg-surface border border-[var(--color-border)] rounded-lg overflow-hidden">
      {items.map(({ icon: Icon, label, action }) => (
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
    </div>
  )
}

export function ProfileScreen() {
  const { profile, user, signOut, updateProfile, refreshProfile } = useAuth()
  const { access } = useAccessState()
  const navigate = useNavigate()
  const [insightCount, setInsightCount] = useState(0)
  // U1, E-U1-5: Gespräche gesamt + Reflexionstage (Tage mit begonnenem Gespräch, gesamt). null = nicht ladbar
  const [stats, setStats] = useState({ conversations: 0, reflectionDays: 0 })
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [showBetaModal, setShowBetaModal] = useState(false)
  const [showExportSheet, setShowExportSheet] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [betaFeedback, setBetaFeedback] = useState('')
  const [betaSent, setBetaSent] = useState(false)
  // S-11: Feedback nur mit ausdrücklicher Einwilligung; Fehler sichtbar, kein Erfolg ohne Erfolg
  const [betaConsent, setBetaConsent] = useState(false)
  const [betaError, setBetaError] = useState(false)
  const [betaBusy, setBetaBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('insights')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .then(({ count }) => setInsightCount(count || 0))
    // Dieselbe Quelle wie der Gesprächsverlauf: nur Gespräche mit eigener Nachricht
    supabase
      .rpc('get_conversation_history')
      .then(({ data, error }) => {
        if (error) {
          logger.error('conversation_stats_failed', { code: error.code })
          setStats(null)
          return
        }
        const rows = data ?? []
        setStats({
          conversations: rows.length,
          reflectionDays: new Set(rows.map((r) => localDayKey(r.created_at))).size,
        })
      })
  }, [user])
  const name = profile?.display_name || user?.email?.split('@')[0] || 'Unbekannt'

  const handleSignOut = async () => {
    await signOut()
    navigate('/onboarding')
  }

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'LÖSCHEN') return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Nicht eingeloggt')
      const res = await fetch(
        functionUrl('delete-account'),
        {
          method: 'POST',
          headers: functionHeaders(session.access_token),
        }
      )
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Fehler beim Löschen')
      await signOut()
      navigate('/landing')
    } catch (err) {
      setDeleteError(err.message)
      setDeleteLoading(false)
    }
  }

  return (
    <div className="px-5 pt-12 pb-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <Avatar name={name} size="lg" className="mb-4" />
        <h1 className="font-display text-[22px] text-ink mb-2">{name}</h1>
        {profile?.plan === 'tester' && (
          <span className="text-[12px] font-medium px-3 py-1 rounded-full bg-accent-light text-accent mb-2">Beta</span>
        )}
        {/* U4 (E-U4-5): ruhige Zeile zur Phase, kein Countdown */}
        {phaseLine(access) && <p className="text-[13px] text-ink-3">{phaseLine(access)}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 text-center">
          <p className="text-[24px] font-display text-ink">{stats ? stats.conversations : '–'}</p>
          <p className="text-[12px] text-ink-3">Gespräche</p>
        </div>
        <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 text-center">
          <p className="text-[24px] font-display text-ink">{insightCount}</p>
          <p className="text-[12px] text-ink-3">Erkenntnisse</p>
        </div>
        <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 text-center">
          <p className="text-[24px] font-display text-ink">{stats ? stats.reflectionDays : '–'}</p>
          <p className="text-[12px] text-ink-3">Reflexionstage</p>
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

      {/* Paket K W2: Gliederung nach Konzept 7 – Dein Begleiter · Konto & Sicherheit · Rechtliches */}
      <ProfileSection title="Dein Begleiter">
        <MenuList items={[
          { icon: User, label: 'Profil bearbeiten', action: () => { setEditName(profile?.display_name || ''); setShowEditModal(true) } },
          { icon: HelpCircle, label: 'Wie es funktioniert', action: () => navigate('/howto') },
          ...(profile?.plan !== 'premium' ? [{ icon: CreditCard, label: 'Begleitung', action: () => navigate('/begleitung') }] : []),
          ...(profile?.plan === 'tester' ? [{ icon: MessageSquare, label: 'Beta-Feedback geben', action: () => { setBetaFeedback(''); setBetaSent(false); setBetaConsent(false); setBetaError(false); setShowBetaModal(true) } }] : []),
          ...(profile?.plan === 'tester' || profile?.plan === 'premium' ? [{ icon: ClipboardList, label: 'Beta-Fragebogen ausfüllen', action: () => navigate('/feedback') }] : []),
        ]} />
        {/* Lernbasis: deine Erfahrungen teilen (S-13) */}
        <div className="mt-3">
          <LearningConsentCard profile={profile} onChanged={refreshProfile} />
        </div>
      </ProfileSection>

      <ProfileSection title="Konto & Sicherheit">
        <MenuList items={[
          { icon: KeyRound, label: 'Passwort ändern', action: () => navigate('/profil/passwort') },
          { icon: ShieldCheck, label: 'Wie wir deine Daten schützen', action: () => navigate('/sicherheit') },
          { icon: Download, label: 'Meine Daten herunterladen', action: () => setShowExportSheet(true) },
        ]} />
        {/* Konto zusätzlich schützen (S-06b) */}
        <div className="mt-3">
          <SecurityCard />
        </div>
      </ProfileSection>

      <ProfileSection title="Rechtliches">
        <MenuList items={[
          { icon: Handshake, label: 'Coaching-Vereinbarung', action: () => navigate('/vereinbarung') },
          { icon: Shield, label: 'Datenschutzerklärung', action: () => navigate('/datenschutz') },
          { icon: FileText, label: 'Impressum', action: () => navigate('/impressum') },
        ]} />
      </ProfileSection>

      <div className="bg-surface border border-[var(--color-border)] rounded-lg overflow-hidden">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface-2 transition-colors text-left"
        >
          <LogOut size={18} color="var(--color-coral)" />
          <span className="flex-1 text-[15px] text-coral">Abmelden</span>
        </button>
      </div>
      <div className="border-t border-[var(--color-border)] my-5" />
      <div className="bg-surface border border-[var(--color-border)] rounded-lg overflow-hidden">
        <button
          onClick={() => { setDeleteInput(''); setDeleteError(''); setShowDeleteModal(true) }}
          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-surface-2 transition-colors text-left"
        >
          <Trash2 size={18} color="var(--color-ink-3)" />
          <span className="flex-1 text-[15px] text-ink-3">Konto löschen</span>
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

      {/* Datenexport (S-16) */}
      {showExportSheet && <DataExportSheet onClose={() => setShowExportSheet(false)} />}

      {/* Konto löschen Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6">
            <h3 className="font-display text-[22px] text-coral mb-2">Konto wirklich löschen?</h3>
            <p className="text-[14px] text-ink-2 mb-4">
              Damit werden unwiderruflich gelöscht:
            </p>
            <ul className="flex flex-col gap-1 mb-4">
              {[
                'Alle deine Gespräche',
                'Dein persönliches Coaching-Profil',
                'Alle erkannten Muster und Erkenntnisse',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-[14px] text-ink-2">
                  <span className="text-coral mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-ink-3 mb-5">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <label className="block text-[13px] text-ink-2 mb-2">
              Zur Bestätigung tippe: <strong className="text-ink">LÖSCHEN</strong>
            </label>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="LÖSCHEN"
              className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-[15px] text-ink bg-bg mb-2 focus:outline-none focus:border-coral transition-colors"
            />
            {deleteError && <p className="text-[13px] text-coral mb-3">{deleteError}</p>}
            <p className="text-[11px] text-ink-3 mb-5">
              Deine Daten bei Anthropic (API-Logs) werden nach 30 Tagen automatisch von Anthropic gelöscht.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'LÖSCHEN' || deleteLoading}
                className="w-full bg-coral text-white py-3 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {deleteLoading ? 'Wird gelöscht…' : 'Konto endgültig löschen'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full border border-[var(--color-border)] text-ink py-3 rounded-full font-medium"
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
                <label className="flex items-start gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={betaConsent}
                    onChange={e => setBetaConsent(e.target.checked)}
                    className="mt-0.5 flex-shrink-0 accent-[var(--color-accent)]"
                  />
                  <span className="text-[13px] text-ink-2 leading-snug">
                    <span className="text-ink font-medium">Ich bin einverstanden, dass Jerome mein Feedback liest und damit die App verbessert.</span>{' '}
                    Dein Feedback wird mit deinem Namen gespeichert und nach 24 Monaten gelöscht.
                  </span>
                </label>
                {betaError && (
                  <p role="alert" className="text-[13px] text-ink-2 bg-surface-2 rounded-lg px-4 py-3 mb-3">
                    Dein Feedback ließ sich gerade nicht senden. Versuch es bitte noch einmal.
                  </p>
                )}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      if (!betaFeedback.trim() || !user || !betaConsent) return
                      setBetaBusy(true)
                      setBetaError(false)
                      // Kein .select(): authenticated hat auf user_feedback nur INSERT (Migration 025)
                      const { error } = await supabase.from('user_feedback').insert({
                        user_id: user.id,
                        feedback_type: 'beta',
                        content: betaFeedback.trim(),
                        consent_given: true,
                      })
                      setBetaBusy(false)
                      if (error) {
                        logger.error('feedback_insert_failed', { code: error.code })
                        setBetaError(true)
                        return
                      }
                      setBetaSent(true)
                    }}
                    disabled={!betaFeedback.trim() || !betaConsent || betaBusy}
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

    </div>
  )
}
