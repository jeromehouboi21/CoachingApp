# Handoff U1 – Navigation (v1.0, freigegeben)

**Für:** Claude Code · **Stand:** 19.11.2026 · **Basis:** `main` nach T0 (`d4853729` + Doku `t0/doku`)
**Konzept:** UX „Kreislauf“ v1.2, Abschnitte 3.1, 3.2, 4.4, 6, 8.4 · Umsetzungsplan v1.0, Tranche U1
**Branch:** `u1/navigation` · ein Deploy, nur Frontend (Vercel), keine Migration, keine Edge Function

> Aus der Code-Inventur. Die mit **[E-U1-x]** markierten Punkte weichen vom Konzept ab oder füllen eine Lücke. **Alle am 19.11.2026 von Jerome freigegeben**, ebenso die Korrektur des Datenschutz-Links (Abschnitt 7 → in den Umfang übernommen).

---

## 1. Inventur (Ist-Stand im Code)

| Stelle | Ist | Bezug |
|---|---|---|
| `src/components/layout/BottomNav.jsx` | 4 Tabs: Home `/home` · Coach `/coach` · Spiegel `/mirror` (mit roter Zahl `bg-coral` für Auto-Erkenntnisse der letzten 7 Tage, eigene Supabase-Abfrage) · Profil `/profile` | 3.1 |
| `src/components/layout/AppShell.jsx` | nur `<Outlet/>` + `BottomNav`, kein Header | 8.4 |
| `src/App.jsx` | Home liegt unter **`/home`**; `/` gibt es nicht, der Fallback `*` leitet nach `/home` bzw. `/landing`. `/verlauf` ist eine eigene Vollbild-Route ohne BottomNav. `/verstehen`, `/stimmen`, `/feedback`, `/profile` liegen in der AppShell | 3.2 |
| `src/screens/home/HomeScreen.jsx` | eigener Avatar-Button oben rechts → `/profile` (Z. 94); Werkzeugkasten-Grid (Z. 136–165); **Strähnen-Leiste** mit 🔥 und 7 Punkten (Z. 168–183) | 4.1, 4.4 |
| `src/screens/coach/CoachScreen.jsx` | Header rechts: Verlauf-Button → `/verlauf` (Z. 397) + „Neues Gespräch“ | 3.2 |
| `src/screens/mirror/MirrorScreen.jsx` | Titel „Mein Spiegel“ (Z. 516) | 6 |
| `src/screens/history/HistoryScreen.jsx` | „Zurück“ → `/profile` (Z. 54) | 3.2 |
| `src/screens/profile/ProfileScreen.jsx` | Statistik: `streak_count` „Tage Streak“ · `sessions_used_this_month` „Gespräche“ · Erkenntnisse (Z. 81–94); Menüpunkt „Gesprächsverlauf“ → `/verlauf` (Z. 127) | 4.4 |
| `src/hooks/useStreak.js` | schreibt `streak_count`/`streak_last_date` (Tage in Folge), aufgerufen in Coach, Wellness, Stimmen, MusterDetail | 4.4 |
| RPC `get_conversation_history` (Migration 025) | liefert alle eigenen Gespräche mit ≥ 1 Nutzer-Nachricht inkl. `created_at` | 4.4 |

## 2. Abweichungen und Entscheidungen (Freigabe durch Jerome)

**[E-U1-1] Route „Heute“ bleibt `/home`.** Das Konzept (3.2) nimmt an, dass Home heute unter `/` liegt. Tatsächlich ist es `/home`, und `/home` steht in Onboarding, Auth, Welcome, Admin und den Lesezeichen. Vorschlag: `/home` bleibt, und `/` leitet ausdrücklich nach `/home` (angemeldet) bzw. `/landing` weiter. Eine spätere Umstellung auf `/` ist rein kosmetisch.

**[E-U1-2] Redirects für Verstehen und Stimmen erst in U2.** Die Ziele `/mirror/muster` und `/mirror/muster/:key` entstehen erst mit dem neuen Spiegel (U2). In U1 bleiben `/verstehen`, `/verstehen/:key`, `/verstehen/aus-gespraechen` und `/stimmen` unverändert erreichbar (über das Home-Grid, wie bisher). In U1 bekommt nur `/verlauf` einen Redirect. Das Fertig-Kriterium „alle alten Routen leiten weiter“ gilt damit für die Routen, die U1 verlegt.

**[E-U1-3] Avatar als gemeinsamer Baustein in den drei Tab-Headern statt als Overlay der AppShell.** Der Coach-Header hat rechts schon zwei Bedienelemente (Verlauf, Neues Gespräch); ein schwebender Avatar der AppShell läge darauf. Vorschlag: neue Komponente `ProfileButton` (Avatar `sm` mit `aria-label="Profil öffnen"`), eingesetzt in den Headern von Heute, Gespräch und Spiegel. Ergebnis wie im Konzept: Avatar oben rechts, auf jedem Tab gleich.

**[E-U1-4] Rote Zahl am Spiegel-Tab entfällt.** Die neue CLAUDE.md-Regel („keine roten Badges für Ungelesenes“) schließt sie aus. Die eigene Abfrage in `BottomNav` fällt damit weg. Das Konzept sagt dazu nichts; der Hinweis auf neue Erkenntnisse kommt in U3 über Heute (Zustand B).

