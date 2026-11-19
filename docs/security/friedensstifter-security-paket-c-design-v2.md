# Security-Paket C – Lösungsdesign

> **Für:** Jerome (zum Entscheiden und Abnehmen) · **Stand:** 19.11.2026, mittags · **Version:** v2 (ersetzt v1)
> **Grundlage:** ARCHITECTURE.md nach Abschluss von Paket B (alle Wellen, CSP erzwingend), Abschlussbericht Paket B, Lösungsdesign + Handoff Paket B
> **Begleitdokument:** `handoff-security-paket-c.md` (Arbeitsauftrag an Claude Code, ebenfalls v2)
>
> **Was v2 ändert:** Paket B ist komplett fertig. v1 war noch darauf ausgelegt, sich zwischen die offenen B-Wellen zu schieben. Das entfällt: Paket C startet jetzt direkt und läuft Welle für Welle nacheinander. Inhaltlich war keine der C-Maßnahmen schon in B umgesetzt; einige Details passen aber zum neuen Stand (Abschnitt 1.4).

---

## 0. Kurzfassung

| # | ID | Maßnahme | Prio | Kern in einem Satz |
|---|---|---|---|---|
| 1 | **S-05** (Code-Teil) | Secrets im Repo und im Build aufspüren, sichere ZIP-Weitergabe | kritisch | Kein Schlüssel liegt mehr unbemerkt in der Git-Historie, im Build oder in einem ZIP, das du teilst. |
| 2 | **S-09** | Edge Functions fest in Frankfurt | mittel | Jeder Function-Aufruf läuft nachweisbar in `eu-central-1`. |
| 3 | **S-22** | Monitoring + Notfallplan | mittel → jetzt hoch | Auffällige Muster lösen eine Mail an dich aus (nur Zähler, keine Inhalte), und für den Ernstfall gibt es einen Plan. |
| 4 | **S-11** | Drei Datenschutz-Korrekturen | mittel | Feedback nur mit echter Einwilligung, 18+-Bestätigung, ehrlicher Hinweis zur Spracheingabe. |
| 5 | **S-16** | Datenexport (Selbstauskunft) | hoch | Jede Person lädt im Profil alles herunter, was die App über sie speichert, ohne dass du an die Daten musst. |
| 6 | **S-06b** *(neu)* | Zweiter Faktor für alle Nutzer (freiwillig) | mittel | Wer möchte, schützt sein Konto mit einer Authenticator-App, abgesichert bis in die Datenbank, mit Wiederherstellungscodes. |

**Warum S-22 aufgewertet:** Paket A und B erzeugen viele Signale (`userId mismatch`, `mfa_required`, `assistant_insert_failed`, Rate-Limit-Ausfälle …), aber bisher schaut niemand automatisch hin. Ohne Monitoring fällt ein Angriff erst auf, wenn es zu spät ist.

**Aufwand:** Claude Code ca. 6 Arbeitstage in fünf Wellen, direkt hintereinander. Bei dir: rund 1 Stunde Entscheidungen und Einrichtung (SMTP-Secrets, Testkonto), dazu Abnahmen.

**Danach** wären **15 von 28** Roadmap-Maßnahmen erledigt (heute 11), 16 mit deinem Teil von S-05, plus die neue S-06b. Offen blieben im Wesentlichen S-07 (braucht Pro-Plan und Cloudflare), S-17, S-18, Stufe 3 und die Rechtsthemen.

---

## 1. Auswahl

### 1.1 Kriterien

1. **Nahtloser Anschluss an Paket B.** C baut auf dem auf, was B geschaffen hat: Prüfschritt, Löschregeln, Fristen, Löschtest, Admin-MFA.
2. **Claude Code kann es weitgehend allein umsetzen.**
3. **Nutzen vor dem ersten zahlenden Kunden:** Was erwarten zahlende Menschen und eine Aufsichtsbehörde als selbstverständlich?

### 1.2 Begründung

