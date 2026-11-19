# Security-Paket B – Phase 0: Bestandsaufnahme

> Stand: 19.11.2026 · Branch `security/paket-b` (von `main` @ `1f60c57`) · Grundlage: Code, nicht Doku.
> Zeilennummern beziehen sich auf diesen Stand.

## Vorbemerkung: Abweichung Handoff ↔ Code

Der Handoff verwendet die ID **S-12** für „Verlauf und Nachrichten nur serverseitig“. Ein **Teil von S-12** ist am 18.11.2026 schon umgesetzt worden (Migration 028, Commit `c381889`):
- `chat` lädt Akte, Profil, Resonanzkarte, Briefing, Gedächtnis und RAG selbst.
- `pre-session-briefing` liefert nur Eckdaten.
- `rag-search` ist entfernt, die RAG-Suche läuft in `chat` über `_shared/rag.ts`.

Offen ist genau der Teil, den der Handoff beschreibt: Verlauf und `messages`-Writes. Außerdem gibt es schon **Rate-Limits** (Migration 029). Die nächste freie Migrationsnummer ist **030**, die Nummern im Handoff passen also.

---

## 2.1 S-12: Nachrichtenfluss

### Client-Writes in `messages` (alle in `src/hooks/useChat.js`)
| Zeile | Pfad | Felder | Ergebnis geprüft? |
|---|---|---|---|
| 158 | `startWellnessConversation`: Coach-Antwort | `conversation_id, role='assistant', content` | **nein** (stilles Scheitern) |
| 268 | `startBriefingConversation`: Coach-Antwort | dito | **nein** |
| 374 | `startEntryContextConversation`: Coach-Antwort | dito | **nein** |
| 443 | `startNewConversation`: **Eröffnungstext aus dem Pool** (`OPENING_MESSAGES` / `FIRST_OPENING_MESSAGE`, `src/lib/prompts.js`) | `conversation_id, role='assistant', content` | ja (Log) |
| 473 | `sendMessage`: Nutzer-Nachricht | `conversation_id, role='user', content, input_mode` | ja (Log) |
| 598 | `sendMessage`: Coach-Antwort | `conversation_id, role='assistant', content, message_type` | ja (Log) |

**Wichtiger Befund (nicht im Handoff):** Beim Standard-Start (`startNewConversation`) gibt es **keinen** `chat`-Aufruf. Die App schreibt einen Eröffnungstext aus dem eigenen Pool als **Coach-Nachricht** in die DB. Ohne Insert-Recht (Mig. 031) muss auch das der Server übernehmen (`start: 'standard' | 'first'`). Dabei:
- wird **kein Modell aufgerufen**,
- darf **`consume_session` nicht laufen**. Ein Standard-Gespräch zählt heute erst bei der ersten Nutzer-Nachricht, sonst würde schon das Öffnen des Coach-Screens zählen.

Die Pool-Texte müssen dafür in die Function, Quelle ist `src/lib/prompts.js`.

### Start-Funktionen → erster `chat`-Aufruf
- `startWellnessConversation` (Z. 32–100): Sie legt die Konversation an (`title: 'Wellness-Check'`) und sendet `{ messages: [], conversationId, wellnessCheck, requestId }`.
- `startBriefingConversation` (ab Z. ~180): sendet `{ messages: [], conversationId, requestId }`.
- `startEntryContextConversation` (ab Z. ~290): sendet `{ messages: [], conversationId, entryContext, requestId }`.
- **Keine** Start-Funktion erzeugt oder speichert eine Nutzer-Nachricht. Der Server setzt für das Modell nur intern ein synthetisches `'.'` als ersten User-Turn ein (`chat/index.ts`, Block „Anthropic erfordert: messages muss mit user-Role beginnen“). Gespeichert wird nichts davon.

