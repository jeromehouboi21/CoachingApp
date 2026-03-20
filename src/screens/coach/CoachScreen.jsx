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

export function CoachScreen() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { memory, updateMemory } = useMemory(user?.id)
  const { messages, isLoading, conversationId, startNewConversation, startWellnessConversation, sendMessage, extractMemoryAndInsight } = useChat(user?.id, memory)
  const bottomRef = useRef(null)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [endModal, setEndModal] = useState(null) // { content, category }
  const sessionsLeft = 3 - (profile?.sessions_used_this_month || 0)

  useEffect(() => {
    if (!user) return

    const wc = location.state?.wellnessCheck ?? null
    if (wc) {
      logger.info('WellnessCheck received from navigation', { score: wc.score, hasContext: !!wc.context })
      startWellnessConversation(wc)
    } else {
      logger.debug('CoachScreen mounted — standard entry')
      startNewConversation()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

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