**[E-U1-5] Profil-Statistik ohne neue Daten.**
- **Reflexionstage** = Anzahl verschiedener Kalendertage (lokale Zeit), an denen ein Gespräch begonnen wurde. Grundlage: `get_conversation_history` (nur Gespräche mit eigener Nachricht). Tage nur mit Wellness-Check oder Stimmen zählen damit nicht. Eine exakte Zählung aller Reflexionstage bräuchte eine Migration und gehört nicht in U1.
- **Gespräche** = Anzahl Gespräche gesamt aus derselben Abfrage. Bisher stand dort `sessions_used_this_month` (nur dieser Monat, unter dem Label „Gespräche“).
- `useStreak` schreibt weiter `streak_count`, angezeigt wird es nirgends mehr. Keine Datenänderung.
- Reihenfolge laut Konzept 4.4: Gespräche · Erkenntnisse · Reflexionstage.

**[E-U1-6] Namen nach Konzept 6, nur dort, wo U1 ohnehin ändert.** Tabs: **Heute** (Icon `Sun`), **Gespräch** (`MessageCircle`), **Spiegel** (`Sparkles`). Titel „Mein Spiegel“ → „Spiegel“. Der Coach-Titel „Dein Begleiter“ und der Heute-Titel bleiben. Das Home-Grid („KI-Coach · Systemisches Gespräch“) bleibt bis U3, weil Heute dort neu gebaut wird.

## 3. Umfang (AFTER)

1. **`BottomNav.jsx`:** drei Tabs (`/home` Heute · `/coach` Gespräch · `/mirror` Spiegel), keine Zahl, keine Supabase-Abfrage. „Gespräch“ ist auch auf `/coach/verlauf` aktiv (NavLink ohne `end`), „Spiegel“ bleibt nur auf `/mirror` aktiv.
2. **`src/components/layout/ProfileButton.jsx` (neu):** Avatar mit Namen aus `useAuth`, `navigate('/profile')`.
3. **Header:** `ProfileButton` in Heute (ersetzt den bisherigen Avatar-Button), Gespräch (rechts neben „Neues Gespräch“), Spiegel (rechts neben dem Titel).
4. **`App.jsx`:**
   - `/coach/verlauf` → `HistoryScreen` (Vollbild wie bisher, ohne BottomNav, `ProtectedRoute`)
   - `/verlauf` → `<Navigate to="/coach/verlauf" replace />`
   - `/` → `/home` bzw. `/landing`
   - `/profile` bleibt in der AppShell (kein Tab aktiv)
5. **`CoachScreen.jsx`:** Verlauf-Button → `/coach/verlauf`.
6. **`HistoryScreen.jsx`:** „Zurück“ → `/coach`.
7. **`ProfileScreen.jsx`:** Menüpunkt „Gesprächsverlauf“ entfällt; Statistik nach E-U1-5.
8. **`HomeScreen.jsx`:** Strähnen-Leiste entfernt; „Wie funktioniert die App?“ (Zustand B) bleibt am Ende.
9. **`MirrorScreen.jsx`:** Titel „Spiegel“.
10. **`HowItWorksScreen.jsx`:** „Datenschutzerklärung lesen →“ führt nach `/datenschutz` (bisher `/profile`).

**Nicht in U1:** neuer Inhalt von Heute (U3), neuer Spiegel und Muster-Redirects (U2), Änderungen an Edge Functions, Daten oder Freemium-Logik.

## 4. Vor dem Deploy (Claude Code)

- [ ] `npm run build` ohne Fehler (inkl. `postbuild`-Prüfung auf Schlüssel)
- [ ] `rg -n "'/verlauf'|\"/verlauf\"" src` → nur noch der Redirect in `App.jsx`
- [ ] Sprachprinzip: neue/geänderte UI-Texte ohne „müssen“, absolutes „immer“/„nie“, „können nicht“, „Du brauchst“
- [ ] keine neue externe Ressource (CSP unverändert)

## 5. Nach dem Deploy (Jerome, Testkonto)

- [ ] Drei Tabs Heute · Gespräch · Spiegel, ohne Zahl; Avatar oben rechts auf allen drei Tabs öffnet das Profil
- [ ] `https://app.friedensstifter.coach/verlauf` landet auf `/coach/verlauf`; „Zurück“ führt ins Gespräch
- [ ] Verlauf-Button im Gespräch öffnet den Verlauf; ein altes Gespräch lässt sich weiterführen
- [ ] `/` leitet angemeldet nach Heute, abgemeldet zur Landing
- [ ] Profil: Gespräche · Erkenntnisse · Reflexionstage, kein Menüpunkt „Gesprächsverlauf“
- [ ] Heute ohne Strähnen-Leiste; Wie geht's dir?, Innere Stimmen und Verstehen weiter über das Grid erreichbar
- [ ] Alte Lesezeichen `/verstehen`, `/stimmen`, `/feedback` funktionieren unverändert
- [ ] 390 px: Coach-Header bricht nicht um, nichts überlappt
- [ ] `npm run security:test` weiterhin alles PASS

## 6. Designdokument nach Verifikation

- ARCHITECTURE.md: Routen-Tabelle (`/coach/verlauf`, Redirect `/verlauf`, `/`), Komponenten `BottomNav` (3 Tabs) und `ProfileButton`, Profil-Statistik
- CLAUDE.md Abschnitt 2 (Routen-Übersicht): `/coach/verlauf`, `/verlauf` → Redirect, Hinweis „Profil über Avatar“
- Designdokument v3.x (bei Jerome): Navigation, Profil-Statistik, Reflexionstage

## 7. Beobachtungen (nicht Teil von U1)

- `CoachScreen.jsx:416` grüner Punkt „Bereit für dich“ (`bg-green-500`) ist eine Statusanzeige, keine Wertung. Für U3 im Blick behalten.
- `HistoryScreen` hat eine Premium-Sperre (`isLocked`); sie fällt mit U2/U4 (Sperren entfernen, Kennenlernen).
