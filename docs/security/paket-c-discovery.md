# Security-Paket C – Bestandsaufnahme (Phase 0)

> Stand 19.11.2026 · Branch `security/paket-c-c1` (von `main` @ df10d927) · Grundlage: `handoff-security-paket-c.md` v2, Lösungsdesign C v2
> Letzte Migration im Ordner: **033** → Paket C nutzt wie geplant 034 (C-2), 035 (C-3), 036 (C-5).

Fünf Befunde ändern das Design. Sie stehen gesammelt in Abschnitt 7.

---

## 1. S-05 (Code-Teil)

| Frage | Befund |
|---|---|
| `package.json` Scripts | `dev`, `build` (`vite build`), `preview`, `security:test`, `security:deletion-test`. **Kein `postbuild`.** |
| `vite.config.js` `build.sourcemap` | Kein `build`-Block → Vite-Standard `sourcemap: false`. Es entstehen keine `.map`-Dateien in `dist/`. |
| `.gitignore` | `.env`, `.env.local`, `.env.*.local`, `*.local` (deckt `.env.security.local` doppelt ab), `docs/security/*-audit-result.md`, `supabase/functions/**/.env`, `dist/`. |
| `.gitattributes` | Vorhanden, nur `* text=auto`. Die `export-ignore`-Zeilen kommen in C-1 dazu. |
| Eingecheckt in `docs/security/` | `friedensstifter-security-paket-b-design-v1.md`, `handoff-security-paket-b.md`, `paket-a-abschlussbericht.md`, `paket-a-discovery.md`, `paket-b-abschlussbericht.md`, `paket-b-discovery.md`, `supervision-prompt.md`. Keine Audit-Ergebnisse. Die Paket-C-Dokumente fehlen noch (J-C1 Punkt 1). |

## 2. S-09 (Region)

**Function-Aufrufe im Frontend.** Alle laufen über `fetch`. `supabase.functions.invoke` wird **nirgends** verwendet.

| Datei:Zeile | Function |
|---|---|
| `src/hooks/useChat.js:9` (`CHAT_URL`) | `chat` (Streaming) |
| `src/screens/howto/HowItWorksScreen.jsx:44` | `chat` (Howto-FAQ) |
| `src/screens/coach/CoachScreen.jsx:175` | `pre-session-briefing` |
| `src/screens/coach/CoachScreen.jsx:258` | `post-conversation` (`keepalive: true`) |
| `src/hooks/useAuth.js:43` | `validate-invite-code` |
| `src/screens/onboarding/Step4Auth.jsx:58` | `validate-invite-code` |
| `src/screens/profile/ProfileScreen.jsx:49` | `delete-account` |
| `src/screens/admin/AdminUsersScreen.jsx:40, 91, 121` | `admin-feedback`/`admin-users`, `admin-users`, `admin-invite-user` |

Dazu kommen `scripts/security/attack-test.mjs:122` und `deletion-test.mjs:47`. Beide bekommen den Header ebenfalls, damit Test #32 aussagekräftig ist.

**Header heute.** Alle Aufrufe schicken `apikey` (anon-Key) mit. `functionHeaders()` übernimmt das, damit sich am Gateway-Verhalten nichts ändert.

**CORS.** Die Header sind **je Function** definiert, als 10 Kopien von `const CORS_HEADERS` (z. B. `chat/index.ts:1032`, `post-conversation/index.ts:284`). Die Methoden unterscheiden sich je Function. In C-1 kommt das nach `_shared/cors.ts` (`corsHeaders(methods)`), und `x-region` wird ergänzt.
- Nebenbefund: überall gilt `Access-Control-Allow-Origin: '*'`. Das ist **kein akutes Risiko**, weil die Authentifizierung per Bearer-Token läuft und nicht per Cookie. Ich lasse es unverändert. Eine Einschränkung auf `app.friedensstifter.coach` wäre ein kleiner Folgeschritt.

**SDK.** Installiert ist `@supabase/supabase-js` 2.99.2. `FunctionRegion.EuCentral1` ist vorhanden; `INVOKE_REGION` wird für spätere `invoke`-Aufrufe vorgehalten.

## 3. S-22 (Monitoring)

**`app_logs`-Spalten** (`005_v1_8.sql:7`): `level`, `source`, `message` (Code), `request_id`, `user_id`, `metadata`, `error_detail`, `stack_trace`, `created_at`. Logs werden nach 30 Tagen gelöscht (026). Für die 7-Tage-Fenster reicht das.

**Log-Codes heute**

