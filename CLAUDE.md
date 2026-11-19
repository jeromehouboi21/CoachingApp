# Friedensstifter — Technische Dokumentation für Claude Code

**Produkt:** Friedensstifter · Dein systemischer Begleiter
**Stand:** Design-Dokument v2.5 implementiert
**Arbeitsverzeichnis:** `f:/OneDrive/Documents/GitHub/CoachingApp/`
**Security-Paket B abgeschlossen (19.11.2026):** Bericht `docs/security/paket-b-abschlussbericht.md` · Auftrag `docs/security/handoff-security-paket-b.md`, Lösungsdesign `docs/security/friedensstifter-security-paket-b-design-v1.md`, Bestandsaufnahme `docs/security/paket-b-discovery.md`

---

## 1. Stack auf einen Blick

| Schicht | Technologie |
|---|---|
| Frontend | React 18 + Vite · Tailwind CSS v3 · React Router v6 |
| State | Zustand (noch nicht aktiv) · lokale Hook-States |
| Backend | Supabase (Auth + PostgreSQL + Edge Functions) |
| KI | Anthropic Claude API · `claude-sonnet-5-5` (Streaming, seit 19.11.2026, `thinking: between_tools`, effort `medium`) · `claude-haiku-4-5-20251001` (Post-Processing) · IDs nur in `_shared/models.ts` |
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

/home                 → HomeScreen „Heute“ (AppShell + BottomNav)
/coach                → CoachScreen „Gespräch“ (AppShell + BottomNav)
/coach/verlauf        → HistoryScreen (kein AppShell, Zurück → /coach)
/mirror               → MirrorScreen „Spiegel“, Ebene Erkenntnisse (AppShell + BottomNav)
/mirror/muster        → Ebene Muster (Stimmen, Akte-Muster, Bibliothek)
/mirror/entwicklung   → Ebene Entwicklung (Zeitachse, Stärken, Alltag)
/mirror/muster/:key   → PatternDetailScreen (kein AppShell) — key = pattern_key
/profile              → ProfileScreen (AppShell, kein Tab – über den Avatar oben rechts)

