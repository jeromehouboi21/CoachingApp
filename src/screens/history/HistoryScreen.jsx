import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'

const logger = createLogger('HistoryScreen')

export function HistoryScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  // Seit U2 ohne Sperre: Nachlesen und Fortsetzen ist für alle frei (UX-Konzept 5.3).
  // Gezählt und begrenzt wird ausschließlich serverseitig (consume_session in chat).

  useEffect(() => {
    if (!user) return
    supabase
      .rpc('get_conversation_history')
      .then(({ data, error }) => {
        if (error) {
          logger.error('Failed to load conversation history', { error: error.message })
          setConversations([])
        } else {
          setConversations(data ?? [])
        }
        setLoading(false)
      })
  }, [user])

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const previewText = (conv) => {
    if (conv.main_topic) return conv.main_topic
    if (conv.first_user_message) {
      return conv.first_user_message.length > 120
        ? conv.first_user_message.slice(0, 120).trimEnd() + '…'
        : conv.first_user_message
    }
    return 'Gespräch'
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <button
          onClick={() => navigate('/coach')}
          className="flex items-center gap-1 text-ink-3 text-[13px] mb-6"
        >
          <ChevronLeft size={16} />
          Zurück
        </button>
        <h1 className="font-display text-[24px] text-ink mb-2">Dein Gesprächsverlauf</h1>
        <p className="text-[14px] text-ink-2 leading-relaxed">
          Jedes Gespräch bleibt hier — du kannst es jederzeit weiterführen.
        </p>
      </div>

      <div className="px-5 pb-24">
        {loading && (
          <div className="flex gap-1 justify-center py-10">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="bg-surface border border-[var(--color-border)] rounded-xl p-6 text-center">
            <p className="text-[15px] text-ink-2 mb-4">
              Noch keine Gespräche — dein Verlauf füllt sich, sobald du loslegst.
            </p>
            <button
              onClick={() => navigate('/coach')}
              className="bg-accent text-white text-[13px] font-medium px-5 py-2.5 rounded-full hover:bg-accent-2 transition-colors"
            >
              Erstes Gespräch beginnen →
            </button>
          </div>
        )}

        {!loading && conversations.length > 0 && (
          <div className="flex flex-col gap-4">
            {conversations.map((conv) => {
              return (
                <div
                  key={conv.id}
                  className="bg-surface border border-[var(--color-border)] rounded-xl p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] text-ink-3">{formatDate(conv.updated_at)}</span>
                    <span className="w-1 h-1 rounded-full bg-ink-3" />
                    <span className="flex items-center gap-1 text-[11px] text-ink-3">
                      <MessageCircle size={11} />
                      {conv.message_count}
                    </span>
                  </div>
                  <p className="text-[14px] text-ink-2 leading-relaxed mb-4">
                    {previewText(conv)}
                  </p>
                  <button
                    onClick={() => navigate('/coach', { state: { resumeConversationId: conv.id } })}
                    className="text-[13px] text-accent font-medium hover:underline"
                  >
                    Gespräch fortsetzen →
                  </button>
                </div>
              )
            })}

          </div>
        )}
      </div>
    </div>
  )
}
