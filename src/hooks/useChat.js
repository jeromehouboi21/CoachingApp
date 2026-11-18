import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { OPENING_MESSAGES, FIRST_OPENING_MESSAGE } from '../lib/prompts'
import { createLogger } from '../lib/logger'
import { readRateLimit, rateLimitMessage } from '../lib/rateLimit'

const logger = createLogger('useChat')
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function generateRequestId() {
  return crypto.randomUUID().slice(0, 8)
}

// options.onSessionLimit: wird aufgerufen, wenn der Server mit 429 antwortet
// (Monatslimit erreicht). Die Zählung selbst passiert serverseitig (consume_session).
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
  // Akte, Briefing, Resonanzkarte, Gedächtnis und RAG lädt die chat-Function selbst
  // (Security S-12) — der Client schickt nur Nachrichten und den Eröffnungsanlass.

  // Wellness-Start: kein sichtbarer User-Turn, Coach antwortet direkt aus dem System-Prompt
  const startWellnessConversation = useCallback(async (wellnessCheck) => {
    setMessages([])
    setConversationId(null)
    pendingConvRef.current = null

    let convId = null
    if (userId) {
      const { data: conv } = await supabase
        .from('conversations')
        .insert({ user_id: userId, title: 'Wellness-Check' })
        .select()
        .single()
      if (conv) {
        convId = conv.id
        setConversationId(convId)
      }
    }

    logger.info('Conversation started', {
      conversationId: convId,
      hasWellnessCheck: true,
      wellnessScore: wellnessCheck.score,
    })
    logger.info('WellnessCheck context applied', {
      score: wellnessCheck.score,
      hasContext: !!wellnessCheck.context,
      label: wellnessCheck.label,
    })

    setIsLoading(true)
    const assistantMessage = { role: 'assistant', content: '', id: Date.now() }
    setMessages([assistantMessage])

    const requestId = generateRequestId()

    try {
      const accessToken = session?.access_token ?? null
      if (!accessToken) {
        logger.error('No access token available — aborting wellness start', { requestId })
        setIsLoading(false)
        setMessages([{
          role: 'assistant',
          content: 'Deine Sitzung ist abgelaufen. Bitte melde dich kurz ab und wieder an.',
          isError: true,
          id: Date.now(),
        }])
        return
      }

      logger.info('API request dispatched', { requestId, messageCount: 0, hasWellnessCheck: true })

      const streamStart = Date.now()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: [],
            conversationId: convId,
            wellnessCheck,
            requestId,
          }),
        }
      )

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
      if (!response.ok) {
        logger.error('API request failed', { requestId, status: response.status })
        throw new Error(`API error ${response.status}`)
      }
      if (convId) countedConvIdsRef.current.add(convId)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let firstToken = true
      let totalChunks = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                if (firstToken) {
                  logger.info('Stream first token received', { requestId, duration_ms: Date.now() - streamStart })
                  firstToken = false
                }
                totalChunks++
                fullContent += parsed.text
                setMessages([{ ...assistantMessage, content: fullContent }])
              }
            } catch {}
          }
        }
      }

      if (!fullContent) {
        logger.warn('Stream completed but response was empty', { requestId, conversationId: convId })
      } else {
        logger.info('Stream completed', { requestId, totalChunks, duration_ms: Date.now() - streamStart })
      }

      if (userId && convId && fullContent) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: fullContent,
        })
      }

      logger.debug('WellnessCheck state cleared')
    } catch (err) {
      logger.error('Stream error during receive', err instanceof Error ? err : new Error(String(err)))
      setMessages([{
        role: 'assistant',
        content: 'Das Gespräch hatte einen kurzen Aussetzer. Schreib einfach weiter — ich bin noch da.',
        isError: true,
        id: Date.now(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [userId, session])

  // Wiederkehr-Begrüßung: Coach öffnet automatisch mit einem ersten Turn
  // (basierend auf offenem Faden aus dem letzten Gespräch)
  const startBriefingConversation = useCallback(async () => {
    setMessages([])
    setConversationId(null)
    pendingConvRef.current = null

    let convId = null
    if (userId) {
      const { data: conv } = await supabase
        .from('conversations')
        .insert({ user_id: userId, title: 'Gespräch' })
        .select()
        .single()
      if (conv) {
        convId = conv.id
        setConversationId(convId)
      }
    }

    setIsLoading(true)
    const assistantMessage = { role: 'assistant', content: '', id: Date.now() }
    setMessages([assistantMessage])

    const requestId = generateRequestId()

    try {
      const accessToken = session?.access_token ?? null
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: [],
            conversationId: convId,
            requestId,
          }),
        }
      )

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
      if (!response.ok) throw new Error(`API error ${response.status}`)
      if (convId) countedConvIdsRef.current.add(convId)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullContent += parsed.text
                setMessages([{ ...assistantMessage, content: fullContent }])
              }
            } catch {}
          }
        }
      }

      if (userId && convId && fullContent) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: fullContent,
        })
      }
    } catch (err) {
      logger.error('Briefing start failed', err instanceof Error ? err : new Error(String(err)))
      setMessages([{
        role: 'assistant',
        content: 'Das Gespräch hatte einen kurzen Aussetzer. Schreib einfach weiter — ich bin noch da.',
        isError: true,
        id: Date.now(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [userId, session])

  // Entry-Kontext-Start: Coach öffnet automatisch mit themenspezifischer Antwort
  // Priorität über Wiederkehr-Begrüßung, aber NICHT über Wellness-Check
  const startEntryContextConversation = useCallback(async (entryContext) => {
    setMessages([])
    setConversationId(null)
    pendingConvRef.current = null

    let convId = null
    if (userId) {
      const { data: conv } = await supabase
        .from('conversations')
        .insert({ user_id: userId, title: 'Gespräch' })
        .select()
        .single()
      if (conv) {
        convId = conv.id
        setConversationId(convId)
      }
    }

    setIsLoading(true)
    const assistantMessage = { role: 'assistant', content: '', id: Date.now() }
    setMessages([assistantMessage])

    const requestId = generateRequestId()

    try {
      const accessToken = session?.access_token ?? null
      if (!accessToken) { setIsLoading(false); return }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: [],
            conversationId: convId,
            entryContext,
            requestId,
          }),
        }
      )

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
      if (!response.ok) throw new Error(`API error ${response.status}`)
      if (convId) countedConvIdsRef.current.add(convId)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullContent += parsed.text
                setMessages([{ ...assistantMessage, content: fullContent }])
              }
            } catch {}
          }
        }
      }

      if (userId && convId && fullContent) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: fullContent,
        })
      }
    } catch (err) {
      logger.error('Entry-context start failed', err instanceof Error ? err : new Error(String(err)))
      setMessages([{
        role: 'assistant',
        content: 'Das Gespräch hatte einen kurzen Aussetzer. Schreib einfach weiter — ich bin noch da.',
        isError: true,
        id: Date.now(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [userId, session])

  // Lädt ein bestehendes Gespräch aus dem Verlauf und macht es zum aktiven
  // Gespräch, damit es über sendMessage() ganz normal weitergeführt werden kann.
  // Zählt bewusst NICHT als neue Session (kein countSession() im CoachScreen-Aufrufpfad).
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
        error: error?.message ?? 'empty result',
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

  const startNewConversation = useCallback(async (isFirstEver = false) => {
    const opening = isFirstEver
      ? FIRST_OPENING_MESSAGE
      : OPENING_MESSAGES[Math.floor(Math.random() * OPENING_MESSAGES.length)]
    const firstMessage = { role: 'assistant', content: opening, id: Date.now() }
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
        logger.info('Conversation started', { conversationId: conv.id, hasWellnessCheck: false })
        const { error: msgError } = await supabase.from('messages').insert({
          conversation_id: conv.id,
          role: 'assistant',
          content: opening,
        })
        if (msgError) logger.error('Opening message insert failed', { code: msgError.code ?? null, conversationId: conv.id })
        return conv.id
      }
      const pending = createConversation()
      pendingConvRef.current = pending
      await pending
    }

    return firstMessage
  }, [userId])

  const sendMessage = useCallback(async (content, inputMode = 'text') => {
    if (!content.trim() || isLoading) return

    const userMessage = { role: 'user', content, id: Date.now() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    const messageIndex = updatedMessages.filter(m => m.role === 'user').length
    // Falls die Konversation gerade noch angelegt wird: auf die ID warten
    const activeConvId = conversationId ?? (pendingConvRef.current ? await pendingConvRef.current : null)
    logger.info('Message sent', { conversationId: activeConvId, messageIndex })

    if (userId && activeConvId) {
      const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: activeConvId,
        role: 'user',
        content,
        input_mode: inputMode,
      })
      if (insertError) logger.error('User message insert failed', { code: insertError.code ?? null, conversationId: activeConvId })
    }

    const accessToken = session?.access_token ?? null
    if (!accessToken) {
      logger.error('No access token available — aborting sendMessage', { conversationId: activeConvId })
      setIsLoading(false)
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Deine Sitzung ist abgelaufen. Bitte melde dich kurz ab und wieder an.',
          isError: true,
        }
        return updated
      })
      return
    }

    const assistantMessage = { role: 'assistant', content: '', id: Date.now() + 1 }
    setMessages(prev => [...prev, assistantMessage])

    const requestId = generateRequestId()

    try {
      logger.info('API request dispatched', {
        requestId,
        messageCount: updatedMessages.length,
        hasWellnessCheck: false,
      })

      const streamStart = Date.now()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
            conversationId: activeConvId,
            requestId,
          }),
        }
      )

      const rateLimited = await readRateLimit(response)
      if (rateLimited) {
        logger.warn('Rate limit reached (server)', { requestId, conversationId: activeConvId, retryAfter: rateLimited.retryAfter })
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: rateLimitMessage(rateLimited.retryAfter), isError: true, id: Date.now() + 1 }])
        return
      }
      if (response.status === 429) {
        logger.warn('Session limit reached (server)', { requestId, conversationId: activeConvId })
        // Platzhalter-Bubble entfernen, Limit-Modal zeigen
        setMessages(prev => prev.slice(0, -1))
        onSessionLimitRef.current?.()
        return
      }
      if (!response.ok) {
        logger.error('API request failed', { requestId, status: response.status })
        throw new Error(`API error ${response.status}`)
      }
      if (activeConvId) countedConvIdsRef.current.add(activeConvId)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let firstToken = true
      let totalChunks = 0
      let messageType = 'standard'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.meta?.messageType) {
                messageType = parsed.meta.messageType
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { ...updated[updated.length - 1], messageType }
                  return updated
                })
              }
              if (parsed.text) {
                if (firstToken) {
                  logger.info('Stream first token received', { requestId, duration_ms: Date.now() - streamStart })
                  firstToken = false
                }
                totalChunks++
                fullContent += parsed.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent }
                  return updated
                })
              }
            } catch {}
          }
        }
      }

      if (!fullContent) {
        logger.warn('Stream completed but response was empty', { requestId, conversationId: activeConvId })
      } else {
        logger.info('Stream completed', { requestId, totalChunks, duration_ms: Date.now() - streamStart })
      }

      if (userId && activeConvId && fullContent) {
        const { error: replyError } = await supabase.from('messages').insert({
          conversation_id: activeConvId,
          role: 'assistant',
          content: fullContent,
          message_type: messageType,
        })
        if (replyError) logger.error('Assistant message insert failed', { code: replyError.code ?? null, conversationId: activeConvId })
      }
    } catch (err) {
      logger.error('Stream error during receive', err instanceof Error ? err : new Error(String(err)))
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Das Gespräch hatte einen kurzen Aussetzer. Schreib einfach weiter — ich bin noch da.',
          isError: true,
        }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, userId, conversationId, session])

  // Nach Gesprächsende: Gedächtnis + Erkenntnis via Haiku extrahieren
  const extractMemoryAndInsight = useCallback(async () => {
    if (!userId || messages.length < 3) return null

    try {
      const accessToken = session?.access_token ?? null
      if (!accessToken) return null
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            extractMemory: true,
            requestId: generateRequestId(),
          }),
        }
      )
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }, [messages, userId])

  return {
    messages,
    isLoading,
    conversationId,
    startNewConversation,
    startWellnessConversation,
    startBriefingConversation,
    startEntryContextConversation,
    sendMessage,
    extractMemoryAndInsight,
    loadConversation,
    setMessages,
    isConversationCounted: (id) => !!id && countedConvIdsRef.current.has(id),
  }
}
