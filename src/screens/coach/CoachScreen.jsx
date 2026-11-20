import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, ChevronLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useChat } from '../../hooks/useChat'
import { useMemory } from '../../hooks/useMemory'
import { useStreak } from '../../hooks/useStreak'
import { ChatBubble } from '../../components/coach/ChatBubble'
import { CrisisResponseCard } from '../../components/coach/CrisisResponseCard'
import { TypingIndicator } from '../../components/coach/TypingIndicator'
import { ChatInput } from '../../components/coach/ChatInput'
import { QuickReplies } from '../../components/coach/QuickReplies'
import { ConversationEndModal } from '../../components/coach/ConversationEndModal'
import { ConversationEntry } from '../../components/coach/ConversationEntry'
import { ContinueRatingSheet } from '../../components/coach/ContinueRatingSheet'
import { createConfirmedInsight } from '../../lib/insightActions'
import { RestModeSheet } from '../../components/access/RestModeSheet'
import { ConversationCapNotice } from '../../components/access/ConversationCapNotice'
import { QuotaNotice } from '../../components/access/QuotaNotice'
import { useAccessState, isLastTrialStart, seenOnce, markSeen, TRIAL_LAST_HINT_KEY } from '../../lib/accessState'
import { ProfileButton } from '../../components/layout/ProfileButton'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'
import { functionHeaders, functionUrl } from '../../lib/functions'
import { checkMfaResponse } from '../../lib/mfa'

const logger = createLogger('CoachScreen')

// Parst den <<VOICE_NAMING_CHOICE ...>>-Steuerblock aus einer Coach-Antwort
// ("Innere Stimmen", Phase 2) und trennt ihn vom sichtbaren Chat-Text.
// Solange der Block noch nicht geschlossen ist (Streaming läuft noch),
// wird nur der Text davor angezeigt — kein rohes Marker-Fragment.
function extractVoiceNaming(content) {
  const idx = content.indexOf('<<VOICE_NAMING_CHOICE')
  if (idx === -1) return { cleanText: content, naming: null }
  const cleanText = content.slice(0, idx).trimEnd()
  const blockMatch = content.slice(idx).match(/<<VOICE_NAMING_CHOICE([\s\S]*?)>>/)
  if (!blockMatch) return { cleanText, naming: null }
  const body = blockMatch[1]
  const voiceId = body.match(/voiceId:\s*(\S+)/)?.[1]
  const optionsRaw = body.match(/options:\s*(.*)/)?.[1] ?? ''
  const options = optionsRaw.split('|').map(s => s.trim()).filter(Boolean)
  const allowCustom = /allowCustom:\s*true/.test(body)
  const allowDismiss = /allowDismiss:\s*true/.test(body)
  if (!voiceId) return { cleanText, naming: null }
  return { cleanText, naming: { voiceId, options, allowCustom, allowDismiss } }
}

function VoiceNamingChips({ naming, onChoose }) {
  const [custom, setCustom] = useState('')
  return (
    <div className="flex flex-col gap-2 mt-1 mb-1 ml-1">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {naming.options.map((name, i) => (
          <button
            key={i}
            onClick={() => onChoose(name, false)}
            className="flex-none bg-premium-light text-premium text-[13px] px-4 py-2 rounded-full border border-[var(--color-premium)]/30 whitespace-nowrap hover:opacity-80 transition-all"
          >
            {name}
          </button>
        ))}
      </div>
      {naming.allowCustom && (
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Eigener Name..."
            className="flex-1 text-[13px] bg-surface border border-[var(--color-border)] rounded-full px-3 py-1.5 text-ink"
          />
          <button
            disabled={!custom.trim()}
            onClick={() => onChoose(custom.trim(), false)}
            className="text-[13px] text-accent font-medium px-3 disabled:opacity-40"
          >
            Bestätigen
          </button>
        </div>
      )}
      {naming.allowDismiss && (
        <button onClick={() => onChoose(null, true)} className="text-[12px] text-ink-3 text-left hover:underline">
          Passt nicht für mich
        </button>
      )}
    </div>
  )
}

