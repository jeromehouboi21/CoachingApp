# Friedensstifter — Architektur-Dokumentation

**Produkt:** Friedensstifter · Dein systemischer Begleiter
**Version:** Design-Dokument v2.1
**Stand:** März 2026

---

## Überblick

Friedensstifter ist eine PWA, in der ein KI-Coach systemische Coaching-Gespräche führt. Der Coach lernt mit jedem Gespräch — durch Gedächtnis, anonyme Erfahrungsmuster und wöchentliche Supervision. Das System ist so gebaut, dass der Nutzer nichts von der Infrastruktur dahinter spürt: er schreibt, der Coach antwortet, Wort für Wort.

```
Nutzer (Browser / PWA)
    │
    ├── React 18 + Vite (src/)
    │       ├── Screens (src/screens/)
    │       ├── Hooks (src/hooks/)
    │       └── Lib (src/lib/)
    │
    └── Supabase
            ├── Auth (JWT)
            ├── PostgreSQL + pgvector
            └── Edge Functions (Deno)
                    └── Anthropic Claude API
```

---

## System-Komponenten

### Frontend

| Datei / Verzeichnis | Zweck |
|---|---|
| `src/screens/coach/CoachScreen.jsx` | Haupt-Chat-Interface, Eröffnungslogik (3 Varianten) |
| `src/screens/home/HomeScreen.jsx` | Dashboard, Wellness-Check-Einstieg, Tagesimpuls |
| `src/screens/wellness/WellnessCheckScreen.jsx` | Score-Auswahl + Kontext-Chips |
| `src/screens/verstehen/` | 3 Screens: Übersicht, Muster-Detail, Aus Gesprächen |
| `src/screens/mirror/MirrorScreen.jsx` | "Mein Spiegel" — gespeicherte Erkenntnisse |
| `src/hooks/useAuth.js` | Supabase Auth + Profile |
| `src/hooks/useChat.js` | Streaming-Chat, 3 Start-Funktionen, Memory-Extraktion |
| `src/hooks/useMemory.js` | Lesen + Schreiben des Coach-Gedächtnisses |
| `src/lib/prompts.js` | Texte: Eröffnungen, Impulsfragen, Skalierungsfragen |
| `src/lib/supabase.js` | Supabase Client-Instanz |
| `src/lib/logger.js` | Strukturiertes Frontend-Logging → app_logs |

### Backend (Supabase Edge Functions)

| Function | Wann aufgerufen | Was es tut |
|---|---|---|
| `chat` | Jede Nutzer-Nachricht | Baut System-Prompt, streamt Antwort (SSE) |
| `pre-session-briefing` | CoachScreen Mount | Liest letztes Gespräch + offenen Faden |
| `post-conversation` | Nach Gespräch (fire-and-forget) | Anonymes RAG-Muster, Selbstreflexion, open_thread |
| `rag-search` | Erste Nutzer-Nachricht | Semantische Suche in experience_patterns |
| `supervision` | Wöchentlicher Cron | Supervision-Protokoll aus Reflektionen + Feedback |

---

## Datenflüsse

### 1. Normales Chat-Gespräch

```
Nutzer schreibt Nachricht
    │
    ├── [Frontend] useChat.sendMessage()
    │       ├── Nachricht in UI einfügen
    │       ├── Nachricht in messages-Tabelle speichern
    │       └── POST /functions/v1/chat
    │               ├── Header: Authorization Bearer JWT
    │               └── Body: { messages, conversationId, memory, ragContext, briefing }
    │
    ├── [Edge Function: chat]
    │       ├── JWT validieren → user holen
    │       ├── buildSystemPrompt():
    │       │       BASE + Briefing + Memory + RAG + Wellness
    │       └── Anthropic API stream
    │               └── claude-sonnet-4-5 (Streaming)
    │
    └── [Frontend] SSE-Stream empfangen
            ├── Token für Token in UI einblenden
            └── Nach Stream-Ende: Antwort in messages-Tabelle speichern
```

### 2. Erste Nutzer-Nachricht (RAG-Aktivierung)

```
Erste Nutzer-Nachricht
    │
    ├── [Frontend] fetchRagContext() (parallel, fire-and-forget)
    │       └── POST /functions/v1/rag-search
    │               └── pgvector: cosine similarity auf experience_patterns
    │
    └── [Frontend] ragContextRef.current = Ergebnis
            └── Ab nächster Nachricht im chat-Body mitgeschickt
```

### 3. Gesprächs-Abschluss (Post-Processing)