### Wann entsteht die Konversation?
- Bei Wellness, Briefing und Entry: synchron vor dem `chat`-Aufruf. Scheitert der Insert, ist `convId = null`, und `chat` antwortet mit `400 invalid_conversation_id` (über `assertConversationOwner`).
- Beim Standard-Start (`startNewConversation`, Z. 430–453): Die Konversation und die Eröffnung werden angelegt, das Promise liegt in `pendingConvRef`. `sendMessage` wartet darauf (Z. 469).
- `chat` im Gesprächsmodus **ohne** `conversationId`: Seit Paket A gibt das immer `400`. Ein Aufruf ohne ID aus der App kommt nur zustande, wenn das Anlegen der Konversation gescheitert ist.

### Extraktion, Howto, Post-Processing
- `extractMemoryAndInsight()` (Z. 623–649) sendet `{ messages: <ganzer State>, extractMemory: true, requestId }` **ohne** `conversationId`.
- `HowItWorksScreen` (`src/screens/howto/HowItWorksScreen.jsx`, ca. Z. 43–56) sendet `{ messages: [...], howtoMode: true }`. Es wird nichts gespeichert.
- `runPostConversation()` (`src/screens/coach/CoachScreen.jsx:248–283`) sendet `{ messages: msgs.map(role, content), conversationId }` mit `keepalive: true` und `Authorization: Bearer <frischer Token aus getSession()>`. Die vier Trigger sind:
  1. `handleNewConversation` (Z. 324)
  2. `visibilitychange` (Z. 293)
  3. `pagehide` (Z. 305)
  4. Unmount (Z. 316)

  Eine clientseitige Sperre gegen doppeltes Auslösen läuft über `processedRef`.
- **Innere Stimmen / Namens-Chips** (`CoachScreen.jsx:379–392`): Die Folgenachricht läuft schon heute über `handleSend` → `sendMessage`. Dazu kommt ein direktes Client-Update auf `inner_voices` (erlaubt, Grant aus Mig. 025).

### Tabelle `messages`
- **Spalten:**
  - `id uuid` (Standardwert `gen_random_uuid()`)
  - `conversation_id` (CASCADE auf `conversations`)
  - `role`, `content`
  - **`metadata jsonb`** (gibt es schon, nullable, ohne Standardwert, Mig. 001:30)
  - `created_at` (Standardwert `now()`)
  - `input_mode` (Mig. 002)
  - `message_type` (Mig. 021)
- **Policies (Mig. 025:100–105):** `messages_select_own` und **`messages_insert_own`**. Das ist der Name für Mig. 031.
- **Rechte:** `grant select, insert on public.messages to authenticated` (Mig. 025:70).

### PWA
- `vite.config.js:9`: `registerType: 'autoUpdate'`. `injectRegister` ist nicht gesetzt, damit gilt der Standard `auto`. Das Ergebnis im Build ist ein **externes** `<script src="/registerSW.js">`, kein Inline-Skript.
- Ein Update-Hinweis oder `useRegisterSW` existiert **nicht**. Bei `autoUpdate` aktiviert sich ein neuer Service Worker selbst; die neue Version gilt nach dem nächsten Laden. Für `409 client_outdated` genügt deshalb `location.reload()`.

## 2.2 S-13: Lernbasis

- **`post-conversation`:**
  - `ANONYMOUS_SUMMARY_PROMPT` (Z. 104 ff.) erzeugt **in einem einzigen Aufruf** sowohl den Lernbasis-Eintrag als auch `pattern_references` (Z. 410). `pattern_references` enthält ein **Zitat aus dem Gespräch** (`excerpt`, max. 150 Zeichen).
  - Insert `experience_patterns` (Z. ~640–662) mit den Feldern `context, pattern, resistance, what_helped, what_blocked, outcome, embedding`. Das Embedding wird aus `context — pattern — what_helped` gebildet.
  - Insert `pattern_references` (Z. 679) und `insights` (Z. 700), beide persönlich.
  - `coach_reflections` (Z. 711) speichert die Selbstreflexion. Sie ist die Eingabe der Supervision.
