# Friedensstifter — Technische Dokumentation für Claude Code

**Produkt:** Friedensstifter · Dein systemischer Begleiter
**Stand:** Design-Dokument v2.5 implementiert
**Arbeitsverzeichnis:** `f:/OneDrive/Documents/GitHub/CoachingApp/`
**Laufend:** Security-Paket B – Auftrag `docs/security/handoff-security-paket-b.md`, Lösungsdesign `docs/security/friedensstifter-security-paket-b-design-v1.md`, Bestandsaufnahme `docs/security/paket-b-discovery.md`

---

## 1. Stack auf einen Blick

| Schicht | Technologie |
|---|---|
| Frontend | React 18 + Vite · Tailwind CSS v3 · React Router v6 |
| State | Zustand (noch nicht aktiv) · lokale Hook-States |
| Backend | Supabase (Auth + PostgreSQL + Edge Functions) |
| KI | Anthropic Claude API · `claude-sonnet-4-5` (Streaming) · `claude-haiku-4-5-20251001` (Post-Processing) |
| Hosting | Vercel · Domain: `app.friedensstifter.coach` |
| PWA | `vite-plugin-pwa` (Workbox) |

---

## 2. Routen-Übersicht

```
/landing              → LandingScreen (öffentlich)
/auth                 → AuthScreen (öffentlich, nur Anmeldung · Registrieren → /onboarding)
/onboarding           → OnboardingFlow (öffentlich, 4 Schritte)
/welcome              → WelcomeScreen (nach Registrierung)

/howto                → HowItWorksScreen (kein AppShell)
/wellness             → WellnessCheckScreen (kein AppShell)
/premium              → PremiumScreen (kein AppShell)

/verstehen            → VorstehenScreen (kein AppShell)
/verstehen/aus-gespraechen → AusGespraechen (kein AppShell)
/verstehen/:key       → MusterDetail (kein AppShell) — key = pattern_key

/home                 → HomeScreen (AppShell + BottomNav)
/coach                → CoachScreen (AppShell + BottomNav)
/mirror               → MirrorScreen (AppShell + BottomNav)
/profile              → ProfileScreen (AppShell + BottomNav)
```

**Routing-Logik:** Nicht-authentifizierte User → `/landing`. Authentifizierte User auf `/landing` → `/home`.

---

## 3. Datenbankschema (vollständig, alle Migrationen)

### Kern-Tabellen

**`profiles`** — erweitert `auth.users`
```
id                                UUID (PK, FK → auth.users)
display_name                      TEXT
onboarding_completed              BOOLEAN DEFAULT FALSE
onboarding_data                   JSONB  -- Antworten aus Onboarding
streak_count                      INTEGER DEFAULT 0
streak_last_date                  DATE
plan                              TEXT CHECK ('free' | 'premium' | 'tester')
sessions_used_this_month          INTEGER DEFAULT 0
last_return_greeting_at           TIMESTAMPTZ  -- v2.1: Wiederkehr-Begrüßung Throttle
consent_given_at                  TIMESTAMPTZ  -- DSGVO Art. 6/7: Zeitstempel Datenschutz-Zustimmung
consent_version                   TEXT         -- z.B. '1.0'
coaching_agreement_accepted_at    TIMESTAMPTZ  -- Zeitstempel Coaching-Vereinbarungs-Zustimmung
coaching_agreement_version        TEXT         -- z.B. '1.0'
created_at                        TIMESTAMPTZ
```

**`conversations`**
```
id                    UUID (PK)
user_id               UUID (FK → profiles)
title                 TEXT
summary               TEXT     -- Zusammenfassung nach Gespräch
key_insight           TEXT     -- Wichtigste Erkenntnis
memory_updated        BOOLEAN DEFAULT FALSE
open_thread           TEXT     -- v2.1: Offener Faden (nicht abgeschlossenes Thema)
open_thread_intensity TEXT CHECK ('low' | 'medium' | 'high')  -- v2.1
created_at / updated_at TIMESTAMPTZ
```

**`messages`**
```
id                UUID (PK)
conversation_id   UUID (FK → conversations)
role              TEXT CHECK ('user' | 'assistant')
content           TEXT
input_mode        TEXT CHECK ('text' | 'voice')
metadata          JSONB
created_at        TIMESTAMPTZ
```

