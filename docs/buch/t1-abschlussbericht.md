# T1 Buch-Seite – Abschlussbericht

**Stand:** 21.11.2026
**Grundlagen:** Handoff `docs/Neues_Zielbild/handoff-t1-buch-seite.md` v1 · Phase 0 und J-T1-Entscheidungen in `docs/buch/t1-phase0.md`
**Code:** Commits `d4705506` und `fd7debc1` auf `main`
**Status:** Gerätetest J-T2 bestanden (1–9 und 11), VoiceOver (10) als SKIP gewertet. **Abnahme J-T3 durch Jerome offen.**

---

## 1. Ergebnis

Die Seite `/buch` „Das Buch zur App“ liegt hinter dem Login. Sie zeigt das Cover als lokale Datei und den freigegebenen Seitentext (B-7) wörtlich. Der E-Book-Link führt ohne Tracking zu Amazon. Das Taschenbuch steht bis zum 27.11. als „erscheint am 27.11.“ da. Unten können Nutzer angeben, ob sie das Buch kennen und in welchem Teil (1–7) sie gerade sind.

Der Status wird am Konto gespeichert, ausschließlich über die RPC `set_book_status`. Er gilt auf allen Geräten und ist im Datenexport enthalten.

Erreichbar ist die Seite über drei Wege:
- die Profil-Karte unter der Coaching-Karte, mit Status-Zeile und „ändern ›“
- den Block in „Wie es funktioniert“
- einen dezenten Link auf Heute (nur in Zustand A)

Im Gespräch ändert sich noch nichts. Bis B1 kommt, weist ein Hinweis darauf hin (`BOOK_REFERENCES_LIVE = false`).

## 2. Phase-0-Befunde

| Thema | Befund |
|---|---|
| **Mechanismus des Schutz-Triggers** | `protect_profile_privileges()` beginnt mit `if current_user not in ('authenticated', 'anon') then return new;`. Eine `SECURITY DEFINER`-Funktion (Eigentümer `postgres`) kommt deshalb durch, genau wie `set_learning_opt_in`. Ein Freigabe-Flag braucht es nicht. |
| Verhalten bei gesperrten Spalten | Der Trigger **wirft einen Fehler** `42501 profile_privileged_columns_are_server_only` und setzt nicht still zurück. Angriffstest T1-d bestätigt das. |
| Profil im Frontend | `useAuth.loadProfile` liest `select('*')`. Nach dem Speichern aktualisiert `refreshProfile()` das Profil. |
| Service Worker | Der Precache-Glob enthält kein `.webp`. Das Cover wird nicht vorab gecacht, der Build ist unverändert. |
| Export | `export-my-data` liest `profiles` mit `select('*')`. Die `book_*`-Spalten sind ohne Codeänderung enthalten (J-T2, Punkt 9 ✅). |

**Tatsächliche Migrationsnummer:** **044** (`044_t1_book_status.sql`). 043 war seit Paket R belegt.

## 3. Diff des Schutz-Triggers gegen 040

Die Funktion wurde vollständig aus `040_k_consent_v2.sql` übernommen. Dazu kamen **nur** die drei `book_*`-Spalten: im INSERT-Zweig als zweite Linie und auf der Sperrliste.

```diff
--- 040_k_consent_v2.sql
+++ 044_t1_book_status.sql
@@ -29,2 +29,5 @@
     new.coaching_agreement_version     := null;
+    new.book_status                    := null;   -- 044
+    new.book_progress                  := null;   -- 044
+    new.book_status_at                 := null;   -- 044
     return new;
@@ -49,3 +52,6 @@
   or new.coaching_agreement_accepted_at is distinct from old.coaching_agreement_accepted_at
-  or new.coaching_agreement_version     is distinct from old.coaching_agreement_version then
+  or new.coaching_agreement_version     is distinct from old.coaching_agreement_version
+  or new.book_status                    is distinct from old.book_status        -- 044
+  or new.book_progress                  is distinct from old.book_progress      -- 044
+  or new.book_status_at                 is distinct from old.book_status_at then -- 044
     raise exception 'profile_privileged_columns_are_server_only'
```

## 4. Abweichungen vom Handoff (in J-T1 bestätigt)

| # | Abweichung |
|---|---|
| A1 | Migration 044 statt 043 |
| A2 | `not_authenticated` mit `42501` statt `28000`. Kein Freigabe-Platzhalter in der RPC (nicht nötig, siehe Abschnitt 2) |
| A3 | Schutz-Trigger aus 040 + `book_*`, auch im INSERT-Zweig |
| A4 | Route `/buch` zusätzlich in `ProtectedRoute` (wie alle AppShell-Routen) |
| A5/A6 | Vorhandener Logger (`createLogger`). Monitoring-Regeln mit `origin: 'client'` und `label` |
| A7 | Client-Logs tragen die `user_id` als Spalte (technisch bedingt). In den Event-Daten stehen keine IDs |
| A8 | Fußzeile mit `ExampleAvatar` („JH“) aus Paket R |
| A9 | `BOOK_REFERENCES_LIVE` in `src/content/book.js` statt in `legalTexts.js` |
| A10 | `book_status_set` mit Status und Teil (Variante a) |