- **S-05 (Code-Teil)** ist die einzige offene *kritische* Maßnahme, an der Claude Code mitarbeiten kann. Deine Hälfte (MFA auf den Konten, Keys rotieren, Spend-Limits) bleibt bei dir. Der Scan zeigt dir aber, ob überhaupt etwas zu rotieren ist.
- **S-09** ist eine Kleinigkeit mit klarer Wirkung für die Datenschutzerklärung („Verarbeitung in Frankfurt“).
- **S-22** braucht man, bevor die App größer wird. Der eigene Mailabsender über One.com ist schon eingerichtet; Abschnitt 4.3 beschreibt den einen technischen Vorbehalt.
- **S-11** schließt drei kleine, aber echte DSGVO-Punkte. Der deutlichste: `user_feedback.consent_given` steht auf `DEFAULT true`, die Einwilligung wird also unterstellt statt gegeben.
- **S-16** ist Pflicht (Art. 15 und 20 DSGVO). Als **Selbstauskunft im Profil** ist es datenschutzfreundlicher als ein Admin-Export: Du musst die Daten nicht anfassen.
- **S-06b** hast du heute angefragt. Es nutzt die Bausteine aus S-06 und passt zu einer App, in der Menschen sehr Persönliches teilen.

### 1.3 Bewusst nicht in Paket C

| ID | Grund |
|---|---|
| S-07 | Braucht zuerst Supabase Pro (Leaked-Password-Schutz) und ein Cloudflare-Konto (Turnstile). Das ist deine Kosten- und Kontoentscheidung. Sobald beides steht, ist S-07 ein kleines Paket D. |
| S-17 | Wichtig für deine Arbeitsweise, aber kein akutes Risiko. Passt in Paket D. |
| S-18 | Braucht deine Anbieterentscheidung (OpenAI behalten oder EU-Anbieter). |
| S-19 bis S-21, R-1 bis R-6 | Stufe 3 bzw. Recht. Paket C liefert Material für R-2 (Datenflüsse, Region), R-4 und R-5 (Monitoring, Notfallplan, Export). |

### 1.4 Abgleich mit dem neuen Stand nach Paket B

Keine C-Maßnahme ist durch Paket B schon erledigt. Diese Punkte aus B ändern aber, wie C gebaut wird:

| Neu aus Paket B | Auswirkung auf Paket C |
|---|---|
| **CSP ist schon erzwingend** (Beobachtungswoche übersprungen) | Kein Warten mehr. C braucht keine neuen Origins: Der QR-Code ist ein `data:`-Bild, Mails gehen vom Server aus. |
| **Lernbasis und Supervision-Prompt laufen** (`RAG_LEARNING_ENABLED=1`, `SUPERVISION_IN_PROMPT=1` laut Abschn. 5) | Der Export (S-16) enthält echte eigene Lernbasis-Beiträge. Das Monitoring (S-22) überwacht den Prüfschritt. **Achtung:** An zwei Stellen nennt die Doku den Supervision-Schalter noch „derzeit aus“ (Abschn. 5, BLOCK 5 und `supervision`). Das klärst du in Phase 0. |
| **Prüfschritt loggt `learning_rejected` mit Gründen als Text**, technische Fehler als `review_api_failed`/`review_parse_failed` | Der in v1 für B-3 vorgesehene eigene Log-Code `learning_review_failed` gibt es noch nicht. C-2 ergänzt ihn, damit der Alarm auf einen festen Code hören kann. |
| **Neue Log-Codes**: `supervision_rejected`, `auth_delete_failed`, `retention_applied`, `learning_entry_saved` | Kommen in die Monitoring-Regeln, `retention_applied` und der Supervision-Lauf zusätzlich als **Lebenszeichen**: Bleibt ein Cron-Job aus, gibt es einen Alarm. Das zielt auf stilles Scheitern, eure häufigste Fehlerquelle. |
| **Löschtest existiert** (31 Prüfpunkte, alle 0) | C-4 und C-5 bauen darauf auf; die neue Tabelle `mfa_recovery_codes` kommt in die Prüfung. |
| **Migrationen bis 033** | C nimmt konkret **034** (S-22), **035** (S-11), **036** (S-06b). |
| **Schutz-Trigger** enthält seit 032 die Opt-in-Spalten | S-11 nimmt die Fassung aus 032 als Vorlage. |
| **Feste Import-Versionen** (Ausfall am 19.11.) | Auch neue Bibliotheken in C (SMTP-Client, `otplib`) werden mit Version gepinnt. |
| **Deploy-Lehre**: erst mergen, dann `db push`; nach neuen RPCs `notify pgrst, 'reload schema'` | Steht jetzt in jedem STOPP von C. |
| **Magic Link nur für bestehende Konten** | Die 18+-Abfrage (S-11) gehört nur in die Registrierung mit Passwort. Wer per Einladung kommt, bestätigt über das Bestandsnutzer-Sheet. |
| **Keine aktiven Nutzer seit 02.09.2026** (Aktivitätsprüfung) | Das Risiko beim Ausrollen von S-11 und S-06b ist gering. Die Sorgfalt bei der Deploy-Reihenfolge bleibt, weil dein eigenes Konto schon einen Faktor hat. |
| **Abschn. 10 sieht den Export (S-16) als Admin-Function vor** | Paket C baut ihn als **Selbstauskunft** (Abschnitt 4.5). Die Doku wird in C-4 angepasst. |
| **`crisis_events.notes`: „nie dem Nutzer sichtbar“** | Passt nicht zu C-4 (Auskunftsrecht). Mit C-4 = „alles“ ändert sich dieser Satz in „im Alltag nicht sichtbar, im Export enthalten“. |
| **Löschung inaktiver Konten wartet auf den Mailkanal** | Steht der Mailkanal nach C-2, kann die Löschung mit Vorab-Hinweis als kleiner Folgeschritt kommen (Paket D). |