**`user_memory`** — Coach-Gedächtnis Legacy (1 Zeile pro User, ersetzt durch coach_file_entries)
```
id            UUID (PK)
user_id       UUID (FK → profiles, UNIQUE)
themes        JSONB []
patterns      JSONB []
strengths     JSONB []
context       JSONB {}
last_updated  TIMESTAMPTZ
```

**`invite_codes`** — v2.5: Einladungscodes für Beta-Tester
```
id          UUID (PK)
code        TEXT UNIQUE  -- immer uppercase
max_uses    INTEGER      -- NULL = unbegrenzt
uses_count  INTEGER DEFAULT 0
expires_at  TIMESTAMPTZ  -- NULL = kein Ablaufdatum
created_at  TIMESTAMPTZ
```
RLS aktiv · keine SELECT-Policy für normale Nutzer · Einlösen nur via `redeem_invite_code` RPC (SECURITY DEFINER)

**`resonance_map`** — v2.4: Emotionales Reaktionsprofil (Idee 05)
```
id                  UUID (PK)
user_id             UUID (FK → profiles, UNIQUE)
opening_patterns    JSONB []  -- Was öffnet diesen Menschen
closing_patterns    JSONB []  -- Was führt zu Schließen / Ausweichen
effective_styles    JSONB []  -- Frage-Typen die funktionieren
resonant_metaphors  JSONB []  -- Metaphern / Bilder die geklickt haben
preferred_pace      TEXT CHECK ('slow' | 'medium' | 'direct')
last_updated        TIMESTAMPTZ
```

**`coach_file_entries`** — v2.2: Strukturierte Coach-Akte (ersetzt user_memory)
```
id              UUID (PK)
user_id         UUID (FK → profiles)
category        TEXT CHECK ('pattern' | 'strength' | 'theme' | 'value' | 'trigger')
label           TEXT
description     TEXT
example         TEXT
source_conversation_id UUID (FK → conversations, nullable)
first_detected  TIMESTAMPTZ
history         JSONB []  -- [{ date, note, conversation_id }]
confidence      INTEGER 1–5
status          TEXT CHECK ('active' | 'fading' | 'resolved')
last_updated    TIMESTAMPTZ
```

**`coachee_profile`** — v2.2: Personenprofil (wächst durch Coach-Extraktion)
```
id                  UUID (PK)
user_id             UUID (FK → profiles, UNIQUE)
occupation          TEXT
relationship_status TEXT
family_situation    TEXT
living_situation    TEXT
life_phase          TEXT
current_focus       TEXT
known_values        JSONB []
known_stressors     JSONB []
known_resources     JSONB []
completeness        INTEGER
last_enriched_by    UUID (FK → conversations, nullable)
last_updated        TIMESTAMPTZ
```

**`session_notes`** — v2.2: Strukturierte Session-Notes (1 pro Gespräch)
```
id                  UUID (PK)
conversation_id     UUID (FK → conversations, UNIQUE)
user_id             UUID (FK → profiles)
main_topic          TEXT
emotional_intensity INTEGER 1–5
resistance_detected BOOLEAN
resistance_location TEXT
breakthrough_moment TEXT
where_we_left_off   TEXT
coach_effectiveness INTEGER 1–5
next_session_rec    TEXT
file_updates        JSONB []
created_at          TIMESTAMPTZ
```

**`pattern_references`** — v2.0: Erkannte Muster aus Gesprächen
```
id              UUID (PK)
user_id         UUID (FK → profiles)
pattern_key     TEXT  -- z.B. "rueckzug_unter_druck"
pattern_label   TEXT  -- z.B. "Rückzug unter Druck"
message_id      UUID (FK → messages, nullable)
conversation_id UUID (FK → conversations, nullable)
excerpt         TEXT  -- max. 150 Zeichen, anonymisiert
detected_at     TIMESTAMPTZ
```

**`insights`** — "Mein Spiegel"
```
id              UUID (PK)
user_id         UUID (FK → profiles)
conversation_id UUID (FK → conversations, nullable)
content         TEXT
category        TEXT CHECK ('muster' | 'stärke' | 'erkenntnis' | 'ziel')
source          TEXT CHECK ('auto' | 'user')
is_pinned       BOOLEAN DEFAULT FALSE
created_at / updated_at TIMESTAMPTZ
```

