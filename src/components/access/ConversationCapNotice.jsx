// Übergangstext 4 (UX-Konzept 5.4, U4): Gespräch hat die Kappungsgrenze erreicht (409 conversation_cap).
// canStart: noch ein neuer Start möglich → „Neues Gespräch“, sonst „Begleitung →“.
import { useNavigate } from 'react-router-dom'

export function ConversationCapNotice({ canStart, onNewConversation }) {
  const navigate = useNavigate()
  return (
    <div role="status" className="mx-5 mb-3 bg-accent-light rounded-xl p-4">
      <p className="text-[14px] text-ink-2 leading-relaxed">
        Dieses Gespräch ist sehr lang geworden. Ein neues Gespräch gibt deinem Begleiter einen frischen Blick, und er erinnert sich trotzdem an alles.
      </p>
      {canStart ? (
        <button onClick={onNewConversation} className="text-[13px] text-accent font-medium mt-3">
          Neues Gespräch →
        </button>
      ) : (
        <button onClick={() => navigate('/begleitung')} className="text-[13px] text-accent font-medium mt-3">
          Begleitung →
        </button>
      )}
    </div>
  )
}
