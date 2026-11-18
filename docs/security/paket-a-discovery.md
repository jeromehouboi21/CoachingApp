# Security-Paket A – Phase 0: Bestandsaufnahme (Code)

**Stand:** 18.11.2026 · Branch `security/paket-a` · Grundlage: Code-Stand `f9b58c9`
**Status:** Code-Analyse abgeschlossen. Live-Zustand der DB steht aus (⛔ STOPP J-1, `supabase/security/audit.sql`).

> Alle Angaben beziehen sich auf den Code. Wo die DB per Dashboard abweicht, zeigt das erst das Audit.

---

## 0. Kritische Befunde vorab (Priorität absteigend)

| # | Befund | Fundstelle | Auswirkung |
|---|---|---|---|
| K-1 | **`post-conversation` hat keinerlei Auth-Prüfung.** `userId` kommt aus dem Body, alle Writes laufen mit service_role. | `supabase/functions/post-conversation/index.ts:284-306` | Jede Person mit der öffentlichen Function-URL (ohne Login) kann in **fremde** Coach-Akten, Profile, Insights, Stimmen, Resonanzkarten schreiben und beliebig Anthropic-/OpenAI-Kosten erzeugen. |
| K-2 | **`redeem_invite_code(p_code, p_user_id)` ist SECURITY DEFINER, nimmt die User-ID als Parameter und hat keine `REVOKE`-Anweisung** → per Postgres-Default für `PUBLIC` (also auch `anon`) ausführbar. | `supabase/migrations/010_v2_5.sql:30-76` | Jeder kann per `POST /rest/v1/rpc/redeem_invite_code` beliebige Konten auf `tester` setzen und Codes durchprobieren (keine Rate-Limits). |
| K-3 | **`profiles` hat eine `FOR ALL`-Policy ohne Spaltenschutz.** | `001_initial.sql:39-40` | Eingeloggte Nutzer können `is_admin`, `plan`, `session_limit`, `sessions_used_this_month`, `is_beta_tester`, `invited_*` selbst setzen. `is_admin = true` öffnet Admin-Functions (alle E-Mails, Feedback, Einladungen). |
| K-4 | **`rag-search` und `supervision` haben keine Auth-Prüfung.** | `rag-search/index.ts:28-49`, `supervision/index.ts:24-38` | Anonyme Kosten (OpenAI/Anthropic), anonymer Lesezugriff auf `experience_patterns` (anonymisiert), beliebiges Auslösen von Supervision-Läufen. |
| K-5 | **View `feedback_survey_scores` ohne `security_invoker`.** | `022_feedback_survey.sql:42-55` | Views laufen standardmäßig mit den Rechten des Owners (postgres) und umgehen RLS. Falls Supabase-Default-Privilegien `anon`/`authenticated` SELECT gegeben haben, sind **alle Fragebogen-Antworten aller Nutzer öffentlich lesbar**. → Audit-Abfrage **I** klärt das. |
| K-6 | **`post-conversation` übernimmt Objekt-IDs aus der Modellausgabe** (`entry_id`, `cluster_entry_ids`, `existing_voice_id`) und schreibt damit per service_role **ohne `user_id`-Filter**. | `post-conversation/index.ts:442-460, 467-484, 521-531, 551-554` | Prompt-Injection im Gespräch („gib als entry_id … aus“) kann fremde Akte-Einträge/Stimmen verändern. |
| K-7 | **Sitzungszählung umgehbar:** Zähler wird im Client per Read-Modify-Write gesetzt, der Button „Neues Gespräch“ zählt gar nicht. | `CoachScreen.jsx:218-227`, `327-360` | Limit ohne Manipulation umgehbar (Button), mit Manipulation beliebig (K-3). |
| K-8 | **`.env.local` ist eingecheckt** (trotz `.gitignore`), außerdem 7 ZIP-Snapshots im Repo-Root. | `git ls-files` | Inhalt geprüft: nur `VITE_SUPABASE_URL` + `sb_publishable_…`-Key (öffentlich gedacht). In der Git-Historie keine `sb_secret_`-, `service_role`-JWT-, `sk-ant-`- oder `sk-`-Keys gefunden. ZIPs enthalten keine `.env`/Logs/Dumps. → Niedriges Risiko, aber aufräumen (`git rm --cached`). |

