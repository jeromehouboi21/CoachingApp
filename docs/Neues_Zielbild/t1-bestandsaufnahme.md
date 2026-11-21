# T1 Buch-Seite – Bestandsaufnahme für das Handoff

**Stand:** 21.11.2026 · `main` nach A0 (`0689f8e3`) · **Für:** Claude (Design-Ebene), um das Handoff T1 gegen den aktuellen Code zu schreiben
**Grundlage:** `friedensstifter-konzept-buch-bezuege-v1.md` v1.1, Abschnitte 1–2. Seitentext (B-7) **am 21.11.2026 unverändert freigegeben**.

## 1. Was es schon gibt

Nichts zum Buch. Gesucht wurde nach `book_`, `/buch` und „Buch zur App“ in `src/` und `supabase/migrations/`, ohne Treffer. Auch ein Cover-Bild liegt weder in `public/` noch in `assets/`.

## 2. Stellen im Code, an denen T1 andocken würde

| Thema | Stand im Code | Hinweis für das Handoff |
|---|---|---|
| **Route `/buch`** | Routen in `src/App.jsx`. Es gibt zwei `AppShell`-Gruppen: Z. 118 ist die Sperre ohne Zustimmung, dort nur `/profile`. Z. 178 ist die Haupt-App mit `ProtectedRoute`. | `/buch` gehört in die Haupt-Gruppe (Z. 178 ff.). Ohne Zustimmung v2.0 bleibt sie wie alle anderen gesperrt, außer das Handoff will sie öffentlich, wie `/sicherheit`. |
| **AppShell** | `AppShell` zeigt die BottomNav; `/profile` liegt darin, aber ohne aktiven Tab | Mit AppShell (wie im Konzept) hat `/buch` die BottomNav ohne aktiven Tab. Ohne AppShell (wie `/begleitung`) hat sie einen Zurück-Pfeil. Das Konzept zeigt „←“. |
| **Profil-Karte** | `src/screens/profile/ProfileScreen.jsx` Z. 216–228: grüne Karte „Echtes Coaching · Bereit für den nächsten Schritt? · Termin buchen →“ (extern, `rel="noopener noreferrer"`) | Die Buch-Karte kommt daneben bzw. darunter. Danach folgen die Abschnitte „Dein Begleiter“, „Konto & Sicherheit“, „Rechtliches“. Den Buch-Status im Profil zu ändern, wäre dort ein Menüpunkt oder Teil der Karte. |
| **„Wie es funktioniert“** | `src/screens/howto/HowItWorksScreen.jsx`, Blöcke mit `h2` (Z. 134, 142, 161, 195 „Kennenlernen, Ruhemodus, Begleitung“, 208 „Was steckt dahinter?“) | Ein Block zum Buch wäre ein weiterer `section`. Das Konzept sieht ihn vor, die Übersicht zu T1 nennt ihn nicht. **Umfang klären.** |
| **Heute** | `src/screens/home/HomeScreen.jsx`, Zustand A ab Z. 102 („So funktioniert's“). Die Logik steckt in `src/lib/todayState.js` (A · D · B · C2 · C). | Das Konzept sieht vor: einen dezenten Link in Zustand A, eine einmalige Frage nach dem ersten Gespräch und höchstens einmal im Monat eine Frage nach dem Lesestand. **Umfang klären.** Die einmaligen Karten nutzen bisher `localStorage` (`seenOnce`/`markSeen` in `src/lib/accessState.js`). |
| **Datenmodell** | Letzte Migration `042_z_billing.sql`. **Die nächste freie Nummer ist 043.** | `profiles.book_status`, `book_progress`, `book_status_at` laut Konzept 2. Jede Migration bekommt einen Kommentar zum Rückgängigmachen. |
| **Schutz-Trigger** | `trg_protect_profile_privileges`, letzte Fassung in `040_k_consent_v2.sql`. Er sperrt eine **Liste** von Spalten für den Client: `id`, `is_admin`, `is_beta_tester`, `plan`, `session_limit`, `sessions_used_this_month`, `trial_sessions_used`, `invited_*`, `created_at`, `learning_opt_in*`, `age_confirmed_at`, `consent_*`, `coaching_agreement_*`. | Neue Spalten sind damit für den Client **automatisch beschreibbar**, über das RLS-Update der eigenen Zeile, mit MFA-Policy. **Zu entscheiden:** direktes `update profiles` aus dem Frontend (einfach, CHECK-Constraints schützen die Werte) **oder** RPC `set_book_status` nach dem Muster von `set_learning_opt_in`, mit `book_*` zusätzlich im Schutz-Trigger (wie im Konzept empfohlen). |
| **RPC-Muster** | `set_learning_opt_in` (032 → 037 → 041): `SECURITY DEFINER`, `search_path = ''`, zuerst `public.mfa_satisfied()`, nur `authenticated` | Vorlage für `set_book_status(p_status, p_progress)`: `progress` nur bei `reading` (1–7), sonst `null`; `book_status_at = now()`. |
| **Export / Löschen** | `export-my-data` exportiert `profiles` vollständig (Gruppe `konto`). Löschen läuft per CASCADE mit `profiles`. | Neue Spalten in `profiles` sind automatisch im Export und werden mit gelöscht. Eine neue Tabelle braucht es nicht. |
| **Externe Links** | CSP (`vercel.json`) blockiert ausgehende Links nicht. Bilder nur `'self'`, `data:`, `blob:`. | Amazon-Links mit `target="_blank" rel="noopener noreferrer"`, ohne Affiliate-Parameter. **Das Cover muss als Datei im Repo liegen** (z. B. `public/buch-cover.webp`), keine Bild-URL von Amazon. |
| **Texte** | Inhaltstexte schreibt Claude Code nicht | Seitentext aus Konzept 1 wörtlich übernehmen (freigegeben). Weitere UI-Texte (Karten auf Heute, Profil) müssen ins Handoff oder werden dort freigegeben. |
| **Angriffstest** | Kennungen statt Nummern (Reihenfolge-Dokument, Regel 2) | Vorschlag: `T1-a` (`book_*` eines anderen Nutzers setzen → 0 Zeilen), `T1-b` (ungültiger Status bzw. Fortschritt → Fehler), `T1-c` (anon → Fehler) |

## 3. Was vor dem Bau noch fehlt

1. **Handoff T1**, geschrieben auf der Design-Ebene
2. **Cover-Bild** als Datei von Jerome
3. **Taschenbuch-Link:** bis 27.11. „Erscheint am 27.11.“; der Link kommt als kleiner Nachtrag
4. **Umfang:** Gehören die Karten auf Heute (einmalige Frage, Lesestand-Erinnerung, Link in Zustand A) und der Block in „Wie es funktioniert“ zu T1 oder später zu B1?
5. **Status speichern:** RPC oder direktes Update (siehe Schutz-Trigger)
6. **Lesestand:** Das Konzept nennt „Teil 1–7 oder durch“, das Datenmodell `book_progress` 1–8 (6 = Jeromes Geschichte, 8 = Epilog). Welche Auswahl zeigt die Seite genau?
