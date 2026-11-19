import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { OPENING_MESSAGES, FIRST_OPENING_MESSAGE } from '../lib/prompts'
import { createLogger } from '../lib/logger'
import { readRateLimit, rateLimitMessage } from '../lib/rateLimit'
import { functionHeaders, functionUrl } from '../lib/functions'

const logger = createLogger('useChat')
const CHAT_URL = functionUrl('chat')

const HICCUP_MESSAGE = 'Das Gespräch hatte einen kurzen Aussetzer. Schreib einfach weiter — ich bin noch da.'
const SESSION_EXPIRED_MESSAGE = 'Deine Sitzung ist abgelaufen. Bitte melde dich kurz ab und wieder an.'
export const OUTDATED_MESSAGE = 'Es gibt eine neue Version der App. Tipp hier, um sie zu laden.'

function generateRequestId() {
  return crypto.randomUUID().slice(0, 8)
}

function postChat(accessToken, body) {
  return fetch(CHAT_URL, {
    method: 'POST',
    headers: functionHeaders(accessToken),
    body: JSON.stringify(body),
  })
}

async function isClientOutdated(response) {
  if (response.status !== 409) return false
  try {
    const body = await response.clone().json()
    return body?.error === 'client_outdated'
  } catch {
    return false
  }
}

function outdatedBubble() {
  return { role: 'assistant', content: OUTDATED_MESSAGE, isError: true, action: 'reload', id: `outdated-${Date.now()}` }
}

// SSE-Stream lesen. Zeilen werden gepuffert, damit ein über zwei Chunks verteiltes
// Ereignis nicht verloren geht.
async function readStream(response, { onMeta, onText }) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finished = false
  while (!finished) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') { finished = true; break }
      try {
        const parsed = JSON.parse(data)
        if (parsed.meta) onMeta?.(parsed.meta)
        if (parsed.text) onText?.(parsed.text)
      } catch { /* unvollständige oder fremde Zeile */ }
    }
  }
}