- **`match_experiences()`:**
  - Signatur: `match_experiences(query_embedding vector(1536), match_threshold float = 0.78, match_count int = 3)`, definiert in Mig. 003:26.
  - Rückgabe: `context, pattern, what_helped, resistance, similarity`.
  - `search_path = public` (Mig. 025:205), nur für `service_role` ausführbar.
  - Einziger Aufrufer: `supabase/functions/_shared/rag.ts` (`findSimilarExperiences`). Die Wartungs-Function `backfill-embeddings` schreibt nur Embeddings, sie sucht nicht.
- **RAG-Block in `chat`** (`buildSystemPrompt`):
  ```
  --- ERFAHRUNGEN AUS ÄHNLICHEN GESPRÄCHEN (anonym) ---
  <Einträge mit '\n---\n' verbunden>
  Nutze diese Erfahrungen als stille Orientierung. Zitiere sie nie direkt. …
  --- ENDE ---
  ```
  Es gibt kein Entfernen von `<` oder `>` und keinen Hinweis „keine Anweisung“.
- **Supervision** (`supabase/functions/supervision/index.ts`):
  - Prompt: Z. 12–27.
  - Eingaben: `coach_reflections` der letzten 7 Tage (`what_worked, what_missed, resistance_detected, resistance_handled, improvement_note`) und `user_feedback`.
  - Modell: Haiku.
  - `improvement_recs` = Regex auf „3. …“ (Z. 98).
  - **Befund:** `supervision_logs.raw_reflections` speichert die **Reflexionen im Volltext** mit (Z. 107). Das ist für die Fristen in S-15 relevant.
- **`protect_profile_privileges()`:** Die aktuelle Fassung steht in **Mig. 027:18–58**. Die Mig. 024 ist überholt, weil der INSERT-Zweig `session_limit := 20` setzt. Gesperrte Spalten: `id, is_admin, is_beta_tester, plan, session_limit, sessions_used_this_month, invited_at, invited_by, consent_ip, created_at`.

## 2.3 S-06: Admin

- `requireAdmin()`: `supabase/functions/_shared/auth.ts:70–75`. Sie prüft nur `is_admin`.
- Aufrufer:
  - `admin-users/index.ts:28`
  - `admin-feedback/index.ts:26`
  - `admin-invite-user/index.ts:29`
- `AdminRoute`: `src/App.jsx:49–55`. Sie prüft `user` und `profile.is_admin`, aber kein MFA.
- **`AdminUsersScreen`:** `fetchUsers` und `fetchFeedback` (Z. 23–46) prüfen `res.ok` **nicht**. Ein Fehler erscheint als leere Liste, das ist stilles Scheitern. Ein künftiges `403 mfa_required` würde also unbemerkt verschluckt. Die Einladung zeigt bei einem Fehler `data.error`, und das ist ein Code (Z. 106 f.).
- `@supabase/supabase-js`: installiert ist **2.99.2** (`package.json`: `^2.45.4`). Die MFA-API (`auth.mfa.*`) ist verfügbar.

## 2.4 S-08: Browser

- **`vercel.json` existiert** und hat `rewrites` (SPA) sowie Cache-Header für `/assets/*`, `*.html` und `/`. Diese Einträge bleiben erhalten, die Security-Header kommen dazu.
- **Externe Origins, die geladen werden:**
  - `fonts.googleapis.com` und `fonts.gstatic.com` (`index.html:11–13`, Workbox-Regel `vite.config.js:29`)
  - das Supabase-Projekt (über `VITE_SUPABASE_URL`)

  Weitere `https://`-Treffer (friedensstifter.coach, telefonseelsorge.de, ldi.nrw.de, anthropic.com, supabase.com) sind **nur Links** und für die CSP nicht relevant.
