import { useState, useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

export function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '42px'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [value])

  const handleSubmit = () => {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex items-end gap-2 p-3 bg-surface border-t border-[var(--color-border)]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Schreib etwas…"
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-surface-2 rounded-[20px] px-4 py-[10px] text-[15px] text-ink placeholder:text-ink-3 outline-none border-none min-h-[42px] max-h-[120px] overflow-y-auto"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
        className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-none disabled:opacity-40 transition-opacity"
      >
        <ArrowUp size={18} color="white" />
      </button>
    </div>
  )
}