**Weitere J-T1-Entscheidungen:**
- T1-6: Der Hinweis bleibt, bis B1 live ist. B1 soll direkt nach T1 folgen.
- T1-7 bis T1-9 und die Texte aus Abschnitt 5.2 sind freigegeben.

## 5. Geänderte und neue Dateien

**Neu:**
- `supabase/migrations/044_t1_book_status.sql`
- `public/buch-cover.webp` (600 × 929, 116 KB)
- `src/content/book.js`
- `src/lib/bookStatus.js`, `src/lib/bookStatus.test.js`
- `src/hooks/useBookStatus.js`
- `src/components/book/BookStatusPicker.jsx`, `src/components/book/BookProfileCard.jsx`
- `src/screens/book/BookScreen.jsx`
- `docs/buch/t1-phase0.md`, dieser Bericht

**Geändert:**
- `src/App.jsx` (Route)
- `src/screens/profile/ProfileScreen.jsx` (Karte)
- `src/screens/howto/HowItWorksScreen.jsx` (Block)
- `src/screens/home/HomeScreen.jsx` (Link in Zustand A)
- `supabase/functions/_shared/monitorRules.ts`
- `scripts/security/attack-test.mjs`
- `ARCHITECTURE.md`

**Nicht geändert:** Gespräch, Prompts und Edge Functions (außer `monitorRules.ts`), Spiegel, `todayState.js`, Rechtstexte.

## 6. Testergebnisse

| Test | Ergebnis |
|---|---|
| `npm test` | 15 / 15 PASS (davon 7 `bookStatus.test.js`) |
| `npm run build` inkl. postbuild | PASS |
| `npm run security:test` | 203 Prüfungen · 199 PASS · 0 FAIL · 4 SKIP. T1-a bis T1-e PASS; T1-f SKIP (gleiche MFA-Prüfung wie `set_learning_opt_in`, kein eigener aal1-Lauf) |
| Sprachprinzip (neue Texte) | ohne Treffer. Das Buchzitat „Ein guter Coach …“ ist ein wörtliches Zitat auf einer Info-Seite |

**Gerätetest J-T2:**

| # | Prüfung | Ergebnis |
|---|---|---|
| 1 | Profil-Karte unter der Coaching-Karte, Cover scharf, keine Status-Zeile bei neuem Konto | ✅ |
| 2 | Buch-Seite: Text vollständig, Cover ohne Sprung, Zurück ins Profil, kein Tab aktiv | ✅ |
| 3 | E-Book-Link ohne Zusätze, Taschenbuch „erscheint am 27.11.“ | ✅ |
| 4 | Status: „Noch nicht“ → Gespeichert; „Ich lese gerade“ ohne Speichern; Teil 3 → Gespeichert; nach Neuladen gewählt | ✅ |
| 5 | Profil „Du liest gerade Teil 3“, „ändern ›“ springt zur Auswahl | ✅ |
| 6 | „Ja, durchgelesen“, gleicher Status auf zweitem Gerät | ✅ |
| 7 | Flugmodus: Fehlermeldung, Rücksprung, kein „Gespeichert“ | ✅ |
| 8 | „Wie es funktioniert“-Block; Link auf Heute nur in Zustand A | ✅ |
| 9 | Datenexport enthält die `book_*`-Spalten | ✅ |
| 10 | VoiceOver | SKIP |
| 11 | `app_logs`: `book_page_viewed` (profile, howto, today), `book_link_clicked` (ebook), `book_status_set` (not_yet, read, reading/1, reading/3). Nur Codes, `origin = client`, keine IDs in `metadata` | ✅ |

## 7. Offene Punkte

1. **Taschenbuch-Link ab 27.11.** (Handoff Abschnitt 8): eigener kleiner Branch `chore/t1-taschenbuch-link`. In `src/content/book.js` wird nur `paperbackUrl` gesetzt. Jerome liefert den Link.
2. **B1 Buch-Bezüge:** direkt im Anschluss. Voraussetzung sind die geprüfte Buch-Landkarte (B-8), die Entscheidung B-9 und ein Handoff B1. Mit B1 wird `BOOK_REFERENCES_LIVE` auf `true` gestellt.
3. **VoiceOver:** Radiogruppen und die Ansage von „Gespeichert“ sind gebaut, aber noch nicht mit einem Screenreader getestet. Das passt zum nächsten Gerätetest, gemeinsam mit dem Rundgang (Paket R).
4. **CLAUDE.md:** Migrationen 043/044, die Routen `/buch` und den Rundgang nachtragen, wenn CLAUDE.md das nächste Mal aktualisiert wird. Das gehört nicht zum Handoff.

## 8. Beobachtungen (nicht umgesetzt)

- Testkonto B (`+sec-b`) steht nach jedem Angriffstest auf `book_status = 'read'`, und der Rundgang ist dort ausgeblendet. Für Gerätetests besser andere Konten nehmen.
- Die Supabase CLI meldet v3.2.0 (installiert ist v2.95.4). Ein Update auf eine neue Hauptversion sollte bewusst und getrennt von einem Paket passieren.