---

## 2. Deine Entscheidungen

Trag sie im Handoff ein; leere Felder bedeuten „Empfehlung umsetzen“.

| # | Frage | Optionen | Empfehlung |
|---|---|---|---|
| **C-1** | Altersgrenze (S-11) | a) harte Grenze 18 · b) Grenze 16 · c) keine Abfrage | **a) 18.** Coaching mit Krisenthemen ist ein Angebot für Erwachsene. Unter 16 wäre die Einwilligung nach Art. 8 DSGVO ohnehin nicht ausreichend, und 18 ist die klarere Linie. Wer jünger ist, bekommt einen freundlichen Hinweis auf die Nummer gegen Kummer (116 111). |
| **C-2** | Bestandsnutzer und 18+ | a) einmalige Bestätigung beim nächsten Öffnen · b) nur für neue Konten | **a)**, als ruhiges Sheet, ohne Sperre der laufenden Nutzung bis zur Antwort. |
| **C-3** | Krisenereignisse im Monitoring | a) nur Anzahl in der wöchentlichen Übersicht · b) zusätzlich Sofort-Mail bei neuem Ereignis | **a)**. Eine Sofort-Mail weckt die Erwartung, dass du eingreifst, und das kannst du technisch und rechtlich nicht zuverlässig. Das bisherige Prinzip „wöchentliche Sichtung“ bleibt; die Frage gehört zum Anwaltstermin (R-6). |
| **C-4** | Was gehört in den Datenexport (S-16)? | a) alles mit Personenbezug, auch die unsichtbaren Coach-Notizen · b) nur sichtbare Inhalte | **a) alles.** Art. 15 umfasst auch abgeleitete Daten: Resonanzkarte, Session-Notes, Coach-Reflexionen, Krisenprotokoll inkl. deiner Notizen. Das ändert die Haltung „Coach-Gedächtnis ist unsichtbar“: Es bleibt im Alltag unsichtbar, ist aber auf Anfrage einsehbar. Deine Notizen in `crisis_events.notes` deshalb sachlich formulieren. |
| **C-5** | Wiederherstellung bei MFA für Nutzer (S-06b) | a) eigene Wiederherstellungscodes · b) nur Support über dich | **a) Codes.** Ein Support-Weg zwingt dich, Identitäten zu prüfen, und genau dort setzen Angreifer mit Social Engineering an. 10 Einmal-Codes nach der Einrichtung, gespeichert nur als Hash. |
| **C-6** | Wo wird MFA angeboten? | a) nur im Profil · b) zusätzlich als Hinweis nach dem Onboarding | **a) nur im Profil** („Konto zusätzlich schützen“). Kein Drängen im Onboarding, in dem Menschen oft schon belastet ankommen. |
| **C-7** | Was passiert mit gefundenen Secrets in der Git-Historie (S-05)? | a) Schlüssel rotieren, Historie lassen · b) zusätzlich Historie umschreiben | **a) rotieren.** Ein rotierter Schlüssel ist wertlos. Die Historie eines privaten Repos umzuschreiben kostet Aufwand und bringt nach der Rotation kaum Sicherheit. |
| **C-8** | Mailkanal für Alarme (S-22) | a) One.com-SMTP über Port 465, Fallback Admin-Tab · b) zusätzlicher Mail-Dienst (z. B. Brevo) | **a)**, kein neuer Dienstleister. Funktioniert Port 465 aus den Edge Functions nicht, zeigen der Admin-Tab „Sicherheit“ und eine wöchentliche Übersicht im Admin-Bereich die Alarme, bis du anders entscheidest. |

