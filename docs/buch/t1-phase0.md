# T1 Buch-Seite – Phase 0 (Restfragen)

**Stand:** 21.11.2026 · Branch `feature/t1-buch-seite` von `main` (`4b33d14d`, nach Paket R) + Merge von `docs/b7-seitentext-freigegeben` (Freigabe B-7, Bestandsaufnahme T1)
**Handoff:** `docs/Neues_Zielbild/handoff-t1-buch-seite.md` v1
**Ergebnis kurz:** Bauen geht wie geplant. Abweichungen siehe Abschnitt 11, die wichtigste: **Migration 044** (043 ist seit Paket R belegt).

---

## 1. Wie umgeht `set_learning_opt_in` den Schutz-Trigger?

- **Mechanismus: `current_user`-Prüfung im Trigger**, kein Freigabe-Flag.
- `protect_profile_privileges()` (letzte Fassung `040_k_consent_v2.sql:50`) beginnt mit `if current_user not in ('authenticated', 'anon') then return new; end if;` (Z. 56).
- `set_learning_opt_in` ist `security definer` (`041_k_legal_v2_cleanup.sql:33–36`), Eigentümer `postgres`. Innerhalb der Funktion ist `current_user` daher `postgres`, und der Trigger lässt die Änderung durch.
- **Für `set_book_status`:** derselbe Weg, `security definer` reicht. Im Funktionsrumpf braucht es **keine zusätzliche Zeile** (der Platzhalter `[Freigabe …]` im Handoff 3.2 entfällt).
- Die Trigger-Funktion wurde seit 040 nicht mehr geändert (043 erwähnt sie nur im Kommentar).

## 2. Verhalten bei gesperrten Spalten

- **Er wirft einen Fehler:** `raise exception 'profile_privileged_columns_are_server_only' using errcode = '42501'` (`040:100–101`). Er setzt nicht still zurück.
- **Erwartung für T1-d:** Fehler `42501`, Wert unverändert (wie die Prüfungen 3/4, S11-c, R3).

## 3. Profil im Frontend

- **Laden:** `useAuth` → `loadProfile()` mit `.select('*')` (`src/hooks/useAuth.js:120–124`). Die neuen Spalten sind damit automatisch dabei.
- **Aktualisieren nach einer Änderung:** `refreshProfile()` lädt das Profil neu (`useAuth.js:201`), ohne Ladebildschirm.
  - Muster: `LearningConsentCard onChanged={refreshProfile}` (`ProfileScreen.jsx`).
  - Paket R macht es genauso (`useWelcomeTour.js`).

## 4. `mfa_satisfied()` und Fehlercode

- **Signatur:** `public.mfa_satisfied()` ohne Parameter → `boolean`. `stable`, `security definer`, `search_path = ''` (Migration 037).
- **`set_learning_opt_in` wirft:** `raise exception 'mfa_required' using errcode = '42501'` (`041:43–45`).
- **Frontend** (`LearningConsentCard.jsx:44–48`):
  - `reportIfMfaRpcError(rpcError)` (`src/lib/mfa.js:107`, globaler MFA-Fehlerpfad)
  - dann `logger.warn('learning_opt_in_failed', { code })`, Fehlertext anzeigen
  - `useBookStatus` übernimmt das genauso.
- **Hinweis:** Im Frontend kommt `error.code` (z. B. `42501`, `22023`) an, der Name (`mfa_required`, `invalid_book_status`) steht in `error.message`. Geloggt wird nur `code` (Log-Regel: keine Fehlertexte). Unterscheiden lässt sich `42501` (MFA/Rechte) von `22023` (ungültige Eingabe). Das reicht.

## 5. Bestehende Bausteine

| Baustein | Fundort | Verwendung in T1 |
|---|---|---|
| Radio-Gruppe | nur `BegleitungScreen.jsx:124` (`role="radiogroup"` aus Knöpfen, Monat/Jahr) | **Kein** Baustein mit echten `<input type="radio">`. Der Handoff verlangt echte Radios → `BookStatusPicker` baut sie selbst (kein Paket). |
| Kopfzeile mit Zurück-Pfeil | `BegleitungScreen.jsx:68–77` (`ArrowLeft` 20 px, Knopf 36 px, Titel als kleine Eyebrow-Zeile) | Muster übernehmen, Knopf auf **44 px** (Handoff ≥ 44 px), Titel als `h1` |
| Karten-Stil Profil | `bg-surface border border-[var(--color-border)] rounded-lg` (Statistik, `MenuList`) | Profil-Karte |
| Grüne Coaching-Karte | `ProfileScreen.jsx:225` („Echtes Coaching“) | Buch-Karte direkt darunter |
| Avatar „JH“ | `components/ui/Avatar.jsx` zeigt nur **einen** Buchstaben. „JH“ gibt es als `ExampleAvatar` (Paket R, `components/tour/illustrations/MiniTabBar.jsx`) | `ExampleAvatar` wiederverwenden (Vorschlag A8) |

## 6. Feature-Konstanten

- **Ort:** `src/content/legalTexts.js:50–51` (`PAYMENTS_ENABLED`, `VOICE_MISTRAL_ENABLED`). Beide schalten **Rechtstexte** mit um, deshalb liegen sie dort.
- **`BOOK_REFERENCES_LIVE`** schaltet keinen Rechtstext. Laut CLAUDE.md gehören in `legalTexts.js` nur Rechtstexte. **Vorschlag A9:** die Konstante in `src/content/book.js` neben die Buch-Texte legen.

