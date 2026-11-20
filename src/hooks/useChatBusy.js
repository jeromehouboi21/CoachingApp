import { useEffect, useState } from 'react'
import { isChatBusy, subscribeChatBusy } from '../lib/chatActivity'

export function useChatBusy() {
  const [busy, setBusy] = useState(isChatBusy)
  useEffect(() => subscribeChatBusy(setBusy), [])
  return busy
}