```
Nutzer klickt "Neues Gespräch"
    │
    ├── [Frontend] runPostConversation() (fire-and-forget)
    │       └── POST /functions/v1/post-conversation
    │               ├── [claude-haiku-4-5] SUMMARY_PROMPT
    │               │       → pattern_references[], open_thread{}
    │               ├── [claude-haiku-4-5] REFLECTION_PROMPT
    │               │       → was_helpful, what_worked, language_violations[]
    │               ├── OpenAI Embeddings → pgvector für RAG
    │               └── Speichern:
    │                       ├── experience_patterns (anonymes Muster)
    │                       ├── coach_reflections
    │                       ├── conversations.open_thread + intensity
    │                       └── pattern_references[]
    │
    └── [Frontend] extractMemoryAndInsight()
            └── POST /functions/v1/chat (extractMemory: true)
                    → Themen, Muster, Stärken, suggested_insight
                    └── updateMemory() + optional: InsightModal zeigen
```

### 4. CoachScreen-Eröffnung (3 Varianten)

```
CoachScreen mountet (user + profile geladen)
    │
    ├── Wellness-Check in navigation.state?
    │       └── → Variante 3: startWellnessConversation()
    │
    └── POST /functions/v1/pre-session-briefing
            ├── Kein offener Faden ODER erstes Gespräch?
            │       └── → Variante 2: startNewConversation(isFirstEver)
            │
            └── Offener Faden vorhanden + ≥2 Tage + ≥5 Tage seit letzter Begrüßung?
                    └── → Variante 1: startBriefingConversation(briefing)
                            + profiles.last_return_greeting_at aktualisieren
```

---

## Datenbankschema

### Kern-Tabellen

```
profiles
├── id (UUID, FK → auth.users)
├── display_name
├── onboarding_completed (BOOLEAN)
├── onboarding_data (JSONB)
├── streak_count / streak_last_date
├── plan ('free' | 'premium')
├── sessions_used_this_month
└── last_return_greeting_at (TIMESTAMPTZ) — Throttle für Wiederkehr-Begrüßung

conversations
├── id (UUID)
├── user_id (FK → profiles)
├── title
├── summary / key_insight / memory_updated
├── open_thread (TEXT) — nicht abgeschlossenes Thema aus Post-Processing
└── open_thread_intensity ('low' | 'medium' | 'high')

messages
├── id (UUID)
├── conversation_id (FK → conversations)
├── role ('user' | 'assistant')
├── content
└── input_mode ('text' | 'voice')

user_memory (1 Zeile pro User)
├── user_id (UNIQUE)
├── themes (JSONB[])
├── patterns (JSONB[])
├── strengths (JSONB[])
└── context (JSONB)
```

### Lernende Architektur

```
experience_patterns — anonyme RAG-Datenbank
├── embedding (vector(1536)) — pgvector cosine similarity
├── context / pattern / resistance
├── what_helped / what_blocked
└── outcome ('breakthrough' | 'stuck' | 'partial' | 'unknown')

pattern_references — persönliche Muster-Erkennungen
├── user_id / conversation_id / message_id
├── pattern_key (z.B. "rueckzug_unter_druck")
├── pattern_label (z.B. "Rückzug unter Druck")
└── excerpt (max. 150 Zeichen)

coach_reflections — KI-Selbstreflexion nach jedem Gespräch
├── conversation_id
├── was_helpful / what_worked / what_missed
├── resistance_detected / resistance_handled
└── improvement_note

insights — "Mein Spiegel"-Erkenntnisse
├── user_id / conversation_id
├── content / category ('muster' | 'stärke' | 'erkenntnis' | 'ziel')
└── source ('auto' | 'user') / is_pinned
```

> **RLS:** Alle Tabellen haben Row Level Security. Nutzer sehen ausschließlich ihre eigenen Daten. `app_logs` hat keine SELECT-Policy (nur service_role).

---

## System-Prompt Architektur

Die Edge Function `chat` baut den System-Prompt dynamisch aus bis zu 5 Blöcken:

```
BASE_SYSTEM_PROMPT
    Haltung des Coaches (systemisch, nicht therapeutisch)
    Sprachprinzip (verbotene Wörter + Alternativen)
    Widerstand-Handling
    Muster-Erkennung (5 bekannte pattern_keys)

BLOCK 1: Briefing (optional)
    Nur wenn conversationCount > 1
    Letztes Gesprächsdatum, offener Faden, Intensität

BLOCK 2: user_memory (optional)
    Themen, Muster, Stärken, Kontext aus vergangenen Gesprächen

BLOCK 3: RAG-Kontext (optional)
    Anonyme Erfahrungen aus ähnlichen Gesprächen (pgvector)

BLOCK 4: Supervision (optional)
    Wöchentliche Empfehlung aus Supervision-Cron

BLOCK 5: Wellness-Check (optional, ersetzt Standard-Eröffnung)
    Score (1–10), Kontext-Label, Skalierungsfrage
```

