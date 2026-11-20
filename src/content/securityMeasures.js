// src/content/securityMeasures.js — Inhalt der Seite „Wie wir deine Daten schützen“ (Paket K, W2)
//
// Grundregel (Konzept 4.1): nur zeigen, was nachweisbar umgesetzt ist.
// Jede Aussage hat eine Roadmap-ID und einen Beleg (für Jerome und den Abschlussbericht).
//   status: 'live'       → wird angezeigt
//           'geplant'    → wird NICHT angezeigt; auf 'live' setzen, sobald die Welle gemergt und abgenommen ist
//           'text_offen' → wird NICHT angezeigt; Jerome liefert bzw. bestätigt den Text (Platzhalter in [eckigen Klammern])
// Die Build-Prüfung (scripts/security/check-content.mjs) bricht ab, wenn ein 'live'-Eintrag einen
// Platzhalter ([ oder <) oder keinen Beleg hat.
// Bei jeder Änderung SECURITY_PAGE_AS_OF hochsetzen.

export const SECURITY_PAGE_AS_OF = '2026-11'

export const SECURITY_GROUPS = [
  { key: 'zugriff', title: 'Wer deine Daten sehen kann' },
  { key: 'ort', title: 'Wo deine Daten liegen' },
  { key: 'zugang', title: 'Wie dein Zugang geschützt ist' },
  { key: 'gehen', title: 'Was mit deinen Daten passiert, wenn du gehst' },
]