## 7. Logger und Monitor

- **Frontend:** `createLogger(source)` → `.info(code, data)` / `.warn` / `.error` (`src/lib/logger.ts:74`). `logInfo`/`logClientError` gibt es **nicht** (wie in Paket R, A3).
- **Client-Logs:** Die Zeile in `app_logs` trägt **immer** die `user_id` als Spalte (gesetzt vom Logger, wie bei allen Client-Logs). In den Event-Daten (`metadata`) stehen keine IDs.
- **`monitorRules.ts`:** `supabase/functions/_shared/monitorRules.ts`. Client-Codes zählen nur mit `origin: 'client'`, jede Regel braucht ein `label` (wie Paket R, A4). Neue Regeln brauchen danach einen Deploy von `security-monitor`.

## 8. Service Worker

- **Precache-Glob:** `vite.config.js:35` → `**/*.{js,css,html,woff2,svg,png,ico,webmanifest}`. **`.webp` ist nicht dabei.** Das Cover wird nicht vorab gecacht, nichts bricht.
- `check-sw.mjs` prüft nur Laufzeit-Routen und Fremd-Origins. Eine lokale Datei in `public/` ist unkritisch.

## 9. „Wie es funktioniert“

- „Was steckt dahinter?“ (`HowItWorksScreen.jsx:213`), danach seit Paket R der Link „Rundgang durch die App ansehen ›“ (Z. 224).
- **Der Buch-Block kommt dazwischen.**

## 10. Tests

- Seit Paket R gibt es `npm test` mit dem eingebauten `node --test "src/**/*.test.js"` (ohne Paket).
- Vorhanden ist bisher `src/lib/tourState.test.js`. `todayState.js` hat keinen Test. `src/lib/bookStatus.test.js` kommt dazu.

## 10b. Weitere Befunde

- **Cover:** `docs/Neues_Zielbild/buch-cover.webp` liegt im Repo, 600 × 929 px, 116 KB (geprüft). Ich lege eine Kopie nach `public/buch-cover.webp` (J-T1, Punkt 3).
- **Heute, Zustand A:** `HomeScreen.jsx:115–122`, der Block „So funktioniert's“, darunter „Erstes Gespräch beginnen“. Der Link kommt zwischen beide.
- **Datenexport:** `export-my-data` liest `profiles` mit `select('*')` (`index.ts:95`, Gruppe `konto`). Die neuen Spalten sind automatisch dabei.
- **Rundgang (Paket R):** `/buch` liegt in der `AppShell`. Wer die App direkt auf `/buch` öffnet, sieht in dieser Sitzung keinen Rundgang. Das ist gewollt (Deep Link).

---

## 11. Abweichungen vom Handoff (Vorschlag, zur Bestätigung in J-T1)

| # | Handoff | Befund | Vorschlag |
|---|---|---|---|
| A1 | Migration `043_t1_book_status.sql` | 043 ist seit Paket R belegt (`043_r_tour_dismissed.sql`) | **`044_t1_book_status.sql`** |
| A2 | RPC: `not_authenticated` mit `errcode '28000'`, Platzhalter „Freigabe für den Trigger“ | Projektmuster `42501` (`confirm_age`, `set_tour_dismissed`); eine Freigabe ist nicht nötig (Punkt 1) | `42501`, kein Platzhalter. Sonst wie im Handoff |
| A3 | Schutz-Trigger aus 040 übernehmen + `book_*` | Ja, 040 ist die letzte Fassung | Wie im Handoff; im INSERT-Zweig zusätzlich `book_*` := null (zweite Linie wie bei den anderen Spalten) |
| A4 | Route `<Route path="/buch" element={<BookScreen />} />` | Alle AppShell-Routen sind zusätzlich in `ProtectedRoute` gewickelt | `<ProtectedRoute><BookScreen /></ProtectedRoute>` |
| A5 | `logInfo` / `logClientError` | Gibt es nicht | `createLogger('BookScreen' …).info/warn` |
| A6 | Monitor-Regeln ohne `origin`/`label` | Würden nie zählen | `origin: 'client'` und `label` |
| A7 | „ohne Nutzer-ID“ (T1-9) | Client-Logs tragen die `user_id` als Spalte, technisch bedingt (wie alle Client-Logs) | Keine IDs in den Event-Daten; die Spalte bleibt. Ein Log ganz ohne Nutzer-ID ginge nur über eine neue Function (Scope) |
| A8 | Fußzeile mit JH-Avatar | `Avatar` zeigt nur einen Buchstaben | `ExampleAvatar` aus Paket R wiederverwenden (zeigt „JH“) |
| A9 | `BOOK_REFERENCES_LIVE` zu den Feature-Konstanten | Die liegen in `legalTexts.js`, das nur Rechtstexte enthält | In `src/content/book.js` |
| A10 | `book_status_set { status, progress }` im Log | Log-Regel: keine Profil-Felder in Logs. Der Buch-Status ist harmlos, aber eine Selbstauskunft am Profil | **Jerome entscheidet:** so lassen (Auswertung „wie viele lesen gerade Teil 3“) **oder** nur `book_status_set` ohne Werte |

**Sonst:** Keine Änderung an Gespräch, Prompts oder Edge Functions außer `monitorRules.ts`. Keine neue Abhängigkeit.