**Verbotene Wörter (Sprachprinzip):**

| Verboten | Alternative |
|---|---|
| „müssen" | „kannst", „hast die Möglichkeit" |
| „immer" (Absolutum) | „oft", „häufig" |
| „nie" (Absolutum) | „selten", „bisher kaum" |
| „du bist X" (Urteil) | „du neigst dazu", „du verhältst dich oft so" |
| „können nicht" | „hast dich bisher dagegen entschieden" |

---

## Verstehen-Modul

Das Modul zeigt dem Nutzer, welche Verhaltensmuster der Coach in seinen Gesprächen erkannt hat.

```
Post-Processing (nach jedem Gespräch)
    → pattern_references in DB schreiben

/verstehen (VorstehenScreen)
    → Liste aller 5 bekannten Muster
    → Filter: Alle / Beziehungen / Arbeit / Selbstbild
    → Persönlich erkannte Muster oben + grünes Tag

/verstehen/:key (MusterDetail)
    → 3-Schritt-Entstehungsgeschichte des Musters
    → Coach-Zitat-Block wenn persönlich erkannt (excerpt aus pattern_references)
    → CTA: "Darüber sprechen" → /coach mit vorausgefülltem Prompt

/verstehen/aus-gespraechen (AusGespraechen)
    → Alle pattern_references chronologisch
    → Free: erste Karte sichtbar, Rest Premium-gesperrt (Blur-Overlay)
```

**5 bekannte Muster:**

| Key | Label |
|---|---|
| `rueckzug_unter_druck` | Rückzug unter Druck |
| `innerer_kritiker` | Der innere Kritiker |
| `uebernahme_reflex` | Übernahme-Reflex |
| `harmonie_um_jeden_preis` | Harmonie um jeden Preis |
| `perfektionismus_blockade` | Perfektionismus-Blockade |

---

## Freemium-Logik

```
profiles.plan = 'free' | 'premium'
profiles.sessions_used_this_month — inkrementiert beim CoachScreen-Aufruf

Free:
    3 Gespräche/Monat → Limit-Modal → /premium
    Verstehen: Allgemeine Muster (keine persönlichen Referenzen)
    Spiegel: max. 10 Erkenntnisse

Premium:
    Unbegrenzte Gespräche
    Vollständiger Spiegel + Export
    Persönliche pattern_references im Verstehen-Modul
```

Reset-Cron: `sessions_used_this_month = 0` am 1. des Monats.

---

## Streaming (SSE)

Alle Chat-Antworten kommen token-by-token über Server-Sent Events:

```
POST /functions/v1/chat
    → Response: text/event-stream

Frontend liest:
    data: {"text": "Hallo"}
    data: {"text": " dort"}
    data: [DONE]

useChat: token-by-token in setMessages() einbauen
    → UI aktualisiert sich nach jedem Token
```

---

## Migrationen

| Datei | Inhalt |
|---|---|
| `001_initial.sql` | profiles, conversations, messages, RLS, handle_new_user Trigger |
| `002_v1_1.sql` | user_memory, insights |
| `003_v1_4.sql` | experience_patterns (pgvector), coach_reflections, user_feedback, supervision_logs |
| `004_v1_6.sql` | messages.input_mode, conversations.summary / key_insight / memory_updated |
| `005_v1_8.sql` | app_logs |
| `006_v2_0.sql` | pattern_references |
| `007_v2_1.sql` | conversations.open_thread + open_thread_intensity · profiles.last_return_greeting_at |

Deployment: `supabase db push` (lokal) oder Migration-Datei im Supabase Dashboard ausführen.

---

## Umgebungsvariablen

```bash
# .env.local (Frontend, Vite)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase Edge Functions (Secrets, nur serverseitig)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...           # optional, für pgvector Embeddings
SUPABASE_SERVICE_ROLE_KEY=      # automatisch in Edge Functions verfügbar
```

---

## Design System

**Farb-Tokens (CSS Custom Properties):**

| Token | Wert | Verwendung |
|---|---|---|
| `--color-bg` | `#F5F3EF` | Haupthintergrund |
| `--color-surface` | `#FFFFFF` | Cards, Modals |
| `--color-accent` | `#2D5A4E` | Brand-Grün, primäre Buttons |
| `--color-coral` | `#C4593A` | Warnung, niedrige Wellness-Scores |
| `--color-ink` | `#1A1916` | Haupttext |
| `--color-ink-2` | `#5C5A54` | Sekundärtext |
| `--color-ink-3` | `#9A9890` | Tertiärtext, Platzhalter |
| `--color-premium` | `#8B6914` | Premium-Badge |

**Typografie:** DM Serif Display (Headlines) · DM Sans (Body)
**Viewport:** Mobile-first, optimiert für 390px.
