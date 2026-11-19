import { useState, useRef, useCallback, useEffect } from 'react'

// Spracheingabe über die Web Speech API (de-DE). Das Ergebnis landet im Textfeld und wird nie
// automatisch gesendet (CLAUDE.md).
//
// Geduldig zuhören: continuous = true, damit kurze Denkpausen die Aufnahme nicht beenden.
// Manche Browser (v. a. Chrome auf Android) beenden die Erkennung nach Stille trotzdem –
// dann startet sie still neu, solange der Nutzer nicht selbst gestoppt hat.
// Schutz: Nach IDLE_LIMIT_MS ohne erkannte Sprache geht das Mikrofon aus; bei Berechtigungs-
// oder Dienstfehlern kein Neustart; höchstens MAX_RESTARTS Neustarts ohne Ergebnis hintereinander.
const IDLE_LIMIT_MS = 60_000
const MAX_RESTARTS = 20
const FATAL_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'])

export function useVoiceInput({ onTranscript, onInterim }) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported] = useState(
    () => !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  )
  const recognitionRef = useRef(null)
  const wantRef = useRef(false)          // Nutzer möchte zuhören lassen
  const lastSpeechRef = useRef(0)
  const restartsRef = useRef(0)
  const idleTimerRef = useRef(null)
  const lastFinalRef = useRef('')       // Chrome/Android liefert im Dauerbetrieb Sätze teils doppelt
  const callbacksRef = useRef({ onTranscript, onInterim })
  callbacksRef.current = { onTranscript, onInterim }

  const clearIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = null
  }

  const stop = useCallback(() => {
    wantRef.current = false
    clearIdleTimer()
    try { recognitionRef.current?.stop() } catch { /* bereits beendet */ }
    setIsListening(false)
  }, [])

  const armIdleTimer = useCallback(() => {
    clearIdleTimer()
    idleTimerRef.current = setTimeout(() => {
      if (Date.now() - lastSpeechRef.current >= IDLE_LIMIT_MS) stop()
    }, IDLE_LIMIT_MS)
  }, [stop])

  const startRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'de-DE'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) final += transcript
        else interim += transcript
      }
      if (interim || final) {
        lastSpeechRef.current = Date.now()
        restartsRef.current = 0
        armIdleTimer()
      }
      if (interim) callbacksRef.current.onInterim?.(interim)
      if (final) {
        const normalized = final.trim().toLowerCase()
        if (normalized && normalized !== lastFinalRef.current) {
          lastFinalRef.current = normalized
          callbacksRef.current.onTranscript?.(final)
        }
      }
    }

    recognition.onerror = (event) => {
      // 'no-speech' und 'aborted' sind bei Pausen normal; nur echte Fehler beenden das Zuhören
      if (FATAL_ERRORS.has(event?.error)) wantRef.current = false
    }

    recognition.onend = () => {
      const idleTooLong = Date.now() - lastSpeechRef.current >= IDLE_LIMIT_MS
      if (wantRef.current && !idleTooLong && restartsRef.current < MAX_RESTARTS) {
        restartsRef.current += 1
        try {
          recognition.start()   // still weiterhören
          return
        } catch {
          /* Neustart nicht möglich → beenden */
        }
      }
      wantRef.current = false
      clearIdleTimer()
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [armIdleTimer])

  const start = useCallback(() => {
    if (!isSupported || wantRef.current) return
    wantRef.current = true
    lastSpeechRef.current = Date.now()
    restartsRef.current = 0
    lastFinalRef.current = ''
    armIdleTimer()
    try {
      startRecognition()
    } catch {
      wantRef.current = false
      clearIdleTimer()
      setIsListening(false)
    }
  }, [isSupported, armIdleTimer, startRecognition])

  const toggle = useCallback(() => {
    if (wantRef.current || isListening) stop()
    else start()
  }, [isListening, start, stop])

  // Beim Verlassen des Screens Mikrofon sicher aus
  useEffect(() => () => {
    wantRef.current = false
    clearIdleTimer()
    try { recognitionRef.current?.abort() } catch { /* egal */ }
  }, [])

  return { isListening, isSupported, toggle, start, stop }
}
