# Paket R „Einstiegs-Rundgang“ – Abschlussbericht

**Stand:** 21.11.2026 · **Handoff:** `docs/Neues_Zielbild/handoff-einstiegs-rundgang.md` v1 · **Bestandsaufnahme:** `docs/rundgang/paket-r-discovery.md`
**Code:** Commit `9376055d` (auf `main`) · Migration 043 eingespielt · `security-monitor` neu deployt
**Status:** ✅ **Abgenommen (J-R3, 21.11.2026).** Gerätetest J-R2 bestanden, Schritt 9 (VoiceOver) als SKIP gewertet, Text Schritt 2 bestätigt.

---

## 1. Ergebnis

Nach dem Login zeigt Heute neuen Nutzern einen Rundgang in fünf Schritten: Willkommen, Heute, Gespräch, Spiegel, Kreislauf. Er erscheint höchstens einmal pro Sitzung und nur, wenn die App auf Heute startet. Er kommt nicht mehr, sobald der Haken „Nicht mehr anzeigen“ gesetzt ist (am Konto, auf allen Geräten) oder der Nutzer 3 Gespräche geführt hat. Über das Profil („Rundgang durch die App“) und über „Wie es funktioniert“ lässt er sich jederzeit wieder öffnen, dann ohne Haken und mit „Fertig“.

## 2. Phase-0-Befunde (Kurzfassung)

| Thema | Befund |
|---|---|
| Schutz-Trigger | `protect_profile_privileges` lässt SECURITY-DEFINER-Funktionen durch (`current_user` ≠ authenticated/anon). Er blieb **unverändert**. `tour_dismissed_at` steht nicht auf der Sperrliste. Ein Client könnte die Spalte für das eigene Konto also auch direkt setzen. Das ist unkritisch, vorgesehen ist trotzdem die RPC. |
| „Geführtes Gespräch“ | `message_count >= 3` aus `get_conversation_history` (wie `todayState.js`). Der Zähler war auf Heute schon vorhanden (`conversationCount`), eine neue Abfrage war nicht nötig. Eröffnungen ohne eigene Nachricht zählen nicht: Das Testkonto hatte 7 Gespräche, davon 0 geführte. |
| Startreihenfolge | MFA, Zustimmung und Profil sind ganze Bildschirme vor der App. Die einzige Sperre über Heute ist `AgeConfirmSheet`. |
| Tests | Es gab keinen Test-Runner. Neu: `npm test` mit dem eingebauten `node --test`, ohne neues Paket. |

## 3. Abweichungen vom Handoff (in J-R1 bestätigt)

| # | Abweichung |
|---|---|
| A1 | Heute ist `/home`. Maßgeblich ist die erste Route in der App-Shell (`noteShellStart`). |
| A2 | RPC nach Projektmuster: zuerst `mfa_satisfied()`, `search_path = ''`, `42501`. |
| A3 | `logger.warn('tour_dismiss_failed')` statt des nicht vorhandenen `logClientError`. |
| A4 | Monitoring-Regeln mit `origin: 'client'` und `label` (sonst hätten sie nie gezählt). |
| A5 | `node --test` statt eines Test-Frameworks. |
| A6 | `blockingGateOpen` = `AgeConfirmSheet` offen. |
| A7 | `MenuList` hat ein optionales Feld `hint` bekommen (zweite Zeile nur beim Rundgang-Eintrag). |

**Zusätzlich:**
- **Schritt 2:** „Heute zeigt dir ~~immer~~ nur das, was gerade dran ist.“ Das absolute „immer“ ist wegen des Sprachprinzips raus. Von Jerome bestätigt (21.11.2026).
- **Schritt 3:** mit „sprechen“ und Mikrofon in der Grafik (deine Entscheidung: die Spracheingabe kommt vor dem Start). Bis dahin zeigt der Rundgang ein Mikrofon, das es in der App noch nicht gibt.
- **Schritt 5:** Oben steht kein „Überspringen“, wie im Design. Dort schließt „Los geht's“ bzw. „Fertig“ den Rundgang, Esc geht auch.
- **Ladefehler auf Heute:** Der Rundgang erscheint dann nicht. Sonst sähen ihn Nutzer mit vielen Gesprächen.
- **Kennenlern-Satz:** Die Zahl kommt aus `access.starts_limit` („drei“ als Wort). Den Satz zeigt auch der Rundgang über Profil und „Wie es funktioniert“, wenn die Phase `kennenlernen` ist.
- **Tab-Leiste:** `BottomNav` exportiert jetzt `NAV_ITEMS`. Die Mini-Tab-Leiste in den Grafiken nutzt dieselben Icons.