| Ereignis | Heute geloggt als | Stelle | Anpassung in C-2 |
|---|---|---|---|
| Rate-Limit-Ausfall | `consume_rate_limits failed` (error, `{ code, failOpen }`) | `_shared/rateLimit.ts:50` | Code wird **`rate_limit_db_error`** (Metadaten bleiben) |
| Kontolöschung unvollständig | nur `delete failed` je Tabelle; `delete_incomplete` ist nur Antwortcode | `delete-account/index.ts:41, 65` | zusätzlich `logger.error('delete_incomplete', { failedSteps })` |
| Auth-Löschung | `Failed to delete auth user`; `auth_delete_failed` nur Antwortcode | `delete-account/index.ts:72` | Code wird **`auth_delete_failed`** |
| `mfa_verify_failed` | **nur im Frontend** (Client-Logger → `app_logs`) | `src/hooks/useAdminMfa.js:62` | siehe Befund 3 |
| `mfa_required` (Admin) | `warn` | `admin-users:30`, `admin-feedback:28`, `admin-invite-user:31` | – |
| `userId mismatch` | `warn` | `post-conversation/index.ts:315` | – |
| `supervision_rejected` | `warn` mit `reasons` als Text | `supervision/index.ts:123` | – |
| `retention_applied` | SQL-Insert, `source = 'retention'` | `033_s15_cascade_and_retention.sql:76` | – |
| Prüfschritt technisch ausgefallen | `learning_rejected` mit Grund `review_api_failed`/`review_parse_failed` | `post-conversation:687`, Gründe aus `_shared/learning.ts:52, 65`; supervision analog in `supervision_rejected` | zusätzlich `learning_review_failed` (post-conversation **und** supervision) |
| `assistant_insert_failed` | `error` | `chat/index.ts:1530` | – |
| `message_insert_failed` | geloggt nur als **`user_message_insert_failed`** (`chat:1355, 1366`); die Würfe in `chat:1196, 1205, 1274` (Eröffnung, Extraktion) loggen nichts | `chat/index.ts` | Regel hört auf `user_message_insert_failed`; die drei stillen Stellen bekommen einen Log mit demselben Code |
| `legacy_format`, `learning_entry_saved` | info | `chat:1169, 1225`, `post-conversation:321, 704` | – |

**`errorResponse()` loggt 401/403 nicht** (`_shared/auth.ts:152`). In C-2 kommt dort `auth_rejected` mit `{ status, code }` dazu, ohne Body und ohne Header. Weil `errorResponse` keinen Logger bekommt, nutzt es einen eigenen `createLogger('auth')`.

**Cron-URL.** Der `weekly-supervision`-Job (`023_session_counting.sql:134`) nutzt die feste URL `https://dpvqysabgycdjawkdrah.supabase.co/functions/v1/supervision`. `security-monitor` wird genauso gebildet.

**Schalter.** Laut meinem Stand aus Paket B hast du am 19.11. **beide** Schalter gesetzt: `SUPERVISION_IN_PROMPT=1` und `RAG_LEARNING_ENABLED=1`. Bitte in J-C1 im Dashboard bestätigen; die Doku korrigiere ich danach in C-2.

## 4. S-11 (Datenschutz-Korrekturen)

| Frage | Befund |
|---|---|
| Feedback-Modal | **inline in `src/screens/profile/ProfileScreen.jsx:284`** (Beta-Feedback). Insert in `user_feedback` mit `consent_given: true` **fest verdrahtet**, `feedback_type: 'beta'`. Bei Fehler nur `console.error`, ohne sichtbaren Hinweis. |
| Zweiter Feedback-Weg | `src/screens/feedback/BetaSurveyScreen.jsx:56`: Fragebogen → `feedback_surveys`. Zeigt Fehler korrekt an. |
| `user_feedback.consent_given` | `DEFAULT TRUE` (`003_v1_4.sql:66`) |
| `feedback_surveys` Einwilligungsspalte | **keine** (`022_feedback_survey.sql:5`), siehe Befund 4 |
| Insert-Policies | `user_feedback_insert_own`, `feedback_surveys_insert_own` (`025_rls_hardening.sql:147, 149`) |
| `handle_new_user` | aktuelle Fassung in `027_signup_consent_and_limit.sql`; nennt `consent_ip` **nicht** |
| Schutz-Trigger | aktuelle Fassung in `032_s13_learning_base.sql:74`. `consent_ip` steht im INSERT-Zweig (`:93`) und in der UPDATE-Prüfung (`:109`), zum Entfernen in 035. Ausnahme für `current_user not in ('authenticated','anon')` → `handle_new_user` (SECURITY DEFINER) darf `age_confirmed_at` setzen. |
| `consent_ip` sonst | Weder Frontend noch Functions noch `deletion-check.sql` noch die Testskripte lesen oder schreiben die Spalte. Sie steht nur in den Migrationen 011, 024, 027, 032. Entfernen ist sicher. |
| Registrierung | `src/screens/onboarding/Step4Auth.jsx:43` `signUp(email, password, undefined, { … })`; Button-Sperre `:236` mit `consentPrivacy`/`consentSensitive` → dort kommt `consentAge` dazu |
| Einladung | `src/screens/onboarding/OnboardingFlow.jsx:28` `isInvited = user.invited_at \|\| profile.invited_at` |
| Mikrofon | `src/components/coach/ChatInput.jsx:19` (`toggle` aus `useVoiceInput`), Hook `src/hooks/useVoiceInput.js` |

## 5. S-16 (Export)