### Lernende Architektur

**`experience_patterns`** — Anonyme RAG-Datenbank
```
id           UUID (PK)
embedding    vector(1536)  -- pgvector
context      TEXT
pattern      TEXT
resistance   TEXT
what_helped  TEXT
what_blocked TEXT
outcome      TEXT CHECK ('breakthrough' | 'stuck' | 'partial' | 'unknown')
```

**`coach_reflections`** — KI-Selbstreflexion nach Gesprächen
```
conversation_id      UUID (FK → conversations)
was_helpful          BOOLEAN
what_worked          TEXT
what_missed          TEXT
resistance_detected  BOOLEAN
resistance_handled   TEXT
improvement_note     TEXT
```

**`user_feedback`** — Nutzerfeedback
```
user_id         UUID
conversation_id UUID
feedback_type   TEXT CHECK ('improvement' | 'praise' | 'bug' | 'general')
content         TEXT
consent_given   BOOLEAN DEFAULT TRUE
processed       BOOLEAN DEFAULT FALSE
```

**`supervision_logs`** — Wöchentliche KI-Supervision (Cron)

**`app_logs`** — Strukturiertes Logging (level: debug/info/warn/error)

### RLS
Alle Tabellen haben Row Level Security. Jeder User sieht nur seine eigenen Daten. `app_logs` hat keine SELECT-Policy — nur Admin (service_role) kann lesen.

---

## 4. Edge Functions

| Function | Trigger | Zweck |
|---|---|---|
| `chat` | Jede Chat-Nachricht | Anthropic API Proxy, Streaming, buildSystemPrompt |
| `pre-session-briefing` | CoachScreen Mount | Nur Eckdaten für die Wiederkehr-Begrüßung (`daysSince`, `conversationCount`, `openThread.intensity`) – keine Akte, keine Inhalte (S-12) |
| `post-conversation` | Nach Gespräch (fire-and-forget) | RAG-Eintrag, Selbstreflexion, open_thread, pattern_references |
| `validate-invite-code` | Onboarding Step 4 (Registrierung) | Code validieren + redeem_invite_code RPC aufrufen → plan='tester' |
| `supervision` | Wöchentlicher Cron | Supervision-Protokoll aus Reflektionen + Feedback |
| `backfill-embeddings` | Manuell (SQL-Editor, `net.http_post` + Vault-Secret) | Wartung: fehlende Vektoren in experience_patterns nachtragen (nur intern) |
| `admin-users` / `admin-feedback` / `admin-invite-user` | Admin-Bereich | nur mit `is_admin` **und** zweitem Faktor (`aal2`, S-06) |

### `chat` — System-Prompt Aufbau

**Nachrichten schreibt nur der Server (S-12, Paket B Welle 2a):** Gesprächsmodus `{ conversationId, message: { clientMessageId, content, inputMode } }` bzw. Eröffnung `{ conversationId, start: 'first'|'standard'|'wellness'|'briefing'|'entry' }`. `chat` lädt den Verlauf aus der DB, speichert die Nutzer-Nachricht idempotent (nach `consume_session`) und die Antwort per `EdgeRuntime.waitUntil` auch nach Client-Abbruch. `first`/`standard` speichert nur den Pool-Text (Kopie von `src/lib/prompts.js`!), ohne Modellaufruf und ohne Zählung. Altes Format (`messages[]`) → noch erlaubt und als `legacy_format` geloggt, ab Welle 2b `409 client_outdated`.

**Kontext lädt `chat` selbst (S-12):** Akte, Profil, Resonanzkarte, Briefing, Legacy-Gedächtnis, RAG und Supervision kommen aus der DB (`loadCoachContext`). Entsprechende Body-Felder werden ignoriert; vom Client kommen nur `messages`, `conversationId`, `wellnessCheck` und `entryContext` (typ- und längengeprüft). RAG läuft einmal pro Gespräch beim ersten Nutzer-Input (`_shared/rag.ts`) und wird in `conversation_context` gespeichert (kein Client-Zugriff).

`buildSystemPrompt()` baut den Prompt in dieser Reihenfolge:

