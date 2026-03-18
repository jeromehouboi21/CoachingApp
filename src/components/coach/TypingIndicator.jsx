export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-surface border border-[var(--color-border)] rounded-[18px_18px_18px_6px] px-4 py-[14px]">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-ink-3 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