---

## 1. S-01: Privilegierte Profilspalten

### 1.1 Wie entsteht eine `profiles`-Zeile?

1. **DB-Trigger** `on_auth_user_created` → `public.handle_new_user()` (SECURITY DEFINER, **ohne `search_path`**) legt `(id, display_name)` an. `supabase/migrations/001_initial.sql:52-63`
2. **Zusätzlich Client-`upsert`** direkt nach `signUp`: `supabase.from('profiles').upsert({ id, display_name: displayName || email.split('@')[0] })` – `src/hooks/useAuth.js:95-98`
   - Ergebnis wird nicht geprüft (stilles Scheitern). Wenn E-Mail-Bestätigung aktiv ist, gibt es noch keine Session → der Upsert läuft als `anon` und scheitert immer.
   - `Step4Auth` ruft `signUp(email, password)` ohne Namen auf (`Step4Auth.jsx:35`), d. h. der Upsert setzt `display_name` = E-Mail-Präfix.
3. **Admin-Einladung:** `admin-invite-user` macht per service_role `upsert` mit `plan='tester'`, `is_beta_tester`, `session_limit`, `invited_at`, `invited_by`. `supabase/functions/admin-invite-user/index.ts:123-136`

→ Für 5.1 (Schutz-Trigger): Der Client-Upsert wird auf „Name per `signUp({ options: { data: { display_name } } })` an den Trigger übergeben, kein Client-Insert mehr“ umgestellt. Dann braucht `authenticated` kein INSERT auf `profiles`.

### 1.2 Wo wird `sessions_used_this_month` erhöht?

**Nur im Client**, `countSession()` in `src/screens/coach/CoachScreen.jsx:218-227`:
```js
supabase.from('profiles')
  .update({ sessions_used_this_month: (profile?.sessions_used_this_month || 0) + 1 })
```
- Nicht atomar (veralteter `profile`-Wert → verlorene Updates bei mehreren Tabs), Ergebnis wird nicht geprüft.
- Einmal pro Mount des CoachScreens (`sessionCountedRef`), nicht für `plan === 'premium'`.

| Gesprächsart | Zählt heute? | Fundstelle |
|---|---|---|
| Neu (Standard-Start beim Öffnen des Coach-Tabs) | ✅ ja – **beim Mount, auch wenn nie eine Nachricht geschrieben wird** | `CoachScreen.jsx:207, 212` |
| Wellness-Check | ✅ ja | `CoachScreen.jsx:162-163` |
| Wiederkehr-Begrüßung (Briefing) | ✅ ja | `CoachScreen.jsx:197, 212` |
| Entry-Kontext (Tagesimpuls, Muster, Verstehen) | ✅ ja | `CoachScreen.jsx:193, 212` |
| Fortsetzen aus dem Verlauf | ❌ nein (nur Fallback bei Fehler zählt) | `CoachScreen.jsx:145-157` |
| **Button „Neues Gespräch“** / nach Insight-Modal | ❌ **nein** (Lücke) | `CoachScreen.jsx:327-381` |
| Howto-FAQ (`/howto`) | ❌ nein | `HowItWorksScreen.jsx:42-55` (`howtoMode: true`, keine `conversationId`) |
| `extractMemory` (Gedächtnis-Extraktion) | ❌ nein | `useChat.js:617-644` (keine `conversationId`) |

Serverseitig (`chat/index.ts:897-922`) wird heute nur **geprüft**, nicht gezählt – und zwar bei **jedem** Request (auch Howto und `extractMemory`). Bei Lesefehler: fail-open.