/verlauf              → Weiterleitung /coach/verlauf (alte Lesezeichen)
/                     → Weiterleitung /home bzw. /landing
/verstehen*, /stimmen → Weiterleitung /mirror/muster(/:key) (seit U2)
```

**BottomNav (seit U1):** drei Tabs Heute · Gespräch · Spiegel, ohne Zähler. Profil über `ProfileButton` in den Tab-Headern.

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
age_confirmed_at                  TIMESTAMPTZ  -- S-11 (036): 18+ bestätigt (server-only)
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
surfaced_at     TIMESTAMPTZ  -- U3: auf Heute angezeigt
confirmed_at    TIMESTAMPTZ  -- U3: vom Nutzer bestätigt/angepasst (source → 'user')
dismissed_at    TIMESTAMPTZ  -- U3: „Heute nicht“
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
feedback_type   TEXT CHECK ('improvement' | 'praise' | 'bug' | 'general' | 'beta')
content         TEXT
consent_given   BOOLEAN DEFAULT FALSE  -- seit 036: Insert nur mit true (RLS); feedback_surveys ebenso
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
| `pre-session-briefing` | CoachScreen Mount / Einstieg | Nur Eckdaten (`daysSince`, `conversationCount`, `openThread.intensity`) + seit U3 `recent` (3 Gespräche: id, Kurztitel, Zeit, offen/bewegt) und `latestActiveConversation` – keine Akte, keine Inhalte (S-12) |
| `post-conversation` | Nach Gespräch (fire-and-forget) | RAG-Eintrag, Selbstreflexion, open_thread, pattern_references |
| `validate-invite-code` | Onboarding Step 4 (Registrierung) | Code validieren + redeem_invite_code RPC aufrufen → plan='tester' |
| `supervision` | Wöchentlicher Cron | Supervision-Protokoll aus Reflektionen + Feedback |
| `security-monitor` | Cron stündlich :07 (`x-cron-secret`) | Monitoring S-22: Log-Codes zählen (`_shared/monitorRules.ts`), Lebenszeichen der Cron-Jobs, Alarm-Mail über One.com-SMTP 465, montags Wochenübersicht (nur intern) |
| `admin-security` | Admin-Tab „Sicherheit“ | Alarme + Wochenübersicht (`requireAdmin`, aal2) |
| `export-my-data` | Profil → „Meine Daten herunterladen“ | Selbstauskunft S-16: alle eigenen Daten als JSON (`EXPORT_TABLES`), `requireUser`, 3/Tag fail-closed, `export_incomplete` bei Teilausfall |
| `mfa-recovery` | Profil → Sicherheit, Code-Abfrage | Zweiter Faktor für alle (S-06b): `codes:generate` (aal2, 10 Codes, HMAC mit `MFA_CODE_PEPPER`) · `recover` (auch aal1, entfernt alle Faktoren) · `disable` (aal2) |
| `backfill-embeddings` | Manuell (SQL-Editor, `net.http_post` + Vault-Secret) | Wartung: fehlende Vektoren in experience_patterns nachtragen (nur intern) |
| `admin-users` / `admin-feedback` / `admin-invite-user` | Admin-Bereich | nur mit `is_admin` **und** zweitem Faktor (`aal2`, S-06) |

### `chat` — System-Prompt Aufbau

**Nachrichten schreibt nur der Server (S-12, Paket B Welle 2a):** Gesprächsmodus `{ conversationId, message: { clientMessageId, content, inputMode } }` bzw. Eröffnung `{ conversationId, start: 'first'|'standard'|'wellness'|'briefing'|'entry'|'resume' }` (`resume` seit U3: Coach knüpft an **dieses** bestehende Gespräch an, Block FORTSETZUNG, keine neue Konversation; `briefing` nutzt das Frontend nicht mehr). `chat` lädt den Verlauf aus der DB, speichert die Nutzer-Nachricht idempotent (nach `consume_session`) und die Antwort per `EdgeRuntime.waitUntil` auch nach Client-Abbruch. `first`/`standard` speichert nur den Pool-Text (Kopie von `src/lib/prompts.js`!), ohne Modellaufruf und ohne Zählung. Altes Format (`messages[]`) → `409 client_outdated` (seit Welle 2b, geloggt als `legacy_format`). `authenticated` hat auf `messages` nur noch SELECT (Migration 031).

**Kontext lädt `chat` selbst (S-12):** Akte, Profil, Resonanzkarte, Briefing, Legacy-Gedächtnis, RAG und Supervision kommen aus der DB (`loadCoachContext`). Entsprechende Body-Felder werden ignoriert; vom Client kommen nur `messages`, `conversationId`, `wellnessCheck` und `entryContext` (typ- und längengeprüft). RAG läuft einmal pro Gespräch beim ersten Nutzer-Input (`_shared/rag.ts`) und wird in `conversation_context` gespeichert (kein Client-Zugriff).

`buildSystemPrompt()` baut den Prompt in dieser Reihenfolge:

```
BASE_SYSTEM_PROMPT          (Haltung, Sprachprinzip, Widerstand, Muster-Erkennung)
  + BLOCK 1: Briefing       (letztes abgeschlossenes Gespräch + offener Faden · in jedem Folgegespräch; bei start 'resume' stattdessen FORTSETZUNG aus diesem Gespräch)
  + BLOCK 2: Coach-Akte     (coach_file_entries + coachee_profile · Fallback: user_memory)
  + BLOCK 3: Resonanzkarte  (resonance_map · ab 3. Gespräch · immer unsichtbar)
  + BLOCK 4: RAG-Kontext    (Anonyme Erfahrungen)
  + BLOCK 5: Supervision    (Wöchentliche Empfehlung · nur mit Secret SUPERVISION_IN_PROMPT=1, seit 19.11.2026 an)
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
| `useChat` | Gesprächs-State · Streaming · startNewConversation / startWellnessConversation / startEntryContextConversation / resumeWithOpening / loadConversation / sendMessage / extractMemoryAndInsight |
| `useMemory` | user_memory lesen & schreiben (Legacy-Fallback) |
| `useStreak` | Streak-Berechnung |
| `useVoiceInput` | Web Speech API (de-DE) |