export const SECURITY_MEASURES = [
  // ── Wer deine Daten sehen kann ──────────────────────────────────────────────
  { id: 'S-01/S-02/S-03/S-12', group: 'zugriff', status: 'live',
    text: 'In der App siehst nur du deine Gespräche und Erkenntnisse. Jede Anfrage wird auf dem Server geprüft, nicht nur in der App.',
    evidence: 'RLS auf allen Tabellen, Policies nur für eigene Zeilen (Migration 025); requireUser/assertConversationOwner in supabase/functions/_shared/auth.ts; Nachrichten schreibt nur der Server (Migration 031)' },
  { id: 'S-02', group: 'zugriff', status: 'live',
    text: 'Ob das wirklich hält, prüfe ich mit einem eigenen Angriffstest. Dabei versucht ein Testkonto gezielt, an die Daten eines anderen Kontos zu kommen, so wie es jemand mit schlechten Absichten versuchen würde. Ziel ist, dass das nicht gelingt. Der Test läuft vor jeder neuen Version der App. Lücken, die er gefunden hat, habe ich geschlossen, bevor die App für alle geöffnet wird.',
    evidence: 'scripts/security/attack-test.mjs (npm run security:test), Pflicht vor jedem Deployment (CLAUDE.md „Vor jedem Deployment“); Paket A: 14 FAIL im ersten Lauf, alle behoben (docs/security/paket-a-abschlussbericht.md); zuletzt 161 Prüfungen ohne Fehler (U5a, 19.11.2026)' },
  { id: 'R-1', group: 'zugriff', status: 'text_offen',
    text: 'Als Betreiber habe ich technischen Zugang. [Formulierung aus R-1]',
    evidence: 'Coaching-Vereinbarung; Formulierung kommt mit R-1 (Anwalt)' },
  { id: 'S-13', group: 'zugriff', status: 'live',
    text: 'Erfahrungen aus deinen Gesprächen fließen nur dann in die gemeinsame Lernbasis, wenn du das ausdrücklich erlaubst. Sie werden vorher geprüft und enthalten keine Namen.',
    evidence: 'Opt-in nur über RPC set_learning_opt_in (Migration 032), Prüfschritt reviewLearningEntry (supabase/functions/_shared/learning.ts), nur freigegebene Einträge in match_experiences' },
  { id: 'S-06', group: 'zugriff', status: 'live',
    text: 'Mein Administrationszugang ist zusätzlich mit einem zweiten Faktor geschützt.',
    evidence: 'requireAdmin verlangt is_admin und aal2 (supabase/functions/_shared/auth.ts); AdminRoute + AdminMfaScreen' },

  // ── Wo deine Daten liegen ────────────────────────────────────────────────────
  { id: 'Region', group: 'ort', status: 'live',
    text: 'Deine Daten liegen in einem Rechenzentrum in Irland, also innerhalb der EU.',
    evidence: 'Supabase-Projekt-Region eu-west-1 (West EU, Ireland), von Jerome im Dashboard bestätigt (Project Settings → General, 20.11.2026)' },
  { id: 'S-09', group: 'ort', status: 'live',
    text: 'Auch die Programmteile, die deine Anfragen verarbeiten, laufen in der EU.',
    evidence: 'x-region: eu-west-1 in src/lib/functions.js (seit 20.11.2026, neben der Datenbank; vorher Frankfurt, Paket C-1); Angriffstest #32 prüft x-sb-edge-region = eu-west-1' },
  { id: 'R-3 Anthropic', group: 'ort', status: 'text_offen',
    text: 'Für die Antworten des Begleiters geht der Gesprächsverlauf an Anthropic. [Speicherfrist laut aktuellem Vertrag eintragen]',
    evidence: 'chat ruft die Anthropic-API auf (supabase/functions/chat/index.ts); Speicherfrist kommt mit R-3' },
  { id: 'R-3 OpenAI', group: 'ort', status: 'text_offen',
    text: 'Nur wenn die App die Lernbasis nutzt, wird die erste Nachricht eines Gesprächs bei OpenAI in einen Zahlenwert umgerechnet, um passende Erfahrungen zu finden. [Speicherfrist laut aktuellem Vertrag eintragen]',
    evidence: 'generateEmbedding (supabase/functions/_shared/rag.ts, post-conversation); seit Paket K (CODE-2) nur mit RAG_LEARNING_ENABLED=1 und mindestens einem freigegebenen Eintrag (findSimilarExperiences)' },
  { id: 'S-11 Spracheingabe', group: 'ort', status: 'geplant',
    text: 'Eine Spracheingabe kommt später dazu. Die Umwandlung von Sprache in Text soll dann in der EU stattfinden.',
    evidence: 'Mikrofon seit Paket K (CODE-1) aus: VOICE_MISTRAL_ENABLED = false (src/content/legalTexts.js, ChatInput). Die Browser-Spracherkennung schickte Aufnahmen an Google/Apple (Rechtstext A2)' },
  { id: 'S-08/S-10', group: 'ort', status: 'live',
    text: 'Keine Werbung, kein Tracking, keine Analyse-Dienste. Auch Schriften werden nicht von Google geladen.',
    evidence: 'CSP ohne Fremd-Origins außer Supabase (vercel.json); Schriften lokal über @fontsource (src/main.jsx); kein Analyse-, Tracking- oder Fehlerdienst im Frontend (Phase 0, Frage 7)' },

  // ── Wie dein Zugang geschützt ist ────────────────────────────────────────────
  { id: 'S-08 TLS', group: 'zugang', status: 'live',
    text: 'Die Verbindung zur App ist verschlüsselt.',
    evidence: 'HTTPS mit Strict-Transport-Security max-age=63072000; includeSubDomains (vercel.json); Angriffstest HDR' },
  { id: 'Auth', group: 'zugang', status: 'live',
    text: 'Dein Passwort wird nur als nicht umkehrbarer Hash gespeichert. Auch ich kenne es nicht.',
    evidence: 'Supabase Auth speichert Passwörter als bcrypt-Hash (auth.users.encrypted_password); die App sieht nie ein Passwort im Klartext' },
  { id: 'S-14', group: 'zugang', status: 'live',
    text: 'Zu viele Anfragen in kurzer Zeit werden gebremst. Das erschwert automatisierte Angriffe.',
    evidence: 'Rate-Limits je Nutzer (Migration 029, supabase/functions/_shared/rateLimit.ts); Angriffstest #16/#17; Rate-Limits von Supabase Auth' },
  { id: 'S-06b', group: 'zugang', status: 'live',
    text: 'Du kannst dein Konto zusätzlich mit einem zweiten Faktor schützen, und ich empfehle dir das. Dann fragt die App nach der Anmeldung zusätzlich nach einem Code aus einer Authenticator-App, zum Beispiel auf deinem Handy. Selbst wenn jemand dein Passwort herausfindet, kommt er ohne diesen Code (oder einen deiner Wiederherstellungscodes) nicht in dein Konto. Einrichten kannst du ihn im Profil unter „Konto & Sicherheit“.',
    evidence: 'Profil → „Konto zusätzlich schützen“; durchgesetzt in App, Functions und Datenbank (Migration 037, Paket C-5); Angriffstest #33–#38' },
  { id: 'K W1', group: 'zugang', status: 'live',
    text: 'Wenn dein Passwort geändert wird, bekommst du eine Mail.',
    evidence: 'Supabase Security Notification „Password changed“ (supabase/templates/password_changed.html), Ankunft von Jerome bestätigt (J-K2 a, 20.11.2026)' },
  { id: 'S-22', group: 'zugang', status: 'live',
    text: 'Auffällige Zugriffsmuster lösen bei mir einen Alarm aus.',
    evidence: 'security-monitor (stündlich) mit Regeln in supabase/functions/_shared/monitorRules.ts, Alarm-Mails (Paket C-2); echter Alarm getestet (J-C7)' },

  // ── Was mit deinen Daten passiert, wenn du gehst ─────────────────────────────
  { id: 'S-15 Löschen', group: 'gehen', status: 'live',
    text: 'Wenn du dein Konto löschst, werden alle deine Daten gelöscht. Das ist mit einem eigenen Löschtest geprüft.',
    evidence: 'delete-account + ON-DELETE-CASCADE-Ketten (Migration 033); scripts/security/deletion-test.mjs + supabase/security/deletion-check.sql, zuletzt 32 Prüfpunkte alle 0 (Paket K W4, 20.11.2026, mit zweitem Faktor); Bestätigungsmail nach der Löschung (delete-account, W4)' },
  { id: 'S-15 Fristen', group: 'gehen', status: 'live',
    text: 'Manche Daten werden auch ohne Kontolöschung nach festen Fristen gelöscht: die Notizen, mit denen der Begleiter seine Gespräche reflektiert, nach 12 Monaten, Feedback und Fragebögen nach 24 Monaten. Hinweise auf Krisen werden nach spätestens 90 Tagen gekürzt und nach drei Jahren gelöscht.',
    evidence: 'apply_retention (Migration 036): coach_reflections 12 Monate, user_feedback/feedback_surveys/supervision_logs 24 Monate, crisis_events.excerpt nach Sichtung bzw. 90 Tagen leer, crisis_events 3 Jahre ab Ende des Kalenderjahres; Formulierung von Jerome freigegeben (J-K3, 20.11.2026)' },
  { id: 'S-04', group: 'gehen', status: 'live',
    text: 'Technische Protokolle enthalten keine Inhalte deiner Gespräche und werden nach 30 Tagen gelöscht.',
    evidence: 'Log-Regel S-04 + sanitizeLogData (_shared/logger.ts, src/lib/logger.ts); Cron purge-app-logs 30 Tage (Migration 026)' },
  { id: 'S-16', group: 'gehen', status: 'live',
    text: 'Du kannst alles, was über dich gespeichert ist, als Datei herunterladen.',
    evidence: 'Profil → „Meine Daten herunterladen“, Function export-my-data (Paket C-4); Angriffstest #27' },
]

// Dieser Block erscheint immer (Konzept 4.2, „Was du wissen solltest“)
export const SECURITY_HONESTY = [
  { status: 'live', text: 'Deine Gespräche sind nicht Ende-zu-Ende-verschlüsselt. Der Begleiter liest deine Worte, um dir antworten zu können. Deshalb liegen sie auf dem Server lesbar vor, geschützt durch die Maßnahmen oben.' },
  { status: 'geplant', text: 'Kein Online-Dienst ist völlig ohne Risiko. Ich arbeite daran, dieses Risiko so klein wie möglich zu halten, und lasse die App vor dem offiziellen Start zusätzlich von außen prüfen.' }, // erst mit S-21
  { status: 'live', text: 'Fragen zur Sicherheit? Schreib mir: hallo@friedensstifter.coach' },
]

export const SECURITY_CONTACT = 'hallo@friedensstifter.coach'