```
BASE_SYSTEM_PROMPT          (Haltung, Sprachprinzip, Widerstand, Muster-Erkennung)
  + BLOCK 1: Briefing       (letztes abgeschlossenes Gespräch + offener Faden · in jedem Folgegespräch)
  + BLOCK 2: Coach-Akte     (coach_file_entries + coachee_profile · Fallback: user_memory)
  + BLOCK 3: Resonanzkarte  (resonance_map · ab 3. Gespräch · immer unsichtbar)
  + BLOCK 4: RAG-Kontext    (Anonyme Erfahrungen)
  + BLOCK 5: Supervision    (Wöchentliche Empfehlung · nur mit Secret SUPERVISION_IN_PROMPT=1, derzeit aus)
  + BLOCK 6: Wellness-Check (Score + Skalierungsfrage, ersetzt Standard-Eröffnung)
```

**Sprachprinzip im System-Prompt — absolut verboten:**
- „müssen" → „kannst", „hast die Möglichkeit"
- „immer" (als Absolutum) → „oft", „häufig"
- „nie" (als Absolutum) → „selten", „bisher kaum"
- „du bist X" (Urteil) → „du neigst dazu", „du verhältst dich oft so"
- „können nicht" → „hast dich bisher dagegen entschieden"

### `post-conversation` — JSON-Output von Claude

```json
{
  "context": "Themenfeld",
  "pattern": "Erkanntes Muster (anonym)",
  "resistance": "...",
  "what_helped": "...",
  "outcome": "breakthrough | stuck | partial | unknown",
  "pattern_references": [
    { "pattern_key": "rueckzug_unter_druck", "pattern_label": "...", "excerpt": "..." }
  ],
  "open_thread": {
    "exists": true,
    "text": "Was offen geblieben ist",
    "intensity": "low | medium | high"
  }
}
```

---

## 5. Frontend-Architektur

### Hooks

| Hook | Zuständigkeit |
|---|---|
| `useAuth` | User, Session, Profile · signUp/signIn/signOut/updateProfile |
| `useChat` | Gesprächs-State · Streaming · startNewConversation / startWellnessConversation / startBriefingConversation / sendMessage / extractMemoryAndInsight |
| `useMemory` | user_memory lesen & schreiben (Legacy-Fallback) |
| `useStreak` | Streak-Berechnung |
| `useVoiceInput` | Web Speech API (de-DE) |

### useChat — 3 Start-Funktionen

```
startNewConversation(isFirstEver)          → Pool-Text sofort anzeigen, Server speichert (start first/standard)
startWellnessConversation(wc)              → start 'wellness' — Coach antwortet sofort auf Wellness-Score
startBriefingConversation()                → start 'briefing' — Coach antwortet auf offenen Faden (lädt der Server)
startEntryContextConversation(entryContext) → start 'entry'
```

Beim `sendMessage` werden mitgeschickt: `conversationId`, `message: { clientMessageId, content, inputMode }`, `requestId` – sonst nichts. Gescheitertes Senden → Nachricht `status: 'failed'`, „Nicht gesendet – nochmal versuchen“ (`retryMessage`, gleiche `clientMessageId`). `post-conversation` bekommt nur `{ conversationId }`, die Extraktion `{ mode: 'extract', conversationId }`.

### CoachScreen — Eröffnungslogik (3 Varianten)

```
Mount:
  1. Wellness-Check aus Navigation state? → startWellnessConversation()
  2. pre-session-briefing laden
     a. Offener Faden + ≥2 Tage alt + ≥5 Tage seit letzter Begrüßung?
        → startBriefingConversation() + last_return_greeting_at setzen
     b. Sonst → startNewConversation(isFirstEver)
```

### src/lib/prompts.js — wichtige Exporte

```js
DAILY_IMPULSE_QUESTIONS    // 14 Fragen (rotierend nach Tagesindex)
OPENING_MESSAGES           // 3 Standard-Eröffnungen
FIRST_OPENING_MESSAGE      // Erstes Gespräch überhaupt
SCALING_HINTS              // {1..10} → Skalierungsfrage
WELLNESS_SCORES            // {1..10} → { label, emoji, color }
getDailyImpulse()          // gibt Tagesfrage zurück
```

---

## 6. Verstehen-Modul (v2.0)

