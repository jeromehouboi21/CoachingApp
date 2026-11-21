# Paket R „Einstiegs-Rundgang“ – Bestandsaufnahme (Phase 0)

**Stand:** 21.11.2026 · Branch `feature/einstiegs-rundgang` von `main` (`0689f8e3` + Doku) · **Handoff:** `docs/Neues_Zielbild/handoff-einstiegs-rundgang.md` v1
**Ergebnis kurz:** Bauen lässt es sich wie geplant, mit **sieben Abweichungen** vom Handoff (Abschnitt 11). Die wichtigsten:
- Heute liegt auf `/home`.
- Die RPC braucht die MFA-Prüfung und `search_path = ''`.
- Die Monitoring-Regeln brauchen `origin: 'client'`.
- Es gibt noch kein Test-Werkzeug; Vorschlag ist der eingebaute Test-Runner von Node, ohne neues Paket.

---

## 1. Heute-Screen

- **Route:** `/home` → `HomeScreen` (`src/screens/home/HomeScreen.jsx`), in der Haupt-`AppShell`-Gruppe von `src/App.jsx` (Z. 178 ff., mit `ProtectedRoute`).
- **`/` leitet weiter:** `/` führt angemeldet per `<Navigate to="/home" replace />` nach Heute. Ebenso Login (`AuthScreen.jsx:45, 54` → `navigate('/home')`) und der Start der installierten App (`start_url: '/'`).
- **Zustand:** `chooseTodayState(conversations, insights)` in `src/lib/todayState.js:19`, Reihenfolge A → D → B → C2 → C.
- **Geladene Daten** (`HomeScreen.jsx:36–60`), parallel:
  - `supabase.rpc('get_conversation_history')`
  - eigene `insights` (bis 300)

  Daraus entstehen `today` (Zustand) und `conversationCount` (Z. 56, Paket P).
- **Phase:** `useAccessState()` wird in Heute schon aufgerufen (Z. 67, Karte „Ende des Kennenlernens“).

## 2. „Geführtes Gespräch“

- **Definition** (`todayState.js:20`): ein Eintrag aus `get_conversation_history` mit `message_count >= 3`.
- **Was gezählt wird:** `message_count` = alle Nachrichten des Gesprächs (Nutzer und Begleiter, `020_v3_2_conversation_history.sql:52`). Drei Nachrichten heißen praktisch Eröffnung, eine Nutzernachricht und eine Antwort.
- **Zähler vorhanden:** `HomeScreen.jsx:56`, `setConversationCount(... .filter(c => Number(c.message_count) >= 3).length)`. **Keine neue Abfrage nötig.**
- **Ladefehler:** Scheitert das Laden, bleibt `conversationCount` bei 0 und Heute zeigt Zustand C. **Für den Rundgang:** bei einem Ladefehler nicht anzeigen, sonst sähen langjährige Nutzer ihn. Der Hook braucht dafür ein Signal „geladen“ bzw. „Fehler“.

## 3. `access_phase`

- **Quelle:** RPC `get_access_state()` (Migration 038, seit 042 erweitert), mit MFA-Prüfung.
- **Frontend:** `useAccessState()` in `src/lib/accessState.js:22` → `{ access, loading, error, refresh }`. Die Phase steht in `access.phase` (`kennenlernen` · `ruhemodus` · `begleitung`).
- **Zahl „drei“** (Text Schritt 5): `access.starts_limit` (= `session_limit`, `null` ohne Grenze). Bei `kennenlernen` gibt es immer eine Zahl, Standard 3.

## 4. Reihenfolge beim Start

| Ebene | Sperre | Wirkung auf den Rundgang |
|---|---|---|
| `src/App.jsx:73` | `loading` → `LoadingScreen` | Heute wird gar nicht gerendert |
| `App.jsx:77` | `mfaGate === 'required'` → `MfaChallengeScreen` | Heute wird gar nicht gerendert |
| `App.jsx:89` | `!profileReady` → `LoadingScreen` | Heute wird gar nicht gerendert |
| `App.jsx:93` | Profil fehlt → `ProfileMissingScreen` | Heute wird gar nicht gerendert |
| `App.jsx:105–125` | Zustimmung nicht v2.0 → `ConsentGateScreen` (vollflächig) | Heute wird gar nicht gerendert |
| `src/components/layout/AppShell.jsx:14` | **`AgeConfirmSheet`** (18+ für Bestandsnutzer, `z-[60]`), solange `profile.age_confirmed_at` fehlt | **Einzige Sperre, die über Heute liegt.** Sie zählt als `blockingGateOpen`. Der Rundgang wartet, bis sie bestätigt oder aufgeschoben ist. |
| `src/main.jsx:27–28` | `UpdateBanner` (`z-[80]`, oben), `OfflineBar` (`z-[75]`, unten) | Keine Sperre. Beide liegen über dem Rundgang. Der Rundgang bekommt `z-[70]`, damit der Hinweis auf eine neue Version erreichbar bleibt. |