### 1.3 Alle Client-Schreibzugriffe auf `profiles`

| Aufrufstelle | Operation | Felder |
|---|---|---|
| `src/hooks/useAuth.js:95-98` (`signUp`) | `upsert` | `id`, `display_name` |
| `src/hooks/useAuth.js:129-140` (`updateProfile(updates)`) | `update` (generisch!) | alles, was übergeben wird – Aufrufer: |
| ↳ `src/screens/onboarding/Step4Auth.jsx:46-53` | | `onboarding_completed`, `onboarding_data`, `consent_given_at`, `consent_version`, `coaching_agreement_accepted_at`, `coaching_agreement_version` |
| ↳ `src/screens/onboarding/InvitedSetPassword.jsx:32-38` | | `onboarding_completed`, `consent_given_at`, `consent_version`, `coaching_agreement_accepted_at`, `coaching_agreement_version` |
| ↳ `src/hooks/useStreak.js:20` | | `streak_count`, `streak_last_date` |
| ↳ `src/screens/profile/ProfileScreen.jsx:178` | | `display_name` |
| `src/screens/landing/WelcomeScreen.jsx:11-14` | `update` | `onboarding_completed` (Fehler ungeprüft) |
| `src/screens/coach/CoachScreen.jsx:199-203` | `update` | `last_return_greeting_at` (Fehler ungeprüft) |
| `src/screens/coach/CoachScreen.jsx:221-225` (`countSession`) | `update` | `sessions_used_this_month` ← **entfällt mit S-01a** |

Nicht vom Client geschrieben (und damit „server-only“): `id`, `plan`, `is_admin`, `is_beta_tester`, `session_limit`, `sessions_used_this_month` (nach S-01a), `invited_at`, `invited_by`, `created_at`, **`consent_ip`** (Spalte aus `011_v2_7.sql`, wird nirgends befüllt – wenn sie Nachweiszwecken dient, darf der Client sie nicht frei setzen; ich nehme sie in die Schutzliste auf).

### 1.4 Wer setzt privilegierte Spalten serverseitig?

| Stelle | Spalten | Rolle |
|---|---|---|
| `redeem_invite_code` (`010_v2_5.sql:30-76`), aufgerufen von `validate-invite-code/index.ts:52-55` | `plan = 'tester'` | Function: SECURITY DEFINER (Owner postgres). Aufrufer heute: service_role-Client – **aber direkt auch von anon/authenticated aufrufbar (K-2)** |
| `admin-users/index.ts:133-136` (PATCH) | `is_beta_tester`, `session_limit` | echter service_role-Client nach `is_admin`-Prüfung ✅ |
| `admin-invite-user/index.ts:123-136` | `plan`, `is_beta_tester`, `session_limit`, `invited_at`, `invited_by`, `display_name` | echter service_role-Client nach `is_admin`-Prüfung ✅ |
| Monats-Reset-Cron | `sessions_used_this_month = 0` | **nicht im Repo.** ARCHITECTURE.md (Abschn. 9) und CLAUDE.md behaupten „Cron am 1. des Monats“. Ob der Job existiert → Audit **G**. |
| `is_admin` | – | wird nirgends im Code gesetzt (nur per Dashboard) ✅ |

---

## 2. S-02: RLS

### 2.1 Policies laut Migrationen

Alle Policies ohne `TO …` gelten für die Rolle `public` (also auch `anon`). Bei `FOR ALL` ohne `WITH CHECK` dient `USING` auch als Check.