## 4. Geänderte und neue Dateien

**Neu:**
- `supabase/migrations/043_r_tour_dismissed.sql`
- `src/lib/tourState.js`, `src/lib/tourState.test.js`
- `src/hooks/useWelcomeTour.js`
- `src/content/welcomeTour.js`
- `src/components/tour/WelcomeTour.jsx`
- `src/components/tour/illustrations/`: `WelcomeIllustration`, `TodayIllustration`, `ConversationIllustration`, `MirrorIllustration`, `CycleIllustration`, `MiniTabBar`

**Geändert:**
- `src/screens/home/HomeScreen.jsx`
- `src/components/layout/AppShell.jsx`
- `src/components/layout/BottomNav.jsx`
- `src/screens/profile/ProfileScreen.jsx`
- `src/screens/howto/HowItWorksScreen.jsx`
- `supabase/functions/_shared/monitorRules.ts`
- `scripts/security/attack-test.mjs`
- `package.json` (Script `test`)
- `ARCHITECTURE.md`

Der Datenexport (alle `profiles`-Spalten) und die Kontolöschung (Zeile in `profiles`) erfassen `tour_dismissed_at` ohne Änderung.

## 5. Testergebnisse

| Test | Ergebnis |
|---|---|
| `npm test` | 8 / 8 PASS |
| `npm run build` inkl. postbuild (Schlüssel, Inhalte, Service Worker) | PASS |
| `npm run security:test` | 197 Prüfungen · 194 PASS · 0 FAIL · 3 SKIP (K8, supervision, MFA-Lauf, wie bisher). Neu: R1–R4 PASS |
| Sprachprinzip (neue Texte) | ohne Treffer |

**Gerätetest J-R2** (21.11.2026):

| # | Prüfung | Ergebnis |
|---|---|---|
| 1 | Erster Login → Rundgang, Kennenlern-Satz auf Schritt 5 | ✅ |
| 2 | Überspringen ohne Haken → nach Neustart wieder da | ✅ |
| 3 | Tab-Wechsel → kein erneuter Rundgang | ✅ |
| 4 | Haken auf Schritt 3 → weg, auch auf zweitem Gerät | ✅ |
| 5 | Drei geführte Gespräche → kein Rundgang mehr (Konto aus 1–4, Haken per SQL zurückgesetzt) | ✅ |
| 6 | Profil → Rundgang ohne Haken, „Fertig“, zurück ins Profil | ✅ |
| 7 | Tester-Konto: Schritt 5 ohne Kennenlern-Satz | ✅ |
| 8 | Start direkt in `/coach` → kein Rundgang (Konto `+test-b`) | ✅ |
| 9 | VoiceOver | SKIP (Jerome, 21.11.2026) |
| 10 | `app_logs`: nur `tour_*`-Codes, `origin = client`, `metadata` nur `mode`/`step`/`via`, kein `tour_dismiss_failed` | ✅ |

## 6. Offene Punkte

1. **VoiceOver** wurde nicht geprüft (SKIP). Fokus, Dialog-Rolle und Beschriftungen sind gebaut, ein Test mit einem Screenreader steht aus. Gut wäre er beim nächsten Gerätetest.
2. **Kreislauf-Konzept** (Handoff 7.3): Beim nächsten Update in Abschnitt 7 „Was gleich bleibt“ ergänzen, dass es nach dem Login einen Rundgang gibt. Das Dokument liegt nicht im Repo, das machst du im Design-Chat.

## 7. Beobachtungen (nicht umgesetzt, kein Scope)

- Die anderen Sheets (`RestModeSheet`, `InstallSheet`, `AgeConfirmSheet` …) haben weiterhin keine Fokusfalle und keine Esc-Taste. Der Rundgang hat beides, aber nur für sich selbst. Ein gemeinsamer Baustein wäre eine eigene kleine Aufgabe.
- Testkonto B (`+sec-b`) hat seit R2 den Haken dauerhaft gesetzt. Für Gerätetests besser andere Konten nehmen.
- Die Testkonten werden knapp. Bestehende Konten lassen sich per SQL zurücksetzen (Haken, Starts). Die Abfragen dafür stehen im Chatverlauf vom 21.11.