### useChat — Start-Funktionen

```
startNewConversation(isFirstEver)          → Pool-Text sofort anzeigen, Server speichert (start first/standard)
startWellnessConversation(wc)              → start 'wellness' — Coach antwortet sofort auf Wellness-Score
startEntryContextConversation(entryContext) → start 'entry'
resumeWithOpening(conversationId)          → U3: Verlauf laden + start 'resume', KEINE neue Konversation
loadConversation(conversationId)           → Verlauf laden ohne Coach-Nachricht (Verlauf, laufendes Gespräch)
startBriefingConversation()                → start 'briefing' — seit U3 vom Frontend nicht mehr genutzt
```

Beim `sendMessage` werden mitgeschickt: `conversationId`, `message: { clientMessageId, content, inputMode }`, `requestId` – sonst nichts. Gescheitertes Senden → Nachricht `status: 'failed'`, „Nicht gesendet – nochmal versuchen“ (`retryMessage`, gleiche `clientMessageId`). `post-conversation` bekommt nur `{ conversationId }`, die Extraktion `{ mode: 'extract', conversationId }`.

### CoachScreen — Eröffnungslogik (seit U3)

```
Mount:
  0. resumeConversationId (Verlauf) → loadConversation()
  1. Wellness-Check aus Navigation state? → startWellnessConversation()
  2. pre-session-briefing laden (recent, latestActiveConversation)
     a. Entry-Kontext? → startEntryContextConversation()
     b. Noch kein Gespräch mit eigener Nachricht? → startNewConversation(true)
     c. Jüngstes Gespräch < 2 h? → loadConversation(latest)
     d. Sonst → Einstieg: Weitermachen (resumeWithOpening) · Etwas Neues · Wie geht's dir?
```

**Heute (`/home`, seit U3):** Zustände A Neu → D heute schon gesprochen → B Nachklang (verdeckt) → C2 Wiederentdecken (max. 1×/Woche) → C Ruhe, Logik in `src/lib/todayState.js`. Schreibaktionen an Erkenntnissen nur über `src/lib/insightActions.js` (Write mit `.select('id')` bestätigt). Abschluss-Modal: bestätigte Erkenntnis `source: 'user'`, danach optional ein Vorhaben (`ziel`).

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

## 6. Muster im Spiegel (früher Verstehen-Modul, seit U2)

**5 bekannte Muster-Keys** (`src/lib/patterns.js`, = `pattern_references.pattern_key`):
```
rueckzug_unter_druck     → Rückzug unter Druck
innerer_kritiker         → Der innere Kritiker
uebernahme_reflex        → Übernahme-Reflex
harmonie_um_jeden_preis  → Harmonie um jeden Preis
perfektionismus_blockade → Perfektionismus-Blockade
```

**Ebene Muster** (`/mirror/muster`): Deine Stimmen · Was sich bei dir zeigt (Akte-Muster als Sheet, Bibliotheks-Muster mit eigenen Momenten) · Kandidat · Kennst du das?. Jedes Muster an genau einem Ort, keine Punkte, keine Wertungsfarben.
**Muster-Detail** (`/mirror/muster/:key`): Untertitel · Deine Momente (alle eigenen `pattern_references`) · Entstehung in 3 Schritten · Was hilft · Darüber sprechen.

**Datenfluss:** Post-Processing extrahiert pattern_references → DB → Spiegel liest sie. Akte-Muster (`coach_file_entries`) und `pattern_references` sind nicht verknüpft.

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
| Spiegel (alle Ebenen, Stimmen, Momente) | vollständig (seit U2 keine Anzeige-Sperren) | vollständig |
| Gesprächsverlauf | vollständig (seit U2) | vollständig |
| Coach-Gedächtnis | Begrenzt | Vollständig |

