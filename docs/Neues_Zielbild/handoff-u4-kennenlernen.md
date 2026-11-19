# Handoff U4 – Kennenlernen, Ruhemodus, Kappung (v0.1, Entwurf zur Freigabe)

**Für:** Claude Code · **Stand:** 19.11.2026 · **Basis:** `main` nach Paket C (`security/paket-c-abschluss` gemergt)
**Konzept:** UX „Kreislauf“ v1.2, Abschnitte 5.3, 5.4, 5.5, 8.3 · Umsetzungsplan v1.0, Tranche U4 (E-12, E-13, O-2)
**Branch:** `u4/kennenlernen` · ein Deploy: **Migration 038** + Edge Functions `chat`, `pre-session-briefing` (nur falls E-U4-6 b), `admin-users` + Frontend

> Aus der Code-Inventur. Punkte mit **[E-U4-x]** weichen vom Konzept ab, füllen eine Lücke oder brauchen Jeromes Entscheidung. **Gebaut wird erst nach Freigabe.**

---

## 1. Inventur (Ist-Stand)

| Stelle | Ist | Folge für U4 |
|---|---|---|
| `consume_session` (Migration 023) | zählt **pro Gespräch einmal** (`conversations.session_counted_at`), Zähler `profiles.sessions_used_this_month`; Grenze greift für **alle außer `plan = 'premium'`**, wenn `session_limit` nicht `null` ist (`null` = unbegrenzt) | neue Zählung „Starts gesamt“, Begleitung ausnehmen |
| Cron `reset-monthly-sessions` (023) | setzt `sessions_used_this_month` am 1. auf 0 | für die neue Zählung irrelevant; abschalten |
| `profiles.session_limit` | Default **20** seit 027 (`handle_new_user` setzt 20); Admin kann je Nutzer setzen, `null` = „Unbegrenzt“ (Admin-UI) | Default 3, Bedeutung von `null` klären (E-U4-3) |
| Plan `tester` | **wird begrenzt wie `free`** – bewusst (Kommentar in `CoachScreen.jsx:116–122`: Admin setzt für Tester individuelle Limits 3/300/500). Eingeladene bekommen `plan='tester'` + Limit (`admin-invite-user`, `validate-invite-code`) | **Widerspruch zum Konzept 5.5** („tester verhält sich wie Begleitung“) → E-U4-1 |
| `chat` Zählung (Schritt 10) | `consume_session` vor dem Speichern der Nutzer-Nachricht; nicht erlaubt → `429 { error: 'Session limit reached' }` (Krisenantwort geht trotzdem durch). `first`/`standard` zählen erst mit der ersten Nutzer-Nachricht, `wellness`/`entry`/`resume` sofort | Kappung an derselben Stelle ergänzen |
| Fortsetzen (`loadConversation`, `start: 'resume'`) | legt **keine** neue Konversation an; bereits gezählte Gespräche werden nicht neu gezählt (idempotent) | „Fortsetzen zählt nicht als Start“ ist erfüllt (Konzept 8.3, zweiter Punkt) |
| Nachrichten je Gespräch | keine Grenze; `loadHistory` lädt bis 400, ans Modell gehen die letzten 60 | Kappung neu (`409 conversation_cap`) |
| Frontend `CoachScreen` | Badge „`n` von `limit` frei“ bzw. „Unbegrenzt“/„Premium“ in der Kopfzeile; `LimitModal` „Alle 20 Gespräche für diesen Monat genutzt … Premium entdecken“; UX-Vorprüfung mit `sessionsLeft` | Texte 5.4 statt Modal, Zähler-Badge entfällt (E-U4-5) |
| `PremiumScreen` (`/premium`) | „Kostenlos: 20 KI-Coach Gespräche pro Monat … Premium“ | wird Info-Seite „Begleitung“ (E-U4-7) |
| `ProfileScreen` | Badge „Kostenlos“/„Premium“/„Beta“, Menüpunkt „Plan & Abonnement“ (nicht für Tester) | Phase anzeigen, Menüpunkt „Begleitung“ |
| `HowItWorksScreen` Block 3b | „Kostenlos vs. Premium … 20 Coach-Gespräche im Monat … bis zu 10 Erkenntnisse“ (seit U2 teils falsch) | neuer Text Kennenlernen/Ruhemodus/Begleitung |
| `chat` `HOWTO_SYSTEM_PROMPT` (Z. 433) | „Free (20 Gespräche/Monat …), Premium (unbegrenzt …)“ | Fakten aktualisieren |
| `admin-users` / `AdminUsersScreen` | zeigt „Genutzt: `sessions_used_this_month`“, Limit-Feld (leer = unbegrenzt) | neue Zählung anzeigen |
| `src/lib/rateLimit.js`, `useChat` | unterscheiden 429 Rate-Limit (`rate_limited`) von 429 „Session limit reached“ | bleibt; neu: 409 `conversation_cap` |
| Spiegel-Sperren (Konzept 8.3, letzter Punkt) | **schon in U2 entfernt** | entfällt |
| Migrationsnummern | zuletzt **037** (C-5) | U4 = **038** |