---

## 3. Voraussetzungen

- [ ] Paket B abgeschlossen und abgenommen: Angriffstest alle PASS, Löschtest überall 0 (laut Doku am 19.11.2026 erfüllt).
- [ ] Klarheit über den Supervision-Schalter: Ist `SUPERVISION_IN_PROMPT` an oder aus? Die Doku widerspricht sich an dieser Stelle.
- [ ] Für S-22: Zugangsdaten des Postfachs `hallo@friedensstifter.coach` (oder eines eigenen Absender-Postfachs, z. B. `alarm@…`) und die Zieladresse für Alarme. Die Daten kommen als Secrets in Supabase, nie in eine Datei.
- [ ] Für S-06b: Testkonto B steht zur Verfügung (der Angriffstest richtet dort vorübergehend einen Faktor ein und entfernt ihn wieder).
- [ ] Für S-05: `gitleaks` lokal installiert (`brew install gitleaks`) oder Docker verfügbar.

---

## 4. Design je Maßnahme

### 4.1 S-05 (Code-Teil) – Secrets finden, bevor es andere tun

| Baustein | Was er tut |
|---|---|
| `npm run security:secrets` | Führt `gitleaks` über die **gesamte Git-Historie** aus. Eine Allowlist (`.gitleaks.toml`) erlaubt nur den öffentlichen anon-Key und die Projekt-URL. Ausgabe: Datei, Commit, Regel, **nie** der Fund selbst. |
| `npm run security:check-build` (läuft automatisch nach `npm run build`) | Durchsucht `dist/` nach Schlüsselmustern (`sk-ant-`, OpenAI-Keys, SMTP-Passwort-Variablen, `service_role`). Jedes JWT im Bundle wird dekodiert; steht darin `role: service_role`, **bricht der Build ab**. |
| `npm run share:zip` | Erzeugt das ZIP für Uploads in Chats per `git archive` aus dem letzten Commit. Damit kommen nur eingecheckte Dateien hinein, also nie `.env*`, `.env.security.local`, Audit-Ergebnisse, CSV- oder HAR-Exporte. Zusätzlich `export-ignore` für `docs/security/*audit-result*`. |

**Für dich:** Findet der Scan etwas, rotierst du den Schlüssel in der jeweiligen Konsole (C-7) und hakst S-05 ab.

### 4.2 S-09 – Frankfurt fest einstellen

- Alle Function-Aufrufe aus dem Frontend schicken `x-region: eu-central-1`: die gestreamten `fetch`-Aufrufe (`chat`, `post-conversation` mit `keepalive`) per Header, `supabase.functions.invoke` per Option `region`.
- Die CORS-Konfiguration aller Functions erlaubt den Header `x-region`. Ohne das scheitert der Preflight.
- Kontrolle: Der Angriffstest prüft im Antwort-Header `x-sb-edge-region`, dass die Functions in `eu-central-1` laufen.
- Die Datenbank liegt bereits in `eu-central-1`. Danach stimmt die Aussage „alles in Frankfurt“ auch für die Functions. Die Modellanbieter (Anthropic, OpenAI) bleiben ein eigenes Thema in R-2 und S-18.

### 4.3 S-22 – Monitoring und Notfallplan

**Signale** (alle gibt es schon als Log-Codes oder kommen in Phase 0 dazu):

