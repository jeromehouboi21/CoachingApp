// Schritt 3: drei Chat-Blasen und Eingabezeile mit Mikrofon (Design-Canvas „Gespraech“)
import { Mic } from 'lucide-react'
import { MiniTabBar } from './MiniTabBar'
import { TOUR_EXAMPLES as EX } from '../../../content/welcomeTour'

export function ConversationIllustration() {
  return (
    <>
      <div className="flex flex-col gap-[7px]">
        {EX.chat.map((m, i) => (
          <div
            key={i}
            className={m.role === 'user'
              ? 'self-end max-w-[78%] bg-accent text-white text-[12px] leading-[1.4] px-[11px] py-2 rounded-[14px_14px_4px_14px]'
              : 'self-start max-w-[82%] bg-surface border border-[var(--color-border)] text-ink text-[12px] leading-[1.4] px-[11px] py-2 rounded-[14px_14px_14px_4px]'}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2 bg-surface border border-[var(--color-border)] rounded-full py-1.5 pr-1.5 pl-3.5">
        <span className="flex-1 text-[12px] text-ink-2">{EX.chatPlaceholder}</span>
        <span className="w-[30px] h-[30px] rounded-full bg-accent-light flex items-center justify-center">
          <Mic size={15} strokeWidth={1.8} color="var(--color-accent)" />
        </span>
      </div>
      <div className="flex-1" />
      <MiniTabBar active="Gespräch" />
    </>
  )
}