| Tabelle | RLS | Policies (Befehl · Rolle · using · with check) | Migration |
|---|---|---|---|
| `profiles` | an | „Users own their profile“ · ALL · public · `auth.uid() = id` · – | 001 |
| `conversations` | an | „Users own their conversations“ · ALL · public · `auth.uid() = user_id` · – | 001 |
| `messages` | an | „Users own their messages“ · ALL · public · `conversation_id IN (select id from conversations where user_id = auth.uid())` · – | 001 |
| `user_memory` | an | „Users own their memory“ · ALL · public · `auth.uid() = user_id` · – | 002 |
| `insights` | an | „Users own their insights“ · ALL · public · `auth.uid() = user_id` · – | 002 |
| `experience_patterns` | an | keine | 003 |
| `coach_reflections` | an | keine | 003 |
| `supervision_logs` | an | keine | 003 |
| `user_feedback` | an | „Users read own feedback“ · SELECT · public · `auth.uid() = user_id` ; „Users insert own feedback“ · INSERT · public · – · `auth.uid() = user_id` | 003 |
| `app_logs` | an | „Users can insert own logs“ · INSERT · public · – · `auth.uid() = user_id OR user_id IS NULL` ← **anon darf schreiben** | 005 |
| `pattern_references` | an | „Users own their pattern references“ · ALL · public · `auth.uid() = user_id` · – | 006 |
| `coach_file_entries` | an | „Users own their coach file“ · ALL · public · `auth.uid() = user_id` · – | 008 |
| `coachee_profile` | an | „Users own their coachee profile“ · ALL · public · `auth.uid() = user_id` · – | 008 |
| `session_notes` | an | „Users own their session notes“ · ALL · public · `auth.uid() = user_id` · – | 008 |
| `resonance_map` | an | „Users own their resonance map“ · ALL · public · `auth.uid() = user_id` · – | 009 |
| `invite_codes` | an | keine | 010 |
| `inner_voices` | an | „Users manage their own inner voices“ · ALL · public · `auth.uid() = user_id` · `auth.uid() = user_id` | 015 |
| `crisis_events` | an | „service_role only“ · ALL · public · `false` · `false` | 021 |
| `feedback_surveys` | an | „Users insert own survey“ · INSERT · public · – · `auth.uid() = user_id` ; „Users read own survey“ · SELECT · public · `auth.uid() = user_id` | 022 |
| View `feedback_survey_scores` | (View, kein RLS) | **kein `security_invoker`** – siehe K-5 | 022 |
| `error_logs` | – | in 005 gedroppt | 004/005 |

Explizite Grants: `014` (alles an service_role + Default-Privilegien für service_role), `015` (`inner_voices` → authenticated: S/I/U/D), `016` (profiles → service_role), `021` (crisis_events → service_role), `022` (feedback_surveys → authenticated: S/I; View → service_role). Für alle anderen Tabellen hängen die Rechte von anon/authenticated an den Supabase-Standard-Default-Privilegien (typischerweise `ALL` an anon + authenticated) → Audit **C** und **L**.

Funktionen:

| Funktion | Typ | search_path | Execute-Rechte laut Code | Befund |
|---|---|---|---|---|
| `handle_new_user()` | SECURITY DEFINER, Trigger | **nicht gesetzt** | Default (PUBLIC) | Advisor-Warnung; als Trigger-Funktion nicht per RPC aufrufbar |
| `match_experiences(vector, float, int)` | INVOKER, sql | nicht gesetzt | Default (PUBLIC) | RLS blockt Client → harmlos, trotzdem `revoke` |
| `redeem_invite_code(text, uuid)` | **SECURITY DEFINER** | `public` (nicht `''`) | **Default (PUBLIC = anon + authenticated)** | **K-2** |
| `touch_conversation_updated_at()` | INVOKER, Trigger | nicht gesetzt | Default | ok, `search_path` ergänzen |
| `get_conversation_history()` | INVOKER, sql | nicht gesetzt | Default + `authenticated` | ok (Client nutzt sie), `search_path` ergänzen, anon entziehen |

### 2.2 Tatsächliche Client-Nutzung (Frontend)

