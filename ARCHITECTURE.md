# Friedensstifter — Architektur-Dokumentation

> Stand: Juli 2026 · nach v3.2 + Admin-Bereich, Krisenprotokoll, Gesprächsverlauf, Coaching-Vereinbarung-Rückblick

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
10. [Admin-Bereich & Sicherheitsmuster](#10-admin-bereich--sicherheitsmuster)
11. [Build & Deployment](#11-build--deployment)

---

## 1. Stack-Übersicht

| Schicht | Technologie |
|---|---|
| Frontend | React 18 + Vite · Tailwind CSS v3 · React Router v6 |
| State | Lokale Hook-States (kein globaler Store) · `zustand` ist als Dependency installiert, aber aktuell ungenutzt |
| Backend | Supabase (Auth + PostgreSQL + Edge Functions) |
| KI | Anthropic Claude API · `claude-sonnet-4-5` (Streaming, Haupt-Coach) · `claude-haiku-4-5-20251001` (Post-Processing, Klassifikation) |
| Hosting | Vercel · Domain: `app.friedensstifter.coach` |
| PWA | `vite-plugin-pwa` (Workbox) |
| Logging | `app_logs`-Tabelle (serverseitig) + Browser-Console (clientseitig) |

**Schlüsselprinzipien:**
- Mobile-first, 390 px optimiert
- Alle KI-Antworten werden gestreamt (token-by-token)
- Spracheingabe landet im Textarea, wird nie automatisch abgesendet
- Coach-Gedächtnis ist für den User unsichtbar
- Alle Edge Functions loggen strukturiert via `_shared/logger.ts`
- Admin-Berechtigungen werden **serverseitig** geprüft (`is_admin`-Check in der Edge Function selbst) — ein versteckter Frontend-Screen ist kein Zugriffsschutz (siehe [Abschnitt 10](#10-admin-bereich--sicherheitsmuster))

---

## 2. Projektstruktur

```
CoachingApp/
├── src/
│   ├── App.jsx                          ← Router-Root, ProtectedRoute/AdminRoute-Wrapper
│   ├── main.jsx                         ← ReactDOM.render, BrowserRouter
│   ├── router.jsx                       ← Leerer Stub (Routing lebt komplett in App.jsx)
│   │
│   ├── hooks/                           ← Gesamter App-State (kein Zustand/Redux)
│   │   ├── useAuth.js                   ← User, Session, Profile, Consent, Coaching-Vereinbarung
│   │   ├── useChat.js                   ← Gesprächs-State, Streaming, 5 Start-/Resume-Varianten
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
│   │   ├── coach/                       ← Chat-spezifische Komponenten
│   │   │   ├── ChatBubble.jsx
│   │   │   ├── ChatInput.jsx            ← Textarea + Mikrofon-Button
│   │   │   ├── QuickReplies.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   ├── ConversationEndModal.jsx
│   │   │   └── CrisisResponseCard.jsx   ← Eigene Card statt Bubble bei Krisenfall (v-Krise)
│   │   └── legal/
│   │       └── CoachingAgreementContent.jsx ← Vertragstext, single source of truth
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
│       │   ├── Step3bAgreement.jsx      ← Coaching-Vereinbarung, nutzt CoachingAgreementContent
│       │   └── Step4Auth.jsx
│       ├── home/
│       │   └── HomeScreen.jsx           ← Dashboard mit Tool-Kacheln (Coach/Wellness/Stimmen/Verstehen)
│       ├── coach/
│       │   └── CoachScreen.jsx          ← Haupt-Chat-Interface
│       ├── mirror/
│       │   └── MirrorScreen.jsx         ← "Mein Spiegel" — Erkenntnisse + Deine Akte
│       ├── stimmen/
│       │   └── StimmenScreen.jsx        ← "Innere Stimmen" (Premium) — benannte + Kandidaten-Stimmen
│       ├── history/
│       │   └── HistoryScreen.jsx        ← Gesprächsverlauf + Fortsetzen-Funktion
│       ├── profile/
│       │   └── ProfileScreen.jsx
│       ├── admin/
│       │   └── AdminUsersScreen.jsx     ← Admin-only: Nutzerverwaltung + Feedback + Einladen
│       ├── wellness/
│       │   └── WellnessCheckScreen.jsx  ← 1–10 Skala + Context-Chips
│       ├── howto/
│       │   └── HowItWorksScreen.jsx     ← FAQ-Chat (ohne AppShell)
│       ├── verstehen/                   ← Muster-Bibliothek
│       │   ├── VorstehenScreen.jsx      ← Übersicht + Filter (innerhalb AppShell/BottomNav)
│       │   ├── MusterDetail.jsx         ← Detailansicht per :key (kein AppShell)
│       │   └── AusGespraechen.jsx       ← Persönliche Pattern-Referenzen (kein AppShell)
│       ├── premium/
│       │   └── PremiumScreen.jsx
│       └── legal/
│           ├── ImpressumScreen.jsx
│           ├── DatenschutzScreen.jsx
│           └── CoachingAgreementScreen.jsx ← Vereinbarung nachträglich einsehbar (/vereinbarung)
│
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   └── logger.ts                ← Zentraler Logger für alle Edge Functions
│   │   ├── chat/
│   │   │   ├── index.ts                 ← Claude API Proxy + System-Prompt-Builder + Limit-/Krisen-Check
│   │   │   └── crisisDetection.ts       ← Leichte Klassifikation auf akute Suizidalität
│   │   ├── post-conversation/index.ts   ← Post-Processing (7+ parallele/sequentielle Prompts)
│   │   ├── pre-session-briefing/index.ts← Briefing-Objekt für Wiederkehr-Begrüßung
│   │   ├── rag-search/index.ts          ← Semantische Ähnlichkeitssuche
│   │   ├── validate-invite-code/index.ts← Invite-Code-Einlösung (Selbstregistrierung)
│   │   ├── admin-users/index.ts         ← Admin: Nutzerliste + Beta-/Limit-Verwaltung
│   │   ├── admin-feedback/index.ts      ← Admin: Feedback-Liste inkl. Name/E-Mail
│   │   ├── admin-invite-user/index.ts   ← Admin: Nutzer per E-Mail einladen (Beta-Zugang)
│   │   ├── delete-account/index.ts      ← Account-Löschung (hard delete)
│   │   └── supervision/index.ts         ← Wöchentliche KI-Supervision (Cron)
│   └── migrations/
│       ├── 001_initial.sql              ← profiles, conversations, messages, RLS
│       ├── 002_v1_1.sql                 ← user_memory, insights
│       ├── 003_v1_4.sql                 ← experience_patterns (pgvector), coach_reflections, user_feedback
│       ├── 004_v1_6.sql                 ← messages.input_mode, conversations.summary
│       ├── 005_v1_8.sql                 ← app_logs
│       ├── 006_v2_0.sql                 ← pattern_references
│       ├── 007_v2_1.sql                 ← open_thread, last_return_greeting_at
│       ├── 008_v2_2.sql                 ← coach_file_entries, coachee_profile, session_notes
│       ├── 009_v2_4.sql                 ← resonance_map
│       ├── 010_v2_5.sql                 ← invite_codes, profiles.plan = 'tester'
│       ├── 011_v2_7.sql                 ← DSGVO-Consent-Felder
│       ├── 012_v2_8.sql                 ← coaching_agreement_accepted_at
│       ├── 013_v2_9.sql                 ← conversations.post_processed_at/_message_count (Idempotenz)
│       ├── 014_v2_9b_grants.sql         ← GRANT-Statements für service_role versioniert
│       ├── 015_v3_0_inner_voices.sql    ← inner_voices, coach_file_entries/pattern_references.voice_id
│       ├── 016_admin_users.sql          ← profiles.is_admin/is_beta_tester/session_limit
│       ├── 017_feedback_beta_type.sql   ← user_feedback.feedback_type + 'beta'
│       ├── 018_invite_history.sql       ← profiles.invited_at/invited_by
│       ├── 019_v3_2_linked_value.sql    ← coach_file_entries.linked_value
│       ├── 020_v3_2_conversation_history.sql ← updated_at-Trigger, get_conversation_history() RPC
│       └── 021_crisis_events.sql        ← crisis_events, messages.message_type
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

| Pfad | Screen | Auth | Zusatz-Guard | AppShell |
|---|---|---|---|---|
| `/landing` | LandingScreen | nein (auth → `/home`) | — | nein |
| `/auth` | AuthScreen | nein (auth → `/home`) | — | nein |
| `/onboarding` | OnboardingFlow | nein (auth → `/home`) | — | nein |
| `/welcome` | WelcomeScreen | **ja** | — | nein |
| `/home` | HomeScreen | **ja** | — | **ja** |
| `/coach` | CoachScreen | **ja** | — | **ja** |
| `/mirror` | MirrorScreen | **ja** | — | **ja** |
| `/profile` | ProfileScreen | **ja** | — | **ja** |
| `/verstehen` | VorstehenScreen | **ja** | — | **ja** |
| `/stimmen` | StimmenScreen | **ja** | Premium-Gate *im Screen* (Free sieht Locked-State) | **ja** |
| `/howto` | HowItWorksScreen | **ja** | — | nein |
| `/wellness` | WellnessCheckScreen | **ja** | — | nein |
| `/premium` | PremiumScreen | **ja** | — | nein |
| `/verstehen/aus-gespraechen` | AusGespraechen | **ja** | — | nein |
| `/verstehen/:key` | MusterDetail | **ja** | — | nein |
| `/verlauf` | HistoryScreen | **ja** | — | nein |
| `/vereinbarung` | CoachingAgreementScreen | **ja** | — | nein |
| `/admin/users` | AdminUsersScreen | **ja** | `AdminRoute` (`profile.is_admin`) | nein |
| `/impressum` | ImpressumScreen | nein | — | nein |
| `/datenschutz` | DatenschutzScreen | nein | — | nein |

### Routing-Logik

```
Nicht-authentifiziert → /landing
Authentifiziert auf /landing oder /auth → /home
Fallback (*) → /home (auth) oder /landing (nicht auth)
```

### ProtectedRoute & AdminRoute

```jsx
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/landing" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/landing" replace />
  if (!profile?.is_admin) return <Navigate to="/home" replace />
  return children
}
```

`AdminRoute` ist **nur UX** — die eigentliche Absicherung passiert serverseitig in `admin-users`/`admin-feedback`/`admin-invite-user` (siehe [Abschnitt 10](#10-admin-bereich--sicherheitsmuster)).

### AppShell

`AppShell` rendert einen `<Outlet>` mit darunter liegendem `<BottomNav>`. Nur `/home`, `/coach`, `/mirror`, `/profile`, `/verstehen`, `/stimmen` sind davon umschlossen — die BottomNav selbst zeigt weiterhin nur 4 Tabs (Home/Coach/Spiegel/Profil), Verstehen und Stimmen werden über Home-Kacheln bzw. das Profil erreicht.

---

## 4. Frontend-Architektur

### 4.1 Screens

#### HomeScreen (`/home`)

**Rolle:** Zentrales Dashboard. Startpunkt der meisten Nutzer-Sessions.

**Inhalt:**
- Persönliche Begrüßung mit Avatar (aus `profile.display_name`)
- Tagesstreak-Anzeige
- Tägliche Impulsfrage (rotierend, Index = Tagesindex % 14, aus `prompts.js`)
- 4 Tool-Kacheln (`TOOL_CARDS`): KI-Coach · Wie geht's dir? · Innere Stimmen (PRO-Badge, dauerhaft sichtbar, verlinkt nach `/stimmen`) · Verstehen

**Navigiert zu:** `/coach`, `/wellness`, `/stimmen`, `/verstehen`

---

#### CoachScreen (`/coach`)

**Rolle:** Haupt-Chat-Interface — das Herzstück der App.

**Eröffnungslogik beim Mount (Prioritätsreihenfolge, `VARIANTE 0` sticht alle anderen):**

```
0. resumeConversationId aus Navigation state (von HistoryScreen "Gespräch fortsetzen")?
   → loadConversation(id) — lädt komplette Historie, KEIN countSession()
     Fallback bei Fehler: startNewConversation()

3. Wellness-Check aus Navigation state (state.wellnessCheck)?
   → startWellnessConversation()

   pre-session-briefing laden:
   4. Entry-Kontext (z.B. aus Verstehen-Modul/Tagesimpuls/Spiegel)?
      → startEntryContextConversation()
   1. Offener Faden + ≥2 Tage alt + ≥5 Tage seit letzter Begrüßung?
      → startBriefingConversation() + last_return_greeting_at aktualisieren
   2. Sonst
      → startNewConversation(isFirstEver)
```

**Header:** Icon-Button "Gesprächsverlauf" (→ `/verlauf`) links neben "Neues Gespräch".

**„Neues Gespräch"-Button:**
1. `runPostConversation()` → fire-and-forget zur `post-conversation` Edge Function
2. `extractMemoryAndInsight()` → Legacy-Gedächtnis aktualisieren
3. Wenn `suggested_insight` vorhanden → `ConversationEndModal` zeigen
4. `startNewConversation()` + `showQuickReplies = true`

**Post-Conversation-Auslösung (nicht nur der Button!):** vier unabhängige Trigger-Pfade rufen dieselbe `runPostConversation()`-Kernfunktion auf — `visibilitychange` (Tab in Hintergrund), `pagehide` (Tab schließen/Reload), Unmount-Cleanup (SPA-Navigation weg vom Coach) und der explizite Button-Klick. Ein `processedRef`-Set verhindert clientseitige Doppel-Aufrufe pro `conversationId`; die Edge Function selbst hat zusätzlich einen serverseitigen Idempotenz-Guard über `post_processed_message_count`.

**Session-Limit:** Nur `plan === 'premium'` ist unbegrenzt. `'tester'` zählt wie jeder unbezahlte Account und wird durch `profile.session_limit` begrenzt (individuell pro Nutzer im Admin-Bereich setzbar, `null` = unbegrenzt). Durchsetzung passiert **zweifach**: clientseitig in `handleSend()` (UX, zeigt Limit-Modal) und serverseitig in `chat/index.ts` (harte Grenze, 429 bei Überschreitung — ein direkter Funktionsaufruf am Frontend vorbei wird ebenfalls blockiert).

**Krisenfall-Rendering:** Nachrichten mit `messageType === 'crisis_response'` werden als `CrisisResponseCard` statt als `ChatBubble` gerendert (siehe [Krisenfall-Flow](#krisenfall-flow)).

**"Innere Stimmen"-Namensgebung:** Enthält eine Nachricht den `<<VOICE_NAMING_CHOICE ...>>`-Steuerblock, wird er aus dem sichtbaren Text entfernt und stattdessen als Chip-Auswahl (`VoiceNamingChips`) gerendert — Auswahl schreibt direkt in `inner_voices` und wird als normale Folgenachricht weitergeführt.

---

#### MirrorScreen (`/mirror`)

**Rolle:** „Mein Spiegel" — zwei Tabs.

**Tab 1 — Erkenntnisse:**
- Filter: Alle · Muster · Stärken · Erkenntnisse · Ziele
- InsightCard mit Pin, Delete
- Kategorie-Farb-Coding (`muster` = accent, `stärke` = grün, `erkenntnis` = premium, `ziel` = coral)

**Tab 2 — Deine Akte:**
- Gruppiert `coach_file_entries` nach Muster / Stärken / Kontext (`coachee_profile`) / Wie du reagierst
- Zeitachse ("Deine Entwicklung") — nur Premium, ab dem 3. Gespräch
- Free-Nutzer: erste Karte je Sektion offen, Rest gesperrt + Premium-CTA
- `VerlaufsSheet` (Historie eines Eintrags) wird per `createPortal` direkt in `document.body` gerendert — entkoppelt von `AppShell`/`Outlet`, damit `transform`-tragende Vorfahren die `position: fixed`-Positionierung nicht verschieben können

---

#### StimmenScreen (`/stimmen`)

**Rolle:** „Innere Stimmen" — Premium-Feature, zeigt wiederkehrende innere Anteile.

- **Benannt** (`status = 'named'`): Karte mit Name, Beschreibung, verknüpften Akte-Einträgen, Aktivitäts-Dots, CTA "Mit [Name] sprechen"
- **Kandidat, aber schon angesprochen** (`status = 'candidate'`, `introduced_at IS NOT NULL`): dezente Karte mit Referenz-Chips zu Akte-Einträgen
- **Kandidat, noch nicht angesprochen** (`introduced_at IS NULL`): bleibt **inhaltlich verborgen** — nur ein `pendingCount` fließt in einen Hinweistext ("Da deutet sich schon etwas an"), keine Details, bevor der Coach es im Gespräch selbst anspricht
- Free-Nutzer sehen einen vollflächigen Locked-State mit Premium-CTA (kein Teilinhalt wie bei "Deine Akte")

Namensgebung passiert **ausschließlich im Chat** (kein Eingabefeld auf diesem Screen) — siehe [Innere-Stimmen-Flow](#innere-stimmen-flow).

---

#### HistoryScreen (`/verlauf`)

**Rolle:** Gesprächsverlauf mit Fortsetzen-Funktion.

- Lädt Liste über RPC `get_conversation_history()` (vermeidet N+1-Queries)
- Vorschau: `session_notes.main_topic` falls vorhanden, sonst erste Nutzer-Nachricht (gekürzt)
- Free-Nutzer: nur das neueste Gespräch entsperrt, Rest mit Lock-Overlay + Premium-CTA (analog `AusGespraechen.jsx`)
- „Gespräch fortsetzen" → `navigate('/coach', { state: { resumeConversationId } })`

---

#### AdminUsersScreen (`/admin/users`)

**Rolle:** Admin-only Nutzerverwaltung. Kein Bestandteil der regulären Navigation (nur direkt per URL).

**Tab "Nutzer":** Liste aller Profile inkl. E-Mail (aus `auth.admin.listUsers()`), Beta-Tester-Toggle, individuelles Gesprächslimit, Einladungs-Historie ("Eingeladen am ... — noch nicht angenommen" falls `last_sign_in_at IS NULL`). Formular "+ Per E-Mail einladen" ruft `admin-invite-user` auf.

**Tab "Feedback":** Alle `user_feedback`-Einträge inkl. Name/E-Mail, sortiert nach Datum.

---

#### CoachingAgreementScreen (`/vereinbarung`)

**Rolle:** Nachträglicher Rückblick auf die im Onboarding akzeptierte Coaching-Vereinbarung.

- Nachweis-Card oben: Zustimmungsdatum (`coaching_agreement_accepted_at`, Format „12. Juli 2026, 14:32 Uhr") oder Fallback-Hinweis bei fehlendem Datum
- Vertragstext aus `CoachingAgreementContent.jsx` — identisch zur Onboarding-Version (single source of truth)

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

**Rolle:** Lernmodul — erklärt systemische Muster ohne Coaching-Sprache. Liegt innerhalb `AppShell` (BottomNav bleibt sichtbar) — die beiden Detail-Screens bewusst nicht.

**Bekannte Muster-Keys:**
- `rueckzug_unter_druck` — Rückzug unter Druck
- `innerer_kritiker` — Der innere Kritiker
- `uebernahme_reflex` — Übernahme-Reflex
- `harmonie_um_jeden_preis` — Harmonie um jeden Preis
- `perfektionismus_blockade` — Perfektionismus-Blockade

**Unterseiten (kein AppShell, eigener Zurück-Button):**
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
| 3b | Step3bAgreement | Coaching-Vereinbarung — Zustimmung (nutzt `CoachingAgreementContent`) |
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
- Wrapper für Home/Coach/Spiegel/Profil/Verstehen/Stimmen
- Rendert `<main className="pb-20">` + `<Outlet />` + `<BottomNav />`

**BottomNav:**
- 4 Tabs: Home · Coach · Spiegel · Profil
- Aktiver Tab: accent-Farbe + Icon gefüllt
- Spiegel-Tab trägt Badge mit ungelesener Insight-Anzahl (letzte 7 Tage)
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

**CrisisResponseCard:**
- Eigenständige Card statt Chat-Bubble (voller Breite, kein Sprechblasen-Layout, warmer `accent-light`-Ton statt Alarmfarben)
- `linkify()` erkennt Telefonnummern/URL im Fließtext per Regex und macht sie zu echten `tel:`/`https:`-Links (kein starres Parsen der Modell-Ausgabe)

#### Legal-Komponenten (`src/components/legal/`)

**CoachingAgreementContent:** reiner Vertragstext (4 Abschnitte + Jerome-Signatur), wird sowohl im Onboarding als auch im Rückblick-Screen gerendert.

---

### 4.3 Hooks

#### `useAuth`

**Zuständigkeit:** Gesamter Auth-Lifecycle + Profil-Management.

```
Exports:
  user            — Supabase Auth User
  session         — Supabase Session (mit access_token)
  profile         — profiles-Zeile aus DB (select('*') — inkl. is_admin, session_limit, etc.)
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
- `profile` enthält seit v3.x auch Admin-/Beta-/Invite-Felder — keine eigenen Hook-Exporte dafür nötig, da `select('*')` bereits alles lädt

---

#### `useChat`

**Zuständigkeit:** Gesamter Gesprächs-State — von Erstellen bis Streaming bis Fortsetzen.

```
Exports:
  messages             — Array<{ role, content, id, isError, messageType }>
  isLoading            — Boolean (während Stream läuft)
  conversationId       — UUID | null

  startNewConversation(isFirstEver, coachFile)
  startWellnessConversation(wellnessCheck, coachFile)
  startBriefingConversation(briefing, coachFile)
  startEntryContextConversation(entryContext, coachFile)
  sendMessage(content, inputMode)
  extractMemoryAndInsight()
  loadConversation(conversationId)     — lädt bestehendes Gespräch aus dem Verlauf, kein countSession()
  setMessages(messages)
```

**Interne Refs (keine Re-Renders):**
- `ragContextRef` — wird nach erster Nutzer-Nachricht befüllt (fire-and-forget); nach `loadConversation()` zurückgesetzt, damit RAG beim nächsten Turn erneut läuft
- `briefingRef` — aktives Briefing-Objekt für nachfolgende `sendMessage`-Aufrufe
- `coachFileRef` — Coach-Akte für den aktuellen System-Prompt
- `isFirstUserMessageRef` — steuert wann RAG-Suche getriggert wird

**Streaming-Ablauf in `sendMessage`:**
1. User-Nachricht in State + DB speichern
2. Leere Assistant-Message als Platzhalter einfügen
3. POST zu `/functions/v1/chat` mit SSE
4. Meta-Chunk `data: {"meta": {"messageType": "crisis_response"}}` (falls vorhanden) markiert die Nachricht **vor** dem ersten Text-Token
5. Jedes `data: {"text": "..."}` Token an State anhängen
6. Nach Stream-Ende: vollständige Nachricht inkl. `message_type` in DB speichern
7. `logger.info('Stream completed', ...)`

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

Alle Edge Functions laufen in Deno und haben Zugriff auf `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` und `OPENAI_API_KEY`. `admin-invite-user` nutzt zusätzlich optional `SITE_URL` (Fallback: `https://app.friedensstifter.coach`).

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
`data: {"meta": {"messageType": "crisis_response"}}` (nur bei Krisenfall, vor dem ersten Text-Chunk) → `data: {"text": "Hallo"}` (wiederholt) → `data: [DONE]`

**Vor dem eigentlichen Prompt-Aufbau, in dieser Reihenfolge:**
1. **Serverseitige Limit-Durchsetzung** — `profiles.session_limit` vs. `sessions_used_this_month`, blockiert mit `429` wenn erreicht (Nutzer mit `plan === 'premium'` ausgenommen)
2. **Krisenerkennung** (`crisisDetection.ts`) — nur bei echter Nutzer-Nachricht, nicht im Howto-Modus. Bei `acute_risk` + Confidence ≥ medium: Insert in `crisis_events` (via echtem Service-Role-Client, siehe [Abschnitt 10](#10-admin-bereich--sicherheitsmuster)) und `systemPrompt` wird **komplett ersetzt** durch `CRISIS_RESPONSE_BLOCK`
3. **"Innere Stimmen"-Taktung** — prüft auf einen unangesprochenen Kandidaten (`introduceVoice`, ab 2. Antwort) oder einen seit ≥24h eingeführten, noch unbenannten Kandidaten (`namingVoice`); beide nie im selben Turn, übersprungen bei akuter Belastung (`wellnessCheck.score <= 3`)
4. **Wirkmechanismus-Rhythmus** (`offerMechanism`) — alle 4 Coach-Antworten (ab der 3.) wird aktiv ein Mechanismus angeboten, unabhängig davon ob im Gesagten etwas "offensichtlich" ist

**System-Prompt-Aufbau (`buildSystemPrompt`), wenn kein Krisenfall vorliegt:**

```
BASE_SYSTEM_PROMPT          (Haltung, Sprachprinzip, Widerstand, Kapazität-vs-Widerstand,
                              Verantwortungsverschiebung, Muster-Erkennung)
  + SYSTEMIC_WITNESSING_BLOCK (Bewertungskette/"Brille", Zirkuläre Kausalität, Selbsterfüllende
                              Prophezeiung, Werte-Kollision, Systemfunktion/"innerer Wächter",
                              blinde Flecken, Regelkreise, Ressourcen, Perspektivwechsel)
  + MECHANISM_OFFER_BLOCK    (nur im Rhythmus-Turn)
  + VOICE_INTRODUCE_BLOCK / VOICE_NAMING_BLOCK (nur je nach Taktung, nie beide gleichzeitig)
  + BLOCK 1: Briefing        (Pre-Session, nur wenn conversationCount > 1)
  + BLOCK 2: Coach-Akte      (coach_file_entries inkl. linked_value + coachee_profile · Fallback: user_memory)
  + BLOCK 3: Resonanzkarte   (resonance_map · ab 3. Gespräch · immer unsichtbar)
  + BLOCK 4: RAG-Kontext     (Anonyme Erfahrungen aus experience_patterns)
  + BLOCK 5: Supervision     (Wöchentliche Empfehlung)
  + BLOCK 6: Wellness-Check  (Score + Skalierungsfrage, ersetzt Standard-Eröffnung)
  + BLOCK 7: Entry-Kontext   (v2.6 — woher kommt der Mensch: pattern/tagesimpuls/verstehen/spiegel)
```

Bei Krisenfall ersetzt `CRISIS_RESPONSE_BLOCK` **alle** obigen Blöcke vollständig (BLOCK 0, "übersteuert alle anderen Verhaltensregeln").

**Sprachprinzip (absolut verboten im System-Prompt):**
- `müssen` → `kannst`, `hast die Möglichkeit`
- `immer` (als Absolutum) → `oft`, `häufig`
- `nie` (als Absolutum) → `selten`, `bisher kaum`
- `du bist X` (Urteil) → `du neigst dazu`, `du verhältst dich oft so`
- `können nicht` → `hast dich bisher dagegen entschieden`

---

### `chat/crisisDetection.ts` — Krisen-Klassifikation

Eigenständiges Modul, importiert von `chat/index.ts`. Ein Haiku-Call pro Nutzer-Nachricht, prüft **nur** auf konkrete, akute Suizid-/Selbstverletzungs-Hinweise (nicht auf allgemeine Verzweiflung — die bleibt normales Coaching-Thema). Fail-safe: schlägt die Klassifikation selbst fehl, wird `acute_risk: false` angenommen — blockiert nie die normale Antwort.

---

### `post-conversation` — Post-Processing

**Aufgerufen von:** `CoachScreen.runPostConversation()` — vier Trigger-Pfade (siehe CoachScreen-Sektion oben), nicht nur der Button-Klick.

**Input:**
```json
{ "messages": [...], "conversationId": "uuid", "userId": "uuid" }
```

**Überspringt** wenn `messages.length < 3`. Idempotent über `conversations.post_processed_message_count`.

**Ablauf:**

| Schritt | Prompt | Schreibt in |
|---|---|---|
| 1 | Kontext laden | coach_file_entries, coachee_profile, resonance_map, Gesprächsanzahl |
| 2 | SESSION_NOTES_PROMPT | session_notes (Werte per `clampScore()` auf 1–5 geklammert) + conversations.summary/open_thread |
| 3 | FILE_UPDATE_PROMPT | coach_file_entries (add/update/resolve), inkl. `linked_value` (Wert/Glaubenssatz hinter dem Muster) |
| **4b** | VOICE_CLUSTER_PROMPT | inner_voices — prüft erst gegen bestehende (auch unbenannte) Stimmen, sonst neuer Kandidat; Rollback der Stimmen-Zeile bei fehlgeschlagener Verknüpfung |
| 5 | PROFILE_UPDATE_PROMPT | coachee_profile (upsert) |
| 6 | ANONYMOUS_SUMMARY_PROMPT | experience_patterns + pattern_references + insights |
| 7 | REFLECTION_PROMPT | coach_reflections (inkl. Kapazität-vs-Widerstand-Check, Optimierungs-/Schuld-Framing-Check) |
| 8 | RESONANCE_UPDATE_PROMPT (ab 3. Gespräch) | resonance_map (upsert) |

**Technische Details:**
- `max_tokens: 2000` pro Prompt (Anfang 2026 auf 1500 → 2000 angehoben, war zu knapp für Cluster-Beschreibung + Namensvorschläge)
- JSON-Code-Fence-Stripping vor `JSON.parse`
- `runPrompt()` loggt jeden Fehler (Label + Rohausgabe-Preview) statt ihn stillschweigend als `{}` zurückzugeben — jeder DB-Write prüft und loggt sein eigenes Ergebnis (kein blindes `await` mehr)
- Logging: `Started` / `Completed` / jeder Schritt einzeln via `_shared/logger.ts`

---

### `pre-session-briefing` — Wiederkehr-Briefing

**Aufgerufen von:** `CoachScreen` beim Mount, vor dem Gesprächsstart.

**Gibt zurück:**
```json
{
  "briefing": {
    "openThread": "...", "openThreadIntensity": "low|medium|high",
    "conversationCount": 12, "daysSince": 3, "lastConversationSummary": "..."
  },
  "coachFile": { "entries": [...], "profile": {...} }
}
```

Das Frontend-Check `shouldShowReturnGreeting()` prüft 5 Bedingungen: `openThread` vorhanden · `conversationCount > 1` · `daysSince >= 2` · ≥5 Tage seit `last_return_greeting_at` · kein Wellness-Check/Entry-Kontext/Resume in Navigation state.

---

### `rag-search` — Semantische Suche

**Aufgerufen von:** `useChat.js` nach der ersten Nutzer-Nachricht (fire-and-forget).

1. OpenAI `text-embedding-3-small` Embedding der ersten Nachricht
2. pgvector-Suche in `experience_patterns` (Cosine Similarity > 0.78)
3. Top-3 anonyme Erfahrungen als Kontext zurück

**Fallback:** Wenn kein `OPENAI_API_KEY` → leeres Array.

---

### `validate-invite-code` — Beta-Zugang (Selbstregistrierung)

**Aufgerufen von:** `OnboardingFlow` Step 4, nach Eingabe eines Invite-Codes.

- Validiert Code-Syntax + Gültigkeit + Max-Uses
- Ruft `redeem_invite_code` RPC auf (SECURITY DEFINER)
- Setzt `profiles.plan = 'tester'`

Zweiter, direkterer Weg zum gleichen Ziel: `admin-invite-user` (siehe unten) — beide Wege bestehen parallel.

---

### `admin-users` / `admin-feedback` / `admin-invite-user` — Admin-Bereich

Siehe [Abschnitt 10](#10-admin-bereich--sicherheitsmuster) für das gemeinsame Sicherheitsmuster. Kurzüberblick:

| Function | Methode(n) | Zweck |
|---|---|---|
| `admin-users` | GET, PATCH | Nutzerliste inkl. E-Mail/`last_sign_in_at`; setzt `is_beta_tester`/`session_limit` |
| `admin-feedback` | GET | Alle `user_feedback`-Einträge inkl. Name/E-Mail |
| `admin-invite-user` | POST | `auth.admin.inviteUserByEmail()` + setzt Beta-Rechte + `invited_at`/`invited_by` direkt |

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

Zentraler Logger für alle Edge Functions. Schreibt parallel auf `console.log` (Supabase Edge Function Logs-Tab) und in die `app_logs`-Tabelle via Service Role Key. `persist()` läuft über `EdgeRuntime.waitUntil()`, damit Log-Inserts nicht abgeschnitten werden, nachdem die Response bereits an den Client zurückgegangen ist.

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
is_admin                          BOOLEAN DEFAULT false      -- v3.x, manuell im SQL-Editor gesetzt
is_beta_tester                    BOOLEAN DEFAULT false      -- v3.x, über Admin-Bereich steuerbar
session_limit                     INTEGER DEFAULT 3          -- v3.x, null = unbegrenzt, individuell pro Nutzer
invited_at                        TIMESTAMPTZ                -- v3.x, gesetzt bei admin-invite-user
invited_by                        UUID → auth.users           -- v3.x
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
post_processed_at            TIMESTAMPTZ  -- v2.9, Idempotenz-Guard
post_processed_message_count INTEGER      -- v2.9
updated_at    TIMESTAMPTZ    -- v3.2, per Trigger bei jeder neuen Message aktualisiert
```
Trigger `trg_touch_conversation_updated_at` (AFTER INSERT ON messages) hält `updated_at` aktuell — Grundlage für die Sortierung im Gesprächsverlauf.

**`messages`**
```
id                UUID PK
conversation_id   UUID → conversations
role              TEXT ('user' | 'assistant')
content           TEXT
input_mode        TEXT ('text' | 'voice')
metadata          JSONB
message_type      TEXT DEFAULT 'standard' ('standard' | 'crisis_response')  -- v-Krise
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
linked_value    TEXT       -- v3.2, Wert/Glaubenssatz hinter dem Muster
voice_id        UUID → inner_voices (nullable)  -- v3.0
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
emotional_intensity INTEGER 1–5   -- via clampScore() abgesichert
resistance_detected BOOLEAN
resistance_location TEXT
breakthrough_moment TEXT
where_we_left_off   TEXT
coach_effectiveness INTEGER 1–5   -- via clampScore() abgesichert
next_session_rec    TEXT
file_updates        JSONB []
```

**`inner_voices`** — "Innere Stimmen" (v3.0)
```
id                UUID PK
user_id           UUID → auth.users
status            TEXT ('candidate' | 'named' | 'dismissed')
name              TEXT              -- vom Nutzer vergeben, null solange 'candidate'
suggested_names   JSONB [] DEFAULT '[]'
description       TEXT
introduced_at     TIMESTAMPTZ       -- wann Phase 1 (Verstehen) im Chat stattfand
named_at          TIMESTAMPTZ       -- wann Phase 2 (Entscheidung) abgeschlossen
dismissed_at      TIMESTAMPTZ
created_at        TIMESTAMPTZ
last_active_at    TIMESTAMPTZ
```
RLS: Nutzer verwalten ihre eigenen Zeilen (`auth.uid() = user_id`) — Namensgebung/Ablehnung schreibt das Frontend direkt.

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
voice_id        UUID → inner_voices (nullable)  -- v3.0, additiv, aktuell nicht befüllt
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

**`user_feedback`** — Nutzerfeedback (inkl. Beta-Feedback-Modal im Profil)
```
user_id         UUID → profiles (nullable)
conversation_id UUID → conversations (nullable)
feedback_type   TEXT ('improvement' | 'praise' | 'bug' | 'general' | 'beta')
content         TEXT
context         TEXT
consent_given   BOOLEAN DEFAULT true
processed       BOOLEAN DEFAULT false
```

**`invite_codes`** — Beta-Tester-Zugang (Selbstregistrierung)
```
code        TEXT UNIQUE (always uppercase)
max_uses    INTEGER (null = unbegrenzt)
uses_count  INTEGER DEFAULT 0
expires_at  TIMESTAMPTZ (null = kein Ablauf)
```

**`crisis_events`** — Krisenprotokoll (v-Krise)
```
id                 UUID PK
user_id            UUID → auth.users
conversation_id    UUID → conversations (nullable)
message_id         UUID → messages (nullable)
detected_at        TIMESTAMPTZ
confidence         TEXT ('low' | 'medium' | 'high')
excerpt            TEXT       -- anonymisierter Ausschnitt, KEIN Volltext-Log
response_shown     BOOLEAN DEFAULT true
user_acknowledged  BOOLEAN
reviewed_by_jerome BOOLEAN DEFAULT false
reviewed_at        TIMESTAMPTZ
notes              TEXT       -- nie dem Nutzer sichtbar
```
RLS: `USING (false) WITH CHECK (false)` für **alle** — auch der eigene Nutzer sieht seine Einträge nicht. Nur ein echter `service_role`-Client (ohne Nutzer-Token, `BYPASSRLS`) kann schreiben. Keine Echtzeit-Benachrichtigung — wöchentliche Sichtung durch Jerome, analog zum Supervision-Cron.

### RPCs

**`get_conversation_history()`** — `SECURITY INVOKER`, liefert die Gesprächsliste des eingeloggten Nutzers (Datum, Nachrichtenanzahl, `main_topic`/erste Nutzer-Nachricht) für `/verlauf`, ohne N+1-Queries. `GRANT EXECUTE ... TO authenticated`.

**`redeem_invite_code()`** — `SECURITY DEFINER`, löst einen Invite-Code ein (v2.5).

### RLS-Prinzip

Alle Tabellen haben Row Level Security aktiviert. Grundregel: `auth.uid() = user_id`. Ausnahme `crisis_events` (siehe oben — bewusst für niemanden außer `service_role` lesbar/schreibbar). Edge Functions arbeiten mit dem `SUPABASE_SERVICE_ROLE_KEY` — **aber Vorsicht:** wird zusätzlich ein Nutzer-`Authorization`-Header gesetzt, bestimmt PostgREST die effektive Rolle über den JWT, nicht über den Key — der Client läuft dann effektiv als `authenticated`, nicht als `service_role`. Details siehe [Abschnitt 10](#10-admin-bereich--sicherheitsmuster).

---

## 7. Design System

### Farben (`src/styles/tokens.css`)

| Variable | Wert | Verwendung |
|---|---|---|
| `--color-bg` | `#F5F3EF` | Seitenhintergrund (Creme) |
| `--color-surface` | `#FFFFFF` | Karten, Chat-Bubbles |
| `--color-surface-2` | `#F8F7F4` | Sekundäre Flächen |
| `--color-accent` | `#2D5A4E` | Brand-Grün — Buttons, aktive Tabs, User-Bubbles, Krisen-Card |
| `--color-accent-2` | `#4A8C7A` | Hover-Zustand |
| `--color-accent-light` | `#E8F0EE` | Subtile Highlights, Krisen-Card-Hintergrund |
| `--color-premium` | `#8B6914` | Gold für Premium-Features (inkl. Innere Stimmen) |
| `--color-coral` | `#C4593A` | Warnung, Muster-/Ziel-Kategorie |
| `--color-ink` | `#1A1916` | Primärer Text |
| `--color-ink-2` | `#5C5A54` | Sekundärer Text |
| `--color-ink-3` | `#9A9890` | Deaktiviert, Metadaten |

Bewusst **keine** alarmierende Rot-/Orange-Farbgebung für den Krisenfall — die bestehende `accent`-Palette vermittelt Ruhe statt Panik, konsistent mit dem Sprachprinzip.

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

Optimiert für 390 px (iPhone 14). Kein Breakpoint-Wechsel für Desktop — die App ist rein mobile. Overlays/Sheets (z. B. `VerlaufsSheet`) werden per `createPortal` direkt in `document.body` gerendert, um von `transform`-tragenden Vorfahren unabhängig zu bleiben.

---

## 8. Wichtige Flows

### Wellness-Check-Flow

```
HomeScreen → Kachel „Wie geht's dir?" → /wellness
  ↓
WellnessCheckScreen: Score (1–10) + Chip + Freitext
  ↓
navigate('/coach', { state: { wellnessCheck: { score, label, emoji, context } } })
  ↓
CoachScreen mount: state.wellnessCheck erkannt (VARIANTE 3)
  ↓
startWellnessConversation(wellnessCheck)
  → Kein User-Message sichtbar
  → Coach antwortet direkt aus Wellness-Block im System-Prompt
```

### Wiederkehr-Begrüßungs-Flow

```
CoachScreen mount (kein Resume, kein Wellness-Check)
  ↓
fetch pre-session-briefing
  ↓
Entry-Kontext vorhanden? → startEntryContextConversation() (VARIANTE 4)
shouldShowReturnGreeting() = true? → startBriefingConversation() + last_return_greeting_at (VARIANTE 1)
sonst → startNewConversation(isFirstEver) (VARIANTE 2)
```

### Gesprächsverlauf & Fortsetzen-Flow

```
ProfileScreen → "Gesprächsverlauf" ODER CoachScreen-Header-Icon → /verlauf
  ↓
HistoryScreen: RPC get_conversation_history()
  ↓
Klick "Gespräch fortsetzen" → navigate('/coach', { state: { resumeConversationId } })
  ↓
CoachScreen mount: resumeConversationIdRef erkannt (VARIANTE 0, höchste Priorität)
  ↓
loadConversation(id) → lädt komplette Message-Historie inkl. message_type
  → KEIN countSession() — zählt nicht als neue Session
  → bei Fehler: Fallback auf startNewConversation()
```

### Post-Conversation-Processing

```
Vier unabhängige Trigger-Pfade rufen dieselbe Kernfunktion:
  - "Neues Gespräch"-Button
  - visibilitychange (Tab in Hintergrund)
  - pagehide (Tab schließen/Reload)
  - Unmount-Cleanup (SPA-Navigation weg vom Coach)
  ↓
messages.length >= 3 UND noch nicht für diesen conversationId verarbeitet (processedRef)?
  → runPostConversation(messages, conversationId)  [fire-and-forget, keepalive: true]
    → POST /functions/v1/post-conversation
      → serverseitiger Idempotenz-Guard (post_processed_message_count)
      → session_notes, coach_file_entries (inkl. linked_value), coachee_profile,
        inner_voices (Kandidaten-Erkennung/-Verknüpfung), experience_patterns,
        pattern_references, insights, coach_reflections,
        resonance_map (ab 3. Gespräch)
  
  → extractMemoryAndInsight()  [Legacy-Gedächtnis, nur beim Button-Klick]
    → suggested_insight vorhanden? → ConversationEndModal → Bestätigung → insights.insert (source='user')
  
  → startNewConversation()
```

### Innere-Stimmen-Flow

Zwei-Phasen-Chatflow, serverseitig getaktet — nie beide Phasen im selben Turn, analog zum Wirkmechanismus-Rhythmus.

```
post-conversation, Schritt 4b: ≥3 unverknüpfte Akte-Einträge mit confidence ≥3?
  → VOICE_CLUSTER_PROMPT: passt zu bestehender (auch unbenannter) Stimme?
     ja  → coach_file_entries.voice_id verknüpfen, last_active_at aktualisieren
     nein, aber ≥3 zusammengehörige Einträge → neue inner_voices-Zeile (status='candidate')
        → Rollback der Zeile, falls die Verknüpfung zu coach_file_entries fehlschlägt

chat/index.ts, vor jeder Antwort (außer Howto/akute Belastung):
  Kandidat mit introduced_at IS NULL, ≥2 Coach-Antworten in diesem Gespräch?
    → VOICE_INTRODUCE_BLOCK — Coach spricht das Muster behutsam als "innerer Wächter" an,
      OHNE Namen zu erfragen; introduced_at wird sofort gesetzt
  sonst: Kandidat mit introduced_at vor ≥24h, noch unbenannt (älteste zuerst)?
    → VOICE_NAMING_BLOCK — Coach bietet Namensgebung an, schließt mit
      <<VOICE_NAMING_CHOICE voiceId... options... allowCustom... allowDismiss...>>
      ↓
CoachScreen: extractVoiceNaming() trennt Marker vom sichtbaren Text,
  rendert VoiceNamingChips (Vorschläge + Freitext + "Passt nicht für mich")
  ↓
Auswahl → inner_voices.update({ status: 'named'|'dismissed', name, named_at/dismissed_at })
  + Auswahl wird als normale Folgenachricht gesendet (Gespräch geht natürlich weiter)
  ↓
StimmenScreen (/stimmen) zeigt benannte + bereits angesprochene Kandidaten
```

### Krisenfall-Flow

```
sendMessage() — neue Nutzer-Nachricht
  ↓
chat/index.ts: detectCrisis() klassifiziert NUR diese eine Nachricht (Haiku, fail-safe)
  ↓
acute_risk && confidence ∈ {medium, high}?
  ja:
    → Insert in crisis_events (service_role, RLS blockiert sonst jeden Zugriff)
    → systemPrompt = CRISIS_RESPONSE_BLOCK (ersetzt ALLE anderen Prompt-Blöcke)
    → max_tokens 400 → 700 (Pflichttext mit Hotline-Nummern darf nie abgeschnitten werden)
    → Stream beginnt mit Meta-Chunk { messageType: 'crisis_response' }
  nein:
    → normaler buildSystemPrompt()-Ablauf
  ↓
useChat.js: Meta-Chunk setzt messageType auf der Assistant-Message,
  message_type wird beim finalen DB-Insert mitgeschrieben
  ↓
CoachScreen rendert CrisisResponseCard statt ChatBubble
  → TelefonSeelsorge-Nummern/URL werden per Regex zu tel:/https:-Links
  ↓
Keine Echtzeit-Benachrichtigung an Jerome — wöchentliche Sichtung (siehe crisis_events)
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

| Feature | Free | Premium | Tester |
|---|---|---|---|
| Coach-Gespräche | `profile.session_limit` (Default 3, individuell setzbar) | Unbegrenzt | wie Free, eigener `session_limit`-Wert (Admin-Bereich, z. B. 300/500) |
| Mein Spiegel | 10 Erkenntnisse (UI-seitig) | Unbegrenzt + Export | wie Free |
| Deine Akte | Erste Karte je Sektion offen | Vollständig + Zeitachse | wie Free |
| Verstehen-Modul | Allgemeine Muster | + Persönliche Gesprächsreferenzen | wie Free |
| Innere Stimmen | Locked-State (kein Inhalt) | Vollständig | wie Free |
| Gesprächsverlauf | Nur neuestes Gespräch entsperrt | Vollständig | wie Free |
| Coach-Gedächtnis | Begrenzt | Vollständig | Vollständig |

**Wichtig (Fix, siehe `session_limit` oben):** `isPaidUser` in `CoachScreen`/`HistoryScreen` prüft **nur** `plan === 'premium'` — `'tester'` galt früher fälschlich als unbegrenzt, wodurch individuelle Admin-Limits wirkungslos waren.

**Zähler:** `profiles.sessions_used_this_month`
**Durchsetzung:** clientseitig (`handleSend()`, UX) **und** serverseitig (`chat/index.ts`, harte Grenze mit `429`)
**Reset:** Cron am 1. des Monats (via Supabase Cron)
**Upgrade-Flow:** Limit-Modal → `/premium`

---

## 10. Admin-Bereich & Sicherheitsmuster

Drei Edge Functions (`admin-users`, `admin-feedback`, `admin-invite-user`) folgen demselben Muster — wichtig für jede künftige Erweiterung.

### Das Zwei-Client-Muster (Pflicht für alle Admin-Functions)

**Falle:** PostgREST bestimmt die effektive Datenbank-Rolle über den JWT im `Authorization`-Header, **nicht** über den mitgegebenen API-Key. Ein `createClient(url, serviceRoleKey, { global: { headers: { Authorization: \`Bearer ${userToken}\` } } })` sieht nach einem Service-Role-Client aus, läuft aber effektiv unter der `authenticated`-Rolle des aufrufenden Nutzers — RLS-Policies mit `auth.uid() = user_id` lassen dann nur die eigene Zeile durch (bei `admin-users` führte das dazu, dass nur der Admin selbst in der Nutzerliste erschien; bei `crisis_events`, dessen Policy *jeden* Zugriff blockiert, hätte derselbe Fehler den Insert komplett verhindert).

**Fix, konsequent angewendet:**
```ts
// Client 1: NUR zur Identitätsprüfung — mit dem Nutzer-Token.
const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY,
  { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
const { data: { user: caller } } = await callerClient.auth.getUser(token);

// Client 2: echter Service-Role-Client, OHNE Nutzer-Token — umgeht RLS wirklich.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
```
`callerClient` wird ausschließlich für die eine `getUser()`-Zeile gebraucht. Alle eigentlichen Abfragen/Schreibvorgänge (inkl. `auth.admin.listUsers()`, `auth.admin.inviteUserByEmail()`) laufen über den zweiten Client.

`chat/index.ts` nutzt für die meisten Aufrufe (z. B. `inner_voices`) weiterhin den einfachen Ein-Client-Ansatz — unschädlich, weil diese Calls ausschließlich mit den eigenen Daten des angemeldeten Nutzers arbeiten und die entsprechende RLS-Policy genau das erlaubt. Für `crisis_events` (RLS blockiert *jeden* direkten Zugriff) wird dort zusätzlich ein `serviceClient` nach demselben Zwei-Client-Muster verwendet.

### Admin-Berechtigung

Jede Admin-Function prüft `profiles.is_admin` selbst, **bevor** irgendetwas gelesen/geschrieben wird — ein versteckter Frontend-Screen (`AdminRoute`) ist ausdrücklich kein Ersatz dafür, da jede Anfrage auch direkt gegen die API gerichtet werden könnte. Nicht-Admins erhalten `403 Forbidden`.

`is_admin` wird **nie** über die App gesetzt (Henne-Ei-Problem) — einmaliges manuelles Update im Supabase-SQL-Editor:
```sql
update profiles set is_admin = true where id = '<user_id>';
```

---

## 11. Build & Deployment

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
SITE_URL=                    # optional, Fallback: https://app.friedensstifter.coach (nur admin-invite-user)
```

### Deployment

- **Frontend:** Vercel (Auto-Deploy aus `main`-Branch)
- **Edge Functions:** `supabase functions deploy <name>`
- **Migrationen:** `supabase db push` vor jedem Deployment das DB-Änderungen enthält
- **Domain:** `app.friedensstifter.coach` (Vercel Custom Domain)

**Manueller Einmal-Schritt (Supabase Dashboard, nicht per Code setzbar):** Invite-E-Mail-Vorlage unter Authentication → Email Templates → "Invite user" auf deutschen Text umstellen, bevor `admin-invite-user` produktiv genutzt wird — sonst kommt der englische Default-Text an.

### Vor jedem Deployment prüfen

1. Sprachprinzip-Audit: Alle UI-Texte auf verbotene Wörter (`müssen`, `immer`, `nie`, `können nicht`, `du bist X`)
2. Migrationen ausgeführt: `supabase db push`
3. Edge Functions deployed (bei Bedarf, je nach Änderung): `chat`, `post-conversation`, `pre-session-briefing`, `rag-search`, `validate-invite-code`, `admin-users`, `admin-feedback`, `admin-invite-user`, `delete-account`, `supervision`