**Metadaten vor dem Bau:** `supabase/diagnostics/u4-audit.sql` (Konten je Plan/Limit, Gesprächslängen, Gespräche über 100 Nachrichten – nur Zähler). Das Ergebnis hilft bei E-U4-1, E-U4-3 und O-2.

## 2. Abweichungen und Entscheidungen (Freigabe durch Jerome)

**[E-U4-1] Plan `tester`: Begleitung oder begrenzt?** Konzept 5.5 sagt „wie Begleitung“, der Code begrenzt Tester bewusst über `session_limit`.
- a) **Tester = Begleitung** (unbegrenzte Starts, keine Kappung). Admin-Limits wirken für Tester nicht mehr. Kosten der Beta nur über Rate-Limits (200 Nachrichten/Tag) gedeckelt.
- b) **Tester bleiben begrenzt**, aber mit eigenem Limit statt der 3 (Admin-Wert, `null` = unbegrenzt); Kappung 100 gilt für sie nicht. Phase in der Anzeige: „Begleitung“, solange Starts übrig sind.
- **Empfehlung: b)** – behält deine Kostenkontrolle in der Beta, und Tester merken trotzdem nichts vom Kennenlernen. Nur `premium` ist echte, unbegrenzte Begleitung.

**[E-U4-2] Neue Zählspalte `profiles.trial_sessions_used` statt Umdeutung von `sessions_used_this_month`.** Der alte Name würde nach dem Wegfall des Monats-Resets in die Irre führen. Neue Spalte `integer not null default 0`, server-only im Schutz-Trigger (Fassung aus 036 + Spalte). `consume_session` zählt nur noch sie. Weil sie bei allen mit 0 beginnt, ist der **Bestandsnutzer-Reset** (5.5) automatisch erledigt. `sessions_used_this_month` und der Cron bleiben bis zu einer späteren Aufräum-Migration stehen, der Cron wird aber abgeschaltet (`cron.unschedule`). **Empfehlung: so.**

**[E-U4-3] Bedeutung von `session_limit`.** Konzept: `coalesce(session_limit, 3)` (`null` → 3). Heute heißt `null` „unbegrenzt“ (Admin-UI).
- **Empfehlung:** `null` bleibt „unbegrenzt“ (Admin-Ausnahme). Default der Spalte und in `handle_new_user` wird **3**. Bestehende `free`-Konten mit dem alten Default **20** werden einmalig auf 3 gesetzt; abweichende, vom Admin gesetzte Werte bleiben.

**[E-U4-4] Alte Gespräche von Bestandsnutzern.** Sie sind schon gezählt (`session_counted_at`) und lassen sich daher **ohne** Verbrauch eines Kennenlern-Starts fortsetzen – bis zur Kappung. Das passt zu 5.5 („bisherige Gespräche zählen nicht“). **Empfehlung: so lassen.** (Kosten bleiben durch die Kappung begrenzt.)

**[E-U4-5] Kein Zähler im Chat.** Die Badge „`n` von 3 frei“ in der Kopfzeile ist ein Countdown („Einladen statt drängen“). Sie entfällt. Stattdessen:
- Profil: eine ruhige Zeile zur Phase, z. B. „Kennenlernen · Gespräch 2 von 3“ bzw. „Ruhemodus – alles, was du erkannt hast, bleibt sichtbar“ bzw. „Begleitung“.
- Text 1 (5.4) beim Einstieg vor dem dritten Gespräch.
- **Empfehlung: so.** Alternative: auch im Profil ohne Zahlen.

