import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { OPENING_MESSAGES } from '../lib/prompts'
import { createLogger } from '../lib/logger'

const logger = createLogger('useChat')
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function generateRequestId() {
  return crypto.randomUUID().slice(0, 8)
}

async function fetchRagContext(firstMessage, accessToken) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ firstMessage }),
      }
    )
    if (!response.ok) return null
    const { experiences } = await response.json()
    return experiences?.length ? experiences : null
  } catch {
    return null
  }
}

export function useChat(userId, memory, session) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  // RAG-Kontext wird nach der ersten Nutzer-Nachricht gesetzt und für alle weiteren verwendet
  const ragContextRef = useRef(null)
  const isFirstUserMessageRef = useRef(true)

  // Wellness-Start: kein sichtbarer User-Turn, Coach antwortet direkt aus dem System-Prompt
  const startWellnessConversation = useCallback(async (wellnessCheck) => {
    setMessages([])
    setConversationId(null)
    ragContextRef.current = null
    isFirstUserMessageRef.current = false

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
            memory: memory || null,
            ragContext: null,
            wellnessCheck,
            requestId,
          }),
        }
      )

      if (!response.ok) {
        let errorBody = response.statusText
        try { errorBody = await response.text() } catch {}
        console.error('[useChat] Wellness API request failed', { requestId, status: response.status, body: errorBody })
        logger.error('API request failed', { requestId, status: response.status, error: errorBody })
        throw new Error(`API error ${response.status}: ${errorBody}`)
      }

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
      console.error('[useChat] startWellnessConversation catch:', err)
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
  }, [userId, memory, session])

  const startNewConversation = useCallback(async () => {
    const opening = OPENING_MESSAGES[Math.floor(Math.random() * OPENING_MESSAGES.length)]
    const firstMessage = { role: 'assistant', content: opening, id: Date.now() }
    setMessages([firstMessage])
    setConversationId(null)
    ragContextRef.current = null
    isFirstUserMessageRef.current = true

    if (userId) {
      const { data: conv } = await supabase
        .from('conversations')
        .insert({ user_id: userId, title: 'Neues Gespräch' })
        .select()
        .single()
      if (conv) {
        setConversationId(conv.id)
        logger.info('Conversation started', { conversationId: conv.id, hasWellnessCheck: false })
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          role: 'assistant',
          content: opening,
        })
      }
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
    logger.info('Message sent', { conversationId, messageIndex })

    if (userId && conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content,
        input_mode: inputMode,
      })
    }

    const accessToken = session?.access_token ?? null
    if (!accessToken) {
      logger.error('No access token available — aborting sendMessage', { conversationId })
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

    // RAG-Suche beim ersten Nutzer-Input (fire-and-forget, parallel zum Streaming)
    if (isFirstUserMessageRef.current) {
      isFirstUserMessageRef.current = false
      fetchRagContext(content, accessToken).then(ctx => {
        ragContextRef.current = ctx
      })
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
            conversationId,
            memory: memory || null,
            ragContext: ragContextRef.current || null,
            requestId,
          }),
        }
      )

      if (!response.ok) {
        let errorBody = response.statusText
        try { errorBody = await response.text() } catch {}
        console.error('[useChat] API request failed', { requestId, status: response.status, body: errorBody })
        logger.error('API request failed', { requestId, status: response.status, error: errorBody })
        throw new Error(`API error ${response.status}: ${errorBody}`)
      }

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
        logger.warn('Stream completed but response was empty', { requestId, conversationId })
      } else {
        logger.info('Stream completed', { requestId, totalChunks, duration_ms: Date.now() - streamStart })
      }

      if (userId && conversationId && fullContent) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullContent,
        })
      }
    } catch (err) {
      console.error('[useChat] sendMessage catch:', err)
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
  }, [messages, isLoading, userId, conversationId, memory, session])

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
    sendMessage,
    extractMemoryAndInsight,
    setMessages,
  }
}