Counter: `profiles.sessions_used_this_month` · gezählt **nur serverseitig** über RPC `consume_session` in der `chat`-Function (idempotent pro Konversation, `conversations.session_counted_at`) · Reset: Cron-Job `reset-monthly-sessions` am 1. des Monats (seit Migration 023) · Limit gilt für alle außer `plan = 'premium'`; Krisenantwort, Howto-FAQ und Gedächtnis-Extraktion sind ausgenommen

**Rate-Limits pro Nutzer** (Migration 029, RPC `consume_rate_limits`, Werte zentral in `supabase/functions/_shared/rateLimit.ts`): `chat` Gespräch 10/Minute + 200/Tag · Howto 30/Stunde · Extraktion 30/Tag · `post-conversation` 60/Tag · `validate-invite-code` 5/Stunde + 10/Tag · `export-my-data` 3/Tag (fail-closed) · `mfa-recovery` Codes 5/Tag, Wiederherstellung 5/Stunde + 10/Tag (fail-closed). Antwort `429 { error: 'rate_limited', retryAfter }` + `Retry-After`-Header; das Frontend zeigt dann einen Hinweis inkl. Telefonseelsorge statt des Limit-Modals (`src/lib/rateLimit.js`). chat/post-conversation fail-open bei DB-Fehler (protokolliert), Invite-Code fail-closed. Zähler werden täglich nach 2 Tagen gelöscht (Cron `purge-rate-limits`).

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
- Imports in Edge Functions **immer mit fester Version** (`npm:@supabase/supabase-js@2.119.0`, `npm:@anthropic-ai/sdk@1.10.0`) — ohne Version zieht jeder Deploy die neueste Version (Ausfall 19.11.2026: frisch veröffentlichtes Paket nicht abrufbar). Updates bewusst und mit Test.
- **Nur der Server schreibt `messages`** — kein `supabase.from('messages').insert` im Frontend (S-12)
- **Neue Tabellen mit Personenbezug** brauchen eine `ON DELETE CASCADE`-Kette zu `auth.users`/`profiles`/`conversations`, gehören ggf. in `apply_retention()` (Migration 033), in den Datenexport (`EXPORT_TABLES` in `export-my-data`, sonst mit Begründung in `EXCLUDED_TABLES`) und werden mit dem Löschtest geprüft (`npm run security:deletion-test` + `supabase/security/deletion-check.sql`, Erwartung überall 0).
- **Lernbasis (S-13):** Inhalte gelangen nur mit `RAG_LEARNING_ENABLED=1`, Opt-in (`profiles.learning_opt_in`, nur über RPC `set_learning_opt_in`) und über `reviewLearningEntry` (`_shared/learning.ts`) in `experience_patterns`. Das gilt für jeden neuen nutzerübergreifenden Kanal. RAG-Treffer stehen im Prompt nur als gekennzeichneter Datenblock.
- **Function-Aufrufe im Frontend** nur über `src/lib/functions.js` (`functionUrl`, `functionHeaders` mit `x-region: eu-central-1`, S-09); CORS-Header der Functions nur aus `_shared/cors.ts`.
- **ZIPs für Chats nur über `npm run share:zip`** (nur eingecheckte Dateien, nie `.env*`). Der Build prüft `dist/` automatisch auf Schlüssel (`postbuild`), `npm run security:secrets` scannt die Historie.
- Keine Drittanbieter-Ressourcen im Frontend; jeder neue externe Dienst muss in die CSP in `vercel.json` (S-08). Schriften liegen lokal (`@fontsource`, S-10). Kein `dangerouslySetInnerHTML`.

