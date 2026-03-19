import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { ChatBubble } from '../../components/coach/ChatBubble'
import { TypingIndicator } from '../../components/coach/TypingIndicator'
import { ChatInput } from '../../components/coach/ChatInput'
import { supabase } from '../../lib/supabase'

const OPENING = "Hast du Fragen zur App — wie sie funktioniert, was sie kostet, oder ob sie das Richtige für dich ist? Ich beantworte sie gerne."

export function HowItWorksScreen() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: OPENING }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [coachMessageCount, setCoachMessageCount] = useState(0)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = async (content) => {
    if (!content.trim() || isLoading) return

    const userMsg = { id: Date.now(), role: 'user', content }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setIsLoading(true)

    const assistantMsg = { id: Date.now() + 1, role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
            howtoMode: true,
          }),
        }
      )

      if (!response.ok) throw new Error('API error')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullContent += parsed.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent }
                  return updated
                })
              }
            } catch {}
          }
        }
      }

      // Zähle Coach-Antworten für Übergangs-Hinweis
      setCoachMessageCount(prev => prev + 1)

    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Das Gespräch hatte einen kurzen Aussetzer. Schreib einfach weiter — ich bin noch da.',
          isError: true,
        }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-surface border-b border-[var(--color-border)] px-5 pt-12 pb-4 flex-none">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink-3 hover:text-ink-2 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-[24px] text-ink">Wie es funktioniert</h1>
        </div>
      </div>

      {/* Scrollbarer Bereich */}
      <div className="flex-1 overflow-y-auto">
        {/* Statische Erklärungsblöcke */}
        <div className="px-5 py-6 flex flex-col gap-6">

          {/* Block 1 */}
          <div>
            <h2 className="text-[16px] font-medium text-ink mb-2">Was kannst du hier tun?</h2>
            <p className="text-[14px] text-ink-2 leading-[1.7]">
              Du bringst ein Thema — groß oder klein. Etwas, das dich beschäftigt, nervt, blockiert oder einfach nicht loslässt. Die App stellt dir Fragen. Nicht um dich zu analysieren. Sondern damit du selbst klarer siehst, was wirklich los ist.
            </p>
          </div>

          {/* Block 2 — Jerome */}
          <div>
            <h2 className="text-[16px] font-medium text-ink mb-3">Dein Coach im Hintergrund</h2>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-none">
                <span className="font-display text-white text-[18px]">J</span>
              </div>
              <div>
                <p className="text-[15px] text-ink font-medium">Jerome Houboi</p>
                <p className="text-[13px] text-ink-2">Zertifizierter Systemischer Coach</p>
                <p className="text-[12px] text-ink-3">Paracelsus · 160 Unterrichtsstunden</p>
              </div>
            </div>
            <p className="text-[14px] text-ink-2 leading-[1.7]">
              Der KI-Coach dieser App arbeitet nach den Prinzipien des Systemischen Coachings — entwickelt und verantwortet von Jerome. Systemisches Coaching hilft dir, Muster zu erkennen, die dich unbewusst steuern. Nicht durch Ratschläge — durch die richtigen Fragen.
            </p>
            <a
              href="https://www.friedensstifter.coach"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-accent hover:underline mt-1 inline-block"
            >
              Mehr über Jerome → friedensstifter.coach
            </a>
          </div>

          {/* Block 3 — Datenschutz */}
          <div className="bg-accent-light rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={18} color="var(--color-accent)" />
              <h2 className="text-[15px] font-medium text-ink">Dein Raum gehört dir</h2>
            </div>
            <ul className="flex flex-col gap-1.5">
              {[
                'Deine Gespräche werden nur für dich gespeichert',
                'Keine Weitergabe an Dritte — niemals',
                'Keine Werbung, kein Tracking deines Verhaltens',
                'Deine Daten werden nicht zum Training von KI-Modellen verwendet',
              ].map((item, i) => (
                <li key={i} className="flex gap-2 text-[14px] text-ink-2">
                  <span className="text-accent flex-none">·</span>
                  {item}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/profile')} className="text-[13px] text-ink-3 hover:text-ink-2 mt-2 hover:underline">
              Datenschutzerklärung lesen →
            </button>
          </div>

          {/* Block 4 — Systemisches Coaching */}
          <div>
            <h2 className="text-[16px] font-medium text-ink mb-2">Was steckt dahinter?</h2>
            <p className="text-[14px] text-ink-2 leading-[1.7]">
              Systemisches Coaching geht davon aus, dass wir alle in Systemen leben — Familie, Arbeit, Beziehungen. Und dass unsere Reaktionen oft unbewussten Mustern folgen, die in diesen Systemen entstanden sind.
            </p>
            <p className="text-[14px] text-ink-2 leading-[1.7] mt-2">
              Der Ansatz hilft dir, einen Schritt zurückzutreten und das Muster zu sehen — statt mittendrin zu stecken. Nicht Analyse. Nicht Therapie. Sondern Klarheit durch Fragen.
            </p>
          </div>

          {/* Trenner */}
          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-[13px] text-ink-3">Noch Fragen? Frag einfach.</span>
            <span className="flex-1 h-px bg-[var(--color-border)]" />
          </div>
        </div>

        {/* Chat-Bereich */}
        <div className="px-5 pb-4 flex flex-col gap-3">
          {messages.map(msg => (
            <ChatBubble key={msg.id} role={msg.role} content={msg.content} isError={msg.isError} />
          ))}
          {isLoading && <TypingIndicator />}

          {/* Übergangs-Hinweis nach 3 Coach-Antworten */}
          {coachMessageCount >= 3 && (
            <div className="bg-surface border border-[var(--color-border)] rounded-lg p-4 text-center animate-[fadeIn_0.3s_ease]">
              <p className="text-[13px] text-ink-3 mb-3">Für tiefere Gespräche ist der Coach-Bereich der richtige Ort.</p>
              <button
                onClick={() => navigate('/coach')}
                className="bg-accent text-white text-[13px] font-medium px-4 py-2 rounded-full hover:bg-accent-2 transition-colors"
              >
                Zum Coach →
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="flex-none">
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  )
}
