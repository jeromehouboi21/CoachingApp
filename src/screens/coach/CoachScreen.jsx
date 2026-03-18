import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useChat } from '../../hooks/useChat'
import { ChatBubble } from '../../components/coach/ChatBubble'
import { TypingIndicator } from '../../components/coach/TypingIndicator'
import { ChatInput } from '../../components/coach/ChatInput'
import { QuickReplies } from '../../components/coach/QuickReplies'
import { ScaleSlider } from '../../components/ui/ScaleSlider'
import { Badge } from '../../components/ui/Badge'

export function CoachScreen() {
  const { user, profile } = useAuth()
  const { messages, isLoading, startNewConversation, sendMessage } = useChat(user?.id)
  const bottomRef = useRef(null)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const sessionsLeft = 3 - (profile?.sessions_used_this_month || 0)

  useEffect(() => {
    startNewConversation()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async (content) => {
    if (profile?.plan === 'free' && sessionsLeft <= 0) {
      setShowLimitModal(true)
      return
    }
    setShowQuickReplies(false)
    await sendMessage(content)
  }

  const handleScaleSubmit = (value) => {
    handleSend(`Ich würde sagen: ${value} von 10.`)
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
            onClick={() => startNewConversation()}
            className="flex items-center gap-1.5 bg-surface-2 text-ink text-[13px] font-medium px-3 py-1.5 rounded-full border border-[var(--color-border)] hover:bg-accent-light hover:text-accent transition-all"
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

      {/* Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6">
            <h3 className="font-display text-[22px] text-ink mb-2">Alle 3 Gespräche für diesen Monat genutzt</h3>
            <p className="text-[14px] text-ink-2 mb-5">Upgrade auf Premium für unbegrenzte Gespräche — oder buche ein persönliches Gespräch mit Jerome.</p>
            <div className="flex flex-col gap-3">
              <button className="w-full bg-accent text-white py-3 rounded-full font-medium">Premium entdecken</button>
              <a href="https://www.friedensstifter.coach/contact/" className="w-full border border-[var(--color-border)] text-ink py-3 rounded-full font-medium text-center">Mit Jerome sprechen</a>
              <button onClick={() => setShowLimitModal(false)} className="text-[13px] text-ink-3 text-center">Schließen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