**5 bekannte Muster-Keys:**
```
rueckzug_unter_druck     → Rückzug unter Druck
innerer_kritiker         → Der innere Kritiker
uebernahme_reflex        → Übernahme-Reflex
harmonie_um_jeden_preis  → Harmonie um jeden Preis
perfektionismus_blockade → Perfektionismus-Blockade
```

**Routen:**
- `/verstehen` → VorstehenScreen (Übersicht, Filter-Tabs, Coach-Banner wenn pattern_references vorhanden)
- `/verstehen/:key` → MusterDetail (3-Schritt-Entstehungsgeschichte, Coach-Zitat wenn persönlich erkannt)
- `/verstehen/aus-gespraechen` → AusGespraechen (pattern_references Liste, erste Karte Free / Rest Premium)

**Datenfluss:** Post-Processing extrahiert pattern_references → werden in DB gespeichert → Modul liest sie.

---

## 7. Design System

**Farben (CSS Custom Properties in `src/styles/tokens.css`):**
```
--color-bg:           #F5F3EF  (Haupthintergrund)
--color-surface:      #FFFFFF
--color-accent:       #2D5A4E  (Brand-Grün, Buttons, aktiv)
--color-accent-2:     #4A8C7A  (Hover)
--color-accent-light: #E8F0EE
--color-premium:      #8B6914
--color-coral:        #C4593A
--color-ink:          #1A1916
--color-ink-2:        #5C5A54
--color-ink-3:        #9A9890
```

**Schriften:** DM Serif Display (Headlines) · DM Sans (Body)

**Tailwind:** Custom Colors via CSS-Variablen in `tailwind.config.js` (bg, surface, surface-2, ink, ink-2, ink-3, accent, accent-2, accent-light, premium, premium-light)

---

## 8. Freemium-Logik

| Feature | Free | Premium |
|---|---|---|
| KI-Coach Gespräche | 20/Monat (`session_limit` Default 20 seit Migration 027) | Unbegrenzt |
| Mein Spiegel | 10 Erkenntnisse | Unbegrenzt + Export |
| Verstehen-Modul | Allgemeine Muster | + Persönliche Gesprächsreferenzen |
| Coach-Gedächtnis | Begrenzt | Vollständig |
| Innere Stimmen | — | ✓ |

Counter: `profiles.sessions_used_this_month` · gezählt **nur serverseitig** über RPC `consume_session` in der `chat`-Function (idempotent pro Konversation, `conversations.session_counted_at`) · Reset: Cron-Job `reset-monthly-sessions` am 1. des Monats (seit Migration 023) · Limit gilt für alle außer `plan = 'premium'`; Krisenantwort, Howto-FAQ und Gedächtnis-Extraktion sind ausgenommen

**Rate-Limits pro Nutzer** (Migration 029, RPC `consume_rate_limits`, Werte zentral in `supabase/functions/_shared/rateLimit.ts`): `chat` Gespräch 10/Minute + 200/Tag · Howto 30/Stunde · Extraktion 30/Tag · `post-conversation` 60/Tag · `validate-invite-code` 5/Stunde + 10/Tag. Antwort `429 { error: 'rate_limited', retryAfter }` + `Retry-After`-Header; das Frontend zeigt dann einen Hinweis inkl. Telefonseelsorge statt des Limit-Modals (`src/lib/rateLimit.js`). chat/post-conversation fail-open bei DB-Fehler (protokolliert), Invite-Code fail-closed. Zähler werden täglich nach 2 Tagen gelöscht (Cron `purge-rate-limits`).

---

## 9. Konventionen & Regeln

### Sprache (absolut)
- Im Chat/Home/Impulsfragen: KEIN Coaching-Vokabular ("Coaching", "systemisch", "Methode", "Innere Anteile")
- Im Profil/Info-Seite/Onboarding-Schritt 3: Systemisches Coaching darf genannt werden
- Verbotene Wörter überall: müssen · immer (als Absolutum) · nie (als Absolutum) · können nicht · du bist X (Urteil)