| Tabelle | select | insert | update | delete | upsert | Fundstellen |
|---|---|---|---|---|---|---|
| `profiles` | ✅ | (via upsert) | ✅ | – | ✅ | `useAuth.js:75, 95, 132`; `WelcomeScreen.jsx:13`; `CoachScreen.jsx:200, 222` |
| `conversations` | ✅ (count) | ✅ | ✅ (`key_insight`, `memory_updated`) | – | – | `useChat.js:58, 204, 304, 437`; `CoachScreen.jsx:347`; `HomeScreen.jsx:72` |
| `messages` | ✅ | ✅ | – | – | – | `useChat.js:169, 273, 370, 396, 444, 467, 592` |
| `insights` | ✅ | ✅ | ✅ (`is_pinned`) | ✅ | – | `BottomNav.jsx:15`; `ProfileScreen.jsx:28`; `MirrorScreen.jsx:487, 499, 504`; `CoachScreen.jsx:364` |
| `inner_voices` | ✅ | – | ✅ (`status`, `name`, `named_at`, `dismissed_at`) | – | – | `StimmenScreen.jsx:118, 124, 138`; `CoachScreen.jsx:389, 394` |
| `coach_file_entries` | ✅ | – | – | – | – | `MirrorScreen.jsx:235`; `StimmenScreen.jsx:131` |
| `coachee_profile` | ✅ | – | – | – | – | `MirrorScreen.jsx:241` |
| `session_notes` | ✅ (+ via RPC) | – | – | – | – | `MirrorScreen.jsx:246`; `get_conversation_history` |
| `pattern_references` | ✅ | – | – | – | – | `AusGespraechen.jsx:18`; `MusterDetail.jsx:134`; `VorstehenScreen.jsx:59` |
| `user_memory` | ✅ | (via upsert) | (via upsert) | – | ✅ | `useMemory.js:13, 36` |
| `user_feedback` | – | ✅ | – | – | – | `ProfileScreen.jsx:280` |
| `feedback_surveys` | – | ✅ | – | – | – | `BetaSurveyScreen.jsx:56` |
| `app_logs` | – | ✅ | – | – | – | `src/lib/logger.ts:27` |
| `resonance_map`, `experience_patterns`, `coach_reflections`, `supervision_logs`, `invite_codes`, `crisis_events` | – | – | – | – | – | kein Client-Zugriff |
| RPC `get_conversation_history` | | | | | | `HistoryScreen.jsx:22` |
| Realtime (`.channel(`) | | | | | | **keine Nutzung** → alle Tabellen können aus `supabase_realtime` raus |
| Öffentliche Lesezugriffe ohne Login | | | | | | **keine** → `revoke all … from anon` ist unkritisch |

Abweichungen zur Soll-Matrix im Handoff (5.2):
- `session_notes` und `coachee_profile`: SELECT wird gebraucht (Spiegel, Verlauf).
- `resonance_map`: keine Client-Rechte.
- `user_feedback`, `feedback_surveys`: nur INSERT (SELECT wird nicht genutzt).
- `profiles`: kein Client-INSERT nötig, wenn der Signup-Upsert entfällt (siehe 1.1).
- `conversations`: Client-UPDATE nur für `key_insight`/`memory_updated` – serverseitige Spalten (`session_counted_at`, `post_processed_*`, `summary`, `open_thread*`) brauchen Schutz (siehe 5.).

---

## 3. S-03: Edge Functions

`verify_jwt` steht laut Handoff im Dashboard aus. Damit ist **jede Function ohne Token-Prüfung im Code öffentlich aufrufbar**.

