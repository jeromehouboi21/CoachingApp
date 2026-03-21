import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useChat } from '../../hooks/useChat'
import { useMemory } from '../../hooks/useMemory'
import { ChatBubble } from '../../components/coach/ChatBubble'
import { TypingIndicator } from '../../components/coach/TypingIndicator'
import { ChatInput } from '../../components/coach/ChatInput'
import { QuickReplies } from '../../components/coach/QuickReplies'
import { ConversationEndModal } from '../../components/coach/ConversationEndModal'
import { Badge } from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'

const logger = createLogger('CoachScreen')
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Prüft ob Wiederkehr-Begrüßung angezeigt werden soll (alle 5 Bedingungen aus Spec 7.3)
function shouldShowReturnGreeting(briefing, profile) {
  if (!briefing?.openThread) return false
  if (briefing.conversationCount <= 1) return false
  if (briefing.daysSince < 2) return false
  if (profile?.last_return_greeting_at) {
    const daysSinceGreeting = Math.floor(
      (Date.now() - new Date(profile.last_return_greeting_at).getTime()) / 86400000
    )
    if (daysSinceGreeting < 5) return false
  }
  return true
}

export function CoachScreen() {
  const { user, session, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { memory, updateMemory } = useMemory(user?.id)
  const { messages, isLoading, conversationId, startNewConversation, startWellnessConversation, startBriefingConversation, sendMessage, extractMemoryAndInsight } = useChat(user?.id, memory, session)
  const bottomRef = useRef(null)
  const hasStartedRef = useRef(false)
  const sessionCountedRef = useRef(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [endModal, setEndModal] = useState(null) // { content, category }
  const sessionsLeft = 3 - (profile?.sessions_used_this_month || 0)

  useEffect(() => {
    if (!user || !profile) return
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const wc = location.state?.wellnessCheck ?? null

    // VARIANTE 3: Wellness-Check
    if (wc) {
      logger.info('WellnessCheck received from navigation', { score: wc.score, hasContext: !!wc.context })
      startWellnessConversation(wc)
      countSession()
      return
    }

    // Briefing laden und Eröffnungs-Variante entscheiden
    const loadAndStart = async () => {
      try {
        const accessToken = session?.access_token ?? null
        if (!accessToken) { startNewConversation(); countSession(); return }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pre-session-briefing`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({}),
          }
        )
        const data = response.ok ? await response.json() : null
        const briefing = data?.briefing ?? null
        const coachFile = data?.coachFile ?? null
        const isFirstEver = !briefing || briefing.conversationCount === 0

        // VARIANTE 1: Wiederkehr-Begrüßung mit offenem Faden
        if (briefing && shouldShowReturnGreeting(briefing, profile)) {
          logger.info('Return greeting triggered', { intensity: briefing.openThread?.intensity })
          await startBriefingConversation(briefing, coachFile)
          // last_return_greeting_at aktualisieren (fire-and-forget)
          supabase
            .from('profiles')
            .update({ last_return_greeting_at: new Date().toISOString() })
            .eq('id', user.id)
            .then(() => logger.debug('last_return_greeting_at updated'))
        } else {
          // VARIANTE 2: Normaler Start
          logger.debug('Standard entry', { isFirstEver, hasOpenThread: !!briefing?.openThread })
          startNewConversation(isFirstEver, coachFile)
        }
      } catch {
        startNewConversation()
      }
      countSession()
    }

    loadAndStart()
  }, [user, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const countSession = () => {
    if (!sessionCountedRef.current && profile?.plan === 'free') {
      sessionCountedRef.current = true
      supabase
        .from('profiles')
        .update({ sessions_used_this_month: (profile?.sessions_used_this_month || 0) + 1 })
        .eq('id', user.id)
        .then(() => logger.debug('Session counter incremented'))
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async (content, inputMode = 'text') => {
    if (profile?.plan === 'free' && sessionsLeft <= 0) {
      setShowLimitModal(true)
      return
    }
    setShowQuickReplies(false)
    await sendMessage(content, inputMode)
  }

  const runPostConversation = useCallback(async (msgs, convId) => {
    if (!msgs || msgs.length < 3) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post-conversation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: msgs.map(m => ({ role: m.role, content: m.content })),
            conversationId: convId,
          }),
        }
      )
    } catch {
      // Fire-and-forget — Fehler nicht an den Nutzer weiterleiten
    }
  }, [])

  const handleNewConversation = async () => {
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
    startNewConversation()
    setShowQuickReplies(true)
  }

  const handleInsightConfirm = async (insight) => {
    if (user) {
      await supabase.from('insights').insert({
        user_id: user.id,
        conversation_id: conversationId,
        content: insight.content,
        category: insight.category,
        source: 'auto',
      })
    }
    setEndModal(null)
    startNewConversation()
    setShowQuickReplies(true)
  }

  const handleInsightSkip = () => {
    setEndModal(null)
    startNewConversation()
    setShowQuickReplies(true)
  }

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface border-b border-[var(--color-border)] px-5 pt-12 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-[24px] text-ink">Dein Begleiter</h1>
            <p className="text-[13px] text-ink-3">Fragen, die dich anders denken lassen</p>
          </div>
          <button
            onClick={handleNewConversation}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-surface-2 text-ink text-[13px] font-medium px-3 py-1.5 rounded-full border border-[var(--color-border)] hover:bg-accent-light hover:text-accent transition-all disabled:opacity-50"
          >
            <Plus size={14} />
            Neues Gespräch
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-[12px] text-ink-3">Bereit für dich</span>
          </div>
          {profile?.plan === 'premium' ? (
            <Badge variant="premium">Premium</Badge>
          ) : (
            <Badge variant="free">{sessionsLeft} von 3 frei</Badge>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} role={msg.role} content={msg.content} isError={msg.isError} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick Replies */}
      {showQuickReplies && messages.length === 1 && (
        <div className="px-5 pb-3">
          <QuickReplies onSelect={(r) => { setShowQuickReplies(false); handleSend(r) }} />
        </div>
      )}

      {/* Chat Input */}
      <div className="sticky bottom-0">
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>

      {/* Gesprächs-Abschluss Modal */}
      {endModal && (
        <ConversationEndModal
          suggestion={endModal}
          onConfirm={handleInsightConfirm}
          onSkip={handleInsightSkip}
        />
      )}

      {/* Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6">
            <h3 className="font-display text-[22px] text-ink mb-2">Alle 3 Gespräche für diesen Monat genutzt</h3>
            <p className="text-[14px] text-ink-2 mb-5">Upgrade auf Premium für unbegrenzte Gespräche — oder buche ein persönliches Gespräch mit Jerome.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/premium')} className="w-full bg-accent text-white py-3 rounded-full font-medium">Premium entdecken</button>
              <a href="https://www.friedensstifter.coach/contact/" className="w-full border border-[var(--color-border)] text-ink py-3 rounded-full font-medium text-center">Mit Jerome sprechen</a>
              <button onClick={() => setShowLimitModal(false)} className="text-[13px] text-ink-3 text-center">Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