Die Re-Consent-Prüfung `checkConsent()` aus dem Handoff ist seit Paket K W3 ein **vollflächiger Screen vor allen Routen**, kein Sheet über Heute. Sie ist damit oben schon abgedeckt.

## 5. Profil

- **Datei:** `src/screens/profile/ProfileScreen.jsx`.
- **Gliederung aus Paket K vorhanden:** `ProfileSection title="Dein Begleiter"` (Z. 231) mit Profil bearbeiten · **Wie es funktioniert** (Z. 234) · Startbildschirm · Begleitung · Beta-Einträge. Danach folgen „Konto & Sicherheit“ und „Rechtliches“.
- **`MenuList`** (Z. 63) kennt nur `{ icon, label, action }`, **keine zweite Zeile**. Für „Die fünf Einstiegs-Screens noch mal ansehen“ braucht `MenuList` ein optionales Feld `hint` (kleine Erweiterung, andere Einträge unverändert) **oder** der Eintrag kommt ohne zweite Zeile aus. → **Frage an Jerome**

## 6. Schutz-Trigger, RPC-Muster, Migrationsnummer

- **Trigger:** `trg_protect_profile_privileges`, Funktion `public.protect_profile_privileges()`, letzte Fassung `040_k_consent_v2.sql:50`.
- **Prüft `current_user`:** `if current_user not in ('authenticated', 'anon') then return new;` (Z. 56). **Eine `SECURITY DEFINER`-Funktion** (Eigentümer `postgres`) wird **nicht** blockiert. Der Trigger braucht keine Änderung.
- **Sperrt eine Liste:** `id`, `is_admin`, `is_beta_tester`, `plan`, `session_limit`, `sessions_used_this_month`, `trial_sessions_used`, `invited_*`, `created_at`, `learning_opt_in*`, `age_confirmed_at`, `consent_*`, `coaching_agreement_*` (Verstoß → `profile_privileged_columns_are_server_only`).
- **Folge:** `tour_dismissed_at` steht nicht in der Liste. Der Client **könnte** die Spalte auch direkt per `PATCH /profiles` setzen (RLS: eigene Zeile, MFA-Policy). Unkritisch, denn das betrifft nur das eigene Konto und einen harmlosen Zeitstempel. Die RPC bleibt trotzdem der vorgesehene Weg (R-5). Angriffstest R3 prüft weiter, dass `plan` gesperrt bleibt.
- **RPC-Muster des Projekts** (`set_learning_opt_in`, `confirm_age`):
  - `security definer`, `set search_path = ''`, schema-qualifizierte Namen
  - **zuerst `public.mfa_satisfied()`** (S-06b, Pflicht für jede Client-RPC)
  - `revoke … from public, anon`, `grant … to authenticated`
  - Fehler mit `errcode '42501'`
- **Nächste freie Migrationsnummer:** **043** (letzte: `042_z_billing.sql`). T1 (Buch) bekommt danach 044.

## 7. Icons und Tab-Leiste

- `src/components/layout/BottomNav.jsx:2`: `lucide-react` mit **`Sun`** (Heute), **`MessageCircle`** (Gespräch), **`Sparkles`** (Spiegel); aktiv mit `strokeWidth 2`, sonst 1.5, Größe 22.
- `Compass` gibt es in `lucide-react` (für den Profil-Eintrag), kein Inline-SVG nötig.

## 8. Sheets und Modals

- **Bestehend:** `RestModeSheet`, `InstallSheet`, `AgeConfirmSheet`, `LegalSheet`, `DataExportSheet`, `FileEntrySheet` u. a.
  - Bauweise: `createPortal(…, document.body)`, `role="dialog"`, `aria-modal="true"`, Hintergrund-Klick schließt.
- **Fehlt bisher:** Fokusfalle, Esc-Taste und Scroll-Sperre hat **keines**. Eine wiederverwendbare Komponente gibt es nicht.
- **Vorschlag:** Fokusfalle, Esc und Scroll-Sperre minimal im `WelcomeTour` selbst (ein `useEffect`, ohne Paket). Die bestehenden Sheets bleiben unverändert (kein Scope).

## 9. Frontend-Logger