| Regel | Fenster | Schwelle (Start) | Bedeutung |
|---|---|---|---|
| `auth_rejected` (401/403) | 1 Std. | > 50 | Jemand probiert Tokens oder fremde IDs aus |
| `userId mismatch` | 1 Std. | ≥ 1 | Klares Angriffssignal (Paket A) |
| `mfa_required` (Admin) | 1 Std. | ≥ 3 | Jemand mit deinem Passwort, aber ohne zweiten Faktor? |
| `mfa_verify_failed` | 1 Std. | ≥ 5 | Code-Raten |
| `assistant_insert_failed`, `message_insert_failed` | 1 Std. | ≥ 1 bzw. ≥ 3 | Gespräche gehen verloren |
| `rate_limit_db_error` (fail-open) | 1 Std. | ≥ 1 | Rate-Limits gerade wirkungslos |
| `delete_incomplete` | 1 Std. | ≥ 1 | Kontolöschung bricht ab |
| `learning_review_failed` (neu, technischer Ausfall des Prüfschritts) | 1 Tag | ≥ 5 | Prüfschritt fällt aus, die Lernbasis bekommt nichts mehr |
| `supervision_rejected` | 7 Tage | ≥ 2 | Supervision-Empfehlung wird wiederholt verworfen |
| `auth_delete_failed` | 1 Std. | ≥ 1 | Kontolöschung hängt am Auth-Schritt |
| **Lebenszeichen** `retention_applied` fehlt | 26 Std. | 0 Einträge | Fristen-Job läuft nicht |
| **Lebenszeichen** Supervision-Lauf fehlt | montags ab 08:00 UTC | kein neuer `supervision_logs`-Eintrag diese Woche | Supervision-Cron läuft nicht |
| `mfa_recovery_used` | sofort | ≥ 1 | Info an dich (nach S-06b) |

**Ablauf:**
```
pg_cron (stündlich, :07) ──x-cron-secret──▶ security-monitor (nur intern)
   zählt app_logs der letzten Stunde je Regel (nur Codes, keine Inhalte)
   ├─ Schwelle überschritten und für diese Regel in den letzten 6 Std. noch nicht gemeldet?
   │     → security_alerts-Zeile anlegen → Mail an ALERT_EMAIL_TO
   ├─ Lebenszeichen prüfen (retention_applied in den letzten 26 Std.? Supervision diese Woche gelaufen?)
   └─ montags 07:07 zusätzlich Wochenübersicht: Zähler je Regel, Anzahl neuer Krisenereignisse (C-3),
      neue Lernbasis-Einträge und Ablehnungen, Anzahl inaktiver Konten (aus inactive_accounts_report)
Admin-Bereich: neuer Tab „Sicherheit“ (über admin-security, aal2) zeigt die letzten Alarme und die Wochenübersicht
```

**Mail-Inhalt:** nur Regelname, Anzahl, Zeitfenster und der Hinweis „Details im Admin-Bereich“. Keine Nutzer-IDs, keine Inhalte, keine E-Mail-Adressen.

**Technischer Vorbehalt (C-8):** Supabase Edge Functions können keine ausgehenden Verbindungen auf Port 25 und 587 öffnen (so steht es u. a. in der Supabase-Integrationsanleitung von Brevo). Port 465 (SMTP über TLS) ist dort nicht ausdrücklich gesperrt, aber auch nicht belegt. Phase 0 prüft das deshalb mit einer einmaligen Test-Mail. Klappt es nicht, laufen die Alarme zunächst nur im Admin-Tab, und du entscheidest später über einen Mail-Dienst mit HTTP-API.

**Notfallplan** (`docs/security/notfallplan.md`, Claude Code entwirft, du gibst frei):
1. **Schlüssel geleakt** (service_role, Anthropic, OpenAI, SMTP, CRON_SECRET): rotieren, Secrets neu setzen, Functions neu deployen, Logs prüfen.
2. **Admin-Konto kompromittiert:** Passwort ändern, alle Sitzungen beenden (Dashboard → Users), Faktoren prüfen, `is_admin` prüfen.
3. **Verdacht auf Datenabfluss:** Ruhe bewahren, betroffene Function per Wartungs-Stub stilllegen, Logs sichern (ohne Inhalte). **Meldung an die Landesbeauftragte für Datenschutz und Informationsfreiheit NRW (LDI NRW) binnen 72 Stunden** (Art. 33 DSGVO), bei hohem Risiko Betroffene informieren (Art. 34).
4. **Kostenexplosion / Missbrauch:** Spend-Limits, Rate-Limits verschärfen, betroffene Konten sperren.
5. **Verlust deines zweiten Faktors:** Notfallweg aus S-06.
6. **Wiederherstellung aus Backup:** Schritte und wer was prüft.

Jeder Abschnitt ist eine Checkliste mit Links in die richtigen Konsolen. Der Plan liegt im Repo **und** ausgedruckt bzw. offline bei dir.

### 4.4 S-11 – Drei Datenschutz-Korrekturen