**[E-U4-6] Woher kennt das Frontend die Phase?** Konzept: `access_phase` über `pre-session-briefing` „oder einen schlanken Profil-Endpunkt“.
- a) **SQL-Funktion `public.access_state_for(uid)`** als einzige Quelle der Regeln (Phase, Starts genutzt/Grenze, Kappung). `consume_session` und `chat` nutzen sie, das Frontend fragt sie über die RPC `get_access_state()` ab (nur eigene Zeile, `mfa_satisfied()`-Prüfung wie seit C-5 Pflicht).
- b) `pre-session-briefing` liefert `access_phase` mit.
- **Empfehlung: a)** – die Regel steht dann nur an einer Stelle; Heute, Gespräch und Profil brauchen die Phase, `pre-session-briefing` wird nur im Gespräch geladen.

**[E-U4-7] Info-Seite „Begleitung“.** Neue Route **`/begleitung`** (ohne AppShell), `/premium` leitet dorthin weiter. Inhalt: was Begleitung ist (5.3-Tabelle in Alltagssprache), „Der Preis steht noch nicht fest“, Kontakt zu Jerome (Website-Kontakt wie im Profil, `rel="noopener noreferrer"`), „Zurück“. Keine Bezahlung, keine Verknappung. Profil: „Plan & Abonnement“ → **„Begleitung“** (für alle außer `premium`). Text entwerfe ich, du gibst ihn frei.

**[E-U4-8] Kappung: was zählt, was passiert.**
- Gezählt werden **alle** Nachrichten des Gesprächs in `messages` (Nutzer + Coach, inkl. Eröffnung). Grenze **100** (Startwert, O-2), Konstante an einer Stelle (`access_state_for`).
- Prüfung in `chat` **vor** `consume_session` und vor dem Speichern: Ist die Grenze erreicht und der Nutzer nicht in Begleitung → `409 { error: 'conversation_cap' }`, nichts wird gespeichert, kein Modellaufruf. Log `conversation_cap_reached` (nur Info, mit Anzahl).
- **Krisenantwort geht trotzdem durch** (wie beim Gesprächslimit). **Empfehlung: so.**
- Auch `start: 'resume'` auf einem gekappten Gespräch → 409.

**[E-U4-9] Die vier Übergangstexte (5.4) – wo und wie oft.**
1. **Vor dem dritten Gespräch:** im Einstieg (`ConversationEntry`), wenn Phase = Kennenlernen und noch genau ein Start übrig ist; einmal pro Gerät (`localStorage`, ohne Inhalte). Kein Button.
2. **Ende des Kennenlernens:** neue Karte auf **Heute** mit Vorrang vor B/C2/C (nach D), wenn Phase = Ruhemodus; einmal pro Gerät; Ausweg „Schließen“. Links „Begleitung →“ und „Ein persönliches Gespräch mit Jerome →“ (Website).
3. **Ruhemodus beim Start:** ersetzt das `LimitModal`. Bei 429 „Session limit reached“ und schon vorab im Einstieg für „Etwas Neues mitbringen“ / „Wie geht's dir?“: Sheet mit Text 3, „Begleitung →“ und „Zurück zum Spiegel“. „Weitermachen“ mit einem der eigenen Gespräche bleibt möglich.
4. **Kappung erreicht:** bei 409 `conversation_cap` statt Fehlerblase ein ruhiger Hinweis unter dem Verlauf mit Text 4; Eingabefeld deaktiviert. Im Kennenlernen mit freiem Start zusätzlich „Neues Gespräch“, sonst „Begleitung →“.
- `localStorage` reicht für „einmalig“ (keine Migration, kein Personenbezug). **Empfehlung: so.**