### Sicherheitsmuster (Security-Paket A, Pflicht)
- **Jede Edge Function** ruft nach dem CORS-Preflight als Erstes `requireUser(req)` bzw. `requireInternalCaller(req)` (Cron) aus `supabase/functions/_shared/auth.ts` auf; Admin-Functions zusätzlich `requireAdmin(ctx)` — das verlangt seit S-06 auch den zweiten Faktor (`aal2`), Frontend dazu: `AdminRoute` + `AdminMfaScreen` + `useAdminMfa`.
- **Zweiter Faktor für alle (S-06b, Migration 037):** `requireUser` verlangt aal2, sobald der Nutzer einen verifizierten Faktor hat (`403 mfa_required`, Log `user_mfa_required`); `allowAal1` nur für `mfa-recovery`. Jede neue Tabelle mit Client-Rechten bekommt die restriktive Policy `mfa_required` (`using/with check ((select public.mfa_satisfied()))`), jede neue Client-RPC mit SECURITY DEFINER prüft zuerst `public.mfa_satisfied()`. Frontend: Code-Abfrage über `useAuth.mfaGate` **vor** dem Profil-Laden (`MfaChallengeScreen`), Bausteine in `src/components/mfa/`, Logik in `src/lib/mfa.js`.
- Identität **nur** aus dem JWT (`ctx.user.id`), nie aus Body-Feldern wie `userId`. Jede `conversationId` mit `assertConversationOwner()` prüfen, bevor gelesen oder geschrieben wird. IDs aus Modellausgaben nur übernehmen, wenn sie dem Nutzer gehören; Writes über `admin` zusätzlich mit `.eq('user_id', userId)`.
- `admin` = echter service_role-Client ohne Nutzer-Token; `userClient` = Rolle `authenticated` (für RPCs mit `auth.uid()`, z. B. `consume_session`).
- Fehlerantworten nur als `{ error: <code> }` (`errorResponse`), keine `error.message`-Texte an den Client.
- Gateway-Schalter „Verify JWT“ bleibt aus — festgeschrieben in `supabase/config.toml` (`verify_jwt = false` je Function). Neue Function → dort eintragen.
- **RLS:** Jede neue Tabelle bekommt RLS, Policies **nur `to authenticated`** (nie `public`/`anon`) und gezielte GRANTs nach tatsächlicher Frontend-Nutzung. `anon` hat keine Tabellenrechte. Neue SECURITY-DEFINER-Funktionen: `set search_path = ''`, schema-qualifizierte Namen, `revoke … from public, anon`, `grant` nur an die Rolle, die sie braucht.
- Privilegierte Profilfelder (`is_admin`, `plan`, `session_limit`, `sessions_used_this_month`, `is_beta_tester`, `invited_*`, `learning_opt_in*`, `age_confirmed_at`) sind per Trigger server-only (`consent_ip` seit 036 entfernt; 18+ über Signup-Metadaten `age_confirmed` bzw. RPC `confirm_age`). Der Client legt keine Profile an (Name über `signUp({ options: { data: { display_name } } })`).

### Log-Codes = Schnittstelle zum Monitoring (S-22)
- Überwachte Codes stehen in `supabase/functions/_shared/monitorRules.ts` (Regel mit Schwelle oder `infoOnly`). **Codes dort nicht umbenennen, ohne die Regel mitzuziehen.** Neue sicherheitsrelevante Ereignisse bekommen einen festen snake_case-Code (`logger.warn('mein_code', { … })`) und einen Eintrag in `monitorRules.ts`.
- Gezählt wird standardmäßig nur `app_logs.origin = 'server'` (Trigger, Migration 034); Client-Logs kann jeder angemeldete Nutzer schreiben.
- Lebenszeichen: `retention_applied`, `supervision_run` – fehlen sie, gibt es Alarm. Cron-Jobs, die neu dazukommen, loggen bei jedem Lauf einen solchen Code.
- Mails aus Functions (`_shared/mailer.ts`) enthalten nie Konto-Inhalte, Nutzer-IDs oder SMTP-Fehlertexte. Notfallplan: `docs/security/notfallplan.md`.

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
- Header prüfen: `curl -sI https://app.friedensstifter.coach` (HSTS, CSP, Permissions-Policy …) — die CSP ist seit 19.11.2026 **erzwingend**; neue externe Quellen sonst blockiert
- **Löschtest** bei Änderungen an Tabellen mit Personenbezug oder an der Löschlogik: `npm run security:deletion-test` (frisches Testkonto C) + `supabase/security/deletion-check.sql` → überall 0

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
MFA_CODE_PEPPER=             # mfa-recovery: HMAC-Schlüssel der Wiederherstellungscodes (≥ 32 Zeichen, offline sichern)
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
| `033_s15_cascade_and_retention.sql` | invited_by SET NULL · user_feedback/coach_reflections CASCADE · raw_reflections geleert, protocol_text · apply_retention + Cron apply-retention · inactive_accounts_report |
| `034_s22_security_monitoring.sql` | app_logs.origin (Trigger, server/client) · security_alerts · RPC security_log_counts (nur service_role) · Cron security-monitor + purge-security-alerts |
| `035_u3_insight_surfacing.sql` | insights.surfaced_at · confirmed_at · dismissed_at + Index (user_id, created_at) · Zielbild U3 (Paket C rückt auf 036/037) |
| `036_s11_privacy_fixes.sql` | S-11: user_feedback/feedback_surveys nur mit consent_given (RLS) · profiles.age_confirmed_at + RPC confirm_age · Schutz-Trigger/handle_new_user angepasst · consent_ip entfernt · apply_retention + feedback_surveys 24 Monate |
| `037_s06b_user_mfa.sql` | S-06b: `mfa_satisfied()` · restriktive Policy `mfa_required` auf allen Client-Tabellen (ohne app_logs) · set_learning_opt_in/confirm_age mit MFA-Prüfung · `mfa_recovery_codes` (nur Hash, nur service_role) |