**Tabellen mit Personenbezug.** Die vollständige Liste liefert Abfrage F im Audit. Aus den Migrationen erwartet:
- **über `user_id`:** profiles (über `id`), conversations, insights, user_memory, coach_file_entries, coachee_profile, session_notes, resonance_map, pattern_references, inner_voices, crisis_events, user_feedback, feedback_surveys, app_logs, rate_limit_counters
- **über `conversation_id`:** messages, coach_reflections, conversation_context
- **über `source_user_id`:** experience_patterns
- **Abgleich:** `deletion-check.sql` erkennt die Bezugsspalten automatisch über `information_schema`. Eine neue Tabelle wie `mfa_recovery_codes` (`user_id`) ist damit ohne Änderung in der Prüfung.

**`max_rows`.** Steht nicht in `supabase/config.toml`, es gilt also der Projektwert, Standard 1000 (Dashboard → Project Settings → API → Max rows). Der Export liest ohnehin seitenweise à 1000 Zeilen.

## 6. S-06b (MFA für alle)

| Frage | Befund |
|---|---|
| `admin.auth.getUser(token).user.factors` | Der `User`-Typ von supabase-js hat `factors?: Factor[]` mit `status`, und GoTrue liefert das Feld mit. Ich prüfe es in C-5 trotzdem zur Laufzeit; ohne Feld greift der Fallback `admin.auth.admin.mfa.listFactors({ userId })`. |
| Client-RPCs | `set_learning_opt_in` (`LearningConsentCard.jsx:35`, SECURITY DEFINER), `get_conversation_history` (`HistoryScreen.jsx:22`, INVOKER). Ab C-3 kommt `confirm_age` dazu. Die vollständige Rechte-Liste liefert Audit E. |
| Profil-Laden | `src/hooks/useAuth.js:75` `loadProfile` mit `.single()`. Bei 0 Zeilen → Fehler PGRST116, wird geloggt, `profile = null`. **`ProtectedRoute` (`src/App.jsx:47`) leitet dann wegen `checkCoachingAgreement(null) !== 'valid'` nach `/onboarding` weiter.** Das ist genau die Stolperstelle aus dem Design (4.6); die Code-Abfrage kommt deshalb vor dem Profil-Laden. |
| Admin-MFA heute | `src/hooks/useAdminMfa.js` (enroll, challengeAndVerify, listFactors), `AdminMfaScreen.jsx`. Beides sind die Bausteine für `src/components/mfa/*`. |

---

## 7. Befunde, die das Design ändern

1. **Clients können beliebige Log-Codes schreiben.** Die Policy `app_logs_insert_own` (026) erlaubt angemeldeten Nutzern Inserts mit eigener `user_id` und frei wählbarer `message`. Jemand könnte so absichtlich Fehlalarme auslösen, z. B. 50× `userId mismatch`. Echte Alarme unterdrücken kann er nicht.
   - **Vorschlag für 034:** neue Spalte `app_logs.origin` (`'server' | 'client'`). Ein BEFORE-INSERT-Trigger setzt sie nach `current_user`, wie es der Schutz-Trigger schon tut, und lässt sich vom Client nicht fälschen.
   - `security_log_counts` zählt dann je Regel nur die passende Herkunft. Alle Regeln zählen `server`; nur `mfa_verify_failed` zählt `client`, weil es diesen Code nur dort gibt.
2. **Fünf Codes aus dem Monitoring gibt es so noch nicht.** Betroffen sind `rate_limit_db_error`, `delete_incomplete`, `auth_delete_failed`, `message_insert_failed` und `auth_rejected` (siehe Tabelle in Abschnitt 3). Ich ergänze sie in C-2 und trage den Code für den Rate-Limit-Ausfall in `monitorRules.ts` ein.
3. **`mfa_verify_failed` sieht nur Fehlversuche über die App-Oberfläche.** Wer Codes direkt gegen die Supabase-Auth-API rät, hinterlässt keine Spur in `app_logs`.
   - Dagegen schützt das eingebaute Rate-Limit von Supabase Auth für MFA-Verifikationen (Dashboard → Authentication → Rate Limits).
   - Der Alarm bleibt sinnvoll, ist aber kein vollständiger Schutz. Das kommt in den Notfallplan.
4. **`feedback_surveys` hat keine Einwilligungsspalte.** Der Fragebogen enthält Freitext-Antworten und gehört deshalb wie `user_feedback` unter die Einwilligungspflicht.
   - **Vorschlag für 035:** `feedback_surveys.consent_given boolean not null default false` und eine Insert-Policy mit `consent_given = true`.
   - Im Fragebogen kommt dasselbe Häkchen wie im Feedback-Modal dazu.
   - Bestehende Zeilen bekommen `false`, laufen über die S-15-Frist aus und werden im Bericht gezählt.
5. **Das Feedback-Modal verschweigt Fehler.** Bei einem Fehler bleibt nur `console.error(error.message)`. In C-3 kommt ein sichtbarer Hinweis dazu, und `error.message` fällt weg.