| Punkt | Heute | Danach |
|---|---|---|
| **Feedback-Einwilligung** | `user_feedback.consent_given DEFAULT true` | `DEFAULT false`. Im Feedback-Modal gibt es ein Pflicht-Häkchen; die Datenbank nimmt Feedback nur mit `consent_given = true` an (RLS). Bestehende Zeilen bleiben, werden im Bericht gezählt und laufen über die Frist aus S-15 aus. Gleiches prüft Claude Code für `feedback_surveys`. |
| **18+ (C-1, C-2)** | keine Abfrage | Pflicht-Häkchen in `Step4Auth` bei der Registrierung mit Passwort (Magic Link legt seit B keine Konten mehr an). `profiles.age_confirmed_at` setzt der Server (`handle_new_user`, aus den Signup-Metadaten), für den Client gesperrt. Bestandsnutzer bestätigen einmalig über eine RPC. |
| **Spracheingabe** | Mikrofon startet ohne Hinweis | Beim ersten Tipp auf das Mikrofon erscheint ein kurzer Hinweis. Die Spracherkennung des Browsers kann das Gesagte an Google (Chrome) bzw. Apple (Safari) übertragen. Merker pro Gerät in `localStorage`. |

Nebenbei: Die ungenutzte Spalte `profiles.consent_ip` wird entfernt (Datenminimierung).

### 4.5 S-16 – Datenexport als Selbstauskunft

```
Profil → „Meine Daten herunterladen“ → Sheet (Text 5.4) → „Datei erstellen“
   ▼ export-my-data (requireUser; mit MFA nur aal2 · Rate-Limit 3/Tag)
   ▼ sammelt alle Zeilen mit Bezug zum Nutzer (Tabellenliste unten), schreibt sie als JSON
   ▼ Download: friedensstifter-export-JJJJ-MM-TT.json
   ▼ Log: export_created { tables, rows } · Mail an die Person „Dein Datenexport wurde erstellt“ (falls Mailkanal steht)
```

**Inhalt (C-4 = alles mit Personenbezug):**

| Bereich | Tabellen |
|---|---|
| Konto | `auth.users` (E-Mail, Anlage, letzte Anmeldung), MFA-Faktoren (nur Name, Typ, Datum, **ohne** Geheimnis), `profiles` |
| Gespräche | `conversations`, `messages` |
| Spiegel & Akte | `insights`, `coach_file_entries`, `coachee_profile`, `user_memory`, `pattern_references`, `inner_voices` |
| Hintergrund-Notizen des Coaches | `session_notes`, `resonance_map`, `coach_reflections` (über die eigenen Gespräche) |
| Sicherheit & Support | `crisis_events` (inkl. Notizen), `user_feedback`, `feedback_surveys`, `app_logs` (eigene Zeilen), Rate-Limit-Zähler |
| Lernbasis | eigene Beiträge in `experience_patterns` (über `source_user_id`, seit B-3 aktiv), ohne Vektor; dazu Opt-in-Stand und Version aus `profiles` |
| **Nicht enthalten** | `conversation_context` enthält Erfahrungen **anderer** Menschen (RAG-Treffer) und wird deshalb nur als „vorhanden: ja/nein“ aufgeführt. Ebenfalls nicht enthalten sind Embeddings, Hashes der Wiederherstellungscodes und interne Zählerstände anderer. |

Oben in der Datei steht ein kurzer, verständlicher Abschnitt `_erklaerung`: was jede Gruppe bedeutet, wer Verantwortlicher ist, Kontakt.

**Für Anfragen per E-Mail** (Menschen ohne Zugang zum Konto) bleibt vorerst dein manueller Weg mit Identitätsprüfung. Ein Admin-Export ist bewusst nicht Teil von C. Die ARCHITECTURE.md sieht S-16 bisher als Admin-Function vor; das wird in C-4 auf die Selbstauskunft umgestellt. `supervision_logs` enthält nur Wochen-Zähler und allgemeine Empfehlungen ohne Personenbezug und gehört deshalb nicht in den Export.

### 4.6 S-06b – Zweiter Faktor für alle (freiwillig)

**Kern:** Wer einen Faktor eingerichtet hat, kommt nur mit einer `aal2`-Sitzung an seine Daten. Das gilt an drei Stellen, damit kein Weg vorbeiführt:

```
1. App:            ProtectedRoute prüft nach dem Login die Sicherheitsstufe
                   aal1 + Faktor vorhanden → Code-Abfrage, bevor irgendetwas geladen wird
2. Edge Functions: requireUser lehnt aal1 ab, wenn der Nutzer einen verifizierten Faktor hat
                   (403 mfa_required); Ausnahme nur die Wiederherstellung (mfa-recovery)
3. Datenbank:      restriktive RLS-Policy „mfa_satisfied()“ auf jeder Tabelle mit Client-Zugriff
                   → ein aal1-Token mit Faktor liest auch direkt über die API nichts
```

**Abläufe:**

| Ablauf | Wie |
|---|---|
| **Einrichten** | Profil → „Konto zusätzlich schützen“ → QR-Code (wie Admin) → Code bestätigen → **10 Wiederherstellungscodes** anzeigen (einmalig, mit „Kopieren“ und „Ich habe sie gesichert“) → Bestätigungsmail |
| **Anmelden** | Passwort oder Magic Link → Code-Abfrage → App |
| **Zweites Gerät** | Profil → „Weiteres Gerät hinzufügen“ |
| **Wiederherstellen** | Code-Abfrage → „Kein Zugriff auf deine App?“ → Wiederherstellungscode → alle Faktoren werden entfernt, du bist ohne zweiten Faktor angemeldet → Hinweis, neu einzurichten → Mail |
| **Abschalten** | Profil → „Zweiten Faktor entfernen“ (nur mit aal2) → Faktoren und Codes weg → Mail |

Einrichten, Wiederherstellen und Abschalten laufen über die neue Function `mfa-recovery`, damit Codes und Mails serverseitig entstehen und jede Änderung im Monitoring sichtbar ist.

**Stolperstelle, die Claude Code beachten muss:** Bei `aal1` mit Faktor liefert `profiles` wegen der neuen Policy **keine Zeile**. `useAuth` darf das nicht als „neuer Nutzer → Onboarding“ deuten. Die Code-Abfrage kommt deshalb **vor** dem Laden des Profils.

---

## 5. UI-Texte

Alle in Du-Form und nach dem Sprachprinzip. Gestaltung nach dem bestehenden Design-System.

### 5.1 Onboarding: 18+ (S-11)

> ☐ **Ich bin mindestens 18 Jahre alt.**
> Friedensstifter ist für Erwachsene gedacht. Wenn du jünger bist und gerade jemanden zum Reden brauchst, ist die Nummer gegen Kummer für dich da: **116 111**, kostenlos und anonym.

**Bestandsnutzer (einmaliges Sheet):**
> **Eine kurze Bestätigung**
> Friedensstifter ist für Erwachsene gedacht. Magst du kurz bestätigen, dass du mindestens 18 Jahre alt bist?
> `( Ja, ich bin mindestens 18 )` `Ich bin jünger`
> Bei „Ich bin jünger“: freundlicher Hinweis mit 116 111 und dem Angebot, das Konto zu löschen (bestehender Löschweg).

### 5.2 Feedback-Modal (S-11)

> ☐ **Ich bin einverstanden, dass Jerome mein Feedback liest und damit die App verbessert.** Dein Feedback wird mit deinem Namen gespeichert und nach 24 Monaten gelöscht.
> (Senden-Button erst aktiv mit Häkchen)

### 5.3 Spracheingabe, erster Tipp (S-11)

> **Kurz zur Spracheingabe**
> Die Spracheingabe nutzt die Spracherkennung deines Browsers. Dafür kann das Gesagte an Google (Chrome) oder Apple (Safari) übertragen und dort in Text umgewandelt werden. Was am Ende im Textfeld steht, siehst du, bevor du es abschickst.
> Wenn du das lieber nicht möchtest, kannst du einfach tippen.
> `( Verstanden, Mikrofon starten )` `Lieber tippen`

### 5.4 Datenexport (S-16)

> **Meine Daten herunterladen**
> Du bekommst eine Datei mit allem, was die App über dich gespeichert hat: Gespräche, Spiegel, Akte, Innere Stimmen und auch die Notizen, die der Coach im Hintergrund führt.
> Die Datei ist im JSON-Format, damit du sie auch in anderen Programmen öffnen kannst. Sie enthält sehr persönliche Inhalte. Bewahre sie gut auf und teile sie nur, wenn du das wirklich möchtest.
> `( Datei erstellen )` `Abbrechen`
> Danach: „Fertig. Die Datei wurde heruntergeladen.“ · Bei Rate-Limit: „Du hast heute schon drei Exporte erstellt. Morgen geht es wieder.“

### 5.5 MFA für Nutzer (S-06b)