**[E-U4-10] Angriffstest und Testkonto.** Neue Prüfungen:
- „4. Gespräch ohne Begleitung“ → 429: braucht ein Testkonto im **Ruhemodus**. Vorschlag: Testkonto **B** bekommt per SQL `plan = 'free'`, `session_limit = 3`, `trial_sessions_used = 3`. Ein neues Gespräch von B wird dann sofort abgelehnt (kein Modellaufruf, keine Kosten). Die S-12-Tests von B nutzen ihre zwei dauerhaften, schon gezählten Gespräche und laufen weiter.
- „101. Nachricht“ → 409: braucht ein Gespräch mit ≥ 100 Nachrichten. Vorschlag: ein **synthetisches Testgespräch** „SECTEST Kappung“ von B, das du einmalig per SQL mit 100 Platzhalter-Nachrichten füllst (Vorlage liefere ich; nur Testkonto, keine echten Inhalte).
- `get_access_state()` als anon → Fehler; `trial_sessions_used` direkt setzen → 42501; aal1 mit Faktor → `mfa_required`.

## 3. Umsetzung (nach Freigabe)

### 3.1 Migration `038_u4_access_phases.sql`
- `profiles.trial_sessions_used integer not null default 0`; Default `session_limit` → 3; `free`-Konten mit `session_limit = 20` → 3 (E-U4-3).
- Schutz-Trigger: Fassung aus **036** + `trial_sessions_used`; `handle_new_user`: Fassung aus 036, `session_limit := 3`.
- `access_state_for(uid)` (SECURITY DEFINER, nur `service_role`/intern) → `{ phase, starts_used, starts_limit, cap }` nach E-U4-1/3.
- `consume_session`: Fassung aus 023, zählt `trial_sessions_used`, Grenze aus `access_state_for`; Begleitung ausgenommen.
- `get_access_state()` für `authenticated` mit `mfa_satisfied()`-Prüfung.
- `cron.unschedule('reset-monthly-sessions')`.
- Kommentar zum Rückgängigmachen.

### 3.2 `chat`
- Kappungsprüfung (E-U4-8) vor `consume_session`, 409 `conversation_cap`; Log `conversation_cap_reached` + Eintrag in `monitorRules.ts` (infoOnly).
- 429-Antwort bekommt einen festen Code `{ error: 'session_limit' }` (bisher Text „Session limit reached“); Frontend akzeptiert beide.
- `HOWTO_SYSTEM_PROMPT`: Kennenlernen/Ruhemodus/Begleitung statt „20/Monat“.

### 3.3 Frontend
- `src/lib/accessState.js` + Hook `useAccessState()` (RPC, Fehler sichtbar, kein stilles Scheitern).
- `CoachScreen`: Badge raus, `LimitModal` → `RestModeSheet` (Text 3), Kappungshinweis (Text 4), Einstieg mit Text 1 und Ruhemodus-Verhalten.
- `HomeScreen`/`todayState`: Zustand **E – Ende des Kennenlernens** (Text 2).
- `/begleitung` (`BegleitungScreen`), Redirect `/premium`; Profil: Phasen-Zeile, Menüpunkt „Begleitung“.
- `HowItWorksScreen` Block 3b neu; `AdminUsersScreen`: „Kennenlern-Starts: n“.
- Sprachprinzip-Prüfung aller neuen Texte.

### 3.4 Tests
- Angriffstest nach E-U4-10.
- Testkonto A durchläuft alle drei Phasen (per SQL `session_limit` klein setzen).
- Spiegel, Heute, Verlauf und Export im Ruhemodus vollständig nutzbar.

## 4. Deploy-Reihenfolge (J-U4)
1. Mergen nach `main`, Vercel-Deploy abwarten, **einmal neu laden** (PWA).
2. `supabase functions deploy chat admin-users --no-verify-jwt`
3. Backup, `supabase db push`, `notify pgrst, 'reload schema';`
4. SQL für Testkonto B (E-U4-10), dann `npm run security:test`.

## 5. Designdokument nach Verifikation
`ARCHITECTURE.md` (Freemium-Abschnitt 9, `consume_session`, neue RPCs, Routen, Profil, Heute E), `CLAUDE.md` Abschnitt 8 (Freemium-Logik) und Begriffe-Tabelle – erst nach Jeromes Validierung.

## 6. Beobachtungen
- O-2 (Kappungsgrenze nachjustieren): `supabase/diagnostics/coach-usage.sql` (T0) und `u4-audit.sql` liefern die Daten; die Konstante sitzt danach an einer Stelle.
- Spend-Limit bei Anthropic (Konzept 5.5) ist eine Dashboard-Einstellung, kein Code.
