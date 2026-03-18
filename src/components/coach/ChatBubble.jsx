export function ChatBubble({ role, content, isError }) {
  const isCoach = role === 'assistant'
  return (
    <div className={`flex ${isCoach ? 'justify-start' : 'justify-end'} animate-[fadeIn_0.2s_ease]`}>
      <div
        className={`max-w-[82%] px-4 py-[14px] text-[15px] leading-[1.6] ${
          isCoach
            ? 'bg-surface border border-[var(--color-border)] rounded-[18px_18px_18px_6px] text-ink'
            : 'bg-accent text-white rounded-[18px_18px_6px_18px]'
        } ${isError ? 'opacity-70 italic' : ''}`}
      >
        {content || <span className="opacity-50">...</span>}
      </div>
    </div>
  )
}