**Profil-Karte:**
> **Konto zusätzlich schützen**
> Mit einem zweiten Faktor fragt die App nach der Anmeldung zusätzlich nach einem Code aus einer Authenticator-App. So bleibt dein Konto geschützt, auch wenn jemand dein Passwort kennt. Freiwillig.
> `Einrichten →`

**Wiederherstellungscodes:**
> **Deine Wiederherstellungscodes**
> Falls du einmal keinen Zugriff auf deine Authenticator-App hast, kommst du mit einem dieser Codes wieder in dein Konto. Jeder Code funktioniert einmal.
> Bewahre sie an einem sicheren Ort auf, zum Beispiel in einem Passwortmanager oder ausgedruckt. Hier siehst du sie nur dieses eine Mal.
> `[ Codes kopieren ]` `( Ich habe sie gesichert )`

**Code-Abfrage nach dem Login:**
> Gib den Code aus deiner Authenticator-App ein.
> `Kein Zugriff auf deine App? Wiederherstellungscode verwenden`

**Nach Wiederherstellung:**
> Du bist wieder angemeldet. Dein zweiter Faktor wurde entfernt. Richte ihn am besten gleich neu ein. `Jetzt einrichten →`

**Mails (Absender hallo@friedensstifter.coach, ohne Inhalte aus dem Konto):** „Zweiter Faktor eingerichtet“ · „Wiederherstellungscode verwendet“ · „Zweiter Faktor entfernt“ · „Datenexport erstellt“. Jeweils mit dem Satz: *„Warst du das nicht? Antworte auf diese Mail, dann schauen wir gemeinsam darauf.“*

---

## 6. Fahrplan

Paket B ist abgeschlossen. Claude Code arbeitet die Wellen von C nacheinander ab, jede auf einem eigenen Branch von aktuellem `main`, nachdem die vorige gemergt ist.

| Schritt | Welle | Inhalt | Migration | Warum diese Position |
|---|---|---|---|---|
| 1 | **C-1** | S-05 (Code), S-09 | – | klein, unabhängig, sofort startbar |
| 2 | **C-2** | S-22 Monitoring + Notfallplan | 034 | Alarme und Lebenszeichen stehen, bevor die größeren Umbauten kommen |
| 3 | **C-3** | S-11 | 035 | kleine Datenmodell-Änderungen, die C-4 und C-5 schon vorfinden sollen |
| 4 | **C-4** | S-16 Export | – | braucht den finalen Tabellenstand inkl. `age_confirmed_at` |
| 5 | **C-5** | S-06b MFA für Nutzer | 036 | zuletzt, weil es RLS auf allen Client-Tabellen ergänzt; danach Löschtest und Export erneut |
| 6 | **Abschluss** | Angriffstest komplett, Doku, Abschlussbericht C | – | – |

Sind beim Start schon weitere Migrationen hinzugekommen, nimmt Claude Code die nächsten freien Nummern und nennt die Zuordnung im Abschlussbericht.

---

## 7. Erwarteter Stand nach Paket C

| | Heute (nach Paket B) | Nach Paket C |
|---|---|---|
| Erledigt | **11** (S-01 bis S-04, S-06, S-08, S-10, S-12 bis S-15) | **15**, mit deinem Teil von S-05 **16** (dazu die neue S-06b) |
| Teilweise | 1 (S-07) | 1 (S-07) |
| Offen | 16 | 12 bzw. 11 (S-05 bis zu deinem Teil, S-17, S-18, S-19 bis S-21, R-1 bis R-6) |

Neu erledigt durch C: S-09, S-11, S-16, S-22 und die neue S-06b; S-05, sobald dein Teil abgehakt ist.

## 8. Ausblick Paket D

- **Löschung inaktiver Konten** (Rest von S-15): 24 Monate ohne Anmeldung, 30 Tage vorher Hinweis-Mail über den Mailkanal aus C-2.
- **S-07**, sobald Supabase Pro und Cloudflare stehen (Leaked-Password-Schutz, Turnstile; CSP-Eintrag für Cloudflare).
- **S-17** (Diagnose-Views, Seed-Skript für Testkonten).
- **S-18** nach deiner Anbieterentscheidung.
- **R-2 / R-4 / R-5**: Claude Code erzeugt aus dem dann erreichten Stand die Entwürfe (Datenflüsse, Verarbeitungsverzeichnis, TOM) für deinen Anwaltstermin.
