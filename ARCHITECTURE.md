# Friedensstifter — Architektur-Dokumentation

> Stand: Juni 2026 · Design-Dokument v2.8

---

## Inhaltsverzeichnis

1. [Stack-Übersicht](#1-stack-übersicht)
2. [Projektstruktur](#2-projektstruktur)
3. [Routing & Navigation](#3-routing--navigation)
4. [Frontend-Architektur](#4-frontend-architektur)
   - [Screens](#41-screens)
   - [Komponenten](#42-komponenten)
   - [Hooks](#43-hooks)
   - [Lib-Module](#44-lib-module)
5. [Backend — Supabase Edge Functions](#5-backend--supabase-edge-functions)
6. [Datenbank-Schema](#6-datenbank-schema)
7. [Design System](#7-design-system)
8. [Wichtige Flows](#8-wichtige-flows)
9. [Freemium-Logik](#9-freemium-logik)
10. [Build & Deployment](#10-build--deployment)

---

## 1. Stack-Übersicht

| Schicht | Technologie |
|---|---|
| Frontend | React 18 + Vite · Tailwind CSS v3 · React Router v6 |
| State | Lokale Hook-States (kein globaler Store) |
| Backend | Supabase (Auth + PostgreSQL + Edge Functions) |
| KI | Anthropic Claude API · `claude-sonnet-4-5` (Streaming) · `claude-haiku-4-5-20251001` (Post-Processing) |
| Hosting | Vercel · Domain: `app.friedensstifter.coach` |
| PWA | `vite-plugin-pwa` (Workbox) |
| Logging | `app_logs`-Tabelle (serverseitig) + Browser-Console (clientseitig) |

**Schlüsselprinzipien:**
- Mobile-first, 390 px optimiert
- Alle KI-Antworten werden gestreamt (token-by-token)
- Spracheingabe landet im Textarea, wird nie automatisch abgesendet
- Coach-Gedächtnis ist für den User unsichtbar
- Alle Edge Functions loggen strukturiert via `_shared/logger.ts`

---

## 2. Projektstruktur

```
CoachingApp/
├── src/
│   ├── App.jsx                          ← Router-Root, ProtectedRoute-Wrapper
│   ├── main.jsx                         ← ReactDOM.render, BrowserRouter
│   │
│   ├── hooks/                           ← Gesamter App-State (kein Zustand/Redux)
│   │   ├── useAuth.js                   ← User, Session, Profile, Consent
│   │   ├── useChat.js                   ← Gesprächs-State, Streaming, 4 Start-Varianten
│   │   ├── useMemory.js                 ← Legacy Coach-Gedächtnis (user_memory)
│   │   ├── useStreak.js                 ← Tagesstreak-Berechnung
│   │   └── useVoiceInput.js             ← Web Speech API (de-DE)
│   │
│   ├── lib/
│   │   ├── supabase.js                  ← Supabase-Client (anon key)
│   │   ├── prompts.js                   ← UI-Texte: Eröffnungen, Wellness-Scores, Impulsfragen
│   │   └── logger.ts                    ← Frontend-Logger (console + app_logs)
│   │
│   ├── styles/
│   │   ├── globals.css                  ← CSS-Reset, Basisstile
│   │   └── tokens.css                   ← CSS Custom Properties (Farben, Abstände, Schatten)
│   │
│   ├── components/
│   │   ├── ui/                          ← Atomare UI-Bausteine
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Avatar.jsx
│   │   │   └── ScaleSlider.jsx
│   │   ├── layout/                      ← Seitenrahmen
│   │   │   ├── AppShell.jsx             ← <Outlet> + BottomNav
│   │   │   └── BottomNav.jsx            ← 4 Tabs mit Insight-Badge
│   │   └── coach/                       ← Chat-spezifische Komponenten
│   │       ├── ChatBubble.jsx
│   │       ├── ChatInput.jsx            ← Textarea + Mikrofon-Button
│   │       ├── QuickReplies.jsx
│   │       ├── TypingIndicator.jsx
│   │       └── ConversationEndModal.jsx
│   │
│   └── screens/
│       ├── landing/                     ← Öffentliche Einstiegsseiten
│       │   ├── LandingScreen.jsx
│       │   ├── AuthScreen.jsx
│       │   └── WelcomeScreen.jsx
│       ├── onboarding/                  ← 5-stufiger Onboarding-Flow
│       │   ├── OnboardingFlow.jsx
│       │   ├── Step1Welcome.jsx
│       │   ├── Step2Question.jsx
│       │   ├── Step3Reveal.jsx
│       │   ├── Step3bAgreement.jsx      ← Coaching-Vereinbarung (v2.8)
│       │   └── Step4Auth.jsx
│       ├── home/
│       │   └── HomeScreen.jsx           ← Dashboard mit Tool-Kacheln
│       ├── coach/
│       │   └── CoachScreen.jsx          ← Haupt-Chat-Interface
│       ├── mirror/
│       │   └── MirrorScreen.jsx         ← "Mein Spiegel" — Erkenntnisse
│       ├── profile/
│       │   └── ProfileScreen.jsx
│       ├── wellness/
│       │   └── WellnessCheckScreen.jsx  ← 1–10 Skala + Context-Chips
│       ├── howto/
│       │   └── HowItWorksScreen.jsx     ← FAQ-Chat (ohne AppShell)
│       ├── verstehen/                   ← Muster-Bibliothek
│       │   ├── VorstehenScreen.jsx      ← Übersicht + Filter
│       │   ├── MusterDetail.jsx         ← Detailansicht per :key
│       │   └── AusGespraechen.jsx       ← Persönliche Pattern-Referenzen
│       ├── premium/
│       │   └── PremiumScreen.jsx
│       └── legal/
│           ├── ImpressumScreen.jsx
│           └── DatenschutzScreen.jsx
│
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   └── logger.ts                ← Zentraler Logger für alle Edge Functions
│   │   ├── chat/index.ts                ← Claude API Proxy + System-Prompt-Builder
│   │   ├── post-conversation/index.ts   ← Post-Processing (4 parallele Prompts)
│   │   ├── pre-session-briefing/index.ts← Briefing-Objekt für Wiederkehr-Begrüßung
│   │   ├── rag-search/index.ts          ← Semantische Ähnlichkeitssuche
│   │   ├── validate-invite-code/index.ts← Invite-Code-Einlösung
│   │   ├── delete-account/index.ts      ← Account-Löschung (hard delete)
│   │   └── supervision/index.ts         ← Wöchentliche KI-Supervision (Cron)
│   └── migrations/
│       ├── 001_initial.sql              ← profiles, conversations, messages, RLS
│       ├── 002_v1_1.sql                 ← user_memory, insights
│       ├── 003_v1_4.sql                 ← experience_patterns (pgvector), coach_reflections
│       ├── 004_v1_6.sql                 ← messages.input_mode, conversations.summary
│       ├── 005_v1_8.sql                 ← app_logs
│       ├── 006_v2_0.sql                 ← pattern_references
│       ├── 007_v2_1.sql                 ← open_thread, last_return_greeting_at
│       ├── 008_v2_2.sql                 ← coach_file_entries, coachee_profile, session_notes
│       ├── 009_v2_4.sql                 ← resonance_map
│       ├── 010_v2_5.sql                 ← invite_codes, profiles.plan = 'tester'
│       ├── 011_v2_7.sql                 ← DSGVO-Consent-Felder
│       └── 012_v2_8.sql                 ← coaching_agreement_accepted_at
│
├── tailwind.config.js                   ← Custom Colors via CSS-Variablen
├── vite.config.js                       ← PWA-Manifest, Workbox
├── index.html                           ← viewport-fit=cover, Fonts
├── CLAUDE.md                            ← Technische Dokumentation für Claude Code
└── ARCHITECTURE.md                      ← dieses Dokument
```

---

## 3. Routing & Navigation

### Routen-Tabelle

| Pfad | Screen | Auth | AppShell |
|---|---|---|---|
| `/landing` | LandingScreen | nein (auth → `/home`) | nein |
| `/auth` | AuthScreen | nein (auth → `/home`) | nein |
| `/onboarding` | OnboardingFlow | nein (auth → `/home`) | nein |
| `/welcome` | WelcomeScreen | **ja** | nein |
| `/home` | HomeScreen | **ja** | **ja** |
| `/coach` | CoachScreen | **ja** | **ja** |
| `/mirror` | MirrorScreen | **ja** | **ja** |
| `/profile` | ProfileScreen | **ja** | **ja** |
| `/howto` | HowItWorksScreen | **ja** | nein |
| `/wellness` | WellnessCheckScreen | **ja** | nein |
| `/premium` | PremiumScreen | **ja** | nein |
| `/verstehen` | VorstehenScreen | **ja** | nein |
| `/verstehen/aus-gespraechen` | AusGespraechen | **ja** | nein |
| `/verstehen/:key` | MusterDetail | **ja** | nein |
| `/impressum` | ImpressumScreen | nein | nein |
| `/datenschutz` | DatenschutzScreen | nein | nein |

### Routing-Logik

```
Nicht-authentifiziert → /landing
Authentifiziert auf /landing oder /auth → /home
Fallback (*) → /home (auth) oder /landing (nicht auth)
```

### ProtectedRoute

```jsx
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />   // Bounce-Dots
  if (!user)   return <Navigate to="/landing" replace />
  return children
}
```

### AppShell

`AppShell` rendert einen `<Outlet>` mit darunter liegendem `<BottomNav>`. Nur die 4 Haupt-Tabs (`/home`, `/coach`, `/mirror`, `/profile`) sind davon umschlossen.

---

## 4. Frontend-Architektur

### 4.1 Screens

#### HomeScreen (`/home`)

**Rolle:** Zentrales Dashboard. Startpunkt der meisten Nutzer-Sessions.

**Inhalt:**
- Persönliche Begrüßung mit Avatar (aus `profile.display_name`)
- Tagesstreak-Anzeige
- Tägliche Impulsfrage (rotierend, Index = Tagesindex % 14, aus `prompts.js`)
- 4 Tool-Kacheln: Coach · Wellness · Innere Stimmen · Verstehen

**Navigiert zu:** `/coach`, `/wellness`, `/verstehen`

---

#### CoachScreen (`/coach`)

**Rolle:** Haupt-Chat-Interface — das Herzstück der App.

**Eröffnungslogik beim Mount (3 Varianten in Prioritätsreihenfolge):**

```
1. Wellness-Check aus Navigation state (state.wellnessCheck)?
   → startWellnessConversation()

2. pre-session-briefing laden:
   a. Offener Faden + ≥2 Tage alt + ≥5 Tage seit letzter Begrüßung?
      → startBriefingConversation() + last_return_greeting_at aktualisieren
   b. Entry-Kontext (z.B. aus Verstehen-Modul)?
      → startEntryContextConversation()
   c. Sonst
      → startNewConversation(isFirstEver)
```

**„Neues Gespräch"-Button:**
1. `runPostConversation()` → fire-and-forget zur `post-conversation` Edge Function
2. `extractMemoryAndInsight()` → Legacy-Gedächtnis aktualisieren
3. Wenn `suggested_insight` vorhanden → `ConversationEndModal` zeigen
4. `startNewConversation()` + `showQuickReplies = true`

**Session-Limit:** Free-User werden bei > 3 Gesprächen/Monat auf ein Modal hingewiesen.

---

#### MirrorScreen (`/mirror`)

**Rolle:** „Mein Spiegel" — Alle automatisch und manuell gespeicherten Erkenntnisse.

**Features:**
- Tab-Filter: Alle · Muster · Stärken · Erkenntnisse · Ziele
- InsightCard mit Pin, Edit, Delete
- Kategorie-Farb-Coding (`muster` = coral, `stärke` = grün, etc.)
- Datumsbasierte Gruppierung

---

#### WellnessCheckScreen (`/wellness`)

**Rolle:** Einstiegspunkt für emotionalen Check-in vor dem Coaching.

**Flow:**
1. 1–10 Skala (ScaleSlider-Komponente)
2. Context-Chips (abhängig vom Score-Bereich: low/medium/high)
3. Optional: Freitext
4. Navigation zu `/coach` mit `state: { wellnessCheck: { score, label, emoji, context } }`

---

#### VorstehenScreen (`/verstehen`)

**Rolle:** Lernmodul — erklärt systemische Muster ohne Coaching-Sprache.

**Bekannte Muster-Keys:**
- `rueckzug_unter_druck` — Rückzug unter Druck
- `innerer_kritiker` — Der innere Kritiker
- `uebernahme_reflex` — Übernahme-Reflex
- `harmonie_um_jeden_preis` — Harmonie um jeden Preis
- `perfektionismus_blockade` — Perfektionismus-Blockade

**Unterseiten:**
- `/verstehen/:key` → MusterDetail (3-Schritt-Entstehungsgeschichte + Coach-Zitat wenn persönlich erkannt)
- `/verstehen/aus-gespraechen` → AusGespraechen (persönliche `pattern_references` — erste Karte Free, Rest Premium)

---

#### OnboardingFlow (`/onboarding`)

**Rolle:** Ersteinrichtung für neue User vor der Registrierung.

**Schritte:**
| Schritt | Komponente | Inhalt |
|---|---|---|
| 1 | Step1Welcome | Begrüßung, Produktversprechen |
| 2 | Step2Question | Bereichswahl (Arbeit, Beziehung, Inneres, etc.) |
| 3 | Step3Reveal | Systemisches Coaching erklären (hier darf der Begriff fallen) |
| 3b | Step3bAgreement | Coaching-Vereinbarung — Zustimmung (v1.0) |
| 4 | Step4Auth | E-Mail + Passwort / Magic Link / Login |

---

### 4.2 Komponenten

#### UI-Komponenten (`src/components/ui/`)

| Komponente | Props | Verhalten |
|---|---|---|
| `Button` | `variant`, `disabled`, `onClick` | `primary` = bg-accent; `secondary` = outlined; `ghost` = transparent; `white` = hellgrau |
| `Card` | `children`, `className`, `onClick` | bg-surface, border, rounded-lg, shadow-sm |
| `Badge` | `children`, `variant` | `free` = standard; `premium` = gold; `pro` = dunkelgrün |
| `Avatar` | `name`, `size` | Initialen-Kreis in bg-accent; Größen: sm/md/lg |
| `ScaleSlider` | `onSubmit` | Range 1–10, visuelles Feedback, Skalierungshinweis aus `SCALING_HINTS` |

#### Layout-Komponenten (`src/components/layout/`)

**AppShell:**
- Wrapper für alle 4 Haupt-Tabs
- Rendert `<main className="pb-20">` + `<Outlet />` + `<BottomNav />`

**BottomNav:**
- 4 Tabs: Home · Coach · Spiegel · Profil
- Aktiver Tab: accent-Farbe + Icon gefüllt
- Spiegel-Tab trägt Badge mit ungelesener Insight-Anzahl
- `safe-area-inset-bottom` für iPhone-Notch

#### Coach-Komponenten (`src/components/coach/`)

**ChatBubble:**
- `role === 'assistant'` → bg-surface, links ausgerichtet, abgerundete Ecken links unten scharf
- `role === 'user'` → bg-accent, rechts ausgerichtet, Ecken rechts unten scharf
- `isError === true` → opacity-70, italic, Fehlertext

**ChatInput:**
- Textarea mit dynamischer Höhe (38–120 px)
- Mikrofon-Button togglet `useVoiceInput`; während der Aufnahme erscheint Interim-Text in der Box
- Send-Button (`ArrowUp`-Icon) nur aktiv wenn `!isLoading && content.trim()`

**ConversationEndModal:**
- Erscheint nach „Neues Gespräch" wenn ein `suggested_insight` extrahiert wurde
- Editierbare Textarea (vorausgefüllt mit dem Vorschlag)
- Kategorie-Auswahl (Standard: `erkenntnis`)
- Bestätigen → Insight in `insights`-Tabelle speichern

---

### 4.3 Hooks

#### `useAuth`

**Zuständigkeit:** Gesamter Auth-Lifecycle + Profil-Management.

```
Exports:
  user            — Supabase Auth User
  session         — Supabase Session (mit access_token)
  profile         — profiles-Zeile aus DB
  loading         — Boolean (initiales Session-Laden)

  signUp(email, password, displayName)
  signIn(email, password)
  sendMagicLink(email)
  signOut()
  updateProfile(updates)
  checkConsent(profileData)           → 'missing' | 'outdated' | 'valid'
  checkCoachingAgreement(profileData) → 'missing' | 'outdated' | 'valid'
```

**Besonderheiten:**
- Session wird beim Mount aus Supabase wiederhergestellt (`onAuthStateChange`)
- Pending Invite Code: Wenn ein Code in `localStorage` liegt (gesetzt im Onboarding), wird er nach E-Mail-Verifikation automatisch eingelöst
- Consent-Versioning: `consent_version = '1.0'`, `coaching_agreement_version = '1.0'`

---

#### `useChat`

**Zuständigkeit:** Gesamter Gesprächs-State — von Erstellen bis Streaming.

```
Exports:
  messages             — Array<{ role, content, id, isError }>
  isLoading            — Boolean (während Stream läuft)
  conversationId       — UUID | null

  startNewConversation(isFirstEver, coachFile)
  startWellnessConversation(wellnessCheck, coachFile)
  startBriefingConversation(briefing, coachFile)
  startEntryContextConversation(entryContext, coachFile)
  sendMessage(content, inputMode)
  extractMemoryAndInsight()
  setMessages(messages)
```

**Interne Refs (keine Re-Renders):**
- `ragContextRef` — wird nach erster Nutzer-Nachricht befüllt (fire-and-forget)
- `briefingRef` — aktives Briefing-Objekt für nachfolgende `sendMessage`-Aufrufe
- `coachFileRef` — Coach-Akte für den aktuellen System-Prompt
- `isFirstUserMessageRef` — steuert wann RAG-Suche getriggert wird

**Streaming-Ablauf in `sendMessage`:**
1. User-Nachricht in State + DB speichern
2. Leere Assistant-Message als Platzhalter einfügen
3. POST zu `/functions/v1/chat` mit SSE
4. Jedes `data: {"text": "..."}` Token an State anhängen
5. Nach Stream-Ende: vollständige Nachricht in DB speichern
6. `logger.info('Stream completed', ...)`

---

#### `useMemory`

**Zuständigkeit:** Legacy Coach-Gedächtnis (`user_memory`-Tabelle). Wird als Fallback verwendet wenn `coach_file_entries` noch leer sind.

```
Exports:
  memory        — { themes, patterns, strengths, context } | null
  updateMemory(updates)
```

---

#### `useStreak`

**Zuständigkeit:** Tagesstreak-Pflege.

```
Exports:
  updateStreak()   — async, prüft streak_last_date und inkrementiert

Logik:
  Heute = streak_last_date  → nichts tun (bereits gezählt)
  Gestern = streak_last_date → streak_count + 1
  Älter oder null           → streak_count = 1 (Reset)
```

---

#### `useVoiceInput`

**Zuständigkeit:** Web Speech API Wrapper.

```
Exports:
  isListening   — Boolean
  isSupported   — Boolean (false auf Browsern ohne SpeechRecognition)
  toggle()      — Start/Stop
  start()
  stop()

Config: language = 'de-DE', continuous = false, interimResults = true
Callbacks: onTranscript(finalText), onInterim(interimText)
```

Spracheingabe **landet immer nur im Textarea** — kein automatisches Absenden.

---

### 4.4 Lib-Module

#### `src/lib/supabase.js`

```js
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Einzige Stelle im Frontend wo der Supabase-Client initialisiert wird. Alle Hooks importieren ihn von hier.

---

#### `src/lib/prompts.js`

Zentrale Datei für alle UI-nahen Texte und Konfigurationen.

| Export | Typ | Inhalt |
|---|---|---|
| `DAILY_IMPULSE_QUESTIONS` | Array (14) | Tägliche Reflexionsfragen |
| `OPENING_MESSAGES` | Array (3) | Standard-Gesprächseröffnungen |
| `FIRST_OPENING_MESSAGE` | String | Eröffnung beim allerersten Gespräch |
| `SCALING_HINTS` | Object {1..10} | Skalierungsfrage je Score |
| `WELLNESS_SCORES` | Object {1..10} | `{ label, emoji, color }` |
| `WELLNESS_CONTEXT_CHIPS` | Object | Chips für `low`/`medium`/`high` |
| `getDailyImpulse()` | Funktion | Gibt Frage basierend auf `Date.now()` zurück |
| `getWellnessRange(score)` | Funktion | `'low'` / `'medium'` / `'high'` |

---

#### `src/lib/logger.ts`

Frontend-Logger. Schreibt **immer** auf die Browser-Console und **zusätzlich** für `info`/`warn`/`error` in die `app_logs`-Tabelle via Supabase Anon Key.

```ts
export function setLoggerUserId(id: string | null)
export function createLogger(source: string)

// Methoden:
logger.debug(msg, data)   // nur Console
logger.info(msg, data)    // Console + DB
logger.warn(msg, data)    // Console + DB
logger.error(msg, data)   // Console + DB (mit stack_trace)
```

---

## 5. Backend — Supabase Edge Functions

Alle Edge Functions laufen in Deno und haben Zugriff auf `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` und `OPENAI_API_KEY`.

---

### `chat` — Haupt-KI-Proxy

**Aufgerufen von:** `useChat.js` bei jedem `sendMessage` und bei allen `start*`-Funktionen.

**Input:**
```json
{
  "messages":       [{ "role": "user|assistant", "content": "..." }],
  "conversationId": "uuid",
  "memory":         { "themes": [], "patterns": [], "strengths": [], "context": {} },
  "ragContext":     [...],
  "briefing":       { "openThread": "...", "conversationCount": 3, "daysSince": 5 },
  "entryContext":   { "source": "pattern", "topic": "innerer_kritiker" },
  "coachFile":      { "entries": [...], "profile": {...} },
  "wellnessCheck":  { "score": 4, "label": "Nicht so gut", "emoji": "😕", "context": "..." },
  "requestId":      "abc12345"
}
```

**Output:** Server-Sent Events Stream  
`data: {"text": "Hallo"}` / `data: [DONE]`

**System-Prompt-Aufbau (`buildSystemPrompt`):**

```
BASE_SYSTEM_PROMPT          (Haltung, Sprachprinzip, Widerstand, Muster-Erkennung)
  + BLOCK 1: Briefing       (Pre-Session, nur wenn conversationCount > 1)
  + BLOCK 2: Coach-Akte     (coach_file_entries + coachee_profile · Fallback: user_memory)
  + BLOCK 3: Resonanzkarte  (resonance_map · ab 3. Gespräch · immer unsichtbar)
  + BLOCK 4: RAG-Kontext    (Anonyme Erfahrungen aus experience_patterns)
  + BLOCK 5: Supervision    (Wöchentliche Empfehlung)
  + BLOCK 6: Wellness-Check (Score + Skalierungsfrage, ersetzt Standard-Eröffnung)
```

**Sprachprinzip (absolut verboten im System-Prompt):**
- `müssen` → `kannst`, `hast die Möglichkeit`
- `immer` (als Absolutum) → `oft`, `häufig`
- `nie` (als Absolutum) → `selten`, `bisher kaum`
- `du bist X` (Urteil) → `du neigst dazu`, `du verhältst dich oft so`
- `können nicht` → `hast dich bisher dagegen entschieden`

---

### `post-conversation` — Post-Processing

**Aufgerufen von:** `CoachScreen.runPostConversation()` beim Klick auf „Neues Gespräch" (fire-and-forget).

**Input:**
```json
{
  "messages":       [...],
  "conversationId": "uuid",
  "userId":         "uuid"
}
```

**Überspringt** wenn `messages.length < 3`.

**Ablauf (6 parallele Claude-Haiku-Prompts):**

| Schritt | Prompt | Schreibt in |
|---|---|---|
| 1 | Kontext laden | coach_file_entries, coachee_profile, resonance_map |
| 2 | SESSION_NOTES_PROMPT | session_notes + conversations.summary/open_thread |
| 3 | FILE_UPDATE_PROMPT | coach_file_entries (add/update/resolve) |
| 4 | PROFILE_UPDATE_PROMPT | coachee_profile (upsert) |
| 5 | ANONYMOUS_SUMMARY_PROMPT | experience_patterns + pattern_references + insights |
| 6 | REFLECTION_PROMPT | coach_reflections |
| 7 | RESONANCE_UPDATE_PROMPT (ab 3. Gespräch) | resonance_map (upsert) |

**Technische Details:**
- `max_tokens: 1500` pro Prompt
- JSON-Code-Fence-Stripping vor `JSON.parse`
- Fehler in `runPrompt` geben `{}` zurück (silent fail), aber `session_notes`-Fehler werden geloggt
- Logging: `Started` / `Completed` / Fehler via `_shared/logger.ts`

---

### `pre-session-briefing` — Wiederkehr-Briefing

**Aufgerufen von:** `CoachScreen` beim Mount, vor dem Gesprächsstart.

**Gibt zurück:**
```json
{
  "briefing": {
    "openThread":              "...",
    "openThreadIntensity":     "low|medium|high",
    "conversationCount":       12,
    "daysSince":               3,
    "lastConversationSummary": "..."
  },
  "coachFile": {
    "entries": [...],
    "profile": {...}
  }
}
```

Das Frontend-Check `shouldShowReturnGreeting()` prüft 5 Bedingungen:
1. `briefing.openThread` vorhanden
2. `conversationCount > 1`
3. `daysSince >= 2`
4. Mindestens 5 Tage seit `last_return_greeting_at`
5. Kein Wellness-Check und kein Entry-Kontext in Navigation state

---

### `rag-search` — Semantische Suche

**Aufgerufen von:** `useChat.js` nach der ersten Nutzer-Nachricht (fire-and-forget).

**Ablauf:**
1. OpenAI `text-embedding-3-small` Embedding der ersten Nachricht
2. pgvector-Suche in `experience_patterns` (Cosine Similarity > 0.78)
3. Top-3 anonyme Erfahrungen als Kontext zurück

**Fallback:** Wenn kein `OPENAI_API_KEY` → leeres Array.

---

### `validate-invite-code` — Beta-Zugang

**Aufgerufen von:** `OnboardingFlow` Step 4, nach Eingabe eines Invite-Codes.

- Validiert Code-Syntax + Gültigkeit + Max-Uses
- Ruft `redeem_invite_code` RPC auf (SECURITY DEFINER)
- Setzt `profiles.plan = 'tester'`

---

### `delete-account` — Account-Löschung

- Löscht alle User-Daten (CASCADE über RLS)
- Hard-Delete des Auth-Users via `service_role`
- Aufgerufen von `ProfileScreen` nach Bestätigungs-Modal

---

### `supervision` — Wöchentliche KI-Supervision

**Läuft per Cron** (wöchentlich). Analysiert alle `coach_reflections` der Woche und erzeugt einen `supervision_logs`-Eintrag mit Empfehlungen für den System-Prompt.

---

### `_shared/logger.ts`

Zentraler Logger für alle Edge Functions. Schreibt parallel auf `console.log` (Supabase Edge Function Logs-Tab) und in die `app_logs`-Tabelle via Service Role Key.

```ts
createLogger(source: string, requestId?: string, userId?: string)
// → { debug, info, warn, error, time }
```

`debug` → nur Console. `info/warn/error` → Console + DB.

---

## 6. Datenbank-Schema

### Kern-Tabellen

**`profiles`** (erweitert `auth.users`)
```
id                                UUID PK → auth.users
display_name                      TEXT
onboarding_completed              BOOLEAN DEFAULT false
onboarding_data                   JSONB
streak_count                      INTEGER DEFAULT 0
streak_last_date                  DATE
plan                              TEXT ('free' | 'premium' | 'tester')
sessions_used_this_month          INTEGER DEFAULT 0
last_return_greeting_at           TIMESTAMPTZ
consent_given_at                  TIMESTAMPTZ
consent_version                   TEXT ('1.0')
coaching_agreement_accepted_at    TIMESTAMPTZ
coaching_agreement_version        TEXT ('1.0')
```

**`conversations`**
```
id            UUID PK
user_id       UUID → profiles
title         TEXT
summary       TEXT          (Kurzfassung nach Gespräch)
key_insight   TEXT
memory_updated BOOLEAN
open_thread   TEXT          (Nicht abgeschlossenes Thema)
open_thread_intensity TEXT  ('low' | 'medium' | 'high')
```

**`messages`**
```
id                UUID PK
conversation_id   UUID → conversations
role              TEXT ('user' | 'assistant')
content           TEXT
input_mode        TEXT ('text' | 'voice')
metadata          JSONB
```

### Coach-Gedächtnis

**`coach_file_entries`** — Strukturierte Akte (ersetzt `user_memory` als Primärquelle)
```
id              UUID PK
user_id         UUID → profiles
category        TEXT ('pattern' | 'strength' | 'theme' | 'value' | 'trigger')
label           TEXT
description     TEXT
example         TEXT
source_conversation_id UUID → conversations (nullable)
first_detected  TIMESTAMPTZ
history         JSONB []   — [{ date, note, conversation_id }]
confidence      INTEGER 1–5
status          TEXT ('active' | 'fading' | 'resolved')
```

**`coachee_profile`** — Wächst durch Coach-Extraktion
```
user_id             UUID UNIQUE → profiles
occupation          TEXT
relationship_status TEXT
family_situation    TEXT
life_phase          TEXT
current_focus       TEXT
known_values        JSONB []
known_stressors     JSONB []
known_resources     JSONB []
```

**`user_memory`** — Legacy (1 Zeile pro User, Fallback)
```
user_id     UUID UNIQUE
themes      JSONB []
patterns    JSONB []
strengths   JSONB []
context     JSONB {}
```

**`resonance_map`** — Emotionales Reaktionsprofil
```
user_id             UUID UNIQUE
opening_patterns    JSONB []
closing_patterns    JSONB []
effective_styles    JSONB []
resonant_metaphors  JSONB []
preferred_pace      TEXT ('slow' | 'medium' | 'direct')
```

**`session_notes`** — Strukturierte Session-Notes
```
conversation_id     UUID UNIQUE → conversations
user_id             UUID → profiles
main_topic          TEXT
emotional_intensity INTEGER 1–5
resistance_detected BOOLEAN
resistance_location TEXT
breakthrough_moment TEXT
where_we_left_off   TEXT
coach_effectiveness INTEGER 1–5
next_session_rec    TEXT
file_updates        JSONB []
```

### Lern- & Analyse-Tabellen

**`experience_patterns`** — Anonyme RAG-Datenbank
```
embedding    vector(1536)   (pgvector)
context      TEXT
pattern      TEXT
resistance   TEXT
what_helped  TEXT
what_blocked TEXT
outcome      TEXT ('breakthrough' | 'stuck' | 'partial' | 'unknown')
```

**`pattern_references`** — Persönliche Muster aus Gesprächen
```
user_id         UUID → profiles
pattern_key     TEXT   ('rueckzug_unter_druck', etc.)
pattern_label   TEXT
message_id      UUID → messages (nullable)
conversation_id UUID → conversations (nullable)
excerpt         TEXT   (max. 150 Zeichen)
```

**`insights`** — „Mein Spiegel"
```
user_id         UUID → profiles
conversation_id UUID → conversations (nullable)
content         TEXT
category        TEXT ('muster' | 'stärke' | 'erkenntnis' | 'ziel')
source          TEXT ('auto' | 'user')
is_pinned       BOOLEAN DEFAULT false
```

**`coach_reflections`** — KI-Selbstreflexion
```
conversation_id    UUID → conversations
was_helpful        BOOLEAN
what_worked        TEXT
what_missed        TEXT
resistance_detected BOOLEAN
resistance_handled TEXT
improvement_note   TEXT
```

**`invite_codes`** — Beta-Tester-Zugang
```
code        TEXT UNIQUE (always uppercase)
max_uses    INTEGER (null = unbegrenzt)
uses_count  INTEGER DEFAULT 0
expires_at  TIMESTAMPTZ (null = kein Ablauf)
```

### RLS-Prinzip

Alle Tabellen haben Row Level Security aktiviert. Grundregel: `auth.uid() = user_id`. Edge Functions arbeiten mit dem `SUPABASE_SERVICE_ROLE_KEY`, der RLS vollständig umgeht.

---

## 7. Design System

### Farben (`src/styles/tokens.css`)

| Variable | Wert | Verwendung |
|---|---|---|
| `--color-bg` | `#F5F3EF` | Seitenhintergrund (Creme) |
| `--color-surface` | `#FFFFFF` | Karten, Chat-Bubbles |
| `--color-surface-2` | `#F8F7F4` | Sekundäre Flächen |
| `--color-accent` | `#2D5A4E` | Brand-Grün — Buttons, aktive Tabs, User-Bubbles |
| `--color-accent-2` | `#4A8C7A` | Hover-Zustand |
| `--color-accent-light` | `#E8F0EE` | Subtile Highlights |
| `--color-premium` | `#8B6914` | Gold für Premium-Features |
| `--color-coral` | `#C4593A` | Warnung, Muster-Kategorie |
| `--color-ink` | `#1A1916` | Primärer Text |
| `--color-ink-2` | `#5C5A54` | Sekundärer Text |
| `--color-ink-3` | `#9A9890` | Deaktiviert, Metadaten |

### Typografie

| Schriftart | Gewicht | Verwendung |
|---|---|---|
| DM Serif Display | 400 | Headlines, Display-Text (`font-display`) |
| DM Sans | 300, 400, 500 | Body, UI-Text (`font-body`) |

### Tailwind-Erweiterungen (`tailwind.config.js`)

Alle CSS-Variablen werden als Tailwind-Klassen verfügbar:
- `bg-bg`, `bg-surface`, `bg-surface-2`
- `text-ink`, `text-ink-2`, `text-ink-3`
- `bg-accent`, `text-accent`, `border-accent`
- `bg-premium`, `text-premium`

Custom Animations: `animate-fadeSlideUp` (0,4 s), `animate-fadeIn` (0,2 s)

### Mobile-first

Optimiert für 390 px (iPhone 14). Kein Breakpoint-Wechsel für Desktop — die App ist rein mobile.

---

## 8. Wichtige Flows

### Wellness-Check-Flow

```
HomeScreen → Kachel „Wellness" → /wellness
  ↓
WellnessCheckScreen: Score (1–10) + Chip + Freitext
  ↓
navigate('/coach', { state: { wellnessCheck: { score, label, emoji, context } } })
  ↓
CoachScreen mount: state.wellnessCheck erkannt
  ↓
startWellnessConversation(wellnessCheck)
  → Kein User-Message sichtbar
  → Coach antwortet direkt aus Wellness-Block im System-Prompt
```

### Wiederkehr-Begrüßungs-Flow

```
CoachScreen mount
  ↓
fetch pre-session-briefing
  ↓
shouldShowReturnGreeting() = true?
  → startBriefingConversation(briefing, coachFile)
  → profiles.last_return_greeting_at = now (fire-and-forget)
  
  → false?
  → startNewConversation(isFirstEver, coachFile)
```

### Post-Conversation-Processing

```
„Neues Gespräch" Button
  ↓
messages.length >= 3?
  → runPostConversation(messages, conversationId)  [fire-and-forget]
    → POST /functions/v1/post-conversation
      → 6 parallele Claude-Haiku-Prompts
      → session_notes, coach_file_entries, coachee_profile,
        experience_patterns, pattern_references, insights, coach_reflections,
        resonance_map (ab 3. Gespräch)
  
  → extractMemoryAndInsight()  [Legacy-Gedächtnis]
    → suggested_insight vorhanden?
      → ConversationEndModal zeigen
      → Nutzer bestätigt → insights.insert (source='user')
  
  → startNewConversation()
```

### RAG-Kontext-Flow

```
sendMessage() — erste Nutzer-Nachricht in diesem Gespräch
  ↓
fetchRagContext(content, accessToken) [fire-and-forget, parallel zum Stream]
  ↓
POST /functions/v1/rag-search
  → OpenAI Embedding (text-embedding-3-small)
  → pgvector Cosine Similarity in experience_patterns (threshold: 0.78)
  → Top-3 anonyme Erfahrungen
  ↓
ragContextRef.current = experiences
  ↓
Ab der nächsten sendMessage(): ragContext wird an /chat mitgesendet
```

---

## 9. Freemium-Logik

| Feature | Free | Premium / Tester |
|---|---|---|
| Coach-Gespräche | 3/Monat | Unbegrenzt |
| Mein Spiegel | 10 Erkenntnisse | Unbegrenzt + Export |
| Verstehen-Modul | Allgemeine Muster | + Persönliche Gesprächsreferenzen |
| Coach-Gedächtnis | Begrenzt | Vollständig |

**Zähler:** `profiles.sessions_used_this_month`  
**Überprüfung:** `CoachScreen.handleSend()` prüft vor jedem `sendMessage` ob Limit erreicht  
**Reset:** Cron am 1. des Monats (via Supabase Cron)  
**Upgrade-Flow:** Limit-Modal → `/premium`  

---

## 10. Build & Deployment

### Vite-Konfiguration

- Plugin: `@vitejs/plugin-react` + `vite-plugin-pwa`
- PWA Manifest: `name: Friedensstifter`, `theme_color: #2D5A4E`, `display: standalone`
- Workbox: CacheFirst für Google Fonts
- PWA-Icons: 192×192, 512×512 (maskable)

### Umgebungsvariablen

```bash
# .env.local (Frontend)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase Edge Functions (serverseitig, nie im Client)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=   # automatisch in Edge Functions verfügbar
```

### Deployment

- **Frontend:** Vercel (Auto-Deploy aus `main`-Branch)
- **Edge Functions:** `supabase functions deploy <name>`
- **Migrationen:** `supabase db push` vor jedem Deployment das DB-Änderungen enthält
- **Domain:** `app.friedensstifter.coach` (Vercel Custom Domain)

### Vor jedem Deployment prüfen

1. Sprachprinzip-Audit: Alle UI-Texte auf verbotene Wörter (`müssen`, `immer`, `nie`, `können nicht`, `du bist X`)
2. Migrationen ausgeführt: `supabase db push`
3. Edge Functions deployed: `supabase functions deploy chat post-conversation pre-session-briefing rag-search`