Hinweis: 001–022 wurden ursprünglich per SQL-Editor eingespielt und am 18.11.2026 per `supabase migration repair` als angewendet markiert. Ab 023 läuft alles über `supabase db push`.

---

# Zielbild 2026-11 (Ergänzung v1.0)

Quelle: `docs/Neues_Zielbild/claude-md-ergaenzung-v1.md`. Bei Widerspruch gilt die bestehende Sicherheitsregel; der Widerspruch wird gemeldet, nicht still aufgelöst.

## Arbeitsweise in Tranchen

- Gearbeitet wird **eine Tranche nach der anderen**, so wie in `docs/Neues_Zielbild/friedensstifter-zielbild-umsetzungsplan-v1.md` festgelegt (Detailkonzepte und Handoffs im selben Ordner). Eine Tranche bedeutet ein Handoff, einen Branch und einen Deploy.
- **Kein Scope Creep.** Was im Handoff nicht steht, wird nicht gebaut, auch nicht „wenn man schon mal dran ist". Fällt dir etwas auf, notiere es unter „Beobachtungen" am Ende des Handoffs.
- **Zuerst die Inventur.** Vor jeder Änderung die im Handoff genannten Stellen im Code suchen. Weicht der Code vom BEFORE-Block ab, **anhalten und melden**, nicht raten.
- **Das Designdokument bildet nur verifizierten Code ab.** Aktualisiert wird es erst, nachdem Jerome die Tranche validiert hat, und genau so, wie es der Abschnitt „Designdokument nach Verifikation" im Handoff vorgibt. Jede Änderung bekommt einen Changelog-Eintrag.
- **Migrationen** sind additiv und fortlaufend nummeriert. Jede Migration enthält einen Kommentar zum Rückgängigmachen. Neue Tabellen bekommen RLS und explizite GRANTs für `service_role` und, falls nötig, für `authenticated` (Lehre aus Migration 014/015).

## Produktregeln, die jede Oberfläche einhält

