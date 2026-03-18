import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { OPENING_MESSAGES } from '../lib/prompts'

export function useChat(userId) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)

  const startNewConversation = useCallback(async (initialContext = null) => {
    const opening = OPENING_MESSAGES[Math.floor(Math.random() * OPENING_MESSAGES.length)]
    const firstMessage = { role: 'assistant', content: opening, id: Date.now() }
    setMessages([firstMessage])
    setConversationId(null)

    if (userId) {
      const { data: conv } = await supabase
        .from('conversations')
        .insert({ user_id: userId, title: 'Neues Gespräch' })
        .select()
        .single()
      if (conv) {
        setConversationId(conv.id)
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          role: 'assistant',
          content: opening,
        })
      }
    }

    return firstMessage
  }, [userId])

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isLoading) return

    const userMessage = { role: 'user', content, id: Date.now() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    if (userId && conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content,
      })
    }

    const assistantMessage = { role: 'assistant', content: '', id: Date.now() + 1 }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
            conversationId,
          }),
        }
      )

      if (!response.ok) throw new Error('API error')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

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

      if (userId && conversationId && fullContent) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullContent,
        })
      }
    } catch (error) {
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
  }, [messages, isLoading, userId, conversationId])

  return { messages, isLoading, conversationId, startNewConversation, sendMessage, setMessages }
}