| Function | Aufrufer-Ermittlung | Identitäts-/Objekt-IDs aus dem Body | Clients | Befund |
|---|---|---|---|---|
| `chat` | `supabase.auth.getUser(token)` ✅ (`chat/index.ts:867-895`) | `conversationId` (ungeprüft, nur für `crisis_events`-Insert per serviceClient, `:1076-1081`); außerdem `memory`, `coachFile`, `ragContext`, `briefing`, **`supervisionNote`**, `wellnessCheck`, `entryContext` fließen ungeprüft in den System-Prompt | `supabase` = service-Key + Nutzer-Token → läuft als `authenticated` (Profil-Limit, inner_voices); `serviceClient` = echtes service_role (crisis_events) | keine Größenlimits; `supervisionNote` wird vom Frontend nie gesendet (BLOCK 5 ist faktisch tot und frei injizierbar → S-12); eigener Inline-Logger statt `_shared/logger.ts` |
| `post-conversation` | **keine** | **`userId`**, `conversationId`, `messages` | nur service_role | **K-1, K-6** |
| `pre-session-briefing` | `getUser(token)` ✅ | keine | service_role, alle Abfragen mit `user.id` ✅ | ok; liefert `resonance_map` an den Client (soll laut Konzept unsichtbar sein → S-12) |
| `rag-search` | **keine** | `firstMessage` (ohne Längenlimit) | service_role | **K-4** |
| `validate-invite-code` | `getUser(token)` ✅ | `code` | service_role → RPC mit `user.id` ✅ | gibt `error.message` der RPC an den Client zurück; Logs fehlen |
| `delete-account` | `getUser(token)` ✅ | keine | service_role, nur `user.id` ✅ | Ergebnisse der Einzel-Deletes ungeprüft (stilles Scheitern); `inner_voices`, `crisis_events`, `feedback_surveys` hängen per FK-Cascade an `auth.users` ✅ |
| `admin-users` | Zwei-Client-Muster ✅ + `is_admin` ✅ | `userId` (Ziel, legitim für Admin) | ✅ | ok; wird durch K-3 aushebelbar (Selbst-Admin) |
| `admin-feedback` | Zwei-Client-Muster ✅ + `is_admin` ✅ | – | ✅ | ok (siehe K-3) |
| `admin-invite-user` | Zwei-Client-Muster ✅ + `is_admin` ✅ | `email`, `displayName`, `sessionLimit` | ✅ | **loggt E-Mail-Adressen** (`:107`, `:151`) |
| `supervision` | **keine** | – | service_role | **K-4.** Aufruf per Cron ist **nicht im Repo**; ob und mit welchem Key → Audit **G**. Mit anon-Key (oder ganz ohne Header) heute auslösbar. |

Frontend-Aufrufe: alle senden `Authorization: Bearer <access_token>` + `apikey` – auch der `keepalive`-Pfad (`CoachScreen.jsx:259-276`, Token frisch über `getSession()`). `post-conversation` schickt zusätzlich `userId` (`CoachScreen.jsx:274`) → entfernen.

---

## 4. S-04: Logs

### 4.1 `app_logs`-Spalten (laut `005_v1_8.sql`)
`id`, `created_at` (NOT NULL), `level`, `source`, `message`, `request_id`, `user_id` (FK → profiles, SET NULL), **`metadata` (jsonb)** ← das ist die JSON-Spalte (Handoff nennt sie `data`), `error_detail` (text), `stack_trace` (text). Bestätigung → Audit **H**.

### 4.2 Schreibt der Frontend-Logger ohne Login?
**Ja.** `src/lib/logger.ts:27-36` schreibt mit `user_id: currentUserId` (= `null` vor dem Login); die Policy erlaubt `user_id IS NULL`, auch für `anon`. Fehler beim Insert werden nur in Dev ausgegeben. Damit kann jeder anonym beliebig viel in `app_logs` schreiben.

### 4.3 Aufrufstellen mit Inhalten

**Edge Functions**

