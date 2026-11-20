import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowUp, Mic } from 'lucide-react'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { CHAT_AI_NOTICE, VOICE_MISTRAL_ENABLED } from '../../content/legalTexts'

// S-11: Hinweis beim ersten Mikrofon-Tipp pro Gerät. Ohne localStorage (privat, blockiert) jedes Mal.
const VOICE_HINT_KEY = 'fs_voice_hint_v1'
function voiceHintSeen() {
  try { return localStorage.getItem(VOICE_HINT_KEY) === '1' } catch { return false }
}
function markVoiceHintSeen() {
  try { localStorage.setItem(VOICE_HINT_KEY, '1') } catch { /* ohne Speicher: Hinweis kommt beim nächsten Mal wieder */ }
}

export function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')
  const [interimText, setInterimText] = useState('')
  const [showVoiceHint, setShowVoiceHint] = useState(false)
  const textareaRef = useRef(null)

  const handleTranscript = useCallback((text) => {
    setValue(prev => (prev ? prev + ' ' + text : text).trim())
    setInterimText('')
  }, [])

  const handleInterim = useCallback((text) => {
    setInterimText(text)
  }, [])

  const { isListening, isSupported, toggle, stop: stopListening } = useVoiceInput({
    onTranscript: handleTranscript,
    onInterim: handleInterim,
  })

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '38px'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [value])

  const handleSubmit = () => {
    if (!value.trim() || disabled) return
    if (isListening) stopListening()   // beim Absenden Mikrofon aus
    onSend(value.trim())
    setValue('')
    setInterimText('')
  }

  // Mikrofon: beim ersten Tipp erst der Hinweis, Aufnahme nur nach ausdrücklichem „Mikrofon starten“
  const handleMicClick = () => {
    if (!isListening && !voiceHintSeen()) {
      setShowVoiceHint(true)
      return
    }
    toggle()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="bg-surface border-t border-[var(--color-border)]">
      {/* Status-Leiste während Aufnahme */}
      {isListening && (
        <div className="flex items-center gap-2 px-4 py-2 bg-accent">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-[13px] text-white font-medium">Ich höre zu …</span>
        </div>
      )}

      {/* Transkriptions-Vorschau */}
      {interimText && (
        <div className="px-4 py-1.5 bg-accent-light">
          <p className="text-[13px] text-ink-2 italic">{interimText}</p>
        </div>
      )}

      {showVoiceHint && (
        <div className="px-4 pt-3 pb-1" role="dialog" aria-label="Kurz zur Spracheingabe">
          <div className="bg-surface-2 rounded-xl p-4">
            <p className="text-[14px] text-ink font-medium mb-1">Kurz zur Spracheingabe</p>
            <p className="text-[13px] text-ink-2 leading-relaxed mb-2">
              Die Spracheingabe nutzt die Spracherkennung deines Browsers. Dafür kann das Gesagte an Google (Chrome) oder Apple (Safari) übertragen und dort in Text umgewandelt werden. Was am Ende im Textfeld steht, siehst du, bevor du es abschickst.
            </p>
            <p className="text-[13px] text-ink-2 leading-relaxed mb-3">
              Wenn du das lieber nicht möchtest, kannst du einfach tippen.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => { markVoiceHintSeen(); setShowVoiceHint(false); toggle() }}
                className="bg-accent text-white text-[13px] font-medium px-4 py-2 rounded-full"
              >
                Verstanden, Mikrofon starten
              </button>
              <button
                onClick={() => { setShowVoiceHint(false); textareaRef.current?.focus() }}
                className="text-[13px] text-ink-2 px-2 py-2"
              >
                Lieber tippen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        {/* Mikrofon-Button – Paket K (CODE-1): aus, bis die Spracheingabe über Mistral (EU) läuft.
            Die Browser-Spracherkennung schickt Aufnahmen an Google/Apple (Rechtstext A2). */}
        {VOICE_MISTRAL_ENABLED && isSupported && (
          <button
            onClick={handleMicClick}
            disabled={disabled}
            aria-label={isListening ? 'Spracheingabe beenden' : 'Spracheingabe starten'}
            className={`w-[38px] h-[38px] rounded-full flex items-center justify-center flex-none transition-all disabled:opacity-40 ${
              isListening
                ? 'bg-accent ring-4 ring-accent/30 animate-pulse'
                : 'bg-surface-2 hover:bg-accent-light'
            }`}
          >
            <Mic
              size={16}
              color={isListening ? 'white' : 'var(--color-accent)'}
            />
          </button>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Spreche …' : 'Schreib etwas…'}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-surface-2 rounded-[20px] px-4 py-[9px] text-[15px] text-ink placeholder:text-ink-3 outline-none border-none min-h-[38px] max-h-[120px] overflow-y-auto"
        />

        {/* Send-Button */}
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="w-[38px] h-[38px] rounded-full bg-accent flex items-center justify-center flex-none disabled:opacity-40 transition-opacity"
        >
          <ArrowUp size={16} color="white" />
        </button>
      </div>
      {/* KI-Hinweis, dauerhaft (Art. 50 Abs. 1 KI-VO, Paket K B1) */}
      <p className="text-[11px] text-ink-3 text-center pb-2 -mt-1">{CHAT_AI_NOTICE}</p>
    </div>
  )
}