// Ein Gespräch gilt als „läuft noch“, wenn die letzte Nachricht jünger als 2 Stunden ist (UX-Konzept 4.2a).
const RUNNING_WINDOW_MS = 2 * 60 * 60 * 1000

export function CoachScreen() {
  const { user, session, profile, updateProfile, refreshProfile } = useAuth()
  const { updateStreak } = useStreak()
  const location = useLocation()
  const navigate = useNavigate()
  const { memory, updateMemory } = useMemory(user?.id)
  // U4: Phase (Kennenlernen · Ruhemodus · Begleitung) nur zur Anzeige. Starts und Kappung
  // setzt der Server durch (consume_session, chat): 429 session_limit → Ruhemodus-Hinweis,
  // 409 conversation_cap → Kappungshinweis.
  const { access, loading: accessLoading, refresh: refreshAccess } = useAccessState()
  const canStart = access ? access.can_start !== false : true
  const [showRestSheet, setShowRestSheet] = useState(false)
  const [capReached, setCapReached] = useState(false)
  // Paket Z: Monatskontingent der Begleitung. restQuota → Textzweig im Ruhemodus-Sheet,
  // quotaNotice → Hinweiszeile im Gespräch ({ kind: 'warn'|'grace'|'reached', remaining, periodEnd })
  const [restQuota, setRestQuota] = useState(null)
  const [quotaNotice, setQuotaNotice] = useState(null)
  function openRestSheet(info) {
    if (info?.reason === 'quota') setRestQuota({ periodEnd: info.periodEnd ?? access?.quota_resets_at ?? null, tier: access?.tier ?? null })
    else if (!info && access?.quota_reached) setRestQuota({ periodEnd: access.quota_resets_at ?? null, tier: access.tier ?? null })
    else setRestQuota(null)
    setShowRestSheet(true)
  }
  const { messages, isLoading, conversationId, startNewConversation, startWellnessConversation, startEntryContextConversation, sendMessage, retryMessage, extractMemoryAndInsight, loadConversation, resumeWithOpening, isConversationCounted } = useChat(user?.id, session, {
    onSessionLimit: (info) => { openRestSheet(info); refreshAccess(); refreshProfile() },
    onConversationCap: () => { setCapReached(true); refreshAccess() },
    onQuotaReached: ({ periodEnd }) => { setQuotaNotice({ kind: 'reached', remaining: 0, periodEnd }); refreshAccess() },
    onQuotaNotice: (q) => setQuotaNotice({ kind: q?.grace ? 'grace' : 'warn', remaining: q?.remaining ?? 0, periodEnd: q?.periodEnd ?? null }),
  })
  const bottomRef = useRef(null)
  const hasStartedRef = useRef(false)
  // Refs für Navigation-State — sofort bei Mount gelesen, bevor React Router location.state verändern kann
  const entryContextRef = useRef(location.state?.entryContext ?? null)
  const wellnessCheckRef = useRef(location.state?.wellnessCheck ?? null)
  const resumeConversationIdRef = useRef(location.state?.resumeConversationId ?? null)
  // U5a: „Daran weiterarbeiten“ – { insightId, conversationId, content } (content nur zur Anzeige)
  const continueInsightRef = useRef(location.state?.continueInsight ?? null)
  const [activeContinue, setActiveContinue] = useState(null)
  const continueWroteRef = useRef(false)          // im Weiterarbeiten-Gespräch selbst geschrieben?
  const [ratingSheet, setRatingSheet] = useState(null)   // { insight, then }
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [endModal, setEndModal] = useState(null) // { content, category }
  // U3: Einstieg vor dem Chat. mode: 'loading' | 'entry' | 'chat'
  const [mode, setMode] = useState('loading')
  const [entryData, setEntryData] = useState({ recent: [], hasHistory: false })
  const [entryBusy, setEntryBusy] = useState(false)
  // "Innere Stimmen" Phase 2: bereits beantwortete Namensgebungs-Angebote
  // ausblenden, auch wenn dieselbe Nachricht erneut gerendert wird.
  const [handledVoiceIds, setHandledVoiceIds] = useState(new Set())
  // Kappungshinweis gilt nur für das Gespräch, in dem er ausgelöst wurde
  useEffect(() => { setCapReached(false); setQuotaNotice(null) }, [conversationId])

  // Übergangstext 1: vor dem letzten Kennenlern-Gespräch, einmal pro Gerät (E-U4-9).
  // Sichtbar im Einstieg UND oben in einem frisch begonnenen Gespräch (auch über „Neues Gespräch“),
  // bis die erste Nachricht dieses Gesprächs gesendet wird – erst dann gilt er als gesehen.
  const [trialHintSeen, setTrialHintSeen] = useState(false)
  const showTrialHint = !!user && !trialHintSeen && isLastTrialStart(access) && !seenOnce(TRIAL_LAST_HINT_KEY, user.id)
  const acknowledgeTrialHint = () => {
    if (!showTrialHint) return
    markSeen(TRIAL_LAST_HINT_KEY, user.id)
    setTrialHintSeen(true)
  }

  // Neues Gespräch nur, wenn ein Start möglich ist – sonst Ruhemodus-Hinweis (Übergangstext 3)
  const startNewOrRest = (isFirst = false) => {
    if (!canStart) {
      setMode('entry')
      openRestSheet()
      return false
    }
    startNewConversation(isFirst)
    return true
  }

  // Eckdaten für den Einstieg. Ergebnis: { briefing, recent, latestActiveConversation } oder null.
  const fetchEntryData = useCallback(async () => {
    const accessToken = session?.access_token ?? null
    if (!accessToken) return null
    const response = await fetch(functionUrl('pre-session-briefing'), {
      method: 'POST',
      headers: functionHeaders(accessToken),
      body: JSON.stringify({}),
    })
    if (!response.ok) {
      await checkMfaResponse(response)   // 403 mfa_required → Code-Abfrage (S-06b)
      logger.warn('entry_data_failed', { status: response.status })
      return null
    }
    const data = await response.json()
    setEntryData({ recent: Array.isArray(data?.recent) ? data.recent : [], hasHistory: !!data?.latestActiveConversation })
    return data
  }, [session])

  useEffect(() => {
    if (!user || !profile || accessLoading) return
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const wc = wellnessCheckRef.current
    const entryCtx = entryContextRef.current
    const resumeId = resumeConversationIdRef.current
    const continueIns = continueInsightRef.current

    // State löschen via React Router — kein erneutes Triggern bei Back-Navigation
    if (entryCtx || wc || resumeId || continueIns) {
      navigate('/coach', { replace: true, state: {} })
    }

    // U5a: Weiterarbeiten an einer Erkenntnis im Ursprungsgespräch (Coach steigt ein wie in einer
    // Folgesitzung). Setzt ein bestehendes Gespräch fort → kein neuer Start, auch im Ruhemodus.
    if (continueIns?.insightId && continueIns?.conversationId) {
      logger.info('Continue insight', { conversationId: continueIns.conversationId })
      setMode('chat')
      setShowQuickReplies(false)
      setActiveContinue(continueIns)
      continueWroteRef.current = false
      fetchEntryData().catch(() => {})   // für „←“ zurück zum Einstieg
      resumeWithOpening(continueIns.conversationId, { insightId: continueIns.insightId }).then(ok => {
        if (!ok) {
          logger.warn('Continue insight failed', { conversationId: continueIns.conversationId })
          setActiveContinue(null)
          setMode('entry')
        }
      })
      return
    }

    // VARIANTE 0: Bestehendes Gespräch aus dem Verlauf fortsetzen.
    // Höchste Priorität — expliziter Klick des Nutzers auf ein konkretes Gespräch
    // darf nicht von Wellness-Check/Wiederkehr-Begrüßung überschrieben werden.
    // Zählt nicht als neue Session (serverseitig über session_counted_at abgedeckt).
    if (resumeId) {
      logger.info('Resuming conversation from history', { conversationId: resumeId })
      setMode('chat')
      setShowQuickReplies(false)
      loadConversation(resumeId).then(ok => {
        if (!ok) {
          logger.warn('Resume failed, falling back to new conversation', { conversationId: resumeId })
          startNewConversation()
          setShowQuickReplies(true)
        }
      })
      return
    }

    // VARIANTE 3: Wellness-Check (höchste Priorität unter den automatischen Eröffnungen)
    // Im Ruhemodus kein neues Gespräch anlegen (U4) → Einstieg mit Hinweis
    if (wc && !canStart) {
      fetchEntryData().catch(() => {})
      setMode('entry')
      openRestSheet()
      return
    }
    if (wc) {
      logger.info('WellnessCheck received from navigation', { score: wc.score, hasContext: !!wc.context })
      setMode('chat')
      startWellnessConversation(wc).then(() => refreshProfile())
      return
    }

    // Eckdaten laden (pre-session-briefing, ohne Inhalte) und entscheiden: Entry-Kontext,
    // Erstgespräch, laufendes Gespräch (< 2 h) oder Einstieg (U3, UX-Konzept 4.2a).
    const loadAndStart = async () => {
      try {
        const data = await fetchEntryData()
        const latest = data?.latestActiveConversation ?? null

        if (entryCtx && entryCtx.source !== 'direct' && !canStart) {
          setMode('entry')
          openRestSheet()
          return
        }
        if (entryCtx && entryCtx.source !== 'direct') {
          logger.info('Entry context start', { source: entryCtx.source })
          setMode('chat')
          await startEntryContextConversation(entryCtx)
          refreshProfile()
          return
        }
        if (!data || !latest) {
          // Noch kein Gespräch mit eigener Nachricht → Erstgespräch, kein Einstieg
          setMode('chat')
          startNewOrRest(!!data && !latest)
          return
        }
        if (Date.now() - new Date(latest.lastMessageAt).getTime() < RUNNING_WINDOW_MS) {
          logger.info('Running conversation reopened', { conversationId: latest.id })
          setMode('chat')
          setShowQuickReplies(false)
          const ok = await loadConversation(latest.id)
          if (!ok) { setMode('entry') }
          return
        }
        setMode('entry')
      } catch {
        setMode('chat')
        startNewOrRest()
      }
    }

    loadAndStart()
  }, [user, profile, accessLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async (content, inputMode = 'text') => {
    // UX-Vorprüfung: Ein bereits gezähltes (laufendes oder fortgesetztes) Gespräch
    // darf weitergehen. Maßgeblich ist der Server (429 → onSessionLimit).
    const alreadyCounted = isConversationCounted(conversationId)
    if (!canStart && !alreadyCounted && !conversationHasOwnMessage(messages)) {
      openRestSheet()
      return
    }
    setShowQuickReplies(false)
    if (activeContinue && activeContinue.conversationId === conversationId) continueWroteRef.current = true
    if (!conversationHasOwnMessage(messages)) acknowledgeTrialHint()
    await sendMessage(content, inputMode)
    if (!alreadyCounted) { refreshProfile(); refreshAccess() } // Phase nach dem ersten Senden aktualisieren
    updateStreak(profile, updateProfile)
  }

  // processedRef: conversationId → Anzahl Nachrichten beim letzten Anstoß. Verhindert, dass
  // derselbe Stand mehrfach angestoßen wird (z.B. visibilitychange UND pagehide kurz
  // hintereinander), erlaubt aber einen neuen Lauf, wenn das Gespräch seitdem gewachsen ist
  // (z.B. Tab-Wechsel nach der ersten Nachricht, danach weitergeschrieben). Der Server ist
  // zusätzlich idempotent (post_processed_message_count).
  const processedRef = useRef(new Map())

  // Gemeinsame Kern-Funktion für ALLE Trigger-Pfade (v2.9, Abschnitt 6b.0).
  // keepalive: true sorgt dafür, dass der Request auch dann noch abgeschickt wird,
  // wenn das Dokument im selben Tick entladen wird (Tab-Schließen, Navigation weg
  // von der Seite). Anders als navigator.sendBeacon() erlaubt fetch mit keepalive
  // weiterhin eigene Header — wichtig, weil die Edge Function den Supabase-Access-
  // Token im Authorization-Header braucht.
  const runPostConversation = useCallback(async (msgs, convId) => {
    if (!convId || !msgs || msgs.length < 3) return
    if ((processedRef.current.get(convId) ?? 0) >= msgs.length) return // Idempotenz — Client-Seite
    processedRef.current.set(convId, msgs.length)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      await fetch(
        functionUrl('post-conversation'),
        {
          method: 'POST',
          keepalive: true,
          headers: functionHeaders(session.access_token),
          // S-12: nur die Gesprächs-ID — den Verlauf liest der Server selbst aus der DB
          body: JSON.stringify({ conversationId: convId }),
        }
      )
    } catch {
      // Fire-and-forget — Fehler nicht an den Nutzer weiterleiten.
      // processedRef NICHT zurücksetzen: ein Retry beim nächsten Trigger-Pfad
      // (z.B. pagehide nach fehlgeschlagenem visibilitychange-Versuch) ist
      // erwünscht und wird serverseitig durch die Idempotenz-Prüfung sauber
      // gehandhabt, falls beide durchkommen.
    }
  }, [])

  // messagesRef/conversationIdRef: synchrone Spiegel von messages/conversationId.
  // Notwendig, weil Event-Handler und die Unmount-Cleanup-Funktion sonst einen
  // veralteten Closure-Stand sehen (Stale-Closure-Problem bei useEffect-Cleanups).
  const messagesRef = useRef(messages)
  const conversationIdRef = useRef(conversationId)
  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { conversationIdRef.current = conversationId }, [conversationId])

  // Trigger-Pfad 2: Tab/App wird in den Hintergrund geschickt oder geschlossen.
  // visibilitychange feuert zuverlässiger als beforeunload, v.a. auf Mobile/PWA.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        runPostConversation(messagesRef.current, conversationIdRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [runPostConversation])

  // Trigger-Pfad 3: Seite wird endgültig verlassen (Tab-Schließen, Reload,
  // Zurück-Button). Ergänzt visibilitychange, da pagehide auch bei
  // bfcache-Navigation zuverlässig feuert.
  useEffect(() => {
    const handlePageHide = () => {
      runPostConversation(messagesRef.current, conversationIdRef.current)
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [runPostConversation])

  // Trigger-Pfad 4: Navigation innerhalb der SPA weg vom Coach-Screen
  // (z.B. Tab-Wechsel zu "Spiegel" oder "Profil"). React Router löst dabei
  // weder pagehide noch visibilitychange aus — braucht einen Unmount-Guard.
  useEffect(() => {
    return () => {
      runPostConversation(messagesRef.current, conversationIdRef.current)
    }
  }, [runPostConversation])

  // Einstieg: Weitermachen → Coach knüpft an DIESES Gespräch an (start 'resume'), keine neue Konversation
  const handleEntryResume = async (convId) => {
    setEntryBusy(true)
    setShowQuickReplies(false)
    setMode('chat')
    const ok = await resumeWithOpening(convId)
    setEntryBusy(false)
    if (!ok) {
      logger.warn('Resume from entry failed', { conversationId: convId })
      setMode('entry')
    }
  }

  const handleEntryNew = () => {
    if (!canStart) { openRestSheet(); return }
    setMode('chat')
    setShowQuickReplies(true)
    startNewConversation(false)
  }

  // U5a (E-U5a-5): Nach einem Weiterarbeiten-Gespräch, in dem selbst geschrieben wurde, einmalig
  // und überspringbar nach der Einschätzung fragen – danach geht es mit `next` weiter.
  const withContinueRating = (next) => {
    if (activeContinue && continueWroteRef.current) {
      setRatingSheet({ insight: activeContinue, then: next })
      return
    }
    setActiveContinue(null)
    next()
  }
  const finishRating = () => {
    const next = ratingSheet?.then
    setRatingSheet(null)
    setActiveContinue(null)
    continueWroteRef.current = false
    next?.()
  }

  // „←“ im Chat: zurück zum Einstieg. Nachbearbeitung wie beim Verlassen des Screens.
  const handleBackToEntry = () => withContinueRating(async () => {
    runPostConversation(messagesRef.current, conversationIdRef.current)
    setMode('entry')
    try { await fetchEntryData() } catch { /* Liste bleibt wie zuletzt */ }
  })

  const handleNewConversation = () => withContinueRating(startNewWithClosing)

  const startNewWithClosing = async () => {
    // Gedächtnis extrahieren bevor neues Gespräch startet
    if (messages.length >= 3) {
      // Post-processing fire-and-forget (RAG + Selbstreflexion)
      runPostConversation(messages, conversationId)

      const extracted = await extractMemoryAndInsight()
      if (extracted) {
        // Memory im Hintergrund aktualisieren
        if (extracted.themes || extracted.patterns || extracted.strengths || extracted.context) {
          await updateMemory({
            themes: extracted.themes || memory?.themes || [],
            patterns: extracted.patterns || memory?.patterns || [],
            strengths: extracted.strengths || memory?.strengths || [],
            context: { ...(memory?.context || {}), ...(extracted.context || {}) },
          })
        }
        // Conversation-Summary speichern
        if (conversationId && extracted.key_insight) {
          await supabase
            .from('conversations')
            .update({ key_insight: extracted.key_insight, memory_updated: true })
            .eq('id', conversationId)
        }
        // Erkenntnis vorschlagen
        if (extracted.suggested_insight?.content) {
          setEndModal(extracted.suggested_insight)
          return // Modal zeigen, neues Gespräch danach
        }
      }
    }
    if (startNewOrRest()) setShowQuickReplies(true)
  }

  // Abschluss (U3, 4.2c): bestätigte Erkenntnis gehört dem Nutzer (source 'user'); danach optional ein Vorhaben.
  const handleInsightSave = (insight) =>
    createConfirmedInsight({ userId: user?.id, conversationId, content: insight.content, category: insight.category })

  const handlePlanSave = (text) =>
    createConfirmedInsight({ userId: user?.id, conversationId, content: text, category: 'ziel' })

  const handleEndModalClose = () => {
    setEndModal(null)
    if (startNewOrRest()) setShowQuickReplies(true)
  }

  // "Innere Stimmen" Phase 2: Chip-Auswahl direkt in inner_voices schreiben
  // und als normale Nutzer-Nachricht weiterführen, damit der Coach natürlich
  // darauf reagieren kann (kein Formular, der Name entsteht im Gespräch).
  const handleVoiceNaming = async (voiceId, chosenName, dismissed) => {
    setHandledVoiceIds(prev => new Set(prev).add(voiceId))
    if (dismissed) {
      await supabase.from('inner_voices')
        .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
        .eq('id', voiceId)
      handleSend('Das passt nicht für mich.')
    } else {
      await supabase.from('inner_voices')
        .update({ status: 'named', name: chosenName, named_at: new Date().toISOString() })
        .eq('id', voiceId)
      handleSend(`Ich nenne sie „${chosenName}".`)
    }
  }

  // U3: Einstieg statt sofortigem Neustart
  if (mode === 'entry') {
    return (
      <div className="min-h-screen bg-bg">
        <ConversationEntry
          recent={entryData.recent}
          busy={entryBusy}
          onResume={handleEntryResume}
          onNew={handleEntryNew}
          onWellness={() => (canStart ? navigate('/wellness') : openRestSheet())}
          onAll={() => navigate('/coach/verlauf')}
          trialHint={showTrialHint}
          lastStartLabel={access?.starts_limit === 3 ? 'dritte' : 'letzte'}
        />
        {showRestSheet && <RestModeSheet quota={restQuota} onClose={() => setShowRestSheet(false)} />}
        {ratingSheet && <ContinueRatingSheet insight={ratingSheet.insight} onDone={finishRating} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-app bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface border-b border-[var(--color-border)] px-5 pt-safe-header pb-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex items-start gap-1">
            {entryData.hasHistory && (
              <button
                onClick={handleBackToEntry}
                aria-label="Zurück zum Einstieg"
                className="-ml-2 mt-1 p-1 text-ink-3 hover:text-ink-2 flex-none"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            <div className="min-w-0">
            <h1 className="font-display text-[24px] text-ink">Dein Begleiter</h1>
            <p className="text-[13px] text-ink-3">Fragen, die dich anders denken lassen</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <button
              onClick={handleNewConversation}
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-surface-2 text-ink text-[13px] font-medium px-3 py-1.5 rounded-full border border-[var(--color-border)] hover:bg-accent-light hover:text-accent transition-all disabled:opacity-50"
            >
              <Plus size={14} />
              Neues Gespräch
            </button>
            <ProfileButton />
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-[12px] text-ink-3">Bereit für dich</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
        {/* Übergangstext 1 (U4) in einem neuen, noch nicht begonnenen Gespräch */}
        {showTrialHint && !conversationHasOwnMessage(messages) && (
          <p className="text-[13px] text-ink-2 leading-relaxed bg-surface-2 rounded-xl px-4 py-3">
            Das ist dein {access?.starts_limit === 3 ? 'drittes' : 'letztes'} Gespräch zum Kennenlernen. Danach bleibt alles, was du hier erkannt hast, für dich sichtbar. Für neue Gespräche gibt es die Begleitung.
          </p>
        )}
        {messages.map((msg) => {
          const { cleanText, naming } = msg.role === 'assistant'
            ? extractVoiceNaming(msg.content)
            : { cleanText: msg.content, naming: null }
          return (
            <div key={msg.id}>
              {msg.messageType === 'crisis_response' ? (
                <CrisisResponseCard content={cleanText} />
              ) : msg.action === 'reload' ? (
                <button type="button" onClick={() => window.location.reload()} className="block w-full text-left">
                  <ChatBubble role={msg.role} content={cleanText} isError={msg.isError} />
                </button>
              ) : (
                <ChatBubble role={msg.role} content={cleanText} isError={msg.isError} />
              )}
              {msg.role === 'user' && msg.status === 'failed' && (
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => retryMessage(msg)}
                    disabled={isLoading}
                    className="text-[12px] text-coral underline disabled:opacity-50"
                  >
                    Nicht gesendet – nochmal versuchen
                  </button>
                </div>
              )}
              {naming && !isLoading && !handledVoiceIds.has(naming.voiceId) && (
                <VoiceNamingChips
                  naming={naming}
                  onChoose={(name, dismissed) => handleVoiceNaming(naming.voiceId, name, dismissed)}
                />
              )}
            </div>
          )
        })}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick Replies */}
      {showQuickReplies && messages.length === 1 && (
        <div className="px-5 pb-3">
          <QuickReplies onSelect={(r) => { setShowQuickReplies(false); handleSend(r) }} />
        </div>
      )}

      {/* Monatskontingent der Begleitung (Paket Z) */}
      {quotaNotice && (
        <QuotaNotice kind={quotaNotice.kind} remaining={quotaNotice.remaining} periodEnd={quotaNotice.periodEnd} tier={access?.tier ?? null} />
      )}

      {/* Kappungshinweis (U4, Übergangstext 4) */}
      {capReached && (
        <ConversationCapNotice
          canStart={canStart}
          onNewConversation={() => { if (startNewOrRest()) setShowQuickReplies(true) }}
        />
      )}

      {/* Chat Input */}
      <div className="sticky bottom-0">
        <ChatInput onSend={handleSend} disabled={isLoading || capReached || quotaNotice?.kind === 'reached'} />
      </div>

      {/* Gesprächs-Abschluss Modal */}
      {endModal && (
        <ConversationEndModal
          suggestion={endModal}
          onSave={handleInsightSave}
          onSavePlan={handlePlanSave}
          onClose={handleEndModalClose}
        />
      )}

      {/* Ruhemodus-Hinweis (U4, Übergangstext 3) */}
      {showRestSheet && <RestModeSheet quota={restQuota} onClose={() => setShowRestSheet(false)} />}

      {/* Einschätzung nach einem Weiterarbeiten-Gespräch (U5a) */}
      {ratingSheet && <ContinueRatingSheet insight={ratingSheet.insight} onDone={finishRating} />}
    </div>
  )
}

// Hat das Gespräch schon eine eigene Nachricht? Dann ist es gezählt und darf weitergehen (bis zur Kappung).
function conversationHasOwnMessage(msgs) {
  return msgs.some(m => m.role === 'user' && m.status !== 'failed')
}