| Fundstelle | Was wird geloggt | Kategorie |
|---|---|---|
| `post-conversation/index.ts:248-252` (`runPrompt`) | **`rawResponsePreview: raw.slice(0, 300)`** (Modellausgabe über das Gespräch) + `error: err.message` (JSON.parse-Fehler enthalten Textausschnitte) | Modellausgabe ❌ |
| `post-conversation/index.ts:437, 439` | `label: update.label` (Akte-Eintrag, z. B. „Rückzug bei Kritik vom Vater“) | Akte ❌ |
| `post-conversation/index.ts:626` | `pattern: patternRow.pattern` | Modellausgabe ❌ |
| `post-conversation/index.ts:600, 718` | `fields: Object.keys(patch)` | nur Schlüssel ✅ |
| `post-conversation/index.ts:731` | `error: message` (z. B. aus `req.json()`) | ok, aber über Netz bereinigen |
| `chat/index.ts:985` | **`raw: text.slice(0, 100)`** (Modellausgabe Memory-Extraktion) | Modellausgabe ❌ |
| `chat/index.ts:1144, 1161` | `Error`-Objekte → `error_detail` + `stack_trace` | ok (Fehlermeldungen der SDKs), über Netz begrenzen |
| `admin-invite-user/index.ts:107, 151` | **`email`, `invitedEmail`** | E-Mail ❌ |
| `crisis_events.excerpt` (`chat/index.ts:1080`) | 300 Zeichen Nutzertext | **kein Log**, sondern bewusst gespeichertes Krisenprotokoll – außerhalb S-04, im Bericht als Datenschutz-Punkt erwähnen |
| `delete-account/index.ts:82, 95` | `console.error` mit Fehlermeldung | ok |

**Frontend**

| Fundstelle | Was wird geloggt | Kategorie |
|---|---|---|
| `src/hooks/useAuth.js:55, 57` | **`code: pendingCode`** (Einladungscode im Klartext) | Geheimnis ❌ |
| `src/hooks/useChat.js:126-127, 536-537` | `body`/`error: errorBody` (Antworttext der Function; heute u. a. `error.message` aus `chat`) | ❌ nur Status loggen |
| `src/screens/coach/CoachScreen.jsx:192` | `topic: entryCtx.topic` (Muster-Label aus festem Katalog) | grenzwertig → entfernen |
| `src/hooks/useChat.js:73-77`, `WellnessCheckScreen.jsx:41-46` | `label` (Wellness-Label aus fester Skala), `score` | ok (keine Freitexte) |
| Supabase-Fehlerobjekte als `data` (z. B. `useAuth.js:80`, `useMemory.js:19, 41`, `useStreak.js:22`) | `message`, `details`, `hint`, `code` – **`details` kann bei Constraint-Fehlern „Failing row contains (…)“ mit kompletter Zeile enthalten** | ❌ → `details`/`hint` ins Redaction-Netz aufnehmen |
| `console.error(...err)` in `useChat.js:178, 280, 377, 600`, `Step4Auth.jsx:55, 76, 80` | nur Browser-Konsole | ok, aber über den Logger leiten |

### 4.4 Altbestand
Bekannte Schlüssel mit Inhalten in `app_logs.metadata`: `rawResponsePreview`, `raw`, `label` (nur bei `source='post-conversation'` und Nachricht `coach_file_entries …`), `pattern`, `email`, `invitedEmail`, `code`, `topic`, `body`, `error` (bei `runPrompt failed`/`API request failed`), `details`. Zählung → Audit **M**. Bereinigung kommt in die app_logs-Migration.

---

## 5. Weitere Befunde (nicht im Handoff erwartet)