### Code
- Mobile-first, 390px optimiert
- Streaming ist Pflicht (token-by-token)
- Spracheingabe landet im Textarea, wird nie automatisch gesendet
- Coach-Gedächtnis ist für den User unsichtbar
- Fehlermeldung im Chat: "Das Gespräch hatte einen kurzen Aussetzer. Schreib einfach weiter — ich bin noch da."
- Alle Edge Functions verwenden `_shared/logger.ts` für strukturiertes Logging
- **Nur der Server schreibt `messages`** — kein `supabase.from('messages').insert` im Frontend (S-12)
- **Lernbasis (S-13):** Inhalte gelangen nur mit `RAG_LEARNING_ENABLED=1`, Opt-in (`profiles.learning_opt_in`, nur über RPC `set_learning_opt_in`) und über `reviewLearningEntry` (`_shared/learning.ts`) in `experience_patterns`. Das gilt für jeden neuen nutzerübergreifenden Kanal. RAG-Treffer stehen im Prompt nur als gekennzeichneter Datenblock.
- Keine Drittanbieter-Ressourcen im Frontend; jeder neue externe Dienst muss in die CSP in `vercel.json` (S-08). Schriften liegen lokal (`@fontsource`, S-10). Kein `dangerouslySetInnerHTML`.

### Sicherheitsmuster (Security-Paket A, Pflicht)
- **Jede Edge Function** ruft nach dem CORS-Preflight als Erstes `requireUser(req)` bzw. `requireInternalCaller(req)` (Cron) aus `supabase/functions/_shared/auth.ts` auf; Admin-Functions zusätzlich `requireAdmin(ctx)` — das verlangt seit S-06 auch den zweiten Faktor (`aal2`), Frontend dazu: `AdminRoute` + `AdminMfaScreen` + `useAdminMfa`.
- Identität **nur** aus dem JWT (`ctx.user.id`), nie aus Body-Feldern wie `userId`. Jede `conversationId` mit `assertConversationOwner()` prüfen, bevor gelesen oder geschrieben wird. IDs aus Modellausgaben nur übernehmen, wenn sie dem Nutzer gehören; Writes über `admin` zusätzlich mit `.eq('user_id', userId)`.
- `admin` = echter service_role-Client ohne Nutzer-Token; `userClient` = Rolle `authenticated` (für RPCs mit `auth.uid()`, z. B. `consume_session`).
- Fehlerantworten nur als `{ error: <code> }` (`errorResponse`), keine `error.message`-Texte an den Client.
- Gateway-Schalter „Verify JWT“ bleibt aus — festgeschrieben in `supabase/config.toml` (`verify_jwt = false` je Function). Neue Function → dort eintragen.
- **RLS:** Jede neue Tabelle bekommt RLS, Policies **nur `to authenticated`** (nie `public`/`anon`) und gezielte GRANTs nach tatsächlicher Frontend-Nutzung. `anon` hat keine Tabellenrechte. Neue SECURITY-DEFINER-Funktionen: `set search_path = ''`, schema-qualifizierte Namen, `revoke … from public, anon`, `grant` nur an die Rolle, die sie braucht.
- Privilegierte Profilfelder (`is_admin`, `plan`, `session_limit`, `sessions_used_this_month`, `is_beta_tester`, `invited_*`, `consent_ip`) sind per Trigger server-only. Der Client legt keine Profile an (Name über `signUp({ options: { data: { display_name } } })`).

### Log-Regel (absolut)
> Erlaubt in Logs: IDs (`userId`, `conversationId`, `requestId`), Zähler, Längen, Dauer, HTTP-Status, Fehlercodes, Fehlertyp, Prompt-**Label**.
> Verboten in Logs: Nachrichteninhalte, Prompts, Modellausgaben (auch nicht als Preview), Akte-, Profil- und Stimmen-Felder, Zusammenfassungen, E-Mail-Adressen, Namen.
> Fehlermeldungen von `JSON.parse` enthalten Ausschnitte des geparsten Textes und dürfen deshalb **nicht** geloggt werden. Stattdessen nur `parse_failed`, `outputLength` und gegebenenfalls die Position.

Beide Logger (`src/lib/logger.ts`, `supabase/functions/_shared/logger.ts`) schicken Daten durch `sanitizeLogData()` — das ist nur ein Sicherheitsnetz, die Aufrufstelle bleibt verantwortlich. Für Fehler `describeError(err)` verwenden. Auch Einladungscodes nie loggen. `app_logs`: Client nur Insert eigener Zeilen, 30 Tage Aufbewahrung.

