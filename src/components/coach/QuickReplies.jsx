const DEFAULT_REPLIES = [
  "Das trifft es gut.",
  "Ich weiß es nicht genau.",
  "Dazu mehr erzählen?",
  "Das ist neu für mich.",
]

export function QuickReplies({ onSelect, replies = DEFAULT_REPLIES }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {replies.map((reply, i) => (
        <button
          key={i}
          onClick={() => onSelect(reply)}
          className="flex-none bg-surface-2 text-ink text-[13px] px-4 py-2 rounded-full border border-[var(--color-border)] whitespace-nowrap hover:bg-accent-light hover:text-accent hover:border-accent transition-all"
        >
          {reply}
        </button>
      ))}
    </div>
  )
}