- **Kein** Vercel Analytics oder Speed Insights.
- **Inline-Skripte:** keine. `index.html` lädt nur Module, `registerSW.js` ist eine eigene Datei. `public/offline.html` enthält einen `<style>`-Block, der durch `style-src 'unsafe-inline'` gedeckt ist.
- **`dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `eval`, `new Function`:** keine Fundstelle in `src/`.
- **`linkify()`** (`src/components/coach/CrisisResponseCard.jsx:7–40`): Schon heute sicher. Das Regex trifft nur feste Hotline-Nummern und `telefonseelsorge.de`. Als `href` entstehen nur `tel:<Ziffern>` oder die feste URL `https://www.telefonseelsorge.de`, beides als React-Element. Die Allowlist aus dem Handoff baue ich trotzdem als zweite Linie ein.

## 2.5 S-15: Löschen

- **`delete-account/index.ts:25–75`**, Reihenfolge:
  1. Konversations-IDs ermitteln.
  2. `messages` löschen.
  3. Parallel löschen: `insights, pattern_references, user_feedback, coach_file_entries, coachee_profile, session_notes, resonance_map, user_memory`.
  4. `conversations` löschen.
  5. `profiles` löschen.
  6. `auth.admin.deleteUser`. Per CASCADE an `auth.users` hängen: `inner_voices, crisis_events, feedback_surveys, rate_limit_counters`.

  Scheitert ein Schritt, kommt `500 delete_incomplete` zurück, und das Auth-Konto bleibt bestehen. Ein Fehler beim Löschen des Auth-Kontos liefert `{ error: 'Failed to delete account' }`. Das ist **kein Code**, Paket-A-Muster verletzt.
- **Beziehungen aus den Migrationen** (das Audit A/B bestätigt den Live-Stand):

  | Tabelle.Spalte | Ziel | ON DELETE | Bemerkung |
  |---|---|---|---|
  | conversations.user_id | profiles | CASCADE | |
  | messages.conversation_id | conversations | CASCADE | |
  | user_memory / insights / pattern_references / coach_file_entries / coachee_profile / session_notes / resonance_map .user_id | profiles | CASCADE | |
  | insights.conversation_id, pattern_references.conversation_id/message_id, coach_file_entries.source_conversation_id, coachee_profile.last_enriched_by | conversations/messages | SET NULL | Datensatz bleibt, gehört über user_id dem Nutzer → beim Löschen weg |
  | **coach_reflections.conversation_id** | conversations | **SET NULL** | **Keine user_id.** Nach einer Kontolöschung bleibt die Reflexion **verwaist** stehen (Text über das Gespräch). → Welle 4 |
  | **user_feedback.user_id** | profiles | **SET NULL** | `delete-account` löscht explizit; als FK trotzdem auf CASCADE ziehen |
  | **app_logs.user_id** | profiles | SET NULL | Logs ohne Inhalte, 30 Tage → vertretbar, im Bericht nennen |
  | error_logs.user_id (Mig. 004) | auth.users | SET NULL | Alt-Tabelle; ob sie noch existiert → Audit G |
  | crisis_events.user_id | auth.users | CASCADE | conversation_id/message_id SET NULL |
  | inner_voices / feedback_surveys / rate_limit_counters .user_id | auth.users | CASCADE | |
  | conversation_context | conversations + profiles | CASCADE | |
  | **supervision_logs.raw_reflections** | – | – | Kopie der Reflexionen ohne Zuordnung → Frist (D-4) |
  | experience_patterns | – | – | heute **ohne** Zuordnung → S-13 (`source_user_id`) |

## Weitere Befunde

1. **Stilles Scheitern** an drei Stellen:
   - Die Coach-Antworten der drei Start-Varianten werden ohne Prüfung gespeichert (`useChat.js:158/268/374`).
   - `AdminUsersScreen` lädt die Listen ohne `res.ok`.

   Beides löst sich mit S-12 bzw. S-06.
2. **`extractMemoryAndInsight` ohne `conversationId`:** Laut Handoff lädt `extract` künftig über die `conversationId`. Das Frontend muss sie dafür mitschicken.
3. Die **Doku-Lücke „Ein-Client-Ansatz in `chat`“** (ARCHITECTURE.md Abschn. 10) wird in der Abschlussdoku ersetzt.