// Seit S-12 (Paket B) schreibt nur noch der Server Nachrichten. Der Client schickt pro
// Nachricht { conversationId, message: { clientMessageId, content, inputMode } } bzw. für
// Eröffnungen { conversationId, start }. Akte, Briefing, Resonanzkarte, Gedächtnis und RAG
// lädt die chat-Function selbst.
//
// options.onSessionLimit: wird aufgerufen, wenn der Server mit 429 (Monatslimit) antwortet.
export function useChat(userId, session, options = {}) {
  const onSessionLimitRef = useRef(options.onSessionLimit)
  onSessionLimitRef.current = options.onSessionLimit
  // Konversationen, für die der Server bereits eine Sitzung gezählt hat (oder die
  // aus dem Verlauf fortgesetzt werden). Für die clientseitige UX-Prüfung des Limits.
  const countedConvIdsRef = useRef(new Set())
  // Promise auf die ID der gerade angelegten Konversation (Standard-Start), damit
  // eine schnell getippte erste Nachricht nicht ohne conversationId rausgeht.
  const pendingConvRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)

  // Gemeinsamer Ablauf für Eröffnungen, bei denen der Coach sofort antwortet
  // (Wellness-Check, Wiederkehr-Begrüßung, Entry-Kontext). Die Antwort speichert der Server.
  const startStreamedOpening = useCallback(async ({ variant, title, extra = {}, errorLabel }) => {
    setMessages([])
    setConversationId(null)
    pendingConvRef.current = null

    let convId = null
    if (userId) {
      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({ user_id: userId, title })
        .select()
        .single()
      if (error || !conv) {
        logger.error('Conversation insert failed', { code: error?.code ?? null, start: variant })
      } else {
        convId = conv.id
        setConversationId(convId)
        logger.info('Conversation started', { conversationId: convId, start: variant })
      }
    }

    setIsLoading(true)
    const localId = `opening-${Date.now()}`
    setMessages([{ role: 'assistant', content: '', id: localId }])
    const requestId = generateRequestId()

    try {
      const accessToken = session?.access_token ?? null
      if (!accessToken) {
        logger.error('No access token available — aborting opening', { requestId, start: variant })
        setMessages([{ role: 'assistant', content: SESSION_EXPIRED_MESSAGE, isError: true, id: Date.now() }])
        return
      }

      logger.info('API request dispatched', { requestId, start: variant })
      const streamStart = Date.now()
      const response = await postChat(accessToken, { conversationId: convId, start: variant, ...extra, requestId })

      const rateLimited = await readRateLimit(response)
      if (rateLimited) {
        logger.warn('Rate limit reached (server)', { requestId, retryAfter: rateLimited.retryAfter })
        setMessages([{ role: 'assistant', content: rateLimitMessage(rateLimited.retryAfter), isError: true, id: Date.now() }])
        return
      }
      if (response.status === 429) {
        logger.warn('Session limit reached (server)', { requestId })
        setMessages([])
        onSessionLimitRef.current?.()
        return
      }
      if (await isClientOutdated(response)) {
        logger.warn('client_outdated', { requestId })
        setMessages([outdatedBubble()])
        return
      }
      if (!response.ok) {
        logger.error('API request failed', { requestId, status: response.status })
        throw new Error(`API error ${response.status}`)
      }
      if (convId) countedConvIdsRef.current.add(convId)

      let fullContent = ''
      let serverId = null
      let firstToken = true
      await readStream(response, {
        onMeta: (meta) => { if (meta.assistantMessageId) serverId = meta.assistantMessageId },
        onText: (text) => {
          if (firstToken) {
            logger.info('Stream first token received', { requestId, duration_ms: Date.now() - streamStart })
            firstToken = false
          }
          fullContent += text
          setMessages([{ role: 'assistant', content: fullContent, id: localId, serverId }])
        },
      })

      if (!fullContent) logger.warn('Stream completed but response was empty', { requestId, conversationId: convId })
      else logger.info('Stream completed', { requestId, duration_ms: Date.now() - streamStart })
    } catch (err) {
      logger.error(errorLabel, err instanceof Error ? err : new Error(String(err)))
      setMessages([{ role: 'assistant', content: HICCUP_MESSAGE, isError: true, id: Date.now() }])
    } finally {
      setIsLoading(false)
    }
  }, [userId, session])

  // Wellness-Start: kein sichtbarer User-Turn, Coach antwortet direkt aus dem System-Prompt
  const startWellnessConversation = useCallback(async (wellnessCheck) => {
    logger.info('WellnessCheck context applied', {
      score: wellnessCheck.score,
      hasContext: !!wellnessCheck.context,
      label: wellnessCheck.label,
    })
    return startStreamedOpening({
      variant: 'wellness', title: 'Wellness-Check', extra: { wellnessCheck }, errorLabel: 'Wellness start failed',
    })
  }, [startStreamedOpening])

  // Wiederkehr-Begrüßung: Coach öffnet mit Bezug auf den offenen Faden (lädt der Server)
  const startBriefingConversation = useCallback(async () => {
    return startStreamedOpening({ variant: 'briefing', title: 'Gespräch', errorLabel: 'Briefing start failed' })
  }, [startStreamedOpening])

  // Entry-Kontext-Start: Coach öffnet mit themenspezifischer Antwort
  const startEntryContextConversation = useCallback(async (entryContext) => {
    return startStreamedOpening({
      variant: 'entry', title: 'Gespräch', extra: { entryContext }, errorLabel: 'Entry-context start failed',
    })
  }, [startStreamedOpening])

  // Lädt ein bestehendes Gespräch aus dem Verlauf und macht es zum aktiven
  // Gespräch, damit es über sendMessage() ganz normal weitergeführt werden kann.
  // Zählt bewusst NICHT als neue Session.
  const loadConversation = useCallback(async (convId) => {
    if (!userId || !convId) return false

    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at, message_type')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (error || !data || data.length === 0) {
      logger.error('Failed to load conversation for resume', {
        conversationId: convId,
        code: error?.code ?? 'empty_result',
      })
      return false
    }

    setMessages(data.map(m => ({ role: m.role, content: m.content, id: m.id, messageType: m.message_type })))
    setConversationId(convId)
    pendingConvRef.current = null
    countedConvIdsRef.current.add(convId) // bereits gezählt (serverseitig über session_counted_at)

    logger.info('Conversation resumed', { conversationId: convId, messageCount: data.length })
    return true
  }, [userId])

  // Standard-Start: Eröffnungstext aus dem Pool wird sofort angezeigt; gespeichert wird er
  // vom Server (start 'first'/'standard', ohne Modellaufruf, zählt nicht als Gespräch).
  const startNewConversation = useCallback(async (isFirstEver = false) => {
    const openingIndex = Math.floor(Math.random() * OPENING_MESSAGES.length)
    const opening = isFirstEver ? FIRST_OPENING_MESSAGE : OPENING_MESSAGES[openingIndex]
    const firstMessage = { role: 'assistant', content: opening, id: `opening-${Date.now()}` }
    setMessages([firstMessage])
    setConversationId(null)

    if (userId) {
      const createConversation = async () => {
        const { data: conv, error } = await supabase
          .from('conversations')
          .insert({ user_id: userId, title: 'Neues Gespräch' })
          .select()
          .single()
        if (error || !conv) {
          logger.error('Conversation insert failed', { code: error?.code ?? null })
          return null
        }
        setConversationId(conv.id)
        logger.info('Conversation started', { conversationId: conv.id, start: isFirstEver ? 'first' : 'standard' })

        try {
          const { data: { session: current } } = await supabase.auth.getSession()
          if (!current?.access_token) {
            logger.error('opening_store_failed', { conversationId: conv.id, reason: 'no_token' })
          } else {
            const res = await postChat(current.access_token, {
              conversationId: conv.id,
              start: isFirstEver ? 'first' : 'standard',
              openingIndex,
              requestId: generateRequestId(),
            })
            if (!res.ok) logger.error('opening_store_failed', { conversationId: conv.id, status: res.status })
          }
        } catch (err) {
          logger.error('opening_store_failed', { conversationId: conv.id, errorType: err?.name ?? 'Error' })
        }
        return conv.id
      }
      const pending = createConversation()
      pendingConvRef.current = pending
      await pending
    }

    return firstMessage
  }, [userId])

  // Sendet eine Nutzer-Nachricht. Gespeichert wird sie vom Server. Scheitert das Senden,
  // bleibt sie mit status 'failed' stehen und lässt sich mit derselben clientMessageId
  // erneut senden (retryMessage) — der Server legt sie trotzdem nur einmal an.
  const sendMessage = useCallback(async (content, inputMode = 'text', retry = null) => {
    if (!content.trim() || isLoading) return

    const clientMessageId = retry?.clientMessageId ?? crypto.randomUUID()
    const userLocalId = retry?.id ?? clientMessageId
    const placeholderId = `reply-${clientMessageId}-${Date.now()}`

    if (retry) {
      setMessages(prev => prev.map(m => (m.id === userLocalId ? { ...m, status: 'sending' } : m)))
    } else {
      setMessages(prev => [...prev, { role: 'user', content, id: userLocalId, clientMessageId, inputMode, status: 'sending' }])
    }
    setIsLoading(true)

    const setUserStatus = (status) =>
      setMessages(prev => prev.map(m => (m.id === userLocalId ? { ...m, status } : m)))
    const markFailed = (extraBubble = null) =>
      setMessages(prev => {
        const next = prev
          .filter(m => m.id !== placeholderId)
          .map(m => (m.id === userLocalId ? { ...m, status: 'failed' } : m))
        return extraBubble ? [...next, extraBubble] : next
      })

    const messageIndex = messages.filter(m => m.role === 'user').length + (retry ? 0 : 1)
    // Falls die Konversation gerade noch angelegt wird: auf die ID warten
    const activeConvId = conversationId ?? (pendingConvRef.current ? await pendingConvRef.current : null)
    logger.info('Message sent', { conversationId: activeConvId, messageIndex, retry: !!retry })

    const accessToken = session?.access_token ?? null
    if (!accessToken) {
      logger.error('No access token available — aborting sendMessage', { conversationId: activeConvId })
      markFailed({ role: 'assistant', content: SESSION_EXPIRED_MESSAGE, isError: true, id: `expired-${Date.now()}` })
      setIsLoading(false)
      return
    }
    if (!activeConvId) {
      logger.error('No conversation available — message not sent')
      markFailed()
      setIsLoading(false)
      return
    }

    setMessages(prev => [...prev, { role: 'assistant', content: '', id: placeholderId }])
    const requestId = generateRequestId()
    let accepted = false

    try {
      logger.info('API request dispatched', { requestId, messageIndex })
      const streamStart = Date.now()
      const response = await postChat(accessToken, {
        conversationId: activeConvId,
        message: { clientMessageId, content, inputMode },
        requestId,
      })

      const rateLimited = await readRateLimit(response)
      if (rateLimited) {
        logger.warn('Rate limit reached (server)', { requestId, conversationId: activeConvId, retryAfter: rateLimited.retryAfter })
        markFailed({ role: 'assistant', content: rateLimitMessage(rateLimited.retryAfter), isError: true, id: `rate-${Date.now()}` })
        return
      }
      if (response.status === 429) {
        logger.warn('Session limit reached (server)', { requestId, conversationId: activeConvId })
        markFailed()
        onSessionLimitRef.current?.()
        return
      }
      if (await isClientOutdated(response)) {
        logger.warn('client_outdated', { requestId })
        markFailed(outdatedBubble())
        return
      }
      if (!response.ok) {
        logger.error('API request failed', { requestId, status: response.status })
        throw new Error(`API error ${response.status}`)
      }
      countedConvIdsRef.current.add(activeConvId)

      let fullContent = ''
      let firstToken = true
      let totalChunks = 0
      await readStream(response, {
        onMeta: (meta) => {
          accepted = true
          setUserStatus('sent')
          setMessages(prev => prev.map(m => (m.id === placeholderId
            ? { ...m, serverId: meta.assistantMessageId ?? m.serverId, messageType: meta.messageType ?? m.messageType }
            : m)))
          if (meta.replayed) logger.info('Reply restored from server', { requestId })
        },
        onText: (text) => {
          accepted = true
          if (firstToken) {
            logger.info('Stream first token received', { requestId, duration_ms: Date.now() - streamStart })
            firstToken = false
          }
          totalChunks++
          fullContent += text
          setMessages(prev => prev.map(m => (m.id === placeholderId ? { ...m, content: fullContent } : m)))
        },
      })
      setUserStatus('sent')

      if (!fullContent) logger.warn('Stream completed but response was empty', { requestId, conversationId: activeConvId })
      else logger.info('Stream completed', { requestId, totalChunks, duration_ms: Date.now() - streamStart })
    } catch (err) {
      logger.error('Stream error during receive', err instanceof Error ? err : new Error(String(err)))
      if (accepted) {
        // Der Server hat die Nachricht angenommen und speichert die Antwort selbst zu Ende.
        setMessages(prev => prev.map(m => (m.id === placeholderId
          ? { ...m, content: HICCUP_MESSAGE, isError: true }
          : m)))
      } else {
        markFailed()
      }
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, conversationId, session])

  const retryMessage = useCallback((msg) => {
    if (!msg || msg.role !== 'user') return
    return sendMessage(msg.content, msg.inputMode ?? 'text', msg)
  }, [sendMessage])

  // Nach Gesprächsende: Gedächtnis + Erkenntnis via Haiku extrahieren. Der Server liest
  // das Gespräch selbst aus der DB (über die conversationId).
  const extractMemoryAndInsight = useCallback(async () => {
    if (!userId || !conversationId || messages.length < 3) return null

    try {
      const accessToken = session?.access_token ?? null
      if (!accessToken) return null
      const response = await postChat(accessToken, {
        mode: 'extract',
        extractMemory: true,
        conversationId,
        requestId: generateRequestId(),
      })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }, [messages, userId, conversationId, session])

  return {
    messages,
    isLoading,
    conversationId,
    startNewConversation,
    startWellnessConversation,
    startBriefingConversation,
    startEntryContextConversation,
    sendMessage,
    retryMessage,
    extractMemoryAndInsight,
    loadConversation,
    setMessages,
    isConversationCounted: (id) => !!id && countedConvIdsRef.current.has(id),
  }
}