- **Sprachprinzip:** In UI-Texten, Prompts und Beispieltexten gibt es kein „müssen", kein absolutes „immer" oder „nie", kein „können nicht" und kein „Du brauchst …". Wörtliche Zitate aus Jeromes Buch (`book_passages.key_quote`) sind als Zitat ausgenommen.
- **Einladen statt drängen:** keine Streaks, keine Countdowns, keine Verknappung („nur noch heute"), keine gedimmten Teaser-Karten, keine roten Badges für Ungelesenes. Jedes Angebot hat einen sichtbaren Ausweg („Heute nicht", „Überspringen").
- **Wertfreiheit:** Die App bewertet nichts, was den Nutzer betrifft. Es gibt keine Wertungsfarben (grün = gut), keine Punkte oder Sterne als Konfidenz und keine Wörter wie „Aufgelöst", „Fortschritt" oder „geschafft" für Muster. Bewertungen setzt **nur der Nutzer** selbst (`insights.user_rating`, Markierung ✦).
- **Heute ist öffentlicher Raum:** Auf dem Screen Heute erscheinen **keine Gesprächsthemen** im Klartext. Erkenntnisse sind dort verdeckt und werden erst nach Antippen angezeigt, mit dauerhaft sichtbarer Erklärzeile.
- **Kein Coaching-Vokabular im aktiven UI** (Chat, Heute, Spiegel). Begriffe wie „systemisch", „Intervention" oder „Reframing" gehören nur in Info-Kontexte (Profil, „Wie es funktioniert").
- **Keine Werbung, kein Tracking:** Keine Werbe-, Analytics- oder Pixel-SDKs. Externe Links (z. B. Amazon) öffnen mit `rel="noopener noreferrer"`, ohne Affiliate-Parameter.

## Technische Regeln

- **Modell-IDs stehen nur in `supabase/functions/_shared/models.ts`.** Nirgends sonst Modellnamen als String.
- **Anthropic-Aufrufe:** Antwortinhalte nach `type` lesen (`extractText`), nie `content[0]`. Vor jedem Aufruf `ensureEndsWithUser`. Keine `temperature`, `top_p` oder `top_k` bei Sonnet 5.x. `effort` ist pro Function konstant.
- **Serverseitige Durchsetzung:** Gesprächsgrenzen (Kennenlernen, Kappung), Plan-Prüfungen und Admin-Rechte werden **in den Edge Functions** durchgesetzt. Das Frontend zeigt nur an (`access_phase`), es entscheidet nicht.
- **Keine stillen Fehler:** Jeder DB-Write wird auf einen Fehler geprüft und geloggt. Es gibt keine leeren `catch`-Blöcke, und das UI meldet Erfolg erst nach bestätigtem Write. Abgeschnittene Modellantworten (`stop_reason = 'max_tokens'`) werden geloggt.
- **Logs ohne Inhalte** (siehe bestehende Log-Regel, S-04): nur IDs, Zähler, Token-Zahlen und Fehlercodes. Keine Gesprächs- oder Erkenntnistexte, auch keine Buchzitate.
- **Personenbezug und Lernbasis trennen:** Prompts, die `experience_patterns` befüllen, bekommen **keine** personenbezogenen Daten. Einschätzungen, Erkenntnisse und Profilwissen gehen nur in personenbezogene Prompts (z. B. `INSIGHT_PROMPT`).
- **Buchinhalte nur aus `book_passages`:** Der Coach bekommt Buchstellen ausschließlich aus dieser Tabelle, und nur freigegebene Einträge (`approved_by_jerome_at` gesetzt). Keine Buchtexte im Code oder in Prompts hartkodieren.
- **Testen mit Testkonten:** Diagnose und Tests laufen mit synthetischen Testkonten, nicht mit Echtdaten (S-17). Nach jeder Tranche `npm run security:test`.

## Begriffe (UI ↔ Code)

| UI | Code / Route |
|---|---|
| Heute | `/home` · `HomeScreen` (ob `/` dazukommt, entscheidet U1) |
| Gespräch | `/coach` · `CoachScreen`, Einstieg, `/coach/verlauf` |
| Spiegel: Erkenntnisse / Muster / Entwicklung | `/mirror` · `/mirror/muster/:key` |
| Deine Einschätzung | `insights.user_rating` (`helpful` · `unclear` · `disagree`) |
| Daran weiterarbeiten | Entry-Kontext `weiterarbeiten`, Ursprungsgespräch fortsetzen |
| Kennenlernen / Ruhemodus / Begleitung | `access_phase` (`kennenlernen` · `ruhemodus` · `begleitung`) |
| Reflexionstage | bisherige Streak-Daten, Anzeige „Tage gesamt" |
| Das Buch zur App | `/buch` · `profiles.book_status`, `book_progress` |