1. **Nummerierung:** `022` ist bereits belegt (`022_feedback_survey.sql`). Neue Migrationen: **023** Sitzungszählung · **024** Profil-Schutz · **025** RLS-Härtung · **026** app_logs.
2. **Zählung umgehbar über `conversations`-Spalten:** Mit `consume_session` (Handoff 4.4) könnte der Client beim `insert` in `conversations` selbst `session_counted_at = now()` mitschicken und so nie gezählt werden (RLS erlaubt das Insert). → Ich ergänze in **023** einen Schutz-Trigger auf `conversations`, der für `authenticated`/`anon` `session_counted_at` beim Insert auf `null` zwingt und bei Updates unverändert lässt (ebenso `post_processed_at`, `post_processed_message_count`).
3. **`chat` ohne `conversationId`** im normalen Modus funktioniert heute (z. B. wenn der Conversation-Insert scheitert oder noch läuft). Mit serverseitiger Zählung wäre das ein Umgehungsweg → Vorschlag: im normalen Modus `conversationId` Pflicht (400), siehe offene Frage 2.
4. **`extractMemory`- und `howtoMode`-Requests** sind freie LLM-Zugänge mit beliebigem Inhalt (keine Zählung). Heute blockiert der Limit-Check sie trotzdem, sobald das Limit erreicht ist → siehe offene Frage 3.
5. **Funktionaler Bug (kein Security-Thema):** `post-conversation` lädt `coach_file_entries` ohne `voice_id` (`:340-344`), filtert danach aber auf `!e.voice_id` (`:498`) → bereits verknüpfte Einträge werden immer wieder geclustert. Nicht Teil von Paket A, nur gemeldet.
6. **Doku-Abweichungen:** CLAUDE.md nennt `plan`-Werte und `invite_codes` korrekt, aber weder `is_admin`/`session_limit`/`is_beta_tester`/`invited_*` noch `inner_voices`, `crisis_events`, `feedback_surveys`. CLAUDE.md sagt „alle Edge Functions verwenden `_shared/logger.ts`“ – `chat` hat einen eigenen Inline-Logger, `rag-search`, `supervision`, `validate-invite-code`, `pre-session-briefing`, `delete-account` loggen gar nicht strukturiert. CLAUDE.md nennt Arbeitsverzeichnis `f:/…`, tatsächlich `c:/Users/…/OneDrive/…`. `docs/architecture.md` (alt, 468 Zeilen) existiert parallel zu `ARCHITECTURE.md`.
7. **`supervision`** speist Nutzerfeedback (`user_feedback.content`) ungefiltert in einen Prompt – Prompt-Injection-Fläche. `supervision_logs.improvement_recs` wird vom Frontend nie an `chat` übergeben (BLOCK 5 faktisch inaktiv).
8. **`delete-account`** prüft die Ergebnisse der Einzel-Deletes nicht; `app_logs`-Zeilen bleiben mit `user_id = null` erhalten (FK `SET NULL`) – mit 30-Tage-Löschfrist akzeptabel.

---

## 6. Offene Fragen an Jerome (vor Phase 2)

1. **Zählzeitpunkt.** Serverseitig kann `chat` nur zählen, wenn es aufgerufen wird. Vorschlag: Eine Konversation zählt beim **ersten `chat`-Aufruf mit dieser `conversationId`**. Folgen:
   - Wellness, Briefing, Entry-Kontext: zählen wie heute sofort beim Start.
   - Standard-Start: zählt erst bei der **ersten Nutzer-Nachricht** (heute schon beim Öffnen des Tabs). Wer den Tab nur öffnet, verbraucht kein Gespräch mehr.
   - Button „Neues Gespräch“: zählt künftig (schließt die Lücke K-7).
   - Fortsetzen: zählt nicht (über `session_counted_at` abgedeckt – bestehende Gespräche werden in der Migration als gezählt markiert).
   Einverstanden?
2. **`conversationId` Pflicht** im normalen Chat-Modus (sonst 400)? Empfehlung: ja.
3. **Howto-FAQ und `extractMemory` bei erreichtem Limit:** weiter blockieren (wie heute) oder durchlassen? Empfehlung: Howto durchlassen (Hilfe-Seite soll erreichbar bleiben, mit Längenlimit), `extractMemory` durchlassen (betrifft nur bereits geführte Gespräche).
4. **Krisensignal bei erreichtem Limit** (aus dem Handoff, nur benannt): Soll eine Nachricht mit akutem Krisensignal auch bei erreichtem Limit die Krisenantwort bekommen? Heute blockiert das Limit (429), bevor die Krisenerkennung läuft.
5. **`.env.local` und ZIP-Archive** aus dem Repo entfernen (`git rm --cached`, lokale Dateien bleiben)? Empfehlung: ja, im Branch mit erledigen.