### Vor jedem Deployment
- Sprachprinzip-Audit: alle UI-Texte auf verbotene Wörter prüfen
- Migrations in Supabase ausführen (`supabase db push`)
- Edge Functions deployen mit `supabase functions deploy <namen> --no-verify-jwt`
- **Angriffstest:** `npm run security:test` → alle PASS (Testkonten in `.env.security.local`, Vorlage `.env.security.example`; `ATTACK_TEST_SUPERVISION=1` bezieht `supervision` ein)
- Header prüfen: `curl -sI https://app.friedensstifter.coach` (HSTS, CSP, Permissions-Policy …)

---

## 10. Umgebungsvariablen

```bash
# .env.local (Frontend)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase Edge Functions (nur serverseitig)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...        # optional, für Embeddings
SUPABASE_SERVICE_ROLE_KEY=   # automatisch in Edge Functions verfügbar
CRON_SECRET=                 # nur supervision; derselbe Wert in Supabase Vault als 'cron_secret'
```

---

## 11. Migrationen

| Datei | Inhalt |
|---|---|
| `001_initial.sql` | profiles, conversations, messages, RLS, handle_new_user Trigger |
| `002_v1_1.sql` | user_memory, insights |
| `003_v1_4.sql` | experience_patterns (pgvector), coach_reflections, user_feedback, supervision_logs |
| `004_v1_6.sql` | messages.input_mode, conversations.summary/key_insight/memory_updated |
| `005_v1_8.sql` | app_logs (ersetzt error_logs) |
| `006_v2_0.sql` | pattern_references |
| `007_v2_1.sql` | conversations.open_thread + open_thread_intensity · profiles.last_return_greeting_at |
| `008_v2_2.sql` | coach_file_entries · coachee_profile · session_notes |
| `009_v2_4.sql` | resonance_map (Idee 05) |
| `010_v2_5.sql` | profiles.plan + 'tester' · invite_codes · redeem_invite_code RPC |
| `011`–`022` | Consent-Felder, Coaching-Vereinbarung, post_processed_*, Grants, inner_voices, Admin-Felder (is_admin, is_beta_tester, session_limit, invited_*), linked_value, Gesprächsverlauf, crisis_events, feedback_surveys |
| `023_session_counting.sql` | conversations.session_counted_at · RPC consume_session · Schutz-Trigger server-eigener conversations-Spalten · pg_net · Cron reset-monthly-sessions + weekly-supervision (x-cron-secret aus Vault) |
| `024_protect_profile_privileges.sql` | Trigger trg_protect_profile_privileges (privilegierte Profilfelder server-only) |
| `025_rls_hardening.sql` | Least-Privilege-GRANTs + Policies nur für authenticated · anon ohne Rechte · feedback_survey_scores security_invoker · Funktionen mit festem search_path |
| `026_app_logs_hardening.sql` | app_logs nur Insert eigener Zeilen · metadata ≤ 8 KB · Altbestand bereinigt · Cron purge-app-logs (30 Tage) |
| `027_signup_consent_and_limit.sql` | session_limit Default 20 · handle_new_user übernimmt Einwilligung/Vereinbarung/Onboarding aus den signUp-Metadaten (Fix: Passwort musste zweimal gesetzt werden) |
| `028_conversation_context.sql` | conversation_context (RAG-Ergebnis pro Gespräch, nur service_role) · S-12 |
| `029_rate_limits.sql` | rate_limit_counters · RPC consume_rate_limits (nur service_role) · Cron purge-rate-limits |
| `030_s12_server_messages.sql` | messages.client_message_id + eindeutiger Index (conversation_id, client_message_id) · metadata-Default · S-12 Welle 2a |
| `031_s12_revoke_client_message_insert.sql` | Insert-Recht des Clients auf messages entzogen · S-12 Welle 2b |
| `032_s13_learning_base.sql` | profiles.learning_opt_in(+_updated_at/_version) · experience_patterns.source_user_id/review_status · RPC set_learning_opt_in · match_experiences nur approved · Bestand gelöscht (D-2) |

Hinweis: 001–022 wurden ursprünglich per SQL-Editor eingespielt und am 18.11.2026 per `supabase migration repair` als angewendet markiert. Ab 023 läuft alles über `supabase db push`.