- `src/lib/logger.ts:74` `createLogger(source)` → `logger.info(code, data)` / `.warn` / `.error`. Eine Funktion `logClientError` gibt es **nicht**.
- **Schreiben:** nur angemeldet (`setLoggerUserId`) in `app_logs`. Ein Trigger setzt `origin = 'client'` (034), und die Zeile trägt wie jeder Client-Log die `user_id`. In `data` stehen keine IDs.
- **Monitoring** (`_shared/monitorRules.ts`): zählt **standardmäßig nur `origin = 'server'`**. Client-Codes brauchen `origin: 'client'` wie `pwa_client_error`/`pwa_usage` (Z. 60–61). Jede Regel hat zusätzlich ein `label`. **Die Regeln im Handoff 4.7 würden ohne `origin: 'client'` nie zählen.**

## 10. Tests

- **Es gibt keine Unit-Tests und keinen Test-Runner:** kein `npm test`, kein vitest/jest in `package.json`, keine `*.test.*`-Dateien, auch nicht für `todayState.js`.
- **Vorschlag ohne neues Paket:**
  - `package.json` ist `"type": "module"`, Node ist v24, `tourState.js` ist eine reine Funktion ohne Imports.
  - Damit reicht der **eingebaute Test-Runner von Node**: `src/lib/tourState.test.js` mit `node:test` und `node:assert`, Script `"test": "node --test src/lib/"`.
  - Keine neue Abhängigkeit, und `npm test` läuft lokal und in jeder CI.

## 11. Abweichungen vom Handoff (Vorschlag, zur Bestätigung in J-R1)

| # | Handoff | Befund | Vorschlag |
|---|---|---|---|
| A1 | „Heute (`/`)“, `startedOnToday` = Startroute `/` | Heute ist `/home`; `/` leitet sofort weiter | `startedOnToday`, wenn die **erste Route in der App-Shell nach dem Login** `/home` ist (`/` wird vorher umgeleitet) |
| A2 | RPC mit `set search_path = public, pg_temp`, ohne MFA-Prüfung, `errcode '28000'` | Projektregel: `search_path = ''`, zuerst `public.mfa_satisfied()`, `42501` | RPC nach dem Muster von `confirm_age` / `set_learning_opt_in`; sonst wie im Handoff (`coalesce`, nur diese Spalte) |
| A3 | `logClientError('tour_dismiss_failed')` | Gibt es nicht | `logger.warn('tour_dismiss_failed', { code })` über `createLogger('WelcomeTour')` |
| A4 | Regeln in `monitorRules.ts` ohne `origin`/`label` | Würden nie zählen | Beide Regeln mit `origin: 'client'` und `label` |
| A5 | `npm test` mit `tourState.test.js` | Kein Test-Runner | `node --test` (eingebaut), Script `test` neu, keine Abhängigkeit |
| A6 | Re-Consent-Sheet als Sperre | Re-Consent ist ein Vollbild-Screen vor der App | `blockingGateOpen` = **`AgeConfirmSheet` offen**; MFA und Re-Consent schließen Heute ohnehin aus |
| A7 | Profil-Eintrag mit Unterzeile | `MenuList` hat keine Unterzeile | **Jerome:** `MenuList` um ein optionales `hint` erweitern (zweite Zeile nur hier) **oder** Eintrag einzeilig „Rundgang durch die App“ |

**Weitere Punkte für die Texte (Abschnitt 5 des Handoffs):**

- **Spracheingabe ist aus** (`VOICE_MISTRAL_ENABLED = false`, `src/content/legalTexts.js`):
  - Schritt 3 nimmt deshalb die Fassung „Hier schreibst du mit deinem Begleiter …“.
  - **Vorschlag:** In der Grafik von Schritt 3 erscheint das Mikrofon in der Eingabezeile ebenfalls nur bei eingeschalteter Spracheingabe, sonst würde sie etwas zeigen, das es nicht gibt.
- **U5a ist live:** Der ✦-Satz in Schritt 4 bleibt.
- **Kennenlern-Satz:** Die Zahl kommt aus `access.starts_limit`.
- **Ladefehler auf Heute:** Kann Heute die Gespräche nicht laden, erscheint der Rundgang **nicht** (Punkt 2).

**Nichts davon braucht eine neue Abhängigkeit.** Der Schutz-Trigger bleibt unverändert. Der Datenexport übernimmt `profiles` vollständig (`export-my-data`, Gruppe `konto`), `tour_dismissed_at` ist damit automatisch dabei, und es gibt keine Änderung am Export.

## 12. Design-Canvas

Das Canvas hat sechs Artboards: `Main` (Schritt 1), `Heute`, `Gespraech`, `Spiegel`, `Kreislauf` und `Profil` (`project/*.dc.html`). Nach J-R1 baue ich die Grafiken daraus nach. Ich lese dabei nur, am Canvas ändere ich nichts.
