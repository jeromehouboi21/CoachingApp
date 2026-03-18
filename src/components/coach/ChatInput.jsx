import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowUp, Mic } from 'lucide-react'
import { useVoiceInput } from '../../hooks/useVoiceInput'

export function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')
  const [interimText, setInterimText] = useState('')
  const textareaRef = useRef(null)

  const handleTranscript = useCallback((text) => {
    setValue(prev => (prev ? prev + ' ' + text : text).trim())
    setInterimText('')
  }, [])

  const handleInterim = useCallback((text) => {
    setInterimText(text)
  }, [])

  const { isListening, isSupported, toggle } = useVoiceInput({
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
    onSend(value.trim())
    setValue('')
    setInterimText('')
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

      <div className="flex items-end gap-2 p-3">
        {/* Mikrofon-Button */}
        {isSupported && (
          <button
            onClick={toggle}
            disabled={disabled}
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
    </div>
  )
}
