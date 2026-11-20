# Friedensstifter — Architektur-Dokumentation

> Stand: 20.11.2026 · nach v3.2 + Admin-Bereich, Krisenprotokoll, Gesprächsverlauf, Coaching-Vereinbarung-Rückblick · Security-Paket A (S-01 bis S-04) · Rate-Limits · Security-Paket B Welle 1 (Header/CSP, Schriften lokal, Admin-MFA), Welle 2a/2b (Server schreibt Nachrichten, Client ohne Schreibrecht), Welle 3 (Lernbasis mit Opt-in und Prüfschritt) und Welle 4 (Löschregeln, Fristen, Löschtest) · CSP erzwingend · **Paket B abgeschlossen** (Bericht: `docs/security/paket-b-abschlussbericht.md`) · **T0 Modellwechsel Sonnet 5.5** (19.11.2026, `_shared/models.ts`) · **U1 Navigation** (19.11.2026: Heute · Gespräch · Spiegel, Profil über Avatar) · **U2 Spiegel** (19.11.2026: drei Ebenen, wertfrei, ohne Anzeige-Sperren) · **U3 Heute & Einstieg** (19.11.2026: Zustände A–D/C2, Weitermachen ohne neues Gespräch, Migration 035) · **Paket C abgeschlossen** (19.11.2026: C-1 Secret-Scan/Build-Prüfung/ZIP + feste Function-Region (seit 20.11.2026 Irland, neben der Datenbank) · C-2 Monitoring, Alarm-Mails, Notfallplan, Migration 034 · C-3 Feedback nur mit Einwilligung, 18+, Hinweis Spracheingabe, Migration 036 · C-4 Datenexport als Selbstauskunft · C-5 zweiter Faktor für alle, Migration 037; Bericht: `docs/security/paket-c-abschlussbericht.md`) · **U4 Kennenlernen · Ruhemodus · Begleitung** (19.11.2026: 3 Starts insgesamt, Kappung 100 Nachrichten, Übergangstexte, `/begleitung`, Migration 038) · **U5a Weiterarbeiten & Deine Einschätzung** (19.11.2026: Ursprungsgespräch fortsetzen mit Folgesitzungs-Einstieg, ✦ / ? / ≠, Filter, Migration 039) · **Paket K W1 Passwort** (20.11.2026: ändern, vergessen, neu setzen, 12 Zeichen) · **Paket K W2 Sicherheitsseite** (`/sicherheit`, „Warum sich die App etwas merkt“, Profil-Gliederung) · **Paket K W3 Einstieg & Einwilligung v2.0** (20.11.2026: `/start/1–4`, Zustimmung nur Server, erneute Zustimmung, Rechtstexte `vorlaeufig` mit Kennzeichnung, Spracheingabe aus, OpenAI nur mit Lernbasis, Reflexionen geprüft, Datenschutzerklärung 2.0, Migrationen 040/041) · **Paket K W4 Konto löschen** (Bestätigungsmail, ehrlicher Text, Export davor, Fehler sichtbar; Sitzung gelöschter Konten wird beendet) · **Paket K abgeschlossen** (Bericht: `docs/konto/paket-k-abschlussbericht.md`) · **Paket P App installierbar** (20.11.2026, live; Gerätetest und Offline-Test stehen noch aus: Update-Hinweis statt stiller Updates, Installations-Karte/-Anleitung, Code-Anmeldung in der installierten App, Offline-Zeile, sichere Ränder, neue Icons, Name „Frieden“ auf dem Startbildschirm, Build-Prüfung `check-sw.mjs`) · **Paket Z Zahlung & Abo** (20.11.2026: Stripe Checkout, Webhook, Kundenportal, Monatskontingent mit Kulanz, Kontolöschung beendet das Abo, Migration 042; deployt und in der Stripe-Sandbox getestet (J-Z2), **Bezahlung noch aus** (`PAYMENTS_ENABLED = false`), live erst mit J-Z3; Bericht: `docs/billing/paket-z-abschlussbericht.md`)

---

## Inhaltsverzeichnis

1. [Stack-Übersicht](#1-stack-übersicht)
2. [Projektstruktur](#2-projektstruktur)
3. [Routing & Navigation](#3-routing--navigation)
4. [Frontend-Architektur](#4-frontend-architektur)
   - [Screens](#41-screens)
   - [Komponenten](#42-komponenten)
   - [Hooks](#43-hooks)
   - [Lib-Module](#44-lib-module)
5. [Backend — Supabase Edge Functions](#5-backend--supabase-edge-functions)
6. [Datenbank-Schema](#6-datenbank-schema)
7. [Design System](#7-design-system)
8. [Wichtige Flows](#8-wichtige-flows)
9. [Kennenlernen · Ruhemodus · Begleitung](#9-kennenlernen--ruhemodus--begleitung-seit-u4-migration-038)
10. [Admin-Bereich & Sicherheitsmuster](#10-admin-bereich--sicherheitsmuster)
11. [Build & Deployment](#11-build--deployment)

---

## 1. Stack-Übersicht

| Schicht | Technologie |
|---|---|
| Frontend | React 18 + Vite · Tailwind CSS v3 · React Router v6 |
| State | Lokale Hook-States (kein globaler Store) · `zustand` ist als Dependency installiert, aber aktuell ungenutzt |
| Backend | Supabase (Auth + PostgreSQL + Edge Functions) |
| KI | Anthropic Claude API · `claude-sonnet-5-5` (Streaming, Haupt-Coach, seit 19.11.2026) · `claude-haiku-4-5-20251001` (Post-Processing, Klassifikation) · Modell-IDs nur in `_shared/models.ts` |
| Hosting | Vercel · Domain: `app.friedensstifter.coach` |
| Zahlung | Stripe (`npm:stripe@23.1.0`, API-Version `2026-10-28.endive`) · gehostete Bezahlseite + Kundenportal, kein Stripe-Skript im Frontend · bisher nur Sandbox (Paket Z) |
| PWA | `vite-plugin-pwa` 0.20.5 (Workbox, `registerType: 'prompt'`, nur Precache) · Icons über `npm run pwa:icons` |
| Logging | `app_logs`-Tabelle (serverseitig) + Browser-Console (clientseitig) |

**Schlüsselprinzipien:**
- Mobile-first, 390 px optimiert
- Alle KI-Antworten werden gestreamt (token-by-token)
- Spracheingabe landet im Textarea, wird nie automatisch abgesendet
- Coach-Gedächtnis ist für den User unsichtbar
- Alle Edge Functions loggen strukturiert via `_shared/logger.ts`
- Admin-Berechtigungen werden **serverseitig** geprüft (`is_admin` **und** zweiter Faktor `aal2` in der Edge Function selbst) — ein versteckter Frontend-Screen ist kein Zugriffsschutz (siehe [Abschnitt 10](#10-admin-bereich--sicherheitsmuster))
- Gesprächsnachrichten schreibt **nur der Server** (`chat`); der Client schickt pro Nachricht Text + `clientMessageId`, den Verlauf liest der Server aus der DB (S-12)
- Browser-Schutz über Security-Header und Content-Security-Policy in `vercel.json` (S-08); keine Drittanbieter-Ressourcen außer Supabase

---

## 2. Projektstruktur

```
CoachingApp/
├── src/
│   ├── App.jsx                          ← Router-Root, ProtectedRoute/AdminRoute-Wrapper
│   ├── main.jsx                         ← ReactDOM.render, BrowserRouter, lokale Schriften (@fontsource)
│   ├── router.jsx                       ← Leerer Stub (Routing lebt komplett in App.jsx)
│   │
│   ├── hooks/                           ← Gesamter App-State (kein Zustand/Redux)
│   │   ├── useAuth.js                   ← User, Session, Profile, Consent, Coaching-Vereinbarung, mfaGate (S-06b)
│   │   ├── useChat.js                   ← Gesprächs-State, Streaming, Start-/Resume-Varianten, Senden mit clientMessageId
│   │   ├── useAdminMfa.js               ← Zweiter Faktor für den Admin-Bereich + AdminMfaContext (nutzt lib/mfa.js)
│   │   ├── useMemory.js                 ← Legacy Coach-Gedächtnis (user_memory)
│   │   ├── useStreak.js                 ← Tage-in-Folge (streak_count), seit U1 nirgends angezeigt
│   │   ├── useVoiceInput.js             ← Web Speech API (de-DE); Mikrofon derzeit aus (VOICE_MISTRAL_ENABLED)
│   │   ├── useInstallPrompt.js          ← Paket P: Installationsweg je Gerät (prompt · ios_manual · open_in_browser · installed · unsupported)
│   │   ├── useOnline.js                 ← Paket P: online/offline
│   │   └── useChatBusy.js               ← Paket P: „Coach antwortet gerade“ (aus lib/chatActivity.js)
│   │
│   ├── lib/
│   │   ├── supabase.js                  ← Supabase-Client (anon key)
│   │   ├── prompts.js                   ← UI-Texte: Eröffnungen (Kopie in chat/index.ts!), Wellness-Scores, Impulsfragen
│   │   ├── rateLimit.js                 ← 429 rate_limited erkennen + Hinweistext
│   │   ├── consent.js                   ← Versionen der Zustimmungstexte (inkl. LEARNING_CONSENT_VERSION)
│   │   ├── functions.js                 ← functionUrl/functionHeaders (Region eu-west-1 = Datenbank-Region, S-09)
│   │   ├── mfa.js                       ← Zweiter Faktor: Stand, Einrichten, Prüfen, mfa-recovery, globaler Fehlerpfad (S-06b)
│   │   ├── passwordPolicy.js            ← 12 Zeichen, PASSWORD_MESSAGES, mapAuthError (Paket K W1)
│   │   ├── passwordRecovery.js          ← erkennt den Reset-Link vor dem Supabase-Client (erster Import in main.jsx, W1)
│   │   ├── installPrompt.js             ← Paket P: fängt beforeinstallprompt vor dem ersten Rendern ab (Import in main.jsx)
│   │   ├── chatActivity.js              ← Paket P: globaler Merker „Antwort läuft“ (von useChat gesetzt)
│   │   └── logger.ts                    ← Frontend-Logger (console + app_logs)
│   │
│   ├── content/                         ← Inhalte mit Freigabe-/Belegpflicht (Paket K)
│   │   ├── legalTexts.js                ← Rechtstexte v2.0, LEGAL_TEXTS_STATUS, LEGAL_REVIEW_OPEN, DATA_RECIPIENTS, Schalter
│   │   ├── securityMeasures.js          ← Aussagen der Sicherheitsseite mit Status und Beleg
│   │   ├── plans.js                     ← Paket Z: Stufen und Preise NUR zur Anzeige, shortDate/longDate
│   │   └── whyMemory.js                 ← „Warum sich die App etwas merkt“ (W2)
│   │
│   ├── styles/
│   │   ├── globals.css                  ← CSS-Reset, Basisstile
│   │   └── tokens.css                   ← CSS Custom Properties (Farben, Abstände, Schatten)
│   │
│   ├── components/
│   │   ├── ui/                          ← Atomare UI-Bausteine
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Avatar.jsx
│   │   │   └── ScaleSlider.jsx
│   │   ├── layout/                      ← Seitenrahmen
│   │   │   ├── AppShell.jsx             ← <Outlet> + BottomNav + AgeConfirmSheet (S-11)
│   │   │   ├── AgeConfirmSheet.jsx      ← Einmalige 18+-Bestätigung für Bestandsnutzer (RPC confirm_age)
│   │   │   ├── BottomNav.jsx            ← 3 Tabs: Heute · Gespräch · Spiegel (ohne Zähler)
│   │   │   └── ProfileButton.jsx        ← Avatar oben rechts → /profile (Heute, Gespräch, Spiegel)
│   │   ├── coach/                       ← Chat-spezifische Komponenten
│   │   │   ├── ChatBubble.jsx
│   │   │   ├── ChatInput.jsx            ← Textarea, KI-Hinweis, Senden offline gesperrt; Mikrofon nur mit VOICE_MISTRAL_ENABLED
│   │   │   ├── QuickReplies.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   ├── ConversationEndModal.jsx
│   │   │   └── CrisisResponseCard.jsx   ← Eigene Card statt Bubble bei Krisenfall (v-Krise)
│   │   ├── profile/
│   │   │   ├── LearningConsentCard.jsx  ← Opt-in „Zur Lernbasis beitragen“ (S-13)
│   │   │   ├── SecurityCard.jsx         ← „Konto zusätzlich schützen“: Einrichten, Geräte, Codes, Entfernen (S-06b)
│   │   │   └── DataExportSheet.jsx      ← „Meine Daten herunterladen“ (S-16)
│   │   ├── mfa/                         ← Gemeinsame MFA-Bausteine (Admin + Nutzer, S-06b)
│   │   │   ├── MfaCodeForm.jsx          ← 6-stelliger Code + Geräteauswahl
│   │   │   ├── MfaEnrollFlow.jsx        ← QR-Code, Schlüssel, Code bestätigen
│   │   │   ├── RecoveryCodesView.jsx    ← 10 Wiederherstellungscodes, einmalig
│   │   │   └── RecoveryForm.jsx         ← Anmelden mit Wiederherstellungscode
│   │   ├── access/                      ← U4/Paket Z: RestModeSheet (Ruhemodus, Zweig Monatskontingent), QuotaNotice, ConversationCapNotice
│   │   ├── begleitung/                  ← Paket Z: CheckoutButton (+ Rückkehr-Hinweis), PortalButton
│   │   ├── app/                         ← Paket P: UpdateBanner, OfflineBar (beide in main.jsx neben <App />), InstallCard (Heute), InstallSheet, ShareIcon
│   │   ├── auth/                        ← PasswordField (Sichtbar-Schalter), ForgotPasswordForm (W1)
│   │   ├── WhyMemoryBlock.jsx           ← Baustein „Warum sich die App etwas merkt“ (Wie es funktioniert, /start/2)
│   │   └── legal/
│   │       ├── CoachingAgreementContent.jsx ← Vertragstext v2.0 aus legalTexts.js
│   │       ├── ConsentStep.jsx · LegalSheet.jsx · DeclineSheet.jsx · PreliminaryNotice.jsx ← Zustimmung (W3)
│   │
│   └── screens/
│       ├── auth/
│       │   └── MfaChallengeScreen.jsx   ← Code-Abfrage nach der Anmeldung (aal1 + Faktor, S-06b)
│       ├── landing/                     ← Öffentliche Einstiegsseiten
│       │   ├── LandingScreen.jsx
│       │   ├── AuthScreen.jsx
│       │   └── WelcomeScreen.jsx
│       ├── start/                       ← Einstieg /start/1–4 (Paket K W3, ersetzt onboarding/)
│       │   ├── StartFlow.jsx            ← Schritte 1–4, Zustimmung nur im Zustand (kein localStorage)
│       │   ├── StartExpect.jsx · StartWhyMemory.jsx · StartAccount.jsx · StartDots.jsx
│       │   ├── ConsentGateScreen.jsx    ← Sperre ohne Zustimmung v2.0 (18+ → Zustimmung; Eingeladene → Passwort)
│       │   ├── InvitedSetPassword.jsx
│       │   └── ProfileMissingScreen.jsx ← angemeldet, aber Profil fehlt/lädt nicht (W4-Befund)
│       ├── home/
│       │   └── HomeScreen.jsx           ← „Heute“ (U3): ein nächster Schritt je Zustand A · D · B · C2 · C aus lib/todayState.js
│       ├── coach/
│       │   └── CoachScreen.jsx          ← Haupt-Chat-Interface
│       ├── mirror/
│       │   ├── MirrorScreen.jsx         ← "Spiegel" — Kopf + Umschalter Erkenntnisse · Muster · Entwicklung (U2)
│       │   ├── InsightsLevel.jsx        ← Ebene Erkenntnisse
│       │   ├── PatternsLevel.jsx        ← Ebene Muster (Stimmen, Akte-Muster, Kandidat, Bibliothek)
│       │   ├── DevelopmentLevel.jsx     ← Ebene Entwicklung (Zeitachse, Stärken, Reaktionen, Alltag)
│       │   ├── FileEntrySheet.jsx       ← Sheet für ein Akte-Muster (Verlauf)
│       │   ├── PatternDetailScreen.jsx  ← /mirror/muster/:key (kein AppShell)
│       │   └── shared.jsx               ← Ladeanzeige, LoadError, beschreibende Status-Texte
│       ├── history/
│       │   └── HistoryScreen.jsx        ← Gesprächsverlauf + Fortsetzen-Funktion
│       ├── profile/
│       │   └── ProfileScreen.jsx
│       ├── admin/
│       │   ├── AdminUsersScreen.jsx     ← Admin-only: Nutzerverwaltung + Feedback + Einladen + Sicherheit
│       │   └── AdminMfaScreen.jsx       ← Zweiten Faktor einrichten / Code eingeben (S-06)
│       ├── wellness/
│       │   └── WellnessCheckScreen.jsx  ← 1–10 Skala + Context-Chips
│       ├── howto/
│       │   └── HowItWorksScreen.jsx     ← FAQ-Chat (ohne AppShell)
│       ├── begleitung/
│       │   └── BegleitungScreen.jsx     ← Begleitung (U4); mit PAYMENTS_ENABLED Monat|Jahr, Preise, Bezahlung, Abo verwalten (Paket Z)
│       └── legal/
│           ├── ImpressumScreen.jsx
│           ├── DatenschutzScreen.jsx
│           └── CoachingAgreementScreen.jsx ← Vereinbarung nachträglich einsehbar (/vereinbarung)
│
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── models.ts                ← Einzige Stelle für Modell-IDs + Request-Defaults, extractText, ensureEndsWithUser (T0)
│   │   │   ├── monitorRules.ts          ← Regeln, Schwellen, Lebenszeichen für security-monitor (Log-Codes = Schnittstelle)
│   │   │   ├── mailer.ts                ← SMTP über One.com Port 465 (denomailer@1.6.0), nur Fehlercodes
│   │   │   ├── cors.ts                  ← corsHeaders(methods) für alle Functions (inkl. x-region, S-09)
│   │   │   ├── auth.ts                  ← requireUser(aal2 bei Faktor)/requireAdmin(aal2)/assertAal2/requireInternalCaller, Eigentum, Limits
│   │   │   ├── logger.ts                ← Zentraler Logger (sanitizeLogData, describeError)
│   │   │   ├── rag.ts                   ← Embedding + match_experiences (nur serverseitig)
│   │   │   ├── learning.ts              ← Prüfschritt (Vorfilter + Haiku, fail-closed) für Lernbasis und Supervision
│   │   │   ├── rateLimit.ts             ← Rate-Limit-Regeln + enforceRateLimit
│   │   │   └── stripe.ts                ← Paket Z: Stripe-Client, Stufen, Lookup-Keys, Schalter PAYMENTS_ENABLED/INTENSIV_ENABLED, siteUrl
│   │   ├── chat/
│   │   │   ├── index.ts                 ← Claude API Proxy + System-Prompt-Builder + Limit-/Krisen-Check
│   │   │   └── crisisDetection.ts       ← Leichte Klassifikation auf akute Suizidalität
│   │   ├── post-conversation/index.ts   ← Post-Processing (7+ parallele/sequentielle Prompts)
│   │   ├── pre-session-briefing/index.ts← Eckdaten für Eröffnung und Gesprächseinstieg (ohne Inhalte)
│   │   ├── validate-invite-code/index.ts← Invite-Code-Einlösung (Selbstregistrierung)
│   │   ├── admin-users/index.ts         ← Admin: Nutzerliste + Beta-/Limit-Verwaltung
│   │   ├── admin-feedback/index.ts      ← Admin: Feedback-Liste inkl. Name/E-Mail
│   │   ├── admin-security/index.ts      ← Admin: Alarme + Wochenübersicht (S-22)
│   │   ├── security-monitor/index.ts    ← Stündliches Monitoring, Alarm-Mails (Cron, nur intern, S-22)
│   │   ├── admin-invite-user/index.ts   ← Admin: Nutzer per E-Mail einladen (Beta-Zugang)
│   │   ├── delete-account/index.ts      ← Account-Löschung (hard delete, beendet vorher ein Stripe-Abo)
│   │   ├── export-my-data/index.ts      ← Datenexport als Selbstauskunft (S-16)
│   │   ├── mfa-recovery/index.ts        ← Wiederherstellungscodes, Wiederherstellen, Abschalten (S-06b)
│   │   ├── create-checkout-session/index.ts ← Paket Z: Stripe-Bezahlseite öffnen
│   │   ├── stripe-webhook/index.ts      ← Paket Z: Stripe-Ereignisse, einzige Stelle, die plan für Abos setzt (Signatur statt requireUser)
│   │   ├── create-portal-session/index.ts ← Paket Z: Stripe-Kundenportal öffnen
│   │   ├── supervision/index.ts         ← Wöchentliche KI-Supervision (Cron)
│   │   └── backfill-embeddings/index.ts ← Wartung: fehlende Vektoren nachtragen (nur intern)
│   ├── migrations/
│   │   ├── 001_initial.sql              ← profiles, conversations, messages, RLS
│   │   ├── 002_v1_1.sql                 ← user_memory, insights
│   │   ├── 003_v1_4.sql                 ← experience_patterns (pgvector), coach_reflections, user_feedback
│   │   ├── 004_v1_6.sql                 ← messages.input_mode, conversations.summary
│   │   ├── 005_v1_8.sql                 ← app_logs
│   │   ├── 006_v2_0.sql                 ← pattern_references
│   │   ├── 007_v2_1.sql                 ← open_thread, last_return_greeting_at
│   │   ├── 008_v2_2.sql                 ← coach_file_entries, coachee_profile, session_notes
│   │   ├── 009_v2_4.sql                 ← resonance_map
│   │   ├── 010_v2_5.sql                 ← invite_codes, profiles.plan = 'tester'
│   │   ├── 011_v2_7.sql                 ← DSGVO-Consent-Felder
│   │   ├── 012_v2_8.sql                 ← coaching_agreement_accepted_at
│   │   ├── 013_v2_9.sql                 ← conversations.post_processed_at/_message_count (Idempotenz)
│   │   ├── 014_v2_9b_grants.sql         ← GRANT-Statements für service_role versioniert
│   │   ├── 015_v3_0_inner_voices.sql    ← inner_voices, coach_file_entries/pattern_references.voice_id
│   │   ├── 016_admin_users.sql          ← profiles.is_admin/is_beta_tester/session_limit
│   │   ├── 017_feedback_beta_type.sql   ← user_feedback.feedback_type + 'beta'
│   │   ├── 018_invite_history.sql       ← profiles.invited_at/invited_by
│   │   ├── 019_v3_2_linked_value.sql    ← coach_file_entries.linked_value
│   │   ├── 020_v3_2_conversation_history.sql ← updated_at-Trigger, get_conversation_history() RPC
│   │   ├── 021_crisis_events.sql        ← crisis_events, messages.message_type
│   │   ├── 022_feedback_survey.sql      ← feedback_surveys, View feedback_survey_scores
│   │   ├── 023_session_counting.sql     ← consume_session, Schutz-Trigger conversations, Crons
│   │   ├── 024_protect_profile_privileges.sql ← Schutz-Trigger profiles
│   │   ├── 025_rls_hardening.sql        ← Least-Privilege-GRANTs/Policies
│   │   ├── 026_app_logs_hardening.sql   ← app_logs nur Insert, 30 Tage
│   │   ├── 027_signup_consent_and_limit.sql ← session_limit 20, handle_new_user mit Metadaten
│   │   ├── 028_conversation_context.sql ← RAG-Ergebnis pro Gespräch (nur service_role)
│   │   ├── 029_rate_limits.sql          ← rate_limit_counters, consume_rate_limits
│   │   ├── 030_s12_server_messages.sql  ← messages.client_message_id (Idempotenz)
│   │   ├── 031_s12_revoke_client_message_insert.sql ← Client darf messages nicht mehr schreiben (Welle 2b)
│   │   ├── 032_s13_learning_base.sql    ← Opt-in, source_user_id, review_status, set_learning_opt_in
│   │   ├── 033_s15_cascade_and_retention.sql ← Löschregeln, apply_retention, inactive_accounts_report
│   │   ├── 034_s22_security_monitoring.sql ← app_logs.origin, security_alerts, security_log_counts, Cron security-monitor
│   │   ├── 035_u3_insight_surfacing.sql ← insights.surfaced_at/confirmed_at/dismissed_at (Heute)
│   │   ├── 036_s11_privacy_fixes.sql    ← Feedback-Einwilligung (RLS), age_confirmed_at, confirm_age, consent_ip entfernt
│   │   ├── 037_s06b_user_mfa.sql        ← mfa_satisfied(), Policy mfa_required auf Client-Tabellen, mfa_recovery_codes
│   │   ├── 038_u4_access_phases.sql     ← trial_sessions_used, access_state_for/get_access_state, consume_session gesamt
│   │   ├── 039_u5a_insight_rating.sql   ← insights.user_rating/rated_at/follows_insight_id
│   │   ├── 040_k_consent_v2.sql         ← Zustimmung v2.0 nur Server, accept_consent_v2
│   │   ├── 041_k_legal_v2_cleanup.sql   ← Reflexionen gelöscht, Lernbasis-Zustimmung nur v2.0
│   │   └── 042_z_billing.sql            ← Paket Z: subscriptions, message_quota_periods, message_charges, stripe_events, consume_message/refund_message
│   ├── security/                        ← Audit-SQL (nur Metadaten) für Jerome
│   ├── diagnostics/                     ← SQL-Vorlagen für Tests/Auswertung (u. a. z-quota-test.sql: Kontingent setzen, Testuhr-Kunde zuordnen)
│   ├── templates/                       ← Auth-Mail-Vorlagen (Quelle fürs Dashboard)
│   └── config.toml                      ← verify_jwt = false je Function
│
├── scripts/security/attack-test.mjs     ← Angriffstest (npm run security:test)
├── scripts/security/deletion-test.mjs   ← Löschtest (npm run security:deletion-test, Testkonto C)
├── scripts/security/secret-scan.mjs     ← gitleaks über die ganze Historie (npm run security:secrets, nur Fundorte)
├── scripts/security/check-build.mjs     ← postbuild: dist/ auf Schlüssel prüfen, Build bricht ab
├── scripts/security/check-content.mjs   ← postbuild: Sicherheitsseite (Belege) und Rechtstexte (LEGAL_TEXTS_STATUS) prüfen
├── scripts/security/check-sw.mjs        ← postbuild (Paket P): Service Worker ohne Laufzeit-Routen/Fremd-Origins, Manifest vollständig
├── scripts/security/k7-signup-test.mjs  ← K7: Signup mit fremder Zustimmungsversion (npm run security:k7, TEST_K7_EMAIL)
├── scripts/pwa/build-icons.mjs          ← Paket P: Icons aus assets/icon-master.svg („F.“ aus DM Serif Display) – npm run pwa:icons
├── assets/icon-master.svg               ← Master-Motiv der App-Icons (1024², volle Fläche)
├── scripts/share-zip.mjs                ← ZIP zum Teilen nur aus HEAD (npm run share:zip)
├── .gitleaks.toml                       ← Allowlist öffentlicher Werte (Projekt-URL)
├── docs/security/                       ← Discovery, Handoffs, Lösungsdesign, Abschlussberichte
├── docs/billing/                        ← Paket Z: Bestandsaufnahme abo-discovery.md, Abschlussbericht
├── STRIPE_INTEGRATION_TODO.md           ← Paket Z: Einrichtung Sandbox (J-Z2) und Live-Gang (J-Z3); wird nach J-Z3 gelöscht
├── vercel.json                          ← SPA-Rewrite, Cache-, Security-Header, CSP
├── tailwind.config.js                   ← Custom Colors via CSS-Variablen
├── vite.config.js                       ← PWA-Manifest, Workbox: nur Precache, runtimeCaching leer, PDFs nicht umgeleitet
├── index.html                           ← viewport-fit=cover, apple-touch-icon, Titel „Frieden“ für den Home-Bildschirm
├── public/                              ← favicon.svg, apple-touch-icon-180.png, icons/pwa-192/512/maskable-512.png, supabase-dpa.pdf
├── CLAUDE.md                            ← Technische Dokumentation für Claude Code
└── ARCHITECTURE.md                      ← dieses Dokument
```

---

## 3. Routing & Navigation

### Routen-Tabelle

| Pfad | Screen | Auth | Zusatz-Guard | AppShell |
|---|---|---|---|---|
| `/landing` | LandingScreen | nein (auth → `/home`) | — | nein |
| `/auth` | AuthScreen (nur Anmeldung; Registrieren → `/start/1`, Magic Link ohne Kontoanlage) | nein (auth → `/home`) | — | nein |
| `/start/:step` | StartFlow (1–4) | nein (auth → `/home`) | `/start/4` ohne Zustimmung → `/start/3` | nein |
| `/onboarding` | Weiterleitung `/start/1` (angemeldet → `/home`) | — | — | nein |
| `/welcome` | WelcomeScreen | **ja** | — | nein |
| `/home` | HomeScreen | **ja** | — | **ja** |
| `/coach` | CoachScreen | **ja** | — | **ja** |
| `/mirror` | MirrorScreen (Ebene Erkenntnisse) | **ja** | — | **ja** |
| `/mirror/muster` | MirrorScreen (Ebene Muster) | **ja** | — | **ja** |
| `/mirror/entwicklung` | MirrorScreen (Ebene Entwicklung) | **ja** | — | **ja** |
| `/mirror/muster/:key` | PatternDetailScreen | **ja** | — | nein |
| `/profile` | ProfileScreen | **ja** | — | **ja** |
| `/howto` | HowItWorksScreen | **ja** | — | nein |
| `/wellness` | WellnessCheckScreen | **ja** | — | nein |
| `/begleitung` | BegleitungScreen (U4, Bezahlung seit Paket Z hinter `PAYMENTS_ENABLED`; Rückkehr von Stripe mit `?checkout=success\|cancel`) | **ja** | — | nein |
| `/premium` | → Weiterleitung `/begleitung` | — | — | — |
| `/coach/verlauf` | HistoryScreen | **ja** | — | nein |
| `/verlauf` | Weiterleitung → `/coach/verlauf` (alte Lesezeichen, U1) | — | — | — |
| `/` | Weiterleitung → `/home` (angemeldet) bzw. `/landing` | — | — | — |
| `/verstehen`, `/verstehen/aus-gespraechen`, `/stimmen` | Weiterleitung → `/mirror/muster` (U2) | — | — | — |
| `/verstehen/:key` | Weiterleitung → `/mirror/muster/:key` (U2) | — | — | — |
| `/vereinbarung` | CoachingAgreementScreen | **ja** | — | nein |
| `/admin/users` | AdminUsersScreen | **ja** | `AdminRoute` (`profile.is_admin`) | nein |
| `/impressum` | ImpressumScreen | nein | — | nein |
| `/sicherheit` | SecurityInfoScreen (Paket K W2; ohne DB-Aufrufe, Angemeldete sehen „Konto löschen ›“) | nein | — | nein |
| `/profil/passwort` | PasswordChangeScreen (Paket K W1) | **ja** | — | nein |
| `/passwort-neu` | PasswordResetScreen (Paket K W1, nur mit Recovery-Sitzung) | eigene Prüfung | — | nein |
| `/datenschutz` | DatenschutzScreen | nein | — | nein |

### Routing-Logik

```
Nicht-authentifiziert → /landing
Authentifiziert auf /landing oder /auth → /home
Fallback (*) → /home (auth) oder /landing (nicht auth)
```

### ProtectedRoute & AdminRoute

```jsx
function ProtectedRoute({ children }) {
  const { user, profile, loading, mfaGate, checkCoachingAgreement } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/landing" replace />
  if (mfaGate === 'required') return <MfaChallengeScreen />          // S-06b, vor allem anderen
  if (checkLegalConsent(profile) !== 'valid') return <LoadingScreen />   // zweite Linie, Sperre sitzt in App
  return children
}

// App: angemeldet + mfaGate 'required' → nur /impressum, /datenschutz, /sicherheit, sonst MfaChallengeScreen
// App: angemeldet, Profil geladen (profileReady), Zustimmung nicht v2.0 → ConsentGateScreen;
//      erreichbar bleiben /impressum, /datenschutz, /sicherheit, /passwort-neu, /profile (Export, Löschen)

function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()
  const mfa = useAdminMfa()
  if (loading || mfa.loading) return <LoadingScreen />
  if (!user) return <Navigate to="/landing" replace />
  if (!profile?.is_admin) return <Navigate to="/home" replace />
  if (mfa.level !== 'aal2' || mfa.enrolledJustNow || mfa.addingDevice) return <AdminMfaScreen mfa={mfa} />
  return <AdminMfaContext.Provider value={mfa}>{children}</AdminMfaContext.Provider>
}
```

`AdminRoute` ist **nur UX** — die eigentliche Absicherung passiert serverseitig in `admin-users`/`admin-feedback`/`admin-invite-user` (`requireAdmin`: `is_admin` + JWT-Claim `aal = 'aal2'`, siehe [Abschnitt 10](#10-admin-bereich--sicherheitsmuster)).

**MFA-Ablauf (S-06):** ohne Faktor → `AdminMfaScreen` „Einrichten“ (QR-Code als `data:`-Bild, Schlüssel in Vierergruppen, 6-stelliger Code) → danach Erfolgskarte mit „Zweites Gerät hinzufügen“. Mit Faktor, aber Sitzung `aal1` → „Code eingeben“ (bei mehreren Geräten Auswahl). Nicht abgeschlossene Einrichtungen werden vor einem neuen `enroll` per `unenroll` entfernt. Antwortet eine Admin-Function mit `403 mfa_required`, ruft `AdminUsersScreen` `mfa.refresh()` auf und `AdminRoute` zeigt die Code-Abfrage. Log-Regel: nie QR-Code, Schlüssel oder Code loggen (nur `mfa_enrolled`, `mfa_verify_failed`). **Notfallweg:** Faktoren des eigenen Kontos im Supabase-Dashboard (Authentication → Users) entfernen und neu einrichten — setzt MFA am Supabase-Konto voraus.

**Code-Abfrage für alle (S-06b, Paket C):** Hat ein Nutzer einen verifizierten Faktor und ist die Sitzung `aal1`, setzt `useAuth` `mfaGate = 'required'` **bevor** das Profil geladen wird (die RLS-Policy `mfa_required` liefert sonst 0 Zeilen). `App` und `ProtectedRoute` zeigen dann `MfaChallengeScreen`: Code eingeben (Geräteauswahl bei mehreren Faktoren) oder „Kein Zugriff auf deine App? Wiederherstellungscode verwenden“ → `RecoveryForm` → `mfa-recovery recover` → Sitzung erneuern → `/profile` mit Hinweis zum Neu-Einrichten (Flag in `sessionStorage`). Nach erfolgreicher Prüfung meldet Supabase `MFA_CHALLENGE_VERIFIED`, jede `useAuth`-Instanz prüft neu und lädt das Profil. Seit S-06b fragt die App auch Admins direkt nach der Anmeldung nach dem Code.

### AppShell

`AppShell` rendert einen `<Outlet>` mit darunter liegendem `<BottomNav>`. Nur `/home`, `/coach`, `/mirror`, `/mirror/muster`, `/mirror/entwicklung`, `/profile`, `/feedback` sind davon umschlossen. Die BottomNav zeigt seit U1 drei Tabs (Heute `/home` · Gespräch `/coach` · Spiegel `/mirror`). Das Profil ist kein Tab mehr, sondern über den `ProfileButton` oben rechts in den drei Tab-Screens erreichbar; auf `/profile` ist kein Tab aktiv.

---

## 4. Frontend-Architektur

### 4.1 Screens

#### HomeScreen (`/home`, „Heute“) – seit U3

**Rolle:** Ein Screen, ein nächster Schritt. Heute ist öffentlicher Raum: **keine Gesprächsthemen im Klartext**, Erkenntnisse nur verdeckt.

**Zustand** aus vorhandenen Daten (`src/lib/todayState.js`, reine Funktion; Daten: `get_conversation_history` + eigene `insights`), Reihenfolge A → D → B → C2 → C:
- **A – Neu:** kein Gespräch mit ≥ 3 Nachrichten → „So funktioniert's“ · [Erstes Gespräch beginnen] · „Erst mal ankommen → Wie geht's dir?“
- **D – Heute schon gesprochen:** Gespräch mit ≥ 3 Nachrichten, letzte Aktivität heute → „Du warst heute schon im Gespräch. Lass es ruhig nachwirken.“ · „Was du erkannt hast → Spiegel“
- **B – Nachklang:** Erkenntnis der letzten 7 Tage ohne `dismissed_at`, entweder noch nicht bestätigter Vorschlag (`source='auto'`, `confirmed_at IS NULL`) oder Vorhaben (`ziel`, Vorrang) → `HiddenInsightCard` (verdeckt, „Antippen zum Anzeigen“ setzt `surfaced_at`; bei `auto` „Stimmt das so?“ Ja/Anpassen/Entfernen; „Heute nicht“ → `dismissed_at`) + Tagesimpuls als Nebenkarte
- **C2 – Wiederentdecken:** Erkenntnis älter als 14 Tage, `surfaced_at IS NULL`, höchstens einmal pro Kalenderwoche (eine frühere Wiederentdeckung = `surfaced_at` > 14 Tage nach `created_at`); `surfaced_at` wird beim Anzeigen gesetzt
- **U5a:** B und C2 nie mit `user_rating = 'disagree'`; C2 mit Vorrang für ✦. Nach dem Aufdecken „Deine Einschätzung ›“ und „Daran weiterarbeiten →“ (B: „Wie war es seitdem? Daran weiterarbeiten →“), gleiche Komponente `InsightRating` wie im Spiegel.
- **C – Ruhe:** Tagesimpuls (`DailyImpulseCard`) · „Erst mal ankommen → Wie geht's dir?“ · „Ins Gespräch →“
- Dauerhaft: Erklärzeile unter verdeckten Karten („Verdeckt, damit niemand mitliest …“), Link „Wie funktioniert die App?“
- **E – Ende des Kennenlernens (U4):** im Ruhemodus mit Standardgrenze 3 eine Karte über dem jeweiligen Zustand (nicht in A/D): „Drei Gespräche liegen hinter dir …“ · „Begleitung →“ · „Oder ein persönliches Gespräch mit Jerome →“ · „Schließen“ (einmal pro Gerät, `TrialEndCard`)
- Ladefehler → Zustand C + `today_load_failed`

**Navigiert zu:** `/coach` (mit Entry-Kontext `tagesimpuls`), `/wellness`, `/mirror`, `/howto`

---

#### CoachScreen (`/coach`)

**Rolle:** Haupt-Chat-Interface — das Herzstück der App.

**Eröffnungslogik beim Mount (seit U3, Konzept 4.2a):**

```
0. resumeConversationId aus Navigation state (Verlauf „Gespräch fortsetzen“)?
   → loadConversation(id) — Verlauf, keine Coach-Nachricht, zählt nicht neu
3. Wellness-Check aus Navigation state? → startWellnessConversation()
   pre-session-briefing laden (briefing, recent, latestActiveConversation):
4. Entry-Kontext (Tagesimpuls, Muster)? → startEntryContextConversation()
   Noch kein Gespräch mit eigener Nachricht? → startNewConversation(true)  (Erstgespräch, kein Einstieg)
   Letzte Nachricht im jüngsten Gespräch < 2 h? → loadConversation(latest)  (läuft noch)
   Sonst → Einstieg (ConversationEntry)
```

**Einstieg (`ConversationEntry`):** bis zu 3 Gespräche zum Weitermachen (Kurztitel; bei `moving` „Ein Gespräch, das dich bewegt hat“; ohne Kurztitel heute „Gespräch um HH:MM“, sonst „Gespräch vom <Datum>“; „· da war noch etwas offen“) · „Alle Gespräche →“ `/coach/verlauf` · [Etwas Neues mitbringen] (Pool) · „Erst mal ankommen → Wie geht's dir?“. **Weitermachen** → `resumeWithOpening(id)`: Coach knüpft an **dieses** Gespräch an (`start: 'resume'`), **keine neue Konversation**. Die frühere automatische Wiederkehr-Begrüßung (`start: 'briefing'`, `last_return_greeting_at`) nutzt das Frontend nicht mehr.

**Header:** Zeile 1 „←“ (zurück zum Einstieg, nur wenn es frühere Gespräche gibt; stößt `post-conversation` an) · Titel · „Neues Gespräch“ · `ProfileButton`; Zeile 2 Status und Plan-Anzeige.

**„Neues Gespräch"-Button:**
1. `runPostConversation()` → fire-and-forget zur `post-conversation` Edge Function
2. `extractMemoryAndInsight()` → Legacy-Gedächtnis aktualisieren
3. Wenn `suggested_insight` vorhanden → `ConversationEndModal`: Schritt 1 „Was nimmst du heute mit?“ (Ja/Anpassen → `createConfirmedInsight`, `source: 'user'`, `confirmed_at`; Fehler sichtbar), Schritt 2 „Magst du etwas ausprobieren?“ (optional → `category: 'ziel'`)
4. `startNewConversation()` + `showQuickReplies = true`

**Post-Conversation-Auslösung (nicht nur der Button!):** vier unabhängige Trigger-Pfade rufen dieselbe `runPostConversation()`-Kernfunktion auf — `visibilitychange` (Tab in Hintergrund), `pagehide` (Tab schließen/Reload), Unmount-Cleanup (SPA-Navigation weg vom Coach) und der explizite Button-Klick. Eine `processedRef`-Map (`conversationId → Nachrichtenzahl beim letzten Anstoß`) verhindert Doppel-Aufrufe für denselben Stand, stößt aber erneut an, sobald das Gespräch gewachsen ist (vorher blockierte ein früher Tab-Wechsel jede spätere Nachbearbeitung). Die Edge Function hat zusätzlich einen serverseitigen Idempotenz-Guard über `post_processed_message_count` und liest den Verlauf selbst aus der DB.

**Kennenlernen/Ruhemodus (U4):** `useAccessState()` liefert die Phase; der Mount wartet darauf. Ohne freien Start (`can_start = false`) legen „Etwas Neues mitbringen“, „Wie geht's dir?“, Wellness, Entry-Kontext und „Neues Gespräch“ keine Konversation an, sondern zeigen `RestModeSheet`. `429 session_limit` → ebenfalls `RestModeSheet`; `409 conversation_cap` → `ConversationCapNotice` unter dem Verlauf, Eingabe gesperrt (die abgelehnte Nachricht wird nicht gespeichert und aus der Ansicht entfernt). Maßgeblich ist der Server (siehe [Abschnitt 9](#9-kennenlernen--ruhemodus--begleitung-seit-u4-migration-038)).

**Monatskontingent (Paket Z, nur Begleitung mit Abo):** `QuotaNotice` über der Eingabe – `warn` („Noch N Nachrichten in diesem Monat.“, einmal je Zeitraum, verschwindet beim nächsten Senden), `grace` („… Dieses Gespräch kannst du noch in Ruhe abschließen.“), `reached` („… Ab dem TT.MM. geht es weiter.“). Quelle: `meta.quota` im Stream (`onQuotaNotice`) bzw. `409 quota_reached` (`onQuotaReached`). **Die Eingabe bleibt an der Grenze offen**, damit Krisennachrichten durchkommen (Z-E1); eine abgelehnte Nachricht verschwindet aus dem Verlauf, ihr Text kommt zurück ins Eingabefeld (`ChatInput` Prop `restore`). Neues Gespräch bei aufgebrauchtem Kontingent: `429 session_limit` mit `reason: 'quota'` bzw. `access.quota_reached` → `RestModeSheet` mit Datum (`quota_resets_at`).

**Krisenfall-Rendering:** Nachrichten mit `messageType === 'crisis_response'` werden als `CrisisResponseCard` statt als `ChatBubble` gerendert (siehe [Krisenfall-Flow](#krisenfall-flow)).

**Gescheitertes Senden (S-12):** Eigene Nachrichten mit `status === 'failed'` zeigen darunter „Nicht gesendet – nochmal versuchen“ → `retryMessage(msg)` (gleiche `clientMessageId`, der Server legt nichts doppelt an). Eine Bubble mit `action === 'reload'` („Es gibt eine neue Version der App …“) lädt die Seite neu. Rate-Limit-Hinweise erscheinen als Coach-Bubble inkl. Telefonseelsorge (`src/lib/rateLimit.js`).

**"Innere Stimmen"-Namensgebung:** Enthält eine Nachricht den `<<VOICE_NAMING_CHOICE ...>>`-Steuerblock, wird er aus dem sichtbaren Text entfernt und stattdessen als Chip-Auswahl (`VoiceNamingChips`) gerendert — Auswahl schreibt direkt in `inner_voices` und wird als normale Folgenachricht weitergeführt.

---

#### MirrorScreen (`/mirror`, `/mirror/muster`, `/mirror/entwicklung`) – seit U2

**Rolle:** „Spiegel“ mit drei Ebenen, jede mit eigener Route (Segment-Umschalter navigiert, Zurück-Taste und Lesezeichen funktionieren). Alle in der AppShell, Tab „Spiegel“ aktiv. **Keine Anzeige-Sperren** (UX-Konzept 5.2: Was über dich entsteht, ist für dich sichtbar). **Wertfrei** (4.3c): eine neutrale Farbe, keine Konfidenz- oder Aktivitätspunkte, kein „Aufgelöst“; `confidence`/`status` steuern nur die Sortierung. Dateien in `src/screens/mirror/`: `MirrorScreen`, `InsightsLevel`, `PatternsLevel`, `DevelopmentLevel`, `FileEntrySheet`, `PatternDetailScreen`, `shared` (Ladeanzeige, `LoadError`, `statusText`, `momentsText`).

**Ebene Erkenntnisse** (`/mirror`, `InsightsLevel`):
- Filter Alle · Erkenntnisse · Stärken · Vorhaben (`ziel` heißt in der Anzeige „Vorhaben“; `muster` nur unter „Alle“)
- Filter **„Hat mich weitergebracht ✦“** (U5a, nur eigene Markierungen); ✦ an der Karte, wenn `user_rating = 'helpful'`
- Unter jeder Karte (U5a, `InsightRating`): „Deine Einschätzung ›“ (Sheet: ✦ Hat mich weitergebracht · ? Verstehe ich nicht · ≠ Teile ich nicht · ✎ Anpassen · ✕ Entfernen · zurücknehmen) und „Daran weiterarbeiten →“ (nur mit Ursprungsgespräch und nicht bei „Teile ich nicht“; bei „Verstehe ich nicht“ als „Magst du es im Gespräch klären? →“). Bei „Teile ich nicht“: „In deinen Worten formulieren“ · „Entfernen“.
- Karte mit Kategorie (eine neutrale Farbe), Anheften, Entfernen. Writes mit `.select('id')` bestätigt; Fehler → Hinweis, UI ändert sich erst nach Erfolg (`insight_pin_failed`, `insight_delete_failed`). Ladefehler → `LoadError` statt Leerzustand.

**Ebene Muster** (`/mirror/muster`, `PatternsLevel`) – jedes Muster an genau einem Ort:
1. **Deine Stimmen**: `inner_voices` `status='named'`, „zeigt sich bei: …“ (Akte-Labels mit `voice_id`), „Mit <Name> sprechen“ → `/coach`
2. **Was sich bei dir zeigt**: Akte-Muster (`coach_file_entries`, `category='pattern'`, „N Momente aus Gesprächen“ = Anzahl `history`, mind. 1, Status beschreibend, „gehört zu: <Stimme>“) → `FileEntrySheet` (Beschreibung, Beispiel, Verlauf; per `createPortal` in `document.body`). Dazu Bibliotheks-Muster mit eigenen `pattern_references` („N Momente“) → Detail
3. **Kandidat** (eingeführt, unbenannt): „Da ist etwas, das sich wiederholt. Magst du es dir ansehen? Darüber reden →“. Nicht eingeführte Kandidaten bleiben unsichtbar
4. **Kennst du das?**: übrige Bibliotheks-Muster

Akte-Muster und `pattern_references` sind im Datenmodell nicht verknüpft (kein gemeinsamer Schlüssel); deshalb gibt es das Detail nur für die fünf Bibliotheks-Muster.

**Ebene Entwicklung** (`/mirror/entwicklung`, `DevelopmentLevel`, bisher „Deine Akte“): „Was sich bei dir bewegt · Aus N Gesprächen“ (N = `session_notes`) → **Deine Entwicklung** (Zeitachse aus `session_notes.file_updates` **und** – seit U5a – eigenen ✦-Markierungen am Tag der Markierung, Filter „Alle · Hat mich weitergebracht ✦“, neueste oben, ein Punkt in Akzentfarbe; Texte: zum ersten Mal bemerkt / neue Beobachtung / seltener in den letzten Gesprächen / zeigt sich gerade kaum) → **Deine Stärken** (ohne ✦) → **Wie du reagierst** (`trigger` + `value`) → **Dein Alltag** (`coachee_profile`).

**Beschreibende Status:** `fading` → „seltener in den letzten Gesprächen“, `resolved` → „zeigt sich gerade kaum“, `active` ohne Zusatz.

---

#### PatternDetailScreen (`/mirror/muster/:key`) – seit U2

Vollbild ohne BottomNav, Zurück → `/mirror/muster`. Nur die fünf Bibliotheks-Keys (`src/lib/patterns.js`). Inhalt: Untertitel · **Deine Momente** (alle eigenen `pattern_references` des Keys, entfällt ohne eigene) · Entstehung in 3 Schritten · Was hilft · „Darüber sprechen →“ (Entry-Kontext `pattern`). Ruft beim Öffnen `updateStreak`.

---

#### HistoryScreen (`/coach/verlauf`)

**Rolle:** Gesprächsverlauf mit Fortsetzen-Funktion.

- Lädt Liste über RPC `get_conversation_history()` (vermeidet N+1-Queries)
- Vorschau: `session_notes.main_topic` falls vorhanden, sonst erste Nutzer-Nachricht (gekürzt)
- Keine Sperre (seit U2): alle Gespräche lesbar und fortsetzbar; gezählt und begrenzt wird nur serverseitig (`consume_session`)
- „Gespräch fortsetzen" → `navigate('/coach', { state: { resumeConversationId } })`
- „Zurück“ → `/coach` (seit U1; vorher Profil)

---

#### AdminUsersScreen (`/admin/users`)

**Rolle:** Admin-only Nutzerverwaltung. Kein Bestandteil der regulären Navigation (nur direkt per URL).

**Tab "Nutzer":** Liste aller Profile inkl. E-Mail (aus `auth.admin.listUsers()`), Beta-Tester-Toggle, individuelles Gesprächslimit, Einladungs-Historie ("Eingeladen am ... — noch nicht angenommen" falls `last_sign_in_at IS NULL`). Formular "+ Per E-Mail einladen" ruft `admin-invite-user` auf.

**Tab "Sicherheit" (S-22, `src/components/admin/SecurityTab.jsx`):** letzter Monitor-Lauf (rot, wenn älter als 2 Std.), die letzten 50 Alarme und Testmails (Regel, Anzahl, „Mail gesendet“ bzw. Fehlercode) und die neueste Wochenübersicht, aus `admin-security`. Leerer Zustand: „Keine Auffälligkeiten.“

**Tab "Feedback":** oben Abschnitt **„Supervision“** (letzte 26 Wochen, aufklappbar: Empfehlung + geprüftes Protokoll, aus `admin-feedback`), darunter alle `user_feedback`-Einträge inkl. Name/E-Mail, sortiert nach Datum.

**Zugang (S-06):** nur über `AdminRoute` mit zweitem Faktor (`AdminMfaScreen`). Link „Zweites Gerät für den Admin-Code hinzufügen“, solange weniger als zwei Faktoren eingerichtet sind. Ladefehler werden angezeigt (kein stilles Scheitern); `403 mfa_required` → Code-Abfrage. Info-Zeile „N Konten seit über 24 Monaten ohne Anmeldung“ (`inactiveCount`, S-15 — nur Anzahl, keine Löschaktion).

---

#### ProfileScreen (`/profile`)

**Rolle:** Konto, Einstellungen, Rechtliches. Erreichbar über den Avatar (`ProfileButton`), kein Tab.

- **Statistik (seit U1):** Gespräche · Erkenntnisse · Reflexionstage. Gespräche und Reflexionstage kommen aus `get_conversation_history()` (nur Gespräche mit eigener Nachricht): Gespräche = Anzahl gesamt, Reflexionstage = Anzahl verschiedener lokaler Kalendertage mit begonnenem Gespräch. Ladefehler → „–“ und `conversation_stats_failed`.

- **„Zur Lernbasis beitragen“** (`LearningConsentCard`, S-13): Schalter (Standard aus) → Erklär-Sheet → RPC `set_learning_opt_in`; Rücknahme über Bestätigungs-Sheet, danach „Erledigt. N Beiträge wurden gelöscht.“ Der Schalter zeigt immer den Stand aus dem Profil (kein Erfolg ohne Erfolg); Sheets per `createPortal`.
- **„Konto zusätzlich schützen“** (`SecurityCard`, S-06b, freiwillig): ohne Faktor Text + „Einrichten →“ → `MfaEnrollFlow` (Gerätename „Friedensstifter“) → `mfa-recovery codes:generate { afterEnroll: true }` → `RecoveryCodesView` (10 Codes einmalig, „Codes kopieren“, „Ich habe sie gesichert“) → Mail „Zweiter Faktor eingerichtet“. Scheitert das Erzeugen der Codes, bleibt ein sichtbarer Hinweis mit „Noch einmal versuchen“. Mit Faktor: Geräteliste, „Weiteres Gerät hinzufügen“, „Neue Wiederherstellungscodes“ (alte werden ungültig), „Zweiten Faktor entfernen“ (Bestätigungs-Sheet → `disable`). Nach einer Wiederherstellung Hinweis „Du bist wieder angemeldet. Dein zweiter Faktor wurde entfernt …“ mit „Jetzt einrichten →“.
- **„Meine Daten herunterladen“** (`DataExportSheet`, S-16): Erklärtext → „Datei erstellen“ → `export-my-data` → Download als Blob; 429 → „Du hast heute schon drei Exporte erstellt. Morgen geht es wieder.“
- **Phase (U4):** unter dem Namen eine ruhige Zeile aus `get_access_state()` („Kennenlernen · Gespräch n von m“, „Ruhemodus – alles, was du erkannt hast, bleibt sichtbar“, „Begleitung“); bei Testern zusätzlich „Beta“. Kein Countdown. **Mit Abo (Paket Z):** „Begleitung · verlängert sich am TT.MM.JJJJ“ bzw. „… endet am …“ (`cancel_at_period_end`) bzw. „… ab dem … Begleitung“ (geplante Herabstufung `pending_tier`), darunter „Abo verwalten →“ (`PortalButton`).
- **Konto löschen mit Abo (Paket Z):** zusätzlicher Satz „Dein Abo endet damit sofort. Bereits bezahlte Tage werden nicht erstattet.“; `502 subscription_cancel_failed` → eigener Hinweis, nichts gelöscht.
- Einstellungsliste: Profil bearbeiten, Wie es funktioniert, Begleitung (nicht für `premium`, → `/begleitung`), Beta-Feedback/-Fragebogen (Tester), Coaching-Vereinbarung, Datenschutzerklärung, Meine Daten herunterladen (`export-my-data`, S-16), Impressum, Abmelden, **Konto löschen** (`delete-account`, siehe [Abschnitt 5](#delete-account--account-löschung)).

---

#### CoachingAgreementScreen (`/vereinbarung`)

**Rolle:** Nachträglicher Rückblick auf die beim Einstieg (`/start/3`) bzw. bei der erneuten Zustimmung (`ConsentGateScreen`) akzeptierte Coaching-Vereinbarung.

- Nachweis-Card oben: Zustimmungsdatum (`coaching_agreement_accepted_at`, Format „12. Juli 2026, 14:32 Uhr") oder Fallback-Hinweis bei fehlendem Datum
- Vertragstext aus `CoachingAgreementContent.jsx` — derselbe Text wie im Einstieg `/start/1–4` (single source of truth)

---

#### WellnessCheckScreen (`/wellness`)

**Rolle:** Einstiegspunkt für emotionalen Check-in vor dem Coaching.

**Flow:**
1. 1–10 Skala (ScaleSlider-Komponente)
2. Context-Chips (abhängig vom Score-Bereich: low/medium/high)
3. Optional: Freitext
4. Navigation zu `/coach` mit `state: { wellnessCheck: { score, label, emoji, context } }`

---

#### Verstehen und Innere Stimmen (bis U2 eigene Screens)

Seit U2 Teil des Spiegels (Ebene Muster und Muster-Detail). `/verstehen`, `/verstehen/aus-gespraechen`, `/stimmen` → Weiterleitung `/mirror/muster`; `/verstehen/:key` → `/mirror/muster/:key`. Die fünf Muster (Keys = `pattern_references.pattern_key`) stehen in `src/lib/patterns.js`:
- `rueckzug_unter_druck` — Rückzug unter Druck
- `innerer_kritiker` — Der innere Kritiker
- `uebernahme_reflex` — Übernahme-Reflex
- `harmonie_um_jeden_preis` — Harmonie um jeden Preis
- `perfektionismus_blockade` — Perfektionismus-Blockade

Namensgebung der Stimmen passiert weiterhin **ausschließlich im Chat** — siehe [Innere-Stimmen-Flow](#innere-stimmen-flow).

---

#### StartFlow (`/start/1–4`, Paket K W3)

**Rolle:** Einstieg für neue Nutzer vor der Registrierung. Ersetzt den alten OnboardingFlow (unten nur noch als Historie).

| Schritt | Komponente | Inhalt |
|---|---|---|
| 1 | StartExpect | Was dich erwartet, Verantwortung, kein Therapieersatz, TelefonSeelsorge · „Anmelden“ |
| 2 | StartWhyMemory | `WhyMemoryBlock`, „Wie wir deine Daten schützen ›“ als Sheet |
| 3 | ConsentStep | Kurzfassung, Kennzeichnung „vorläufig“, Links Vereinbarung/Datenschutz/Impressum, zwei getrennte Häkchen (Vereinbarung, Art. 9), „Lieber nicht“ → `DeclineSheet` |
| 4 | StartAccount | E-Mail, Passwort (12), 18+, Einladungscode; Zustimmung reist als Signup-Metadaten (`consent_art9`, `agreement_accepted`, Versionen 2.0) |

Bestandsnutzer und Eingeladene: `ConsentGateScreen` (siehe ProtectedRoute). Zustimmung über RPC `accept_consent_v2`.

#### OnboardingFlow (entfernt in Paket K W3)

**Rolle (bis W3):** Ersteinrichtung für neue User vor der Registrierung.

**Schritte:**
| Schritt | Komponente | Inhalt |
|---|---|---|
| 1 | Step1Welcome | Begrüßung, Produktversprechen |
| 2 | Step2Question | Bereichswahl (Arbeit, Beziehung, Inneres, etc.) |
| 3 | Step3Reveal | Systemisches Coaching erklären (hier darf der Begriff fallen) |
| 3b | Step3bAgreement | Coaching-Vereinbarung — Zustimmung (nutzt `CoachingAgreementContent`) |
| 4 | Step4Auth | E-Mail + Passwort (Registrierung mit Einwilligung und Häkchen „Ich bin mindestens 18 Jahre alt.“ → Metadaten `age_confirmed`, S-11) / Login; Magic Link nur für bestehende Konten (`shouldCreateUser: false`) |

Bestandsnutzer ohne `age_confirmed_at` sehen einmalig `AgeConfirmSheet` (in `AppShell`): „Ja, ich bin mindestens 18“ → RPC `confirm_age`; „Ich bin jünger“ → Hinweis auf 116 111 und den Löschweg im Profil (kein automatisches Löschen).

---

### 4.2 Komponenten

#### UI-Komponenten (`src/components/ui/`)

| Komponente | Props | Verhalten |
|---|---|---|
| `Button` | `variant`, `disabled`, `onClick` | `primary` = bg-accent; `secondary` = outlined; `ghost` = transparent; `white` = hellgrau |
| `Card` | `children`, `className`, `onClick` | bg-surface, border, rounded-lg, shadow-sm |
| `Badge` | `children`, `variant` | `free` = standard; `premium` = gold; `pro` = dunkelgrün |
| `Avatar` | `name`, `size` | Initialen-Kreis in bg-accent; Größen: sm/md/lg |
| `ScaleSlider` | `onSubmit` | Range 1–10, visuelles Feedback, Skalierungshinweis aus `SCALING_HINTS` |

#### Layout-Komponenten (`src/components/layout/`)

**AppShell:**
- Wrapper für Home/Coach/Spiegel/Profil/Verstehen/Stimmen/Feedback
- Rendert `<main className="pb-20">` + `<Outlet />` + `<BottomNav />`

**BottomNav:**
- 3 Tabs: Heute (`Sun`) · Gespräch (`MessageCircle`) · Spiegel (`Sparkles`)
- Aktiver Tab: accent-Farbe + stärkere Strichstärke
- Kein Zähler für Ungelesenes (CLAUDE.md „Einladen statt drängen“, seit U1)

**ProfileButton:**
- Avatar (`sm`) mit `aria-label="Profil öffnen"` → `/profile`, in den Headern von Heute, Gespräch und Spiegel
- `safe-area-inset-bottom` für iPhone-Notch

#### Coach-Komponenten (`src/components/coach/`)

**ChatBubble:**
- `role === 'assistant'` → bg-surface, links ausgerichtet, abgerundete Ecken links unten scharf
- `role === 'user'` → bg-accent, rechts ausgerichtet, Ecken rechts unten scharf
- `isError === true` → opacity-70, italic, Fehlertext

**ChatInput:**
- Textarea mit dynamischer Höhe (38–120 px)
- **Seit Paket K:** Mikrofon ausgeblendet, solange `VOICE_MISTRAL_ENABLED = false`; darunter dauerhaft „Du schreibst mit einer KI.“ (`CHAT_AI_NOTICE`)
- **Seit Paket P:** offline ist Senden gesperrt (`useOnline`), der getippte Text bleibt stehen
- Mikrofon-Button (wenn aktiv) togglet `useVoiceInput`; während der Aufnahme erscheint Interim-Text in der Box
- Erster Tipp auf das Mikrofon (einmal pro Gerät, `localStorage` `fs_voice_hint_v1`, S-11): Hinweis „Kurz zur Spracheingabe“ (Browser-Spracherkennung, ggf. Google/Apple) mit „Verstanden, Mikrofon starten“ / „Lieber tippen“
- `useVoiceInput` hört geduldig zu: `continuous` + stiller Neustart nach Pausen, Mikrofon aus nach 60 s ohne Sprache oder bei Berechtigungsfehlern; beim Senden wird die Aufnahme beendet
- Send-Button (`ArrowUp`-Icon) nur aktiv wenn `!isLoading && content.trim()`

**ConversationEndModal:**
- Erscheint nach „Neues Gespräch" wenn ein `suggested_insight` extrahiert wurde
- Editierbare Textarea (vorausgefüllt mit dem Vorschlag)
- Kategorie-Auswahl (Standard: `erkenntnis`)
- Bestätigen → Insight in `insights`-Tabelle speichern

**CrisisResponseCard:**
- Eigenständige Card statt Chat-Bubble (voller Breite, kein Sprechblasen-Layout, warmer `accent-light`-Ton statt Alarmfarben)
- `linkify()` erkennt Telefonnummern/URL im Fließtext per Regex und macht sie zu echten `tel:`/`https:`-Links (kein starres Parsen der Modell-Ausgabe); zweite Linie `safeHref()` lässt nur `tel:` und `https:` zu (S-08). Kein `dangerouslySetInnerHTML` im ganzen Frontend.

#### Profil-Komponenten (`src/components/profile/`)

**LearningConsentCard:** Opt-in zur Lernbasis (S-13), Texte wörtlich nach Lösungsdesign Paket B 5.3, Version `LEARNING_CONSENT_VERSION` aus `src/lib/consent.js`.

**SecurityCard / DataExportSheet:** siehe ProfileScreen (S-06b, S-16).

#### MFA-Bausteine (`src/components/mfa/`, S-06b)

Gemeinsam für `AdminMfaScreen`, `MfaChallengeScreen` und `SecurityCard`: `MfaCodeForm` (6-stelliger Code, sendet automatisch bei 6 Ziffern, Geräteauswahl), `MfaEnrollFlow` (startet `enroll`, zeigt QR-Code und Schlüssel, bestätigt den Code), `RecoveryCodesView` (Codes nur im Speicher der Ansicht), `RecoveryForm` (`mfa-recovery recover`, Fehlertexte für falschen Code und 429). Die Logik liegt in `src/lib/mfa.js`. Nie QR-Code, Schlüssel, Codes oder Wiederherstellungscodes loggen.

#### Begleitung und Zugang (`src/components/begleitung/`, `src/components/access/`, Paket Z)

**CheckoutButton:** `POST create-checkout-session { tier, interval }` → `{ url }`; nur `https://checkout.stripe.com/…` wird geöffnet (`window.location.assign`). `409 already_subscribed` → Hinweis + Portal. `useCheckoutReturn` liest `?checkout=success|cancel` einmal und entfernt den Parameter; `CheckoutReturnNotice` zeigt den Stand. Freigeschaltet wird **nie** durch die Rückkehr-URL, nur durch den Webhook – `BegleitungScreen` lädt die Phase alle 3 s neu (höchstens 10-mal, danach „dauert etwas länger“).

**PortalButton:** `POST create-portal-session` → `{ url }`, nur `https://billing.stripe.com/…`; `404 no_customer`, `429` mit eigenem Text.

**QuotaNotice / RestModeSheet:** siehe CoachScreen. „Begleitung intensiv →“ nur mit `INTENSIV_ENABLED`.

#### Legal-Komponenten (`src/components/legal/`)

**CoachingAgreementContent:** voller Text v2.0 aus `legalTexts.js` (`getAgreementSections()`, Abo-Abschnitte nur mit `PAYMENTS_ENABLED`), mit Kennzeichnung „vorläufig“; im Einstieg, bei der erneuten Zustimmung und im Rückblick. Dazu `ConsentStep`, `LegalSheet`, `DeclineSheet`, `PreliminaryNotice`.

---

### 4.3 Hooks

#### `useAuth`

**Zuständigkeit:** Gesamter Auth-Lifecycle + Profil-Management.

```
Exports:
  user            — Supabase Auth User
  session         — Supabase Session (mit access_token)
  profile         — profiles-Zeile aus DB (select('*') — inkl. is_admin, session_limit, etc.)
  loading         — Boolean (initiales Session-Laden)
  mfaGate         — 'ok' | 'required' (aal1 + verifizierter Faktor → Code-Abfrage, S-06b)
  refreshMfa()    — Sitzung erneuern und Sicherheitsstufe neu prüfen (= requestMfaCheck aus lib/mfa.js)

  signUp(email, password, displayName, meta)  — meta aus dem Einstieg `/start/4` (Zustimmung v2.0, 18+) landet über handle_new_user im Profil (seit 040 nur v2.0)
  signIn(email, password)
  sendMagicLink(email)                — nur bestehende Konten (shouldCreateUser: false)
  signOut()
  updateProfile(updates)
  refreshProfile()                    — Profil neu laden (z. B. nach Opt-in oder Einlösen eines Codes)
  checkConsent(profileData)           → 'missing' | 'outdated' | 'valid'
  checkCoachingAgreement(profileData) → 'missing' | 'outdated' | 'valid'
  checkLegalConsent(profileData)      → beides v2.0? 'valid' | 'missing' | 'outdated'
  acceptConsentV2()                   — RPC accept_consent_v2, danach Profil neu laden (wirft bei Fehler)
  profileReady                        — Profil für genau diesen Nutzer geladen (vorher entscheidet App nichts)
```

**Besonderheiten:**
- Session wird beim Mount aus Supabase wiederhergestellt (`onAuthStateChange`, Verarbeitung per `setTimeout` außerhalb des Auth-Callbacks)
- **Reihenfolge (S-06b):** erst `getAuthenticatorAssuranceLevel()`, dann – nur wenn frei – das Profil. Bei `aal1` mit Faktor bleibt `profile = null` und `mfaGate = 'required'`; das führt nie ins Onboarding. Beim Zurückkehren in den Tab (`visibilitychange`) wird die Stufe erneut geprüft.
- **Kein gemeinsamer Context:** Jede Komponente mit `useAuth()` hat einen eigenen Zustand. Der globale Fehlerpfad (`403 mfa_required` aus Functions, `42501 mfa_required` aus RPCs → `checkMfaResponse` / `reportIfMfaRpcError`) erneuert deshalb einmal die Sitzung; das Ereignis `TOKEN_REFRESHED` lässt jede Instanz neu prüfen.
- Pending Invite Code: Wenn ein Code in `localStorage` liegt (`pendingInviteCode`, gesetzt im Einstieg `/start/4`), wird er nach E-Mail-Verifikation beim ersten Login automatisch eingelöst
- Consent-Versioning: `consent_version = '2.0'`, `coaching_agreement_version = '2.0'` (aus `src/content/legalTexts.js`), Lernbasis `learning_opt_in_version = '2.0'` (`src/lib/consent.js`)
- `profile` enthält seit v3.x auch Admin-/Beta-/Invite-Felder — keine eigenen Hook-Exporte dafür nötig, da `select('*')` bereits alles lädt

---

#### `useChat`

**Zuständigkeit:** Gesamter Gesprächs-State — von Erstellen bis Streaming bis Fortsetzen.

```
Exports:
  messages             — Array<{ role, content, id, isError, messageType, status, clientMessageId, serverId, action }>
  isLoading            — Boolean (während Stream läuft)
  conversationId       — UUID | null

  startNewConversation(isFirstEver)
  startWellnessConversation(wellnessCheck)
  startBriefingConversation()          — vom Frontend seit U3 nicht mehr genutzt
  startEntryContextConversation(entryContext)
  resumeWithOpening(conversationId)    — U3: Verlauf laden + start 'resume' (Coach knüpft an), keine neue Konversation
  sendMessage(content, inputMode)
  retryMessage(msg)                    — erneutes Senden einer gescheiterten Nachricht (gleiche clientMessageId)
  extractMemoryAndInsight()            — { mode: 'extract', conversationId }, der Server liest das Gespräch
  loadConversation(conversationId)     — lädt bestehendes Gespräch aus dem Verlauf, kein countSession()
  setMessages(messages)
```

**Optionen (Callbacks):** `onSessionLimit(info)` (`429 session_limit`, seit Paket Z mit `{ reason: 'quota'|'starts', periodEnd }`), `onConversationCap()` (`409 conversation_cap`), `onQuotaReached({ periodEnd, content })` (`409 quota_reached`: Nutzer-Blase und Platzhalter entfernt, nichts gespeichert), `onQuotaNotice(meta.quota)` (Hinweis ab 80 % bzw. Kulanz aus dem Stream).

**Interne Refs (keine Re-Renders):**
- `countedConvIdsRef`, `pendingConvRef` — UX-Limitprüfung und Konversationsanlage
- Kein Coach-Kontext im Client: Akte, Briefing, Resonanzkarte, Gedächtnis und RAG lädt `chat` selbst (S-12)

**Ablauf in `sendMessage` (seit S-12, Paket B Welle 2a — kein Client-Write in `messages`):**
1. `clientMessageId = crypto.randomUUID()`; Nutzer-Nachricht nur in den State (`status: 'sending'`)
2. Leere Assistant-Message als Platzhalter einfügen
3. POST `/functions/v1/chat` mit `{ conversationId, message: { clientMessageId, content, inputMode }, requestId }`
4. Meta-Chunk `{ meta: { userMessageId, assistantMessageId, messageType } }` → Nachricht `status: 'sent'`, `messageType` (z. B. `crisis_response`) am Platzhalter
5. Jedes `data: {"text": "..."}` an den Platzhalter anhängen (SSE-Zeilen werden gepuffert)
6. Gespeichert wird **beides vom Server**; der Client speichert nichts
7. Fehler **vor** dem Meta-Chunk (Netz, 5xx, Rate-Limit, kein Kennenlern-Start mehr; `409 conversation_cap` dagegen entfernt die Nachricht und meldet `onConversationCap`): Nachricht `status: 'failed'` → „Nicht gesendet – nochmal versuchen“ (`retryMessage`, idempotent). Fehler **nach** dem Meta-Chunk: Platzhalter zeigt den Aussetzer-Text, der Server speichert die Antwort trotzdem zu Ende.
8. `409 client_outdated` (nur alte, gecachte App-Versionen kennen das alte Format; die neue zeigt): Hinweis „Es gibt eine neue Version der App. Tipp hier, um sie zu laden.“ → `location.reload()`

**Eröffnungen:** `startWellnessConversation`/`startBriefingConversation`/`startEntryContextConversation`/`resumeWithOpening` laufen über `startStreamedOpening` → `{ conversationId, start: 'wellness' | 'briefing' | 'entry' | 'resume', wellnessCheck?, entryContext? }`. Mit `existing: { convId, messages }` (nur `resume`) wird **keine** Konversation angelegt; die Coach-Nachricht wird an den geladenen Verlauf angehängt. `startNewConversation` zeigt den Pool-Text sofort an und lässt ihn vom Server speichern (`start: 'first' | 'standard'`, `openingIndex`; ohne Modellaufruf, zählt **nicht** als Gespräch).

---

#### `useMemory`

**Zuständigkeit:** Legacy Coach-Gedächtnis (`user_memory`-Tabelle). Wird als Fallback verwendet wenn `coach_file_entries` noch leer sind.

```
Exports:
  memory        — { themes, patterns, strengths, context } | null
  updateMemory(updates)
```

---

#### `useStreak`

**Zuständigkeit:** Tagesstreak-Pflege (`streak_count`, Tage in Folge). Seit U1 wird der Wert nirgends angezeigt; die Profil-Statistik zeigt Reflexionstage (siehe ProfileScreen).

```
Exports:
  updateStreak()   — async, prüft streak_last_date und inkrementiert

Logik:
  Heute = streak_last_date  → nichts tun (bereits gezählt)
  Gestern = streak_last_date → streak_count + 1
  Älter oder null           → streak_count = 1 (Reset)
```

---

#### `useVoiceInput`

**Zuständigkeit:** Web Speech API Wrapper.

```
Exports:
  isListening   — Boolean
  isSupported   — Boolean (false auf Browsern ohne SpeechRecognition)
  toggle()      — Start/Stop
  start()
  stop()

Config: language = 'de-DE', continuous = false, interimResults = true
Callbacks: onTranscript(finalText), onInterim(interimText)
```

Spracheingabe **landet immer nur im Textarea** — kein automatisches Absenden.

---

### 4.4 Lib-Module

#### `src/lib/supabase.js`

```js
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

Einzige Stelle im Frontend wo der Supabase-Client initialisiert wird. Alle Hooks importieren ihn von hier.

---

#### `src/lib/functions.js`

Gemeinsame Bausteine für alle Edge-Function-Aufrufe (S-09): `functionUrl(name)` und `functionHeaders(accessToken, extra)` (Authorization, Content-Type, `apikey`, **`x-region: eu-west-1`** (seit 20.11.2026 dieselbe Region wie die Datenbank; Paket C-1 hatte Frankfurt gewählt, die Datenbank liegt aber in Irland)). Für künftige `supabase.functions.invoke`-Aufrufe: Option `region: INVOKE_REGION`. Jeder neue Function-Aufruf nutzt diese Bausteine — sonst entscheidet Supabase die Region selbst.

---

#### `src/lib/prompts.js`

Zentrale Datei für alle UI-nahen Texte und Konfigurationen.

| Export | Typ | Inhalt |
|---|---|---|
| `DAILY_IMPULSE_QUESTIONS` | Array (14) | Tägliche Reflexionsfragen |
| `OPENING_MESSAGES` | Array (3) | Standard-Gesprächseröffnungen — **Kopie in `chat/index.ts`**, bei Änderungen beide anpassen |
| `FIRST_OPENING_MESSAGE` | String | Eröffnung beim allerersten Gespräch — dito |
| `SCALING_HINTS` | Object {1..10} | Skalierungsfrage je Score |
| `WELLNESS_SCORES` | Object {1..10} | `{ label, emoji, color }` |
| `WELLNESS_CONTEXT_CHIPS` | Object | Chips für `low`/`medium`/`high` |
| `getDailyImpulse()` | Funktion | Gibt Frage basierend auf `Date.now()` zurück |
| `getWellnessRange(score)` | Funktion | `'low'` / `'medium'` / `'high'` |

---

#### `src/lib/rateLimit.js`

`readRateLimit(response)` erkennt `429 { error: 'rate_limited', retryAfter }` (abgegrenzt von `429 session_limit`, U4), `rateLimitMessage(retryAfter)` liefert den Hinweistext (Minuten- bzw. Tageslimit, immer mit Telefonseelsorge).

---

#### `src/lib/consent.js`

Nur noch `LEARNING_CONSENT_VERSION = '2.0'`. Einwilligung und Vereinbarung: `CONSENT_VERSION` / `AGREEMENT_VERSION` in `src/content/legalTexts.js`. Bei inhaltlicher Änderung eines Textes die Version erhöhen (Server-seitig in Migration 040/041 festgelegt).

---

#### `src/lib/logger.ts`

Frontend-Logger. Schreibt auf die Browser-Console und **zusätzlich** für `info`/`warn`/`error` in die `app_logs`-Tabelle — **nur wenn eingeloggt** (`setLoggerUserId()` gesetzt), sonst nur Console. Scheitert der Insert, kommt einmalig ein `console.warn` (ohne Endlosschleife).

Jedes `data`-Objekt läuft vor Console und DB durch **`sanitizeLogData()`** (Security-Paket A, S-04): Schlüssel mit Inhalten (`content`, `messages`, `text`, `email`, `display_name`, `excerpt`, `description`, `summary`, `details`, `body`, `topic` …) werden zu `{ redacted: true, length }`, Strings auf 200 Zeichen gekürzt, Arrays zu `{ type, length }`. Das Netz ersetzt nicht saubere Aufrufstellen — siehe Log-Regel in [Abschnitt 10](#sicherheitsmuster-v2-security-paket-a).

```ts
export function setLoggerUserId(id: string | null)
export function createLogger(source: string)

// Methoden:
logger.debug(msg, data)   // nur Console
logger.info(msg, data)    // Console + DB
logger.warn(msg, data)    // Console + DB
logger.error(msg, data)   // Console + DB (mit stack_trace)
```

---

## 5. Backend — Supabase Edge Functions

Alle Edge Functions laufen in Deno und haben Zugriff auf `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` und `OPENAI_API_KEY`. **Imports haben feste Versionen** (`npm:@supabase/supabase-js@2.119.0`, `npm:@anthropic-ai/sdk@1.10.0` bzw. `https://esm.sh/@anthropic-ai/sdk@1.10.0`) — ohne Version zieht jeder Deploy die neueste Version (Ausfall 19.11.2026). Schalter-Secrets: `RAG_LEARNING_ENABLED` (Lernbasis, `1` = an), `SUPERVISION_IN_PROMPT` (BLOCK 5, `1` = an) — beide seit 19.11.2026 an. `admin-invite-user` und die Stripe-Functions nutzen optional `SITE_URL` (Fallback: `https://app.friedensstifter.coach`), `supervision` das Secret `CRON_SECRET`. Paket Z: `STRIPE_SECRET_KEY` (eingeschränkter Schlüssel), `STRIPE_WEBHOOK_SECRET`, `PAYMENTS_ENABLED` (`1` = Bezahlseite/Portal/Kontingent an), `INTENSIV_ENABLED` (nicht gesetzt = „Begleitung intensiv“ aus).

**Sicherheitsmuster v2 (Pflicht, Security-Paket A):** Jede Function ruft nach dem CORS-Preflight als Erstes `requireUser(req)` bzw. `requireInternalCaller(req)` aus `_shared/auth.ts` auf. Die Identität kommt **ausschließlich** aus dem JWT, nie aus dem Body; jede `conversationId` wird mit `assertConversationOwner()` geprüft (403). Gateway-Schalter „Verify JWT“ ist aus (`supabase/config.toml`), die Prüfung passiert im Code. Details: [Abschnitt 10](#sicherheitsmuster-v2-security-paket-a).

**CORS und Region (S-09, Paket C):** Alle Functions holen ihre CORS-Header aus `_shared/cors.ts` (`corsHeaders('POST, OPTIONS')`, interne Functions zusätzlich `x-cron-secret`). Erlaubt ist u. a. `x-region`; das Frontend schickt `x-region: eu-west-1`, die Antwort trägt `x-sb-edge-region: eu-west-1` (Angriffstest #32).

---

### `chat` — Haupt-KI-Proxy

> **Paket K W3:** Nach `requireUser` ruft `chat` `requireConsent` (`_shared/consent.ts`): ohne Zustimmung v2.0 → `403 consent_required` (alle Modi, auch Howto/Extraktion), DB-Fehler → `503 consent_check_failed`. RAG (`findSimilarExperiences`) ruft OpenAI nur mit `RAG_LEARNING_ENABLED=1` und mindestens einem freigegebenen Eintrag; sonst `ragStatus` `skipped_learning_disabled` / `skipped_no_entries`.

**Aufgerufen von:** `useChat.js` bei jedem `sendMessage` und bei allen `start*`-Funktionen, `HowItWorksScreen` (Howto).

**Input (Gesprächsmodus, seit S-12 Welle 2a):**
```json
{
  "conversationId": "uuid",
  "message":        { "clientMessageId": "uuid", "content": "...", "inputMode": "text|voice" },
  "requestId":      "abc12345"
}
```
oder für Eröffnungen (ohne `message`):
```json
{
  "conversationId": "uuid",
  "start":          "first|standard|wellness|briefing|entry",
  "openingIndex":   0,
  "wellnessCheck":  { "score": 4, "label": "Nicht so gut", "emoji": "😕", "context": "..." },
  "entryContext":   { "source": "pattern", "topic": "innerer_kritiker" }
}
```
Howto: `{ "howtoMode": true, "messages": [...] }` (Verlauf weiterhin vom Client, nichts wird gespeichert). Extraktion: `{ "mode": "extract", "extractMemory": true, "conversationId": "uuid" }`.

**Verlauf und Speicherung (S-12):** Im Gesprächsmodus lädt `chat` den Verlauf aus der DB (bis 400 Zeilen, ans Modell die letzten 60; gleiche Rollen hintereinander werden zusammengeführt). Ein mitgeschicktes `messages[]` wird ignoriert (`body_messages_ignored`). Die Nutzer-Nachricht wird **nach** `consume_session` per Upsert auf `(conversation_id, client_message_id)` gespeichert — eine Wiederholung legt nichts doppelt an; ist sie schon beantwortet, kommt die gespeicherte Antwort zurück (`meta.replayed`). Die Antwort bekommt vorab eine ID, wird per `EdgeRuntime.waitUntil` auch nach einem Client-Abbruch zu Ende generiert und gespeichert (D-7, `metadata: { model, client_aborted, stop_reason, stream_failed }`; Fehler → `assistant_insert_failed`). `start: 'first' | 'standard'` speichert nur den Pool-Text (Kopie von `src/lib/prompts.js`), ohne Modellaufruf und ohne `consume_session`. Krisen-Events bekommen die `message_id` der Nutzer-Nachricht.

**Start `resume` (U3):** nur auf einem eigenen Gespräch mit mindestens einer Nutzer-Nachricht (sonst `400 invalid_start`, Log `resume_rejected`). Statt BLOCK 1 (Briefing über das letzte *andere* Gespräch) setzt `buildSystemPrompt` den Block **FORTSETZUNG** aus diesem Gespräch (`summary`, `open_thread`, relative Zeit der letzten Nachricht): kurz anknüpfen, höchstens eine Frage, Ausweg, keine Bewertung; bei `open_thread_intensity = 'high'` ohne Thema. Kein Wellness-/Entry-Kontext, kein Wirkmechanismus-Angebot, keine Stimmen-Einführung in dieser Eröffnung. `consume_session` läuft wie bei jeder Eröffnung (idempotent). Log `resume_started`.

**Weiterarbeiten (U5a):** `start: 'resume'` + `insightId`. `chat` lädt die Erkenntnis selbst (eigene Zeile, `conversation_id` = dieses Gespräch, nicht `disagree`; fremd → `403`, sonst `400 invalid_insight`, Log `weiterarbeiten_rejected`) und setzt statt FORTSETZUNG den Block **WEITERARBEITEN**: Zeitbezug ab Entstehung der Erkenntnis + Thema (Kurztitel; Platzhalter oder `high` → ohne Thema) · Erkenntnis wörtlich · genau eine Frage (`ziel`: „Wie ist es dir damit ergangen?“; `unclear`: Klärungsangebot) · Ausweg „Oder bringst du heute etwas anderes mit?“ · keine Bewertung. Kein Erkenntnistext vom Client im Prompt. Log `weiterarbeiten_started` (IDs, Kategorie, Einschätzung, Tage).

**Howto-Fakten (`HOWTO_SYSTEM_PROMPT`, seit U3):** Aufbau Heute · Gespräch · Spiegel (Erkenntnisse · Muster · Entwicklung), Reflexionstage im Profil, Spiegel ohne Grenze.

**Modellaufruf (T0, seit 19.11.2026):** `COACH_MODEL` mit `COACH_REQUEST_DEFAULTS`, Verlauf durch `ensureEndsWithUser`. Nach dem Stream liest `finalMessage()` Nutzung und Stop-Grund: `coach_usage` (`conversationId`, `mode`, `inputTokens`, `outputTokens`, `cacheReadTokens`, `stopReason`), bei `max_tokens` → `coach_response_truncated`, bei anderen unerwarteten Stop-Gründen (z. B. `refusal`) → `coach_response_unexpected_stop` (beide `infoOnly` in `monitorRules.ts`). Kosten je Gespräch: `supabase/diagnostics/coach-usage.sql`.

**Altes Format:** `messages[]` ohne `message`/`start` (Gesprächsmodus) bzw. Extraktion ohne `conversationId` → `409 client_outdated` (seit Welle 2b, `LEGACY_FORMAT_ALLOWED = false`; geloggt als `legacy_format`). Howto ist nicht betroffen. Welle 2b wurde vorgezogen: Die Aktivitätsprüfung vom 19.11.2026 zeigte keine echten Nutzer seit 02.09.2026, alle `legacy_format`-Aufrufe stammten aus dem Angriffstest.

`memory`, `coachFile`, `briefing`, `ragContext`, `supervisionNote` im Body werden **ignoriert** (S-12). `wellnessCheck` (Score 1–10, Texte gekürzt) und `entryContext` (Quelle aus fester Liste, Texte gekürzt) werden geprüft übernommen – sie steuern nur den eigenen Prompt.

**Serverseitiger Kontext (`loadCoachContext`, parallel zur Krisenerkennung):** `coach_file_entries` (inkl. `linked_value`), `coachee_profile`, `resonance_map`, `user_memory` (nur wenn die Akte leer ist), letztes abgeschlossenes Gespräch ohne das laufende (→ Briefing), `conversation_context` (gespeichertes RAG-Ergebnis) und – nur mit Secret `SUPERVISION_IN_PROMPT=1` – die neueste `supervision_logs.improvement_recs`. Fehlt eine Quelle, läuft das Gespräch ohne diesen Block weiter; protokolliert wird `coach context partially unavailable` mit Tabellenname und Fehlercode. RAG (`_shared/rag.ts`): beim ersten Nutzer-Input eines Gesprächs Embedding (Timeout 2,5 s) + `match_experiences`, Ergebnis in `conversation_context`; danach aus der DB.

**Output:** Server-Sent Events Stream
`data: {"meta": {"messageType": "standard|crisis_response", "userMessageId": "…", "assistantMessageId": "…"}}` (vor dem ersten Text-Chunk; IDs nur im neuen Format) → `data: {"text": "Hallo"}` (wiederholt) → `data: [DONE]`. Standard-Eröffnung: JSON `{ ok, assistantMessageId, content }`.

**Modi:** Gesprächsmodus (Standard, `conversationId` **Pflicht**), `howtoMode` (FAQ, zählt nicht), `extractMemory` (Gedächtnis-Extraktion, zählt nicht). Howto und Extraktion laufen auch bei erreichtem Limit.

**Grenzen:** Body ≤ 200 KB, `message.content` ≤ 8.000 Zeichen (`413`), `clientMessageId` muss eine UUID sein (`400`). Howto/Legacy-`messages[]` ≤ 400 Einträge. Ans Modell gehen höchstens die letzten 60 Nachrichten.

**Vor dem eigentlichen Prompt-Aufbau, in dieser Reihenfolge:**
0. **Auth + Eigentum** — `requireUser`, Body-Limits, **Rate-Limit** je Modus (`enforceRateLimit`, 429 `rate_limited`, siehe [Abschnitt 9](#9-freemium-logik)), `assertConversationOwner` (400/401/403/413)
1. **Verlauf + Idempotenz** — Verlauf aus der DB laden; gleiche `clientMessageId` schon vorhanden → ggf. gespeicherte Antwort zurückgeben
2. **Krisenerkennung** (`crisisDetection.ts`) — nur bei echter Nutzer-Nachricht im Gesprächsmodus. Bei `acute_risk` + Confidence ≥ medium wird `systemPrompt` **komplett ersetzt** durch `CRISIS_RESPONSE_BLOCK`; der Insert in `crisis_events` (über `admin`) folgt nach dem Speichern der Nutzer-Nachricht, mit deren `message_id`. Läuft **vor** der Limit-Prüfung: Eine Krisenantwort wird auch bei erreichtem Limit ausgeliefert (Entscheidung 18.11.2026).
3. **Kappung (U4)** — `admin.rpc('access_state_for', { p_user_id })`; ist `cap` gesetzt und hat das Gespräch schon `cap` Nachrichten → `409 { error: 'conversation_cap', cap }` (außer Krisenfall), nichts gespeichert, kein Modellaufruf, Log `conversation_cap_reached`. RPC-Fehler → fail-open, Log `access_state_failed` (Alarm).
4. **Sitzungszählung + Limit** — `userClient.rpc('consume_session', { p_conversation_id })` zählt atomar und idempotent pro Konversation (siehe [Abschnitt 6](#rpcs)). `allowed: false` → `429 { error: 'session_limit', phase, reason, periodEnd }` (seit Paket Z `reason: 'quota'` bei aufgebrauchtem Monatskontingent, sonst `'starts'`; außer Krisenfall), die Nutzer-Nachricht wird dann **nicht** gespeichert. RPC-Fehler → `500`, kein Durchlassen.
4b. **Monatskontingent (Paket Z)** — nur bei neuer Nutzer-Nachricht im Gesprächsmodus und **nicht** im Krisenfall: `admin.rpc('consume_message', { p_user_id, p_conversation_id, p_client_message_id })`. Ohne Abo `no_quota` (keine Wirkung). `allowed: false` → `409 { error: 'quota_reached', periodEnd }`, nichts gespeichert. RPC-Fehler → `503 quota_check_failed` (Alarm). Hinweis ab 80 % bzw. in der Kulanz → `meta.quota { remaining, grace, periodEnd }` im ersten Meta-Chunk. Scheitert danach das Speichern, der Start des Streams oder kommt eine leere Antwort → `refund_message` (Log `quota_refunded`, Fehler `quota_refund_failed`).
5. **Nutzer-Nachricht speichern** (Upsert, Fehler → `500 message_insert_failed`, kein Modellaufruf)
6. **"Innere Stimmen"-Taktung** — prüft auf einen unangesprochenen Kandidaten (`introduceVoice`, ab 2. Antwort) oder einen seit ≥24h eingeführten, noch unbenannten Kandidaten (`namingVoice`); beide nie im selben Turn, übersprungen bei akuter Belastung (`wellnessCheck.score <= 3`)
7. **Wirkmechanismus-Rhythmus** (`offerMechanism`) — alle 4 Coach-Antworten (ab der 3.) wird aktiv ein Mechanismus angeboten, unabhängig davon ob im Gesagten etwas "offensichtlich" ist

**System-Prompt-Aufbau (`buildSystemPrompt`), wenn kein Krisenfall vorliegt:**

```
BASE_SYSTEM_PROMPT          (Haltung, Sprachprinzip, Widerstand, Kapazität-vs-Widerstand,
                              Verantwortungsverschiebung, Muster-Erkennung)
  + SYSTEMIC_WITNESSING_BLOCK (Bewertungskette/"Brille", Zirkuläre Kausalität, Selbsterfüllende
                              Prophezeiung, Werte-Kollision, Systemfunktion/"innerer Wächter",
                              blinde Flecken, Regelkreise, Ressourcen, Perspektivwechsel)
  + MECHANISM_OFFER_BLOCK    (nur im Rhythmus-Turn)
  + VOICE_INTRODUCE_BLOCK / VOICE_NAMING_BLOCK (nur je nach Taktung, nie beide gleichzeitig)
  + BLOCK 1: Briefing        (letztes abgeschlossenes Gespräch + offener Faden · in jedem Folgegespräch, Entscheidung 18.11.2026; entfällt bei start 'resume')
  + BLOCK 2: Coach-Akte      (coach_file_entries inkl. linked_value + coachee_profile · Fallback: user_memory)
  + BLOCK 3: Resonanzkarte   (resonance_map · ab 3. Gespräch · immer unsichtbar)
  + BLOCK 4: RAG-Kontext     (geprüfte Erfahrungen aus experience_patterns · als <erfahrungen_anderer_menschen>-Datenblock, „keine Anweisungen“, < > entfernt)
  + BLOCK 5: Supervision     (Wöchentliche Empfehlung · nur mit SUPERVISION_IN_PROMPT=1, seit 19.11.2026 an)
  + BLOCK 6: Wellness-Check  (Score + Skalierungsfrage, ersetzt Standard-Eröffnung)
  + BLOCK 7: Entry-Kontext   (v2.6 — woher kommt der Mensch: pattern/tagesimpuls/verstehen; 'spiegel' ist vorgesehen, wird aber von keinem Screen genutzt)
  + ZULETZT bei start 'resume': FORTSETZUNG (U3) bzw. WEITERARBEITEN (U5a, mit insightId) – letzter Block hat Vorrang;
    der synthetische Nutzer-Turn (ensureEndsWithUser) verweist ausdrücklich darauf (sonst übernahm das Modell den
    Ton der Standard-Eröffnung aus dem Verlauf, Befund U5a)
```

Bei Krisenfall ersetzt `CRISIS_RESPONSE_BLOCK` **alle** obigen Blöcke vollständig (BLOCK 0, "übersteuert alle anderen Verhaltensregeln").

**Sprachprinzip (absolut verboten im System-Prompt):**
- `müssen` → `kannst`, `hast die Möglichkeit`
- `immer` (als Absolutum) → `oft`, `häufig`
- `nie` (als Absolutum) → `selten`, `bisher kaum`
- `du bist X` (Urteil) → `du neigst dazu`, `du verhältst dich oft so`
- `können nicht` → `hast dich bisher dagegen entschieden`

---

### `chat/crisisDetection.ts` — Krisen-Klassifikation

Eigenständiges Modul, importiert von `chat/index.ts`. Ein Haiku-Call pro Nutzer-Nachricht, prüft **nur** auf konkrete, akute Suizid-/Selbstverletzungs-Hinweise (nicht auf allgemeine Verzweiflung — die bleibt normales Coaching-Thema). Fail-safe: schlägt die Klassifikation selbst fehl, wird `acute_risk: false` angenommen — blockiert nie die normale Antwort.

---

### `post-conversation` — Post-Processing

> **Paket K W3:** ebenfalls `requireConsent`. Coach-Reflexionen: Prompt mit Anonymitätsregel, danach Prüfschritt `reviewLearningEntry` (ohne `low_quality`); abgelehnt oder Prüfung ausgefallen → nichts gespeichert (`reflection_rejected`, Alarm `reflection_review_failed`). Lernbasis nur mit `learning_opt_in_version = '2.0'`.

**Aufgerufen von:** `CoachScreen.runPostConversation()` — vier Trigger-Pfade (siehe CoachScreen-Sektion oben), nicht nur der Button-Klick.

**Input (seit S-12 Welle 2a):**
```json
{ "conversationId": "uuid" }
```
Den Verlauf (letzte 200 Nachrichten + Gesamtanzahl) liest die Function selbst aus der DB. Ein mitgeschicktes `messages` führt seit Welle 2b zu `409 client_outdated` (geloggt als `legacy_format`); die Eigentumsprüfung läuft davor.

**Sicherheit:** Nutzer nur aus dem JWT (`requireUser`). Ein mitgeschicktes `userId` wird ignoriert; weicht es ab, wird `userId mismatch` geloggt (Angriffssignal). `conversationId` ist Pflicht und wird **vor** allem anderen auf Eigentum geprüft. IDs aus der Modellausgabe (`entry_id`, `cluster_entry_ids`, `existing_voice_id`) werden nur übernommen, wenn sie zu den eigenen Einträgen/Stimmen gehören; alle Writes filtern zusätzlich auf `user_id` (Schutz gegen Prompt-Injection).

**Überspringt** wenn das Gespräch in der DB weniger als 3 Nachrichten hat. Idempotent über `conversations.post_processed_message_count` (Basis: Anzahl in der DB). Verarbeitet höchstens die letzten 200 Nachrichten.

**Ablauf:**

| Schritt | Prompt | Schreibt in |
|---|---|---|
| 1 | Kontext laden | coach_file_entries, coachee_profile, resonance_map, Gesprächsanzahl |
| 2 | SESSION_NOTES_PROMPT | session_notes (Werte per `clampScore()` auf 1–5 geklammert) + conversations.summary/open_thread + **`display_title` → `conversations.title`** (U3: Thema/Situation in Alltagssprache, 2–5 Wörter, keine Gegenüberstellungen, keine Wert-/Fachwörter; ungültig → `display_title_invalid`, Titel bleibt) |
| 3 | FILE_UPDATE_PROMPT | coach_file_entries (add/update/resolve), inkl. `linked_value` (Wert/Glaubenssatz hinter dem Muster) |
| **4b** | VOICE_CLUSTER_PROMPT | inner_voices — prüft erst gegen bestehende (auch unbenannte) Stimmen, sonst neuer Kandidat; Rollback der Stimmen-Zeile bei fehlgeschlagener Verknüpfung |
| 5 | PROFILE_UPDATE_PROMPT | coachee_profile (upsert) |
| 6 | ANONYMOUS_SUMMARY_PROMPT | experience_patterns (S-13: nur mit Secret `RAG_LEARNING_ENABLED=1`, `profiles.learning_opt_in` **und** bestandenem Prüfschritt `reviewLearningEntry`; mit `source_user_id`, `review_status = approved`; ohne Embedding kein Eintrag; Log-Codes `learning_disabled`, `learning_no_optin`, `learning_no_summary`, `learning_rejected` (Gründe als Text), `learning_embedding_failed`, `learning_entry_saved`) + pattern_references + insights |
| 7 | REFLECTION_PROMPT | coach_reflections (inkl. Kapazität-vs-Widerstand-Check, Optimierungs-/Schuld-Framing-Check) |
| 8 | RESONANCE_UPDATE_PROMPT (ab 3. Gespräch) | resonance_map (upsert) |

**Technische Details:**
- `max_tokens: 2000` pro Prompt (Anfang 2026 auf 1500 → 2000 angehoben, war zu knapp für Cluster-Beschreibung + Namensvorschläge)
- JSON-Code-Fence-Stripping vor `JSON.parse`
- `runPrompt()` loggt jeden Fehler statt ihn stillschweigend als `{}` zurückzugeben — **ohne Inhalte**: `{ label, parseError: 'parse_failed', outputLength, position? }` bzw. Fehlertyp/Status bei API-Fehlern (keine Rohausgabe-Preview mehr). Jeder DB-Write prüft und loggt sein eigenes Ergebnis (nur Fehlercode).
- Logging: `Started` / `Completed` / jeder Schritt einzeln via `_shared/logger.ts`

---

### `pre-session-briefing` — Eckdaten für Eröffnung und Einstieg

**Aufgerufen von:** `CoachScreen` beim Mount und bei „←“ zurück zum Einstieg.

**Gibt zurück:**
```json
{
  "briefing": { "daysSince": 3, "conversationCount": 12, "openThread": { "intensity": "low|medium|high" } },
  "recent": [ { "id": "uuid", "title": "Spannung im Team", "lastActivityAt": "…", "hasOpenThread": true, "moving": false } ],
  "latestActiveConversation": { "id": "uuid", "lastMessageAt": "…" }
}
```

`recent` (U3): bis zu 3 eigene, nachbearbeitete (`summary`) Gespräche mit mindestens einer Nutzer-Nachricht, neueste zuerst (durchsucht werden höchstens die 20 jüngsten). Platzhalter-Titel → `null`; bei `open_thread_intensity = 'high'` → `moving: true`, `title: null`. `latestActiveConversation` = jüngstes Gespräch mit eigener Nachricht (2-Stunden-Regel). Keine Akte, Resonanzkarte, Zusammenfassung oder Faden-Text (S-12; Angriffstest #9/#9b).

---

### ~~`rag-search`~~ — entfernt (S-12)

Die Function hat anonyme Erfahrungen anderer Nutzer an den Client geliefert. Die Suche läuft jetzt in `chat` über `_shared/rag.ts` (siehe oben); die Ergebnisse verlassen den Server nicht.

---

### `validate-invite-code` — Beta-Zugang (Selbstregistrierung)

**Aufgerufen von:** `StartAccount` (`/start/4`), nach Eingabe eines Invite-Codes.

- Validiert Code-Syntax + Gültigkeit + Max-Uses
- Ruft `redeem_invite_code` RPC über den `service_role`-Client auf (SECURITY DEFINER, **nur für service_role ausführbar**), ausschließlich für `user.id` aus dem JWT
- Setzt `profiles.plan = 'tester'`
- Loggt nie den Code selbst (Geheimnis), nur das Ergebnis

Zweiter, direkterer Weg zum gleichen Ziel: `admin-invite-user` (siehe unten) — beide Wege bestehen parallel.

---

### `admin-users` / `admin-feedback` / `admin-invite-user` — Admin-Bereich

Siehe [Abschnitt 10](#10-admin-bereich--sicherheitsmuster) für das gemeinsame Sicherheitsmuster. Kurzüberblick:

| Function | Methode(n) | Zweck |
|---|---|---|
| `admin-users` | GET, PATCH | Nutzerliste inkl. E-Mail/`last_sign_in_at` + `inactiveCount` (Konten > 24 Monate ohne Anmeldung, über `inactive_accounts_report`); setzt `is_beta_tester`/`session_limit` |
| `admin-feedback` | GET | Alle `user_feedback`-Einträge inkl. Name/E-Mail + die letzten 26 Supervision-Protokolle (`supervision_logs`, S-15) |
| `admin-invite-user` | POST | `auth.admin.inviteUserByEmail()` + setzt Beta-Rechte + `invited_at`/`invited_by` direkt |

Alle drei verlangen seit S-06 einen zweiten Faktor (`403 mfa_required`, geloggt als `mfa_required`).

### `backfill-embeddings` — Wartung

Trägt fehlende Vektoren in `experience_patterns` nach (z. B. nach einem OpenAI-Ausfall). Idempotent (nur `embedding IS NULL`, max. 100 pro Lauf), nur intern aufrufbar (`requireInternalCaller`). Aufruf aus dem SQL-Editor per `net.http_post` mit `x-cron-secret` aus Vault; Ergebnis nur als Zähler (`net._http_response`).

---

### `delete-account` — Account-Löschung

- Löscht ausschließlich `user.id` aus dem JWT (jede ID im Body wird ignoriert)
- **Schritt 0 (Paket Z, Z-E3):** Gibt es ein laufendes Stripe-Abo, wird es zuerst sofort beendet (`subscriptions.cancel`, `prorate: false`, `invoice_now: false`). Scheitert das → `502 subscription_cancel_failed` (Alarm), **nichts** wird gelöscht; ein bei Stripe schon fehlendes Abo (`resource_missing`) gilt als beendet. Der Stripe-Kunde selbst bleibt bestehen (offene Anwaltsfrage 22). Das danach eintreffende `customer.subscription.deleted` protokolliert der Webhook als `stripe_webhook_orphan_ended` (kein Alarm)
- Prüft jedes Lösch-Ergebnis; scheitert ein Schritt → `500 delete_incomplete`, der Auth-Account bleibt bestehen (Wiederholung möglich, kein stilles Scheitern); Fehler beim Auth-Löschen → `500 auth_delete_failed`
- Hard-Delete des Auth-Users via `service_role`; per CASCADE an `auth.users` hängen `inner_voices`, `crisis_events`, `feedback_surveys`, `rate_limit_counters`, `experience_patterns` (`source_user_id`); an `conversations` hängen `messages`, `session_notes`, `conversation_context` und seit 033 `coach_reflections`; seit 042 an `profiles` `subscriptions`, `message_quota_periods`, `message_charges` (letztere auch an `conversations`)
- Nachweis: Löschtest (`npm run security:deletion-test` + `supabase/security/deletion-check.sql`, Erwartung überall 0) — nach jeder Änderung an Tabellen mit Personenbezug oder an der Löschlogik ausführen
- Aufgerufen von `ProfileScreen` nach Bestätigungs-Modal (Text nach Konzept 6.3, „LÖSCHEN“ tippen, Link zum Datenexport; bei Antwort ≠ 200 kein Abmelden, Hinweis „… nicht vollständig gelöscht …“, `403 mfa_required` → globale Code-Abfrage). Erreichbar auch aus `/sicherheit` und der Zustimmungs-Sperre (`state.openDelete`)
- **Seit Paket K W4:** nach erfolgreicher Löschung Bestätigungsmail „Dein Konto wurde gelöscht“ über `_shared/mailer.ts` (Adresse nur im Speicher der Function, Umlaute als ASCII); Logs `account_deleted_mail_ok` / `account_deleted_mail_failed` (Wochenübersicht). Scheitert die Mail, bleibt die Löschung gültig
- Frontend danach: Eine im Browser gespeicherte Sitzung eines gelöschten Kontos wird beim nächsten Laden erkannt (`PGRST116` → `getUser()` scheitert → lokal abmelden); fehlt das Profil bei bestehendem Konto, zeigt `ProfileMissingScreen` Neu laden/Abmelden

---

### `export-my-data` — Datenexport als Selbstauskunft (S-16, Paket C)

- `POST`, `requireUser`; Identität nur aus dem JWT. Liest über `admin`, **jede** Abfrage gefiltert auf `uid` bzw. die eigenen Gesprächs-IDs, seitenweise à 1000 Zeilen
- Rate-Limit `export` 3/Tag, **fail-closed** (`_shared/rateLimit.ts`); 429 → „Du hast heute schon drei Exporte erstellt. Morgen geht es wieder.“
- Inhalt (Entscheidung C-4 = alles mit Personenbezug), Tabellenliste als Konstante `EXPORT_TABLES`:
  - `konto`: E-Mail, Anlage, letzte Anmeldung, zweite Faktoren (nur Name, Typ, Status, Datum), `profiles`
  - `abo` (Paket Z): `subscriptions`, `message_quota_periods`, `message_charges` (Rechnungen und Zahlungsdaten liegen bei Stripe)
  - `gespraeche`: `conversations`, `messages`
  - `spiegel_akte`: `insights`, `coach_file_entries`, `coachee_profile`, `user_memory`, `pattern_references`, `inner_voices`
  - `coach_notizen`: `session_notes`, `resonance_map`, `coach_reflections`
  - `sicherheit_support`: `crisis_events` (inkl. `notes`), `user_feedback`, `feedback_surveys`, `app_logs`, `rate_limit_counters`
  - `lernbasis`: eigene `experience_patterns` (`source_user_id`)
  - `hinweise`: `conversation_context` nur als `{ conversation_id, vorhanden: true }` (enthält Erfahrungen anderer Menschen)
- Nie in der Datei: Spalten `embedding`, `code_hash`, `invited_by` (ID einer anderen Person). Ausgeschlossen mit Begründung (`EXCLUDED_TABLES`): `supervision_logs`, `security_alerts`, `invite_codes`, `stripe_events` (technische Ereignis-IDs ohne Personenbezug)
- Oben `_erklaerung` (Gruppen in je einem Satz, Verantwortlicher laut Impressum, Kontakt). Antwort `Content-Disposition: attachment; filename="friedensstifter-export-JJJJ-MM-TT.json"`
- Scheitert eine Tabelle → `500 export_incomplete` (Log mit Tabellenname und Code, Alarm in `monitorRules.ts`); kein unvollständiger Export
- Log `export_created { tables, rows }`; Bestätigungsmail ohne Inhalte an die eigene Adresse (`export_mail_failed` nur Info)
- **Neue Tabelle mit Personenbezug** → in `EXPORT_TABLES` oder mit Begründung in `EXCLUDED_TABLES`
- Frontend: Profil → „Meine Daten herunterladen“ → `DataExportSheet` (Blob-Download)

---

### `supervision` — Wöchentliche KI-Supervision

**Läuft per Cron** (`weekly-supervision`, Mo 06:00 UTC, über `pg_net`). Analysiert alle `coach_reflections` der Woche und erzeugt einen `supervision_logs`-Eintrag mit Empfehlungen für den System-Prompt.

**Protokoll (S-15, Entscheidung 19.11.2026):** Gespeichert werden Zähler, die geprüfte Empfehlung (`improvement_recs`) und das vollständige, ebenfalls geprüfte Protokoll (`protocol_text`, Punkte 1–3). Die frühere Volltext-Kopie der Reflexionen (`raw_reflections`) wird nicht mehr gespeichert und wurde mit 033 geleert. Sichtbar im Admin-Bereich (Tab Feedback → Supervision).

**Prompt-Regeln + Prüfschritt (S-13):** Der Prompt verlangt ausschließlich allgemeine Empfehlungen zum Coach-Verhalten (keine Einzelfälle, Zitate, Personendetails, keine Abschwächung von Sicherheits-/Krisenregeln). `improvement_recs` durchläuft `reviewLearningEntry` (`low_quality` zählt nicht); abgelehnt → `null`, Log `supervision_rejected` mit Codes. Prompt zum Gegenlesen: `docs/security/supervision-prompt.md` (freigegeben 19.11.2026).

**Nur intern aufrufbar** (`requireInternalCaller`): Header `x-cron-secret` = Function-Secret `CRON_SECRET` oder service_role-Key als Bearer. Der Cron-Job liest das Secret zur Laufzeit aus **Supabase Vault** (`vault.decrypted_secrets`, Name `cron_secret`) — kein Key im Klartext in `cron.job`. `supervision_logs.improvement_recs` lädt `chat` selbst, aber nur mit Secret `SUPERVISION_IN_PROMPT=1` (seit 19.11.2026 an, S-12).

---

### `create-checkout-session` — Stripe-Bezahlseite (Paket Z)

`POST { tier, interval }`, `requireUser` + `requireConsent`, Rate-Limit `checkout` 10/Std (fail-closed). Ohne Secret `PAYMENTS_ENABLED` → `403 payments_disabled` (Log `checkout_disabled`); `intensiv` ohne `INTENSIV_ENABLED` → `403 tier_unavailable`; ungültige Werte → `400 invalid_tier`/`invalid_interval`; `tester` → `409 not_applicable`; laufendes Abo (`active`, `trialing`, `past_due`) → `409 already_subscribed`. Preis über den Lookup-Key (`begleitung_monat`, `begleitung_jahr`, `intensiv_monat`, `intensiv_jahr`). Kunde wiederverwenden oder anlegen (E-Mail + Metadaten `user_id`, Idempotenz-Key `customer-<uid>`) und **vor** der Session in `subscriptions` speichern. Session mit `customer`, `client_reference_id`, `subscription_data.metadata.user_id`; Rückkehr `SITE_URL/begleitung?checkout=success|cancel`. Antwort `{ url }`.

### `stripe-webhook` — Stripe-Ereignisse (Paket Z)

**Ausnahme von der Sicherheitsregel** (von Jerome mit Handoff v1 bestätigt): kein `requireUser`/`requireInternalCaller` – die Authentifizierung ist die Stripe-Signatur (`constructEventAsync` mit SubtleCrypto), geprüft als Erstes, vor jedem DB-Zugriff (fehlt/falsch → `400`, Log `stripe_webhook_signature_invalid`). Ohne Secret/Schlüssel → `503`.

Ablauf: Signatur → `stripe_events` (Idempotenz; schon verarbeitet → `200 { received, duplicate: true }`) → Verarbeitung → `processed_at`. `2xx` nur, wenn alles gespeichert ist, sonst `500` → Stripe stellt erneut zu. Verarbeitete Ereignisse (genau diese sechs im Stripe-Dashboard abonniert): `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid` (bei `billing_reason = subscription_cycle` Log `subscription_renewed`), `invoice.payment_failed` (Log `payment_failed`).

`syncSubscription`: Abo **frisch** von Stripe holen (`expand: items.data.price.product, schedule`) → Nutzer zuordnen (gespeicherte Kunden-ID, sonst Nutzer-ID aus `client_reference_id`/Metadaten, nur wenn das Profil existiert und keinen anderen Kunden hat) → ein älteres beendetes Abo überschreibt kein neueres laufendes → Upsert `subscriptions` (Stufe aus Produkt-Metadaten `tier`, Rückfall Lookup-Key; Periodenende = spätestes `items.data[].current_period_end`; `quota_anchor` = `start_date`; `cancel_at_period_end` und `cancel_at`; `pending_tier` aus dem Abo-Zeitplan) → `profiles.plan` = `premium` bei `active`/`trialing`/`past_due`, sonst `free`; **`tester` wird nie überschrieben** (Z-11). Ohne zuordenbares Konto: beendetes Abo → `stripe_webhook_orphan_ended` (nach Kontolöschung erwartet), sonst Alarm `stripe_webhook_unmatched`.

### `create-portal-session` — Stripe-Kundenportal (Paket Z)

`POST`, `requireUser`, Rate-Limit `portal` 10/Std (fail-closed). Ohne Kunde → `404 no_customer`. Rückkehr `SITE_URL/profile`. Im Portal (Einstellung im Stripe-Dashboard): Upgrade sofort anteilig, Downgrade und Verkürzung zum Periodenende, Kündigung zum Periodenende, Zahlungsart ändern.

### `mfa-recovery` — Zweiter Faktor für alle (S-06b, Paket C)

`POST { action, … }`, `requireUser(req, { allowAal1: true })` – aal1 ist nur zugelassen, weil `recover` genau dann gebraucht wird.

| Aktion | Voraussetzung | Ablauf | Log | Mail |
|---|---|---|---|---|
| `codes:generate` `{ afterEnroll? }` | `assertAal2` + verifizierter Faktor (sonst `409 no_factor`), 5/Tag fail-closed | alte Codes löschen, 10 neue (`XXXXX-XXXXX`, Base32 ohne 0/O/1/I) erzeugen, HMAC-SHA-256 mit `MFA_CODE_PEPPER` speichern, Codes einmalig zurückgeben (`no-store`) | `mfa_codes_generated` | bei `afterEnroll`: „Zweiter Faktor eingerichtet“ |
| `recover` `{ code }` | 5/Std + 10/Tag fail-closed | Code normalisieren → HMAC → unbenutzten Code des Nutzers suchen (kein Treffer → `400 invalid_code`) → `used_at` setzen (nur wenn noch leer) → **alle** Faktoren über die Admin-API löschen → restliche Codes löschen | `mfa_recovery_used` bzw. `mfa_recovery_failed` (Alarm) | „Wiederherstellungscode verwendet“ |
| `disable` | `assertAal2` | alle Faktoren und Codes entfernen | `mfa_disabled` | „Zweiter Faktor entfernt“ (nur wenn Faktoren da waren) |

Scheitert das Entfernen eines Faktors oder der Codes → `500 mfa_reset_failed` (Alarm). Fehlt der Pepper (< 32 Zeichen) → `500 mfa_not_configured`. Weder Codes noch Hashes werden geloggt; Mails enden mit „Warst du das nicht? Antworte auf diese Mail, dann schauen wir gemeinsam darauf.“ und laufen per `waitUntil` im Hintergrund (`mfa_mail_failed` nur Info).

**Verhalten von Supabase Auth:** Wird ein Faktor bestätigt, beendet Supabase die übrigen aal1-Sitzungen desselben Kontos (z. B. auf einem anderen Gerät).

---

### `security-monitor` — Monitoring (S-22, Paket C)

**Läuft per Cron** (`security-monitor`, stündlich um :07, `x-cron-secret` aus Vault; nur intern über `requireInternalCaller`). Ablauf:
1. **Schwellen:** Für jede Regel aus `_shared/monitorRules.ts` zählt `security_log_counts()` die Log-Codes im Fenster, nur mit passender Herkunft (`app_logs.origin`, Standard `server`). Schwelle erreicht und kein Alarm derselben Regel im Cooldown (6 Std., bei langen Fenstern die Fensterlänge) → Zeile in `security_alerts` + Mail an `ALERT_EMAIL_TO`.
2. **Lebenszeichen:** `retention_applied` in den letzten 26 Std.? Montags ab 08:00 UTC: `supervision_run` seit Montag 00:00 UTC? Fehlt eins → Alarm (`retention_missing` / `supervision_missing`, Cooldown 24 Std.).
3. **Wochenübersicht:** montags im Lauf um 06:07 UTC: alle Regeln über 7 Tage, Alarme der Woche, Krisenereignisse (neu / ungesichtet, nur Anzahl, C-3), Konten ohne Anmeldung seit 24 Monaten (Anzahl) → `security_alerts` (`kind = 'weekly_digest'`) + Mail.

Body `{ "probe": true }` schickt eine Testmail („Test: Alarmkanal Friedensstifter“) und legt eine `probe`-Zeile an. Mails enthalten nur Regel, Anzahl und Zeitfenster (keine IDs, keine Inhalte); ein Mailfehler steht als Code in `security_alerts.mail_error`, der Alarm bleibt im Admin-Tab sichtbar. Jeder Lauf loggt `security_monitor_run`. Secrets: `SMTP_HOST`, `SMTP_PORT` (465), `SMTP_USER`, `SMTP_PASS`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO`.

**Überwachte Codes** (Schnittstelle, Änderungen nur zusammen mit `monitorRules.ts`): `auth_rejected` (aus `errorResponse` bei 401/403), `userId mismatch`, `mfa_required` (Admin), `mfa_verify_failed` (nur Client-Herkunft), `assistant_insert_failed`, `user_message_insert_failed`/`opening_insert_failed`, `rate_limit_db_error`, `delete_incomplete`/`auth_delete_failed`, `learning_review_failed` (technischer Ausfall des Prüfschritts in post-conversation und supervision), `supervision_rejected`; ab C-4/C-5 `export_created`, `mfa_recovery_used`, `mfa_recovery_failed`; Info: `user_mfa_required`, `legacy_format`, `learning_entry_saved`, `learning_rejected`, `supervision_protocol_rejected`. Lebenszeichen: `retention_applied`, `supervision_run`. **Paket Z:** Alarm `stripe_webhook_signature_invalid` (ab 5/Std), `stripe_webhook_failed`, `stripe_webhook_unmatched`, `stripe_webhook_not_configured`, `quota_check_failed`, `quota_refund_failed`, `subscription_cancel_failed` (je ab 1/Std), `portal_session_failed` (ab 3/Std); Info: `subscription_started/changed/renewed/ended`, `payment_failed`, `quota_warned/reached/refunded`, `stripe_webhook_ignored`/`stripe_webhook_orphan_ended`, `portal_session_created`, `checkout_session_created`/`checkout_disabled`.

**Hinweis:** Der Angriffstest löst absichtlich `auth_rejected`, `userid_mismatch` und ggf. `admin_mfa_required` aus — danach sind Alarm-Mails zu erwarten.

### `admin-security` — Admin-Tab „Sicherheit“

`GET`, `requireUser` + `requireAdmin` (aal2). Liefert die letzten 50 Alarme/Testmails (ohne Details außer Fehlercode), die neueste Wochenübersicht, den Zeitpunkt des letzten `security_monitor_run` und die Regel-Beschriftungen.

---

### `_shared/logger.ts`

Zentraler Logger für alle Edge Functions. Schreibt parallel auf `console.log` (Supabase Edge Function Logs-Tab) und in die `app_logs`-Tabelle via Service Role Key. `persist()` läuft über `EdgeRuntime.waitUntil()`, damit Log-Inserts nicht abgeschnitten werden, nachdem die Response bereits an den Client zurückgegangen ist.

```ts
createLogger(source: string, requestId?: string, userId?: string)
// → { debug, info, warn, error, time }
```

`debug` → nur Console. `info/warn/error` → Console + DB. Alle Daten laufen durch `sanitizeLogData()`; `Error`-Objekte werden auf Typ/Code und eine gekürzte Meldung reduziert, `SyntaxError` (JSON.parse) nur als `parse_failed`. `describeError(err)` liefert loggbare Fehlerfelder ohne Inhalte.

---

### `_shared/auth.ts` (Security-Paket A, S-03)

| Export | Zweck |
|---|---|
| `requireUser(req, opts?)` | Token aus `Authorization: Bearer`, Prüfung über `admin.auth.getUser(token)` → `{ user, token, admin, userClient }`; sonst `401`. **S-06b:** Hat der Nutzer einen verifizierten Faktor (`user.factors`, Fallback `admin.auth.admin.mfa.listFactors`), wird nur eine `aal2`-Sitzung angenommen, sonst `403 mfa_required` (Log `user_mfa_required`, nicht der Admin-Code `mfa_required`). `opts.allowAal1` setzt nur `mfa-recovery`. |
| `assertAal2(ctx)` | verlangt `aal2` unabhängig vom Faktor (für `mfa-recovery codes:generate` / `disable`) |
| `admin` | echter service_role-Client **ohne** Nutzer-Token (umgeht RLS) — nur für Daten, deren Eigentum geprüft ist |
| `userClient` | anon-Key + Nutzer-Token → Rolle `authenticated`, `auth.uid()` gesetzt (z. B. für `consume_session`) |
| `assertConversationOwner(admin, id, userId)` | UUID-Format (400) + Eigentum (403) |
| `requireAdmin(ctx)` | `profiles.is_admin` über `admin` prüfen (403 `forbidden`) **und** JWT-Claim `aal = 'aal2'` (403 `mfa_required`, S-06) — Claims nur aus dem in `requireUser` geprüften Token |
| `isUuid(value)` | UUID-Formatprüfung (z. B. `clientMessageId`) |
| `requireInternalCaller(req)` | service_role-Bearer oder `x-cron-secret` (401) |
| `readJsonBody(req, maxBytes)` / `validateMessages()` | Größenlimits (413), JSON-Fehler ohne Inhalt (400) |
| `errorResponse()` / `jsonResponse()` | einheitliche Antworten `{ error: <code> }` ohne Fehlertexte |

---

### `_shared/models.ts`, `_shared/rag.ts`, `_shared/rateLimit.ts`, `_shared/stripe.ts`, `_shared/learning.ts`

| Modul | Zweck |
|---|---|
| `models.ts` | **Einzige Stelle für Modell-IDs** (`COACH_MODEL` = `claude-sonnet-5-5`, `HAIKU_MODEL`). `COACH_REQUEST_DEFAULTS`: `thinking: { type: 'between_tools' }` (kein Vorab-Denken; `disabled` gibt auf 5.5 einen 400) + `output_config.effort: 'medium'` (konstant, darf sich im Gespräch nicht ändern). `COACH_MAX_TOKENS` 560 / `COACH_CRISIS_MAX_TOKENS` 980 (neuer Tokenizer, × 1,4). `extractText()` liest Antworten nach Blocktyp statt `content[0]` (leer → `empty_text_response`). `ensureEndsWithUser()` hängt einen nicht gespeicherten Nutzer-Turn an, wenn der Verlauf auf `assistant` endet (Sonnet 5.5 kennt kein Prefill; geloggt als `synthetic_user_turn_added`). |
| `rag.ts` | `generateEmbedding()` (OpenAI `text-embedding-3-small`, Timeout 2,5 s, Fehlergrund nur als Code) und `findSimilarExperiences()` (`match_experiences`). Nur serverseitig — Treffer verlassen den Server nicht. |
| `rateLimit.ts` | Grenzwerte (`RATE_LIMITS`, u. a. `export` 3/Tag, `mfaCodes` 5/Tag, `mfaRecover` 5/Std + 10/Tag, `checkout` und `portal` je 10/Std), `enforceRateLimit()` (RPC `consume_rate_limits`, fail-open/-closed wählbar), `rateLimitResponse()` (429 + `Retry-After`). |
| `stripe.ts` | Paket Z: `stripeClient()` (`npm:stripe@23.1.0`, null ohne Schlüssel), `paymentsEnabled()`, `intensivEnabled()`, `siteUrl()`, `TIERS`/`INTERVALS`/`LOOKUP_KEYS`, `ACTIVE_STATUSES` (`active`, `trialing`, `past_due`), `tierFromPrice()`, `stripeErrorInfo()` (nur Typ/Code, nie Stripe-Fehlertexte). |
| `learning.ts` | Prüfschritt `reviewLearningEntry()` für alles Nutzerübergreifende (Lernbasis, Supervision): Regex-Vorfilter (`contact`, `instruction`) → Haiku-Prüfung (`identifier`, `instruction`, `contact`, `crisis`, `low_quality`). Das JSON wird aus der Antwort herausgelöst (robust gegen Text drumherum); technische Fehler → `review_api_failed` / `review_parse_failed`; immer fail-closed. `makeHaikuCaller()` als Adapter. |

---

## 6. Datenbank-Schema

### Kern-Tabellen

**`profiles`** (erweitert `auth.users`)
```
id                                UUID PK → auth.users
display_name                      TEXT
onboarding_completed              BOOLEAN DEFAULT false   -- Altbestand des früheren Onboardings (Einstieg seit Paket K W3: /start/1–4)
onboarding_data                   JSONB                   -- Altbestand, seit 040 nicht mehr gesetzt
streak_count                      INTEGER DEFAULT 0
streak_last_date                  DATE
plan                              TEXT ('free' | 'premium' | 'tester')
sessions_used_this_month          INTEGER DEFAULT 0          -- Altbestand (Monatszählung bis U4, kein Reset mehr)
trial_sessions_used               INTEGER DEFAULT 0          -- U4 (038): begonnene Gespräche insgesamt, nur consume_session
last_return_greeting_at           TIMESTAMPTZ
consent_given_at                  TIMESTAMPTZ
consent_version                   TEXT ('1.0')
coaching_agreement_accepted_at    TIMESTAMPTZ
coaching_agreement_version        TEXT ('1.0')
is_admin                          BOOLEAN DEFAULT false      -- v3.x, manuell im SQL-Editor gesetzt
is_beta_tester                    BOOLEAN DEFAULT false      -- v3.x, über Admin-Bereich steuerbar
session_limit                     INTEGER DEFAULT 3          -- Starts im Kennenlernen (Default 3 seit 038, vorher 20), null = unbegrenzt, individuell pro Nutzer
invited_at                        TIMESTAMPTZ                -- v3.x, gesetzt bei admin-invite-user
invited_by                        UUID → auth.users ON DELETE SET NULL  -- v3.x (seit 033; vorher NO ACTION, blockierte das Löschen des Einladenden)
age_confirmed_at                  TIMESTAMPTZ                 -- S-11 (036): 18+ bestätigt (handle_new_user aus Signup-Metadaten oder RPC confirm_age); consent_ip entfernt
learning_opt_in                   BOOLEAN DEFAULT false      -- Migration 032 (S-13), nur über RPC set_learning_opt_in
learning_opt_in_updated_at        TIMESTAMPTZ
learning_opt_in_version           TEXT ("1.0")
```
Trigger **`trg_protect_profile_privileges`** (Migration 024): Für die Client-Rollen `authenticated`/`anon` sind `id`, `is_admin`, `is_beta_tester`, `plan`, `session_limit`, `sessions_used_this_month`, (seit 038) `trial_sessions_used`, `invited_at`, `invited_by`, `created_at` sowie (seit 032) `learning_opt_in`, `learning_opt_in_updated_at`, `learning_opt_in_version` und (seit 036) `age_confirmed_at` sowie (seit 040) `consent_given_at`, `consent_version`, `coaching_agreement_accepted_at`, `coaching_agreement_version` nicht änderbar (`42501`). **Seit 040:** `handle_new_user` setzt die Zustimmung nur bei `consent_art9`/`agreement_accepted` = `true` und Version `'2.0'` (andere Versionen werden ignoriert); `onboarding_data` wird nicht mehr gesetzt. Bestandsnutzer und Eingeladene stimmen über RPC `accept_consent_v2()` zu (SECURITY DEFINER, MFA-Prüfung, setzt auch `onboarding_completed`). service_role, Cron und SECURITY-DEFINER-Funktionen sind nicht betroffen. Clients legen keine Profile an — das macht `handle_new_user` (Migration 027): Name, `onboarding_completed`, `onboarding_data.area`, `consent_version`, `coaching_agreement_version` und (seit 036) `age_confirmed` kommen aus `signUp({ options: { data: … } })`, die Zeitstempel setzt der Server. Bestandsnutzer ohne `age_confirmed_at` sehen in der AppShell einmal `AgeConfirmSheet` (RPC `confirm_age`; „Ich bin jünger“ → 116 111 und Löschweg im Profil, kein automatisches Löschen). So funktioniert die Registrierung auch bei aktiver E-Mail-Bestätigung. Im Onboarding fragt nur der Invite-Flow (`user.invited_at`) nach einem Passwort; andere eingeloggte Nutzer ohne gültige Vereinbarung bestätigen nur die Vereinbarung.

**`conversations`**
```
id            UUID PK
user_id       UUID → profiles
title         TEXT
summary       TEXT          (Kurzfassung nach Gespräch)
key_insight   TEXT
memory_updated BOOLEAN
open_thread   TEXT          (Nicht abgeschlossenes Thema)
open_thread_intensity TEXT  ('low' | 'medium' | 'high')
post_processed_at            TIMESTAMPTZ  -- v2.9, Idempotenz-Guard
post_processed_message_count INTEGER      -- v2.9
updated_at    TIMESTAMPTZ    -- v3.2, per Trigger bei jeder neuen Message aktualisiert
session_counted_at           TIMESTAMPTZ  -- Migration 023, gesetzt von consume_session
```
Trigger **`trg_protect_conversation_server_columns`** (Migration 023): Clients können `session_counted_at`, `post_processed_at`, `post_processed_message_count` weder beim Insert setzen noch ändern.
Trigger `trg_touch_conversation_updated_at` (AFTER INSERT ON messages) hält `updated_at` aktuell — Grundlage für die Sortierung im Gesprächsverlauf.

**`messages`**
```
id                UUID PK
conversation_id   UUID → conversations
role              TEXT ('user' | 'assistant')
content           TEXT
input_mode        TEXT ('text' | 'voice')
metadata          JSONB DEFAULT '{}'   -- Assistant: { model, client_aborted, stop_reason, stream_failed }; Eröffnung: { kind: 'opening', variant }
message_type      TEXT DEFAULT 'standard' ('standard' | 'crisis_response')  -- v-Krise
client_message_id UUID                 -- Migration 030, eindeutig je (conversation_id, client_message_id)
created_at        TIMESTAMPTZ
```
Nur `chat` (service_role) schreibt Nachrichten. `authenticated` hat seit Migration 031 (Welle 2b) nur noch SELECT. Der eindeutige Index ist bewusst **nicht** partiell, weil PostgREST `ON CONFLICT` sonst nicht auflösen kann; alte Zeilen haben `NULL` und verletzen ihn nicht.

### Coach-Gedächtnis

**`coach_file_entries`** — Strukturierte Akte (ersetzt `user_memory` als Primärquelle)
```
id              UUID PK
user_id         UUID → profiles
category        TEXT ('pattern' | 'strength' | 'theme' | 'value' | 'trigger')
label           TEXT
description     TEXT
example         TEXT
linked_value    TEXT       -- v3.2, Wert/Glaubenssatz hinter dem Muster
voice_id        UUID → inner_voices (nullable)  -- v3.0
source_conversation_id UUID → conversations (nullable)
first_detected  TIMESTAMPTZ
history         JSONB []   — [{ date, note, conversation_id }]
confidence      INTEGER 1–5
status          TEXT ('active' | 'fading' | 'resolved')
```

**`coachee_profile`** — Wächst durch Coach-Extraktion
```
user_id             UUID UNIQUE → profiles
occupation          TEXT
relationship_status TEXT
family_situation    TEXT
life_phase          TEXT
current_focus       TEXT
known_values        JSONB []
known_stressors     JSONB []
known_resources     JSONB []
```

**`user_memory`** — Legacy (1 Zeile pro User, Fallback)
```
user_id     UUID UNIQUE
themes      JSONB []
patterns    JSONB []
strengths   JSONB []
context     JSONB {}
```

**`resonance_map`** — Emotionales Reaktionsprofil
```
user_id             UUID UNIQUE
opening_patterns    JSONB []
closing_patterns    JSONB []
effective_styles    JSONB []
resonant_metaphors  JSONB []
preferred_pace      TEXT ('slow' | 'medium' | 'direct')
```

**`session_notes`** — Strukturierte Session-Notes
```
conversation_id     UUID UNIQUE → conversations
user_id             UUID → profiles
main_topic          TEXT
emotional_intensity INTEGER 1–5   -- via clampScore() abgesichert
resistance_detected BOOLEAN
resistance_location TEXT
breakthrough_moment TEXT
where_we_left_off   TEXT
coach_effectiveness INTEGER 1–5   -- via clampScore() abgesichert
next_session_rec    TEXT
file_updates        JSONB []
```

**`inner_voices`** — "Innere Stimmen" (v3.0)
```
id                UUID PK
user_id           UUID → auth.users
status            TEXT ('candidate' | 'named' | 'dismissed')
name              TEXT              -- vom Nutzer vergeben, null solange 'candidate'
suggested_names   JSONB [] DEFAULT '[]'
description       TEXT
introduced_at     TIMESTAMPTZ       -- wann Phase 1 (Verstehen) im Chat stattfand
named_at          TIMESTAMPTZ       -- wann Phase 2 (Entscheidung) abgeschlossen
dismissed_at      TIMESTAMPTZ
created_at        TIMESTAMPTZ
last_active_at    TIMESTAMPTZ
```
RLS: Nutzer verwalten ihre eigenen Zeilen (`auth.uid() = user_id`) — Namensgebung/Ablehnung schreibt das Frontend direkt.

### Lern- & Analyse-Tabellen

**`experience_patterns`** — Lernbasis (pseudonymisiert, S-13)
```
source_user_id UUID → auth.users ON DELETE CASCADE   -- Migration 032, für Rücknahme/Löschung, nie ausgeliefert
review_status  TEXT DEFAULT 'pending' ('pending' | 'approved' | 'rejected')
reviewed_at    TIMESTAMPTZ
embedding    vector(1536)   (pgvector)
context      TEXT
pattern      TEXT
resistance   TEXT
what_helped  TEXT
what_blocked TEXT
outcome      TEXT ('breakthrough' | 'stuck' | 'partial' | 'unknown')
```
Nur Einträge mit Opt-in **und** bestandener Prüfung (siehe `post-conversation` Schritt 6). Bestand ohne Zuordnung wurde mit 032 gelöscht (D-2). Ehrliche Einordnung: **pseudonymisiert**, nicht anonym — in Texten „verallgemeinert, ohne Namen und erkennbare Details“.

**`pattern_references`** — Persönliche Muster aus Gesprächen
```
user_id         UUID → profiles
pattern_key     TEXT   ('rueckzug_unter_druck', etc.)
pattern_label   TEXT
message_id      UUID → messages (nullable)
conversation_id UUID → conversations (nullable)
excerpt         TEXT   (max. 150 Zeichen)
voice_id        UUID → inner_voices (nullable)  -- v3.0, additiv, aktuell nicht befüllt
```

**`insights`** — „Mein Spiegel"
```
user_id         UUID → profiles
conversation_id UUID → conversations (nullable)
content         TEXT
category        TEXT ('muster' | 'stärke' | 'erkenntnis' | 'ziel')
source          TEXT ('auto' | 'user')   -- 'user' nach Bestätigung/Anpassung (U3)
is_pinned       BOOLEAN DEFAULT false
surfaced_at     TIMESTAMPTZ  -- U3: auf Heute angezeigt (Nachklang aufgedeckt / Wiederentdecken gezeigt)
confirmed_at    TIMESTAMPTZ  -- U3: vom Nutzer bestätigt oder angepasst
dismissed_at    TIMESTAMPTZ  -- U3: „Heute nicht“
user_rating     TEXT CHECK ('helpful' | 'unclear' | 'disagree')  -- U5a (039): Deine Einschätzung, nur durch den Nutzer
rated_at        TIMESTAMPTZ  -- U5a
follows_insight_id UUID → insights ON DELETE SET NULL  -- U5a angelegt, befüllt ab U5b („Was du seitdem erlebt hast“)
```

**`coach_reflections`** — KI-Selbstreflexion (Frist 12 Monate)
```
conversation_id    UUID → conversations ON DELETE CASCADE (seit 033; vorher SET NULL → verwaiste Zeilen)
was_helpful        BOOLEAN
what_worked        TEXT
what_missed        TEXT
resistance_detected BOOLEAN
resistance_handled TEXT
improvement_note   TEXT
```

**`user_feedback`** — Nutzerfeedback (inkl. Beta-Feedback-Modal im Profil, Frist 24 Monate)
```
user_id         UUID → profiles ON DELETE CASCADE (seit 033)
conversation_id UUID → conversations (nullable)
feedback_type   TEXT ('improvement' | 'praise' | 'bug' | 'general' | 'beta')
content         TEXT
context         TEXT
consent_given   BOOLEAN DEFAULT false   -- seit 036; Insert nur mit true (Policy user_feedback_insert_own_with_consent)
processed       BOOLEAN DEFAULT false
```

**`supervision_logs`** — Wöchentliche Supervision (Frist 24 Monate)
```
week_start           DATE
total_conversations  INTEGER
resistance_rate      NUMERIC
breakthrough_rate    NUMERIC   -- derzeit fest 0 (keine outcome-Auswertung)
top_patterns / top_blockers JSONB  -- werden nicht befüllt
improvement_recs     TEXT      -- geprüfte Empfehlung (Punkt 3), fließt mit SUPERVISION_IN_PROMPT=1 in BLOCK 5
protocol_text        TEXT      -- geprüftes Gesamtprotokoll (Migration 033)
raw_reflections      JSONB     -- seit 033 leer (nicht mehr gespeichert)
```

**`security_alerts`** — Alarme und Wochenübersicht des Monitorings (Migration 034, S-22, Frist 12 Monate, nur service_role)
```
kind          TEXT CHECK ('alert' | 'weekly_digest' | 'probe')
rule          TEXT        -- Regel-ID aus _shared/monitorRules.ts
window_start / window_end TIMESTAMPTZ
count         INTEGER
details       JSONB       -- nur Zähler und Codes (Wochenübersicht: counts je Regel, Krisen-/Inaktiv-Anzahl)
mailed_at     TIMESTAMPTZ
mail_error    TEXT        -- nur Fehlercode
```
Kein Personenbezug (keine IDs) → nicht im Export und nicht im Löschtest.

**`mfa_recovery_codes`** — Wiederherstellungscodes für den zweiten Faktor (Migration 037, S-06b, nur service_role)
```
id         UUID PK
user_id    UUID → auth.users ON DELETE CASCADE
code_hash  TEXT        -- HMAC-SHA-256(normalisierter Code, MFA_CODE_PEPPER), nie der Code selbst
used_at    TIMESTAMPTZ -- gesetzt beim Einlösen; danach werden alle Codes des Nutzers gelöscht
created_at TIMESTAMPTZ
```
Keine Client-Rechte (Angriffstest #33). Im Export ohne `code_hash`, im Löschtest automatisch über `user_id` erfasst. Keine eigene Frist nötig: Codes verschwinden beim Wiederherstellen, Abschalten, Neu-Erzeugen und mit dem Konto.

**`invite_codes`** — Beta-Tester-Zugang (Selbstregistrierung)
```
code        TEXT UNIQUE (always uppercase)
max_uses    INTEGER (null = unbegrenzt)
uses_count  INTEGER DEFAULT 0
expires_at  TIMESTAMPTZ (null = kein Ablauf)
```

**`crisis_events`** — Krisenprotokoll (v-Krise)
```
id                 UUID PK
user_id            UUID → auth.users
conversation_id    UUID → conversations (nullable)
message_id         UUID → messages (nullable)
detected_at        TIMESTAMPTZ
confidence         TEXT ('low' | 'medium' | 'high')
excerpt            TEXT       -- anonymisierter Ausschnitt, KEIN Volltext-Log
response_shown     BOOLEAN DEFAULT true
user_acknowledged  BOOLEAN
reviewed_by_jerome BOOLEAN DEFAULT false
reviewed_at        TIMESTAMPTZ
notes              TEXT       -- im Alltag nicht sichtbar, Teil der Selbstauskunft (Art. 15, S-16)
```
RLS: `USING (false) WITH CHECK (false)` für **alle** — auch der eigene Nutzer sieht seine Einträge nicht. Nur ein echter `service_role`-Client (ohne Nutzer-Token, `BYPASSRLS`) kann schreiben. Keine Echtzeit-Benachrichtigung — wöchentliche Sichtung durch Jerome, analog zum Supervision-Cron.

### Abo und Kontingent (Paket Z, Migration 042)

Alle vier Tabellen: RLS an, **keine** Rechte für `authenticated`/`anon`, nur `service_role`. Anzeige im Frontend nur über `get_access_state()`.

**`subscriptions`** — eine Zeile pro Nutzer (das jeweils aktuelle Abo)
```
user_id                UUID PK → profiles ON DELETE CASCADE
stripe_customer_id     TEXT UNIQUE NOT NULL
stripe_subscription_id TEXT UNIQUE            -- null, solange nur der Kunde angelegt ist
tier                   TEXT ('begleitung' | 'intensiv')
billing_interval       TEXT ('month' | 'year')
status                 TEXT                   -- Stripe-Status 1:1
quota_anchor           TIMESTAMPTZ            -- Stripe start_date, Ankertag der Monatszeiträume
current_period_end     TIMESTAMPTZ            -- Ende des bezahlten Zeitraums
cancel_at_period_end   BOOLEAN                -- endet (cancel_at_period_end ODER cancel_at)
cancel_at              TIMESTAMPTZ            -- Stripe setzt bei Kündigung im Portal nur dieses Feld (J-Z2)
pending_tier           TEXT                   -- geplante Herabstufung zum Periodenende
updated_at             TIMESTAMPTZ
```

**`message_quota_periods`** — PK `(user_id, period_start)`: `period_end`, `used`, `grace_used`, `grace_conversation_id` (→ conversations, SET NULL; Kulanz nur in einem Gespräch je Zeitraum), `warned_at`.

**`message_charges`** — Buchungsjournal, PK `(conversation_id, client_message_id)` (eine Buchung pro Nutzernachricht, idempotent): `user_id`, `period_start`, `kind` (`quota` | `grace`), `charged_at`. CASCADE an `conversations` und `profiles`.

**`stripe_events`** — Webhook-Idempotenz ohne Personenbezug: `event_id` PK, `type`, `received_at`, `processed_at`.

**Regeln an einer Stelle (Z-3):** `quota_limit_for(tier)` (Begleitung 150, intensiv 800), `quota_grace()` (10), `quota_warn_percent()` (80) — Änderung nur per neuer Migration. `current_quota_period(anchor, at)`: Zeitraum = Anker + n Monate (größtes n mit Start ≤ jetzt), in UTC, Monatsende wird gekürzt. Die Testuhr von Stripe verstellt nur Stripe; die DB rechnet mit der echten Zeit.

### RPCs

**`get_conversation_history()`** — `SECURITY INVOKER`, `search_path = ''`, liefert die Gesprächsliste des eingeloggten Nutzers (Datum, Nachrichtenanzahl, `main_topic`/erste Nutzer-Nachricht) für `/coach/verlauf` und die Profil-Statistik, ohne N+1-Queries. Ausführbar nur für `authenticated`.

**`consume_session(p_conversation_id)`** — `SECURITY DEFINER`, `search_path = ''` (Migration 023, seit 038 neu gefasst). Zählt atomar und idempotent: Ist `conversations.session_counted_at` gesetzt → `{ allowed: true, counted: false }`. Sonst Profilzeile sperren und Regeln aus `access_state_for` prüfen: kein freier Start → `{ allowed: false, used, limit, phase }`; sonst `session_counted_at` setzen und `trial_sessions_used + 1`. Fremde Konversation → `42501`. Seit 042 bei Ablehnung zusätzlich `reason` (`quota` | `starts`) und `period_end`. Ausführbar für `authenticated` (aufgerufen von `chat` mit dem Nutzer-Token).

**`access_state_for(p_user_id)`** — `SECURITY DEFINER`, `stable`, nur `service_role` (Migration 038, U4; seit 042 erweitert). Einzige Quelle der Regeln für Kennenlernen/Ruhemodus/Begleitung: `{ phase, starts_used, starts_limit, can_start, cap }` (Kappung `c_cap` = 100 ohne Begleitung), seit Paket Z zusätzlich `tier`, `period_end` (Profil), `cancel_at_period_end`, `pending_tier`, `quota_resets_at` (nächstes Monatskontingent, beim Jahresabo ≠ `period_end`), `messages_left`, `quota_reached`; `can_start = false` bei aufgebrauchtem Kontingent (Phase bleibt `begleitung`). Aufrufer: `consume_session`, `chat` (Kappung), `get_access_state`.

**`consume_message(p_user_id, p_conversation_id, p_client_message_id)`** — `SECURITY DEFINER`, nur `service_role` (Migration 042). Bucht eine Nutzernachricht gegen das Monatskontingent: ohne `premium`-Abo → `{ allowed: true, reason: 'no_quota' }`; schon gebucht → keine zweite Buchung; unter der Grenze → `kind 'quota'`, `warn` einmal ab 80 %; danach Kulanz in **einem** Gespräch (`kind 'grace'`, `grace_left`); sonst `{ allowed: false, reason: 'quota_reached', period_end }`. Zeile des Zeitraums `for update` gesperrt.

**`refund_message(p_conversation_id, p_client_message_id)`** — `SECURITY DEFINER`, nur `service_role`. Nimmt eine Buchung zurück (`used` bzw. `grace_used` − 1), liefert `true`/`false`.

**`get_access_state()`** — `SECURITY DEFINER`, ausführbar für `authenticated`, prüft zuerst `mfa_satisfied()` (Migration 038). Liefert `access_state_for(auth.uid())` für die Anzeige im Frontend (`useAccessState`).

**`redeem_invite_code(p_code, p_user_id)`** — `SECURITY DEFINER`, `search_path = ''`, löst einen Invite-Code ein. **Nur für `service_role` ausführbar** (vorher für jeden inkl. anon — Befund K-2).

**`match_experiences()`** — pgvector-Suche, nur für `service_role` (Aufrufer: `_shared/rag.ts`). Seit 032 nur `review_status = 'approved'`; `source_user_id` ist nicht Teil der Rückgabe.

**`set_learning_opt_in(p_opt_in, p_version)`** — `SECURITY DEFINER`, `search_path = ''`, ausführbar für `authenticated` (Migration 032). Setzt die Zustimmung für `auth.uid()`; bei Rücknahme löscht sie in derselben Transaktion alle eigenen `experience_patterns` und liefert `{ opt_in, deleted }`. Seit 037 zuerst MFA-Prüfung (`42501 mfa_required`). Seit 041 nur Version `'2.0'` (sonst `22023 invalid_version`).

**`confirm_age()`** — `SECURITY DEFINER`, `search_path = ''`, ausführbar für `authenticated` (Migration 036, S-11). Setzt `profiles.age_confirmed_at` für `auth.uid()` (bleibt beim ersten Wert). Seit 037 zuerst MFA-Prüfung.

**`mfa_satisfied()`** — `SECURITY DEFINER`, `stable`, `search_path = ''`, ausführbar für `authenticated` (Migration 037, S-06b). `true`, wenn der JWT-Claim `aal = 'aal2'` ist **oder** der Nutzer keinen verifizierten Faktor in `auth.mfa_factors` hat. Grundlage der restriktiven Policy `mfa_required` und der MFA-Prüfung in Client-RPCs.

**`security_log_counts(p_since, p_codes)`** — `SECURITY DEFINER`, nur `service_role` (Migration 034). Liefert je Code und Herkunft nur die Anzahl (`code, origin, n`), keine Inhalte. Aufrufer: `security-monitor`.

**`consume_rate_limits(p_user_id, p_rules)`** — `SECURITY DEFINER`, nur `service_role` (Migration 029). Erhöht feste Zeitfenster-Zähler atomar, liefert `null` oder `{ bucket, retry_after }`.

### Cron-Jobs (pg_cron + pg_net)

| Job | Zeitplan (UTC) | Aufgabe |
|---|---|---|
| ~~`reset-monthly-sessions`~~ | – | seit 038 abgeschaltet (Starts zählen insgesamt, U4) |
| `weekly-supervision` | `0 6 * * 1` | `supervision` per `net.http_post` mit `x-cron-secret` aus Vault |
| `purge-app-logs` | `17 3 * * *` | `app_logs` älter als 30 Tage löschen (Migration 026) |
| `purge-rate-limits` | `23 3 * * *` | `rate_limit_counters` älter als 2 Tage löschen (Migration 029) |
| `apply-retention` | `41 3 * * *` | `apply_retention()` — Fristen nach D-4 (Migration 033), Ergebnis als `retention_applied` in `app_logs` |
| `security-monitor` | `7 * * * *` | `security-monitor` per `net.http_post` mit `x-cron-secret` aus Vault (Migration 034) |
| `purge-security-alerts` | `29 3 * * *` | `security_alerts` älter als 12 Monate löschen (Migration 034) |

**Fristen (`apply_retention()`, D-4, keine Rechtsberatung — mit Anwalt bestätigen, R-4):** `crisis_events.excerpt` nach Sichtung (`reviewed_by_jerome`) bzw. spätestens 90 Tagen leeren · `crisis_events` 3 Jahre ab Ende des Kalenderjahres · `coach_reflections` 12 Monate · `supervision_logs`, `user_feedback` und (seit 036) `feedback_surveys` 24 Monate · `app_logs` 30 Tage · `rate_limit_counters` 2 Tage · seit 042 `message_charges` und `message_quota_periods` 13 Monate, `stripe_events` 90 Tage (`subscriptions` bleibt bis zur Kontolöschung). Inaktive Konten (24 Monate ohne Anmeldung) werden nur gezählt (`inactive_accounts_report`, nur service_role); gelöscht wird erst mit Mailkanal für den Vorab-Hinweis (Paket D). `security_alerts` 12 Monate (`purge-security-alerts`).

### RLS-Prinzip (Least Privilege, Migration 025)

Alle Tabellen haben RLS. Policies gelten **nur für `authenticated`**, nie für `public`/`anon`; `anon` hat keinerlei Tabellenrechte. Client-Rechte entsprechen der tatsächlichen Nutzung im Frontend:

| Tabelle | Rechte `authenticated` | Bedingung |
|---|---|---|
| `profiles` | SELECT, UPDATE | `id = auth.uid()` + Schutz-Trigger |
| `conversations` | SELECT, INSERT, UPDATE | `user_id = auth.uid()` + Schutz-Trigger |
| `messages` | SELECT (seit Migration 031 kein INSERT mehr — nur der Server schreibt) | Konversation gehört dem Nutzer |
| `insights` | SELECT, INSERT, UPDATE, DELETE | `user_id = auth.uid()`; `conversation_id` nur eigene |
| `user_memory` | SELECT, INSERT, UPDATE | `user_id = auth.uid()` |
| `inner_voices` | SELECT, UPDATE | `user_id = auth.uid()` |
| `coach_file_entries`, `coachee_profile`, `session_notes`, `pattern_references` | SELECT | `user_id = auth.uid()` |
| `user_feedback`, `feedback_surveys` | INSERT | `user_id = auth.uid()` **und** `consent_given = true` (seit 036) |
| `app_logs` | INSERT | `user_id = auth.uid()` (Migration 026); bewusst **ohne** MFA-Policy, damit Logging vor der Code-Eingabe funktioniert |
| `resonance_map`, `experience_patterns`, `coach_reflections`, `supervision_logs`, `invite_codes`, `crisis_events`, `conversation_context`, `rate_limit_counters`, `security_alerts`, `mfa_recovery_codes`, `subscriptions`, `message_quota_periods`, `message_charges`, `stripe_events`, View `feedback_survey_scores` | **keine** | nur service_role |

**MFA-Policy (S-06b, Migration 037):** Alle Tabellen der Liste oben mit Client-Rechten außer `app_logs` (`profiles`, `conversations`, `messages`, `insights`, `user_memory`, `inner_voices`, `coach_file_entries`, `coachee_profile`, `session_notes`, `pattern_references`, `user_feedback`, `feedback_surveys`) haben zusätzlich die **restriktive** Policy `mfa_required` (`for all to authenticated using/with check ((select public.mfa_satisfied()))`). Ein aal1-Token eines Nutzers mit Faktor liest damit 0 Zeilen und kann nichts schreiben – auch direkt über die API (Angriffstest #34). Neue Client-Tabellen bekommen diese Policy ebenfalls.

Die View `feedback_survey_scores` hat `security_invoker = true`. Neue Tabellen bekommen per Default-Privileg weiterhin Rechte für `authenticated` → **jede neue Tabelle braucht RLS + explizite Policies + gezielte GRANTs**. Edge Functions arbeiten über `_shared/auth.ts` (siehe [Abschnitt 10](#sicherheitsmuster-v2-security-paket-a)).

---

## 7. Design System

### Farben (`src/styles/tokens.css`)

| Variable | Wert | Verwendung |
|---|---|---|
| `--color-bg` | `#F5F3EF` | Seitenhintergrund (Creme) |
| `--color-surface` | `#FFFFFF` | Karten, Chat-Bubbles |
| `--color-surface-2` | `#F8F7F4` | Sekundäre Flächen |
| `--color-accent` | `#2D5A4E` | Brand-Grün — Buttons, aktive Tabs, User-Bubbles, Krisen-Card |
| `--color-accent-2` | `#4A8C7A` | Hover-Zustand |
| `--color-accent-light` | `#E8F0EE` | Subtile Highlights, Krisen-Card-Hintergrund |
| `--color-premium` | `#8B6914` | Gold für Premium-Features (inkl. Innere Stimmen) |
| `--color-coral` | `#C4593A` | Warnung, Muster-/Ziel-Kategorie |
| `--color-ink` | `#1A1916` | Primärer Text |
| `--color-ink-2` | `#5C5A54` | Sekundärer Text |
| `--color-ink-3` | `#9A9890` | Deaktiviert, Metadaten |

Bewusst **keine** alarmierende Rot-/Orange-Farbgebung für den Krisenfall — die bestehende `accent`-Palette vermittelt Ruhe statt Panik, konsistent mit dem Sprachprinzip.

### Typografie

| Schriftart | Gewicht | Verwendung |
|---|---|---|
| DM Serif Display | 400 | Headlines, Display-Text (`font-display`) |
| DM Sans | 300, 400, 500 | Body, UI-Text (`font-body`) |

Beide Schriften liegen lokal (`@fontsource/dm-sans`, `@fontsource/dm-serif-display`, Import in `main.jsx`, S-10) — keine Anfrage an Google, die CSP braucht keine Fremd-Origins.

### Tailwind-Erweiterungen (`tailwind.config.js`)

Alle CSS-Variablen werden als Tailwind-Klassen verfügbar:
- `bg-bg`, `bg-surface`, `bg-surface-2`
- `text-ink`, `text-ink-2`, `text-ink-3`
- `bg-accent`, `text-accent`, `border-accent`
- `bg-premium`, `text-premium`

Custom Animations: `animate-fadeSlideUp` (0,4 s), `animate-fadeIn` (0,2 s)

### Mobile-first

Optimiert für 390 px (iPhone 14). Kein Breakpoint-Wechsel für Desktop — die App ist rein mobile. Overlays/Sheets (z. B. `VerlaufsSheet`) werden per `createPortal` direkt in `document.body` gerendert, um von `transform`-tragenden Vorfahren unabhängig zu bleiben.

---

## 8. Wichtige Flows

### Wellness-Check-Flow

```
HomeScreen → Kachel „Wie geht's dir?" → /wellness
  ↓
WellnessCheckScreen: Score (1–10) + Chip + Freitext
  ↓
navigate('/coach', { state: { wellnessCheck: { score, label, emoji, context } } })
  ↓
CoachScreen mount: state.wellnessCheck erkannt (VARIANTE 3)
  ↓
startWellnessConversation(wellnessCheck) → chat { conversationId, start: 'wellness', wellnessCheck }
  → Kein User-Message sichtbar
  → Coach antwortet direkt aus Wellness-Block im System-Prompt; der Server speichert die Antwort
```

### Gesprächseinstieg & Weitermachen (seit U3, ersetzt die Wiederkehr-Begrüßung)

```
CoachScreen mount (kein Resume, kein Wellness-Check)
  ↓
fetch pre-session-briefing (recent, latestActiveConversation)
  ↓
Entry-Kontext? → startEntryContextConversation()
kein Gespräch mit eigener Nachricht? → startNewConversation(true)
jüngstes Gespräch < 2 h? → loadConversation(latest)
sonst → Einstieg
  Weitermachen → resumeWithOpening(id) → chat start 'resume' (Block FORTSETZUNG, keine neue Konversation)
Vorher (höchste Priorität): state.continueInsight (U5a, „Daran weiterarbeiten“ aus Spiegel/Heute)
  → resumeWithOpening(conversationId, { insightId }) → Block WEITERARBEITEN; kein neuer Start, auch im Ruhemodus
  → beim Verlassen („←“/„Neues Gespräch“) nach eigenem Schreiben einmal ContinueRatingSheet („Wie siehst du diese Erkenntnis jetzt?“)
  Etwas Neues  → startNewConversation()
```

### Gesprächsverlauf & Fortsetzen-Flow

```
Einstieg „Alle Gespräche →“ → /coach/verlauf
  ↓
HistoryScreen: RPC get_conversation_history()
  ↓
Klick "Gespräch fortsetzen" → navigate('/coach', { state: { resumeConversationId } })
  ↓
CoachScreen mount: resumeConversationIdRef erkannt (VARIANTE 0, höchste Priorität)
  ↓
loadConversation(id) → lädt komplette Message-Historie inkl. message_type
  → KEIN countSession() — zählt nicht als neue Session
  → bei Fehler: Fallback auf startNewConversation()
```

### Post-Conversation-Processing

```
Vier unabhängige Trigger-Pfade rufen dieselbe Kernfunktion:
  - "Neues Gespräch"-Button
  - visibilitychange (Tab in Hintergrund)
  - pagehide (Tab schließen/Reload)
  - Unmount-Cleanup (SPA-Navigation weg vom Coach)
  ↓
messages.length >= 3 UND seit dem letzten Anstoß gewachsen (processedRef: conversationId → Nachrichtenzahl)?
  → runPostConversation(messages, conversationId)  [fire-and-forget, keepalive: true]
    → POST /functions/v1/post-conversation { conversationId }  (Verlauf liest der Server aus der DB)
      → serverseitiger Idempotenz-Guard (post_processed_message_count)
      → session_notes, coach_file_entries (inkl. linked_value), coachee_profile,
        inner_voices (Kandidaten-Erkennung/-Verknüpfung), experience_patterns,
        pattern_references, insights, coach_reflections,
        resonance_map (ab 3. Gespräch)
  
  → extractMemoryAndInsight()  [Legacy-Gedächtnis, nur beim Button-Klick]
    → suggested_insight vorhanden? → ConversationEndModal → Bestätigung → insights.insert (source='user')
  
  → startNewConversation()
```

### Innere-Stimmen-Flow

Zwei-Phasen-Chatflow, serverseitig getaktet — nie beide Phasen im selben Turn, analog zum Wirkmechanismus-Rhythmus.

```
post-conversation, Schritt 4b: ≥3 unverknüpfte Akte-Einträge mit confidence ≥3?
  → VOICE_CLUSTER_PROMPT: passt zu bestehender (auch unbenannter) Stimme?
     ja  → coach_file_entries.voice_id verknüpfen, last_active_at aktualisieren
     nein, aber ≥3 zusammengehörige Einträge → neue inner_voices-Zeile (status='candidate')
        → Rollback der Zeile, falls die Verknüpfung zu coach_file_entries fehlschlägt

chat/index.ts, vor jeder Antwort (außer Howto/akute Belastung):
  Kandidat mit introduced_at IS NULL, ≥2 Coach-Antworten in diesem Gespräch?
    → VOICE_INTRODUCE_BLOCK — Coach spricht das Muster behutsam als "innerer Wächter" an,
      OHNE Namen zu erfragen; introduced_at wird sofort gesetzt
  sonst: Kandidat mit introduced_at vor ≥24h, noch unbenannt (älteste zuerst)?
    → VOICE_NAMING_BLOCK — Coach bietet Namensgebung an, schließt mit
      <<VOICE_NAMING_CHOICE voiceId... options... allowCustom... allowDismiss...>>
      ↓
CoachScreen: extractVoiceNaming() trennt Marker vom sichtbaren Text,
  rendert VoiceNamingChips (Vorschläge + Freitext + "Passt nicht für mich")
  ↓
Auswahl → inner_voices.update({ status: 'named'|'dismissed', name, named_at/dismissed_at })
  + Auswahl wird als normale Folgenachricht gesendet (Gespräch geht natürlich weiter)
  ↓
Spiegel → Muster (/mirror/muster) zeigt benannte Stimmen + Hinweis auf bereits angesprochene Kandidaten
```

### Krisenfall-Flow

```
sendMessage() — neue Nutzer-Nachricht
  ↓
chat/index.ts: detectCrisis() klassifiziert NUR diese eine Nachricht (Haiku, fail-safe)
  ↓
acute_risk && confidence ∈ {medium, high}?
  ja:
    → Insert in crisis_events (service_role, RLS blockiert sonst jeden Zugriff)
    → systemPrompt = CRISIS_RESPONSE_BLOCK (ersetzt ALLE anderen Prompt-Blöcke)
    → max_tokens 400 → 700 (Pflichttext mit Hotline-Nummern darf nie abgeschnitten werden)
    → Stream beginnt mit Meta-Chunk { messageType: 'crisis_response' }
  nein:
    → normaler buildSystemPrompt()-Ablauf
  ↓
useChat.js: Meta-Chunk setzt messageType auf der Assistant-Message;
  chat speichert die Antwort mit message_type = 'crisis_response', crisis_events.message_id = Nutzer-Nachricht
  ↓
CoachScreen rendert CrisisResponseCard statt ChatBubble
  → TelefonSeelsorge-Nummern/URL werden per Regex zu tel:/https:-Links
  ↓
Keine Echtzeit-Benachrichtigung an Jerome — wöchentliche Sichtung (siehe crisis_events)
```

### RAG-Kontext-Flow

```
chat — Gesprächsmodus, conversation_context für diese Konversation fehlt noch
  ↓
erste Nutzer-Nachricht des Gesprächs → _shared/rag.ts
  → OpenAI Embedding (text-embedding-3-small, Timeout 2,5 s)
  → match_experiences (Cosine Similarity > 0.78, Top 3)
  ↓
Ergebnis in conversation_context (nur service_role) + direkt in BLOCK 4
  ↓
Folgende Turns: rag_context aus conversation_context
(Embedding fehlgeschlagen → nichts gespeichert, nächster Turn versucht es erneut)
```

---

## 9. Kennenlernen · Ruhemodus · Begleitung (seit U4, Migration 038)

Grundsatz (UX-Konzept 5.2): Was über den Menschen entsteht, bleibt in jeder Phase sichtbar. Begrenzt werden nur neue Gespräche und die Länge eines Gesprächs – dort entstehen die Kosten.

| Bereich | Kennenlernen (`free`) | Ruhemodus | Begleitung |
|---|---|---|---|
| Neue Gespräche | `session_limit` insgesamt (Default 3, `null` = unbegrenzt) | – | `premium` ohne Startgrenze, mit Abo begrenzt durch das Monatskontingent · `tester` eigenes Limit (Admin, z. B. 200/300/500) |
| Fortsetzen / Weitermachen | bis 100 Nachrichten je Gespräch | bis 100 Nachrichten (Tester ohne Grenze) | ohne Grenze je Gespräch; mit Abo Monatskontingent (Begleitung 150 / intensiv 800 eigene Nachrichten, + 10 Kulanz in einem Gespräch) |
| Heute, Spiegel, Verlauf, Export, Profil | vollständig | vollständig | vollständig |

**Regeln:** `access_state_for(uid)` (SQL, nur service_role) ist die einzige Quelle: `premium` → Begleitung; `tester` → Begleitung, solange Starts übrig sind, sonst Ruhemodus, keine Kappung; sonst Kennenlernen, solange Starts übrig sind, sonst Ruhemodus, Kappung 100 (Konstante `c_cap`). Bestandsgespräche (schon gezählt) lassen sich ohne neuen Start fortsetzen.
**Zähler:** `profiles.trial_sessions_used` (insgesamt, server-only). `sessions_used_this_month` ist Altbestand; der Monats-Reset ist abgeschaltet.
**Zählung:** ausschließlich serverseitig und idempotent pro Konversation über `consume_session` (beim ersten `chat`-Aufruf im Gesprächsmodus). Wellness, Briefing, Entry-Kontext zählen sofort beim Start; ein Standard-Gespräch bei der ersten Nutzer-Nachricht; Fortsetzen zählt nicht; Howto-FAQ und Gedächtnis-Extraktion zählen nie.
**Durchsetzung:** nur serverseitig – `429 { error: 'session_limit', phase }` (kein Start mehr) und `409 { error: 'conversation_cap', cap }` (Kappung, geprüft vor Zählung und Speichern). Krisenantworten gehen in beiden Fällen durch. Das Frontend (`useAccessState`) zeigt nur an und vermeidet leere Konversationen im Ruhemodus.
**Übergangstexte (UX 5.4):** 1. vor dem letzten Kennenlern-Gespräch (Einstieg und oben im neuen Gespräch, bis zur ersten Nachricht) · 2. Karte „Ende des Kennenlernens“ auf Heute (nur Standardgrenze 3, mit „Schließen“) · 3. `RestModeSheet` („Für ein neues Gespräch gibt es die Begleitung …“) · 4. `ConversationCapNotice` (Eingabe gesperrt). „Einmalig“ pro Gerät über `localStorage` (`fs_trial_last_hint_v1`, `fs_trial_end_card_v1`). Kein Zähler im Chat; im Profil eine ruhige Zeile zur Phase.

**Rate-Limits pro Nutzer** (Migration 029, RPC `consume_rate_limits`, Werte zentral in `supabase/functions/_shared/rateLimit.ts`): `chat` Gespräch 10/Minute + 200/Tag · Howto 30/Stunde · Extraktion 30/Tag · `post-conversation` 60/Tag · `validate-invite-code` 5/Stunde + 10/Tag. Antwort `429 { error: 'rate_limited', retryAfter }` + `Retry-After`-Header; das Frontend zeigt dann einen Hinweis inkl. Telefonseelsorge statt des Limit-Modals (`src/lib/rateLimit.js`). chat/post-conversation fail-open bei DB-Fehler (protokolliert), Invite-Code fail-closed. Zähler werden täglich nach 2 Tagen gelöscht (Cron `purge-rate-limits`).
**Begleitung:** Seite `/begleitung` (`BegleitungScreen`); `/premium` leitet dorthin. Erreichbar über Ruhemodus-Hinweis, Karte auf Heute, Kappungshinweis, Profil und „Wie es funktioniert“. Ohne `PAYMENTS_ENABLED` (derzeit) nur Info + Kontakt zu Jerome.

**Abo über Stripe (Paket Z, Migration 042):**
- **Stufen:** Begleitung 9,90 €/Monat oder 99 €/Jahr, 150 Nachrichten im Monat; „Begleitung intensiv“ 19,90 € / 199 €, 800 Nachrichten – gebaut, aber aus (`INTENSIV_ENABLED`). Preise im Frontend nur zur Anzeige (`src/content/plans.js`); abgerechnet wird, was in Stripe hinterlegt ist.
- **Zwei Schalter:** Frontend `PAYMENTS_ENABLED` in `legalTexts.js` (setzt nur Jerome, derzeit `false`) und Secret `PAYMENTS_ENABLED` (Server, gesetzt). Ohne Server-Schalter keine Bezahlseite, kein Portal und kein Kontingent.
- **Freischaltung nur über den Webhook:** `plan` setzt ausschließlich `stripe-webhook`. `past_due` bleibt Begleitung (Stripe versucht es ca. 14 Tage erneut, danach „Abonnement kündigen“ → `free`), `tester` wird nie überschrieben. Nach dem Ende eines Abos zählen wieder die Kennenlern-Starts (`trial_sessions_used` zählt auch in der Begleitung weiter).
- **Monatskontingent:** Zeitraum ab dem Startdatum des Abos (auch beim Jahresabo monatlich). Hinweis einmal ab 80 %, danach 10 Nachrichten Kulanz im laufenden Gespräch, dann `409 quota_reached`; neue Gespräche → `429 session_limit` (`reason: 'quota'`). Krisenantworten sind nie gesperrt und werden nicht gezählt; Howto/Extraktion zählen nicht.
- **Kontolöschung:** beendet das Abo sofort, ohne Erstattung (Z-E3); scheitert das, wird nichts gelöscht.
- **Test (J-Z2, 20.11.2026):** 12 Schritte in der Stripe-Sandbox bestanden, Testuhren für Verlängerung/Ende/gescheiterte Zahlung (`supabase/diagnostics/z-quota-test.sql`). Bericht `docs/billing/paket-z-abschlussbericht.md`.

---

## 10. Admin-Bereich & Sicherheitsmuster

Drei Edge Functions (`admin-users`, `admin-feedback`, `admin-invite-user`) folgen demselben Muster — wichtig für jede künftige Erweiterung.

### Das Zwei-Client-Muster (Pflicht für alle Admin-Functions)

**Falle:** PostgREST bestimmt die effektive Datenbank-Rolle über den JWT im `Authorization`-Header, **nicht** über den mitgegebenen API-Key. Ein `createClient(url, serviceRoleKey, { global: { headers: { Authorization: \`Bearer ${userToken}\` } } })` sieht nach einem Service-Role-Client aus, läuft aber effektiv unter der `authenticated`-Rolle des aufrufenden Nutzers — RLS-Policies mit `auth.uid() = user_id` lassen dann nur die eigene Zeile durch (bei `admin-users` führte das dazu, dass nur der Admin selbst in der Nutzerliste erschien; bei `crisis_events`, dessen Policy *jeden* Zugriff blockiert, hätte derselbe Fehler den Insert komplett verhindert).

**Fix, konsequent angewendet:**
```ts
// Client 1: NUR zur Identitätsprüfung — mit dem Nutzer-Token.
const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY,
  { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
const { data: { user: caller } } = await callerClient.auth.getUser(token);

// Client 2: echter Service-Role-Client, OHNE Nutzer-Token — umgeht RLS wirklich.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
```
`callerClient` wird ausschließlich für die eine `getUser()`-Zeile gebraucht. Alle eigentlichen Abfragen/Schreibvorgänge (inkl. `auth.admin.listUsers()`, `auth.admin.inviteUserByEmail()`) laufen über den zweiten Client.

Seit Paket A gibt es keinen „Ein-Client-Ansatz“ mehr: Alle Functions bekommen beide Clients aus `requireUser()` (`_shared/auth.ts`). `chat` nutzt `userClient` (Rolle `authenticated`) nur dort, wo `auth.uid()` gebraucht wird oder die eigene RLS-Policy genau passt (`consume_session`, `inner_voices`); alles andere — Verlauf, Nachrichten, Kontext, `crisis_events` — läuft über `admin` mit geprüftem Eigentum und `user_id`-Filter.

### Sicherheitsmuster v2 (Security-Paket A)

Seit Paket A kapselt `_shared/auth.ts` das Zwei-Client-Muster: `requireUser()` prüft das Token über den echten service_role-Client (`admin.auth.getUser(token)`) und liefert zusätzlich `userClient` (anon-Key + Nutzer-Token, Rolle `authenticated`). Regeln für **jede** Function, auch neue:

1. Erste Zeile nach dem CORS-Preflight: `requireUser(req)` (Nutzer-Functions) bzw. `requireInternalCaller(req)` (Cron). Admin-Functions zusätzlich `requireAdmin(ctx)`. **Einzige Ausnahme:** `stripe-webhook` – dort ist die Prüfung der Stripe-Signatur die Authentifizierung und kommt als Erstes (von Jerome mit Handoff Paket Z bestätigt).
2. Identität nur aus `ctx.user.id`. Body-Felder wie `userId` nie als Identität verwenden.
3. Jede Objekt-ID aus dem Body (`conversationId` …) vor dem ersten Zugriff auf Eigentum prüfen (`assertConversationOwner`). IDs aus Modellausgaben nur übernehmen, wenn sie zu den eigenen Daten gehören; Writes über `admin` immer zusätzlich mit `.eq('user_id', userId)`.
4. Body-Größe und Felder begrenzen (`readJsonBody`, `validateMessages`).
5. Fehlerantworten nur als `{ error: <code> }` (`errorResponse`) — keine `error.message`-Texte an den Client.
6. Gateway-Schalter „Verify JWT“ bleibt aus (`supabase/config.toml` → `verify_jwt = false` je Function; ohne die Datei schaltet `supabase functions deploy` ihn wieder ein).

**Log-Regel (S-04):**
> Erlaubt in Logs: IDs (`userId`, `conversationId`, `requestId`), Zähler, Längen, Dauer, HTTP-Status, Fehlercodes, Fehlertyp, Prompt-**Label**.
> Verboten in Logs: Nachrichteninhalte, Prompts, Modellausgaben (auch nicht als Preview), Akte-, Profil- und Stimmen-Felder, Zusammenfassungen, E-Mail-Adressen, Namen, Einladungscodes.
> Fehlermeldungen von `JSON.parse` enthalten Ausschnitte des geparsten Textes und dürfen deshalb **nicht** geloggt werden. Stattdessen nur `parse_failed`, `outputLength` und gegebenenfalls die Position.

`app_logs`: Client darf nur eigene Zeilen einfügen (nichts lesen), `metadata` ≤ 8 KB, Aufbewahrung 30 Tage (`purge-app-logs`). Seit 034 setzt ein Trigger `origin` (`server` für service_role/postgres, `client` für authenticated/anon) — vom Client nicht fälschbar; das Monitoring zählt danach.

**Monitoring und Notfallplan (S-22):** `security-monitor` (stündlich) → `security_alerts` → Mail über One.com-SMTP (Port 465) bzw. Admin-Tab „Sicherheit“. Für den Ernstfall: `docs/security/notfallplan.md` (sechs Szenarien, 72-Stunden-Frist LDI NRW, Vorfallsprotokoll; ausgedruckt griffbereit).

**Mailkanal (`_shared/mailer.ts`):** Alarm-Mails, Wochenübersicht und Mails an Nutzer (Datenexport, zweiter Faktor) gehen über denselben SMTP-Zugang. Betreff und Text werden als reines ASCII verschickt (`toMailAscii`, denomailer kodiert Umlaute nicht zuverlässig). Mails enthalten nie Inhalte aus dem Konto, keine Nutzer-IDs und keine SMTP-Fehlertexte; Fehler nur als Code.

**Zweiter Faktor für alle (S-06b, freiwillig):** Wer einen Faktor eingerichtet hat, kommt nur mit `aal2` an seine Daten – an drei Stellen: App (`useAuth.mfaGate` → `MfaChallengeScreen`), Edge Functions (`requireUser` → `403 mfa_required`) und Datenbank (restriktive Policy `mfa_required`, MFA-Prüfung in Client-RPCs). Wiederherstellung über 10 Einmal-Codes (`mfa-recovery`), danach sind alle Faktoren entfernt. Alarme: `mfa_recovery_used` (ab 1/Std), `mfa_recovery_failed` (ab 5/Std), `mfa_reset_failed`, `mfa_verify_failed` (Client, ab 5/Std).

**Prüfschritt (`_shared/learning.ts`, S-13):** Alles, was nutzerübergreifend wirkt (Lernbasis, Supervision-Empfehlung), läuft durch `reviewLearningEntry`: Regex-Vorfilter (E-Mail, Telefon, URL, Anweisungsmuster) → Haiku-Prüfung (`identifier`, `instruction`, `contact`, `crisis`, `low_quality`), fail-closed. Geloggt werden nur die Gründe als Codes.

**Angriffstest:** `npm run security:test` (`scripts/security/attack-test.mjs`, Zugangsdaten zweier Testkonten in `.env.security.local`, Vorlage `.env.security.example`) prüft RLS-Trennung, Profil-Schutz, Eigentumsprüfung der Functions, Admin-Schutz, anonymen Zugriff, S-12 (kein Client-Insert in `messages` — auch nicht in eigene Gespräche, erfundener Verlauf wirkungslos, Idempotenz der `clientMessageId`, altes Format → 409), S-13 (Opt-in nur per RPC), S-15 (Fristen-/Berichtsfunktionen gesperrt), S-11 (Feedback nur mit Einwilligung, `age_confirmed_at` server-only), S-22 (#31 Monitoring nur intern), S-16 (#27 Export enthält nur B-Daten, ohne Vektoren/Hashes), S-06b (#33 Codes-Tabelle gesperrt; mit `ATTACK_TEST_MFA=1` #34–#38: aal1 mit Faktor gesperrt an Tabelle, Functions und RPC, Wiederherstellung, Aufräumen – TOTP ohne Zusatzpaket nach RFC 6238), Function-Region eu-west-1 (#32), Paket Z (Z1/Z2 Webhook ohne bzw. mit gefälschter Signatur → 400, Z3 `plan` nicht selbst setzbar, Z4/Z4b Abo-Tabellen und Kontingent-RPCs gesperrt, Z5 „intensiv“ abgeschaltet, Z7 ungültige Stufe/Laufzeit), Rate-Limits und die Security-Header der App (`HDR`). Netzwerkaussetzer werden wiederholt und zählen nicht als „kein Zugriff“. Nur Zähler/Status-Ausgabe, keine Inhalte. `ATTACK_TEST_SUPERVISION=1` bezieht `supervision` ein. Der Test legt bei Testkonto B zwei dauerhafte Gespräche „SECTEST S-12“ an und sperrt B danach kurz (Rate-Limit-Prüfung).

**Löschtest:** `npm run security:deletion-test` (`scripts/security/deletion-test.mjs`, frisches Testkonto C in `.env.security.local`) erzeugt Daten über die normalen Wege, löscht das Konto und prüft den Login; `supabase/security/deletion-check.sql` zählt danach die Reste je Tabelle (Erwartung überall 0; Stand 19.11.2026 nach C-5: 32 Prüfpunkte inkl. `mfa_recovery_codes` und `auth.mfa_factors`, alle 0). `DELETION_TEST_MFA=1` richtet vorher einen zweiten Faktor ein, erzeugt Codes, prüft den Export und löscht mit `aal2`. `DELETION_TEST_SUBSCRIPTION=1` (Paket Z): C hat vorher in der Sandbox ein Abo abgeschlossen; geprüft wird zusätzlich, dass es bei Stripe beendet ist. Stand 20.11.2026: Löschung mit Abo von Hand geprüft (J-Z2 Test 10), 36 Prüfpunkte inkl. `subscriptions`, `message_quota_periods`, `message_charges`, alle 0.

### Browser-Schutz (S-08)

`vercel.json` setzt für alle Pfade: `Strict-Transport-Security` (2 Jahre, inkl. Subdomains), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (Mikrofon nur `self`, Kamera/Standort/Zahlung/USB aus), `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: DENY` und die **erzwingende** `Content-Security-Policy` (seit 19.11.2026; die Beobachtungswoche wurde übersprungen, weil die App noch keine aktiven Nutzer hat — Brüche fallen bei den nächsten Tests auf):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self';
img-src 'self' data: blob:; connect-src 'self' https://<projekt>.supabase.co wss://<projekt>.supabase.co;
worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';
upgrade-insecure-requests
```

**Wenn etwas nicht lädt:** In der Browser-Konsole steht `Refused to load … because it violates the following Content Security Policy directive …` — die genannte Quelle bewusst prüfen und ggf. in `vercel.json` ergänzen. Der Angriffstest prüft die Header (`HDR`).

`'unsafe-inline'` nur für Styles (React-`style`-Props); Skripte strikt `'self'`, kein Inline-Script in `index.html` (Angriffstest #47). Der Service Worker wird seit Paket P über `useRegisterSW` registriert, `registerSW.js` gibt es nicht mehr. **Jeder neue externe Dienst muss in die CSP.**

### Admin-Berechtigung

Jede Admin-Function prüft über `requireAdmin()` `profiles.is_admin` **und** den zweiten Faktor (`aal2`), **bevor** irgendetwas gelesen/geschrieben wird — ein versteckter Frontend-Screen (`AdminRoute`) ist ausdrücklich kein Ersatz dafür, da jede Anfrage auch direkt gegen die API gerichtet werden könnte. Nicht-Admins erhalten `403 forbidden`, Admins ohne zweiten Faktor `403 mfa_required`. Neue Admin-Functions (z. B. protokollierte Einsicht S-20) laufen ebenfalls über `requireAdmin`. Der Datenexport (S-16) ist dagegen eine **Selbstauskunft**: `export-my-data` mit `requireUser`, nur die eigenen Daten (siehe „Datenexport“).

`is_admin` wird **nie** über die App gesetzt (Henne-Ei-Problem) — einmaliges manuelles Update im Supabase-SQL-Editor:
```sql
update profiles set is_admin = true where id = '<user_id>';
```

---

## 11. Build & Deployment

### Vite-Konfiguration

- Plugin: `@vitejs/plugin-react` + `vite-plugin-pwa`
- PWA-Manifest (Paket P): `id /`, `name: Friedensstifter`, `short_name: Frieden` (Gerätetest: „Friedensstifter“ wurde gekürzt), `lang de`, `start_url`/`scope /`, `display: standalone`, `theme_color #2D5A4E`, `background_color #F5F3EF`; Icons `pwa-192` + `pwa-512` (`any`) und `pwa-maskable-512` (`maskable`). iOS: `apple-touch-icon-180.png` und `apple-mobile-web-app-title` „Frieden“ in `index.html`.
- **Service Worker speichert nie Nutzerdaten:** nur Precache statischer Build-Dateien (`js, css, html, woff2, svg, png, ico, webmanifest`), `runtimeCaching: []`, `cleanupOutdatedCaches`, `navigateFallback /index.html` mit Ausnahme für `.pdf`. `scripts/security/check-sw.mjs` bricht den Build ab, sobald eine Laufzeit-Route oder eine Fremd-Origin (Supabase, Mistral, OpenAI, Anthropic …) im Worker steht. Neue Caching-Regeln nur nach Freigabe durch Jerome.
- **Update-Ablauf (P-2):** `registerType: 'prompt'`, `injectRegister: false`. `UpdateBanner` (in `main.jsx`) registriert über `useRegisterSW`, prüft stündlich und bei jeder Rückkehr in den Vordergrund (`reg.update()`) und zeigt „Es gibt eine neue Version …“ mit „Jetzt aktualisieren“ / „Später“; gesperrt, solange eine Antwort läuft. Bei `409 client_outdated` löst `useChat` das Event `fs:client-outdated` aus → automatisch aktualisieren. Der allererste Wechsel von der alten `autoUpdate`-Fassung passierte einmalig ohne Hinweis.
- **Achtung (Befund C-5, gilt weiter):** Ein bereits geöffneter Tab läuft bis zum Aktualisieren mit dem alten Bundle. Ändert ein Deploy Frontend und Datenbank-Regeln zusammen, kann die alte App kurz falsch reagieren. Nach dem Deploy einmal neu laden bzw. den Hinweis antippen.
- **Installation (P-3):** `src/lib/installPrompt.js` fängt `beforeinstallprompt` ab. `useInstallPrompt` liefert den Weg je Gerät. `InstallCard` erscheint auf Heute **einmal** ab dem 2. Gespräch (`message_count >= 3`, wie `todayState`), nie während einer Antwort; „Später“/„So geht's“ setzen `fs_install_hint_v1`. Dauerhaft: Profil → „Friedensstifter auf den Startbildschirm“ (solange nicht installiert). `InstallSheet` zeigt Knopf (Android/Desktop), Anleitung mit Teilen-Symbol (iPhone) bzw. den Umweg über Safari/Chrome (In-App-Browser). Start der installierten App wird einmal pro Gerät als `pwa_launched_standalone` gezählt.
- **Anmeldung in der installierten App (P-4):** Mail-Links öffnen auf dem iPhone Safari, nicht die App. Deshalb zeigt `AuthScreen` nach „Link per E-Mail“ im App-Modus ein Code-Feld (`verifyOtp`, `type: 'email'`); die Vorlage `magic_link.html` enthält dafür zusätzlich `{{ .Token }}` (im Dashboard übernommen). Danach greift wie gewohnt die Code-Abfrage des zweiten Faktors.
- **Offline (P-5):** `OfflineBar` (in `main.jsx`) zeigt eine ruhige Zeile; Senden ist gesperrt, nichts wird offline gespeichert.
- **Sichere Ränder:** Hilfsklassen in `globals.css`: `h-app` (100vh → 100dvh), `pt-safe-header`, `pb-safe-cta`, `pb-shell` (`env(safe-area-inset-*)`); genutzt in `CoachScreen`, `HowItWorksScreen`, `LandingScreen`, `AppShell`.
- **Header (`vercel.json`):** `/sw.js` und `/manifest.webmanifest` mit `Cache-Control: public, max-age=0, must-revalidate` (Manifest zusätzlich `Content-Type: application/manifest+json`), `index.html` ohne Cache, `/assets/*` ein Jahr `immutable`. Angriffstest #45–#48.
- **Monitoring:** `monitorRules.ts` `pwa_client_error` (Register-/Update-/Install-Fehler, Schwelle 10/Tag, origin client) und `pwa_usage` (Starts, Updates, Installationen, nur Wochenübersicht).
- Bestandsaufnahme und Bauentscheidungen: `docs/pwa/paket-p-discovery.md`.

### Umgebungsvariablen

```bash
# .env.local (Frontend)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase Edge Functions (serverseitig, nie im Client)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=   # automatisch in Edge Functions verfügbar
SITE_URL=                    # optional, Fallback: https://app.friedensstifter.coach (admin-invite-user, Stripe-Rückkehr-URLs)
CRON_SECRET=                 # supervision, security-monitor; derselbe Wert liegt in Vault als 'cron_secret'
SMTP_HOST= SMTP_PORT=465 SMTP_USER= SMTP_PASS=   # One.com, Mailkanal (Alarme, Export-/MFA-Mails)
ALERT_EMAIL_FROM= ALERT_EMAIL_TO=                 # Absender bzw. Empfänger der Alarm-Mails
MFA_CODE_PEPPER=             # mfa-recovery: HMAC-Schlüssel der Wiederherstellungscodes (≥ 32 Zeichen, offline gesichert)
STRIPE_SECRET_KEY=           # Paket Z: eingeschränkter Schlüssel (rk_test_… bis J-Z3), Rechte siehe STRIPE_INTEGRATION_TODO.md
STRIPE_WEBHOOK_SECRET=       # Paket Z: whsec_… des Webhook-Endpunkts
PAYMENTS_ENABLED=1           # Paket Z: Server-Schalter (Bezahlseite, Portal, Kontingent)
INTENSIV_ENABLED=            # Paket Z: nicht gesetzt = „Begleitung intensiv“ aus
```

Kein Stripe-Schlüssel im Frontend und keine `VITE_`-Variable dafür (auch kein `pk_…`, die Bezahlseite ist gehostet). `SITE_URL` nur vorübergehend für lokale Tests auf `http://localhost:5173` setzen und danach entfernen.

`.env.security.local` (nur lokal, nicht eingecheckt): Zugangsdaten der Testkonten A und B für `npm run security:test` und eines frischen Kontos C für `npm run security:deletion-test` (Vorlage `.env.security.example`). Schalter beim Aufruf (cmd): `set ATTACK_TEST_MFA=1&& npm run security:test`, `set DELETION_TEST_MFA=1&& npm run security:deletion-test`, `set DELETION_TEST_SUBSCRIPTION=1&& npm run security:deletion-test`.

### Deployment

- **Frontend:** Vercel (Auto-Deploy aus `main`-Branch)
- **Edge Functions:** `supabase functions deploy <name>` — `supabase/config.toml` hält `verify_jwt = false` für alle Functions fest (zur Sicherheit zusätzlich `--no-verify-jwt`)
- **Migrationen:** `supabase db push` vor jedem Deployment das DB-Änderungen enthält
- **Reihenfolge:** Erst den Branch nach `main` mergen (bzw. auschecken), **dann** `db push` und `functions deploy` (bei Paket Z ausnahmsweise Migration vor Functions, weil `chat` die neuen RPCs aufruft) — die CLI arbeitet mit dem lokalen Stand (Panne 19.11.2026: „Remote database is up to date“, weil die neue Migration lokal noch fehlte). Nach neuen RPCs: `notify pgrst, 'reload schema';`
- **Build-Prüfung:** `postbuild` (`scripts/security/check-build.mjs`) läuft nach jedem `npm run build`, auch auf Vercel. Findet sie ein Schlüsselmuster (`sk-ant-`, OpenAI, `sb_secret_`, Namen geheimer Variablen) oder ein JWT mit einer anderen Rolle als `anon`, scheitert der Build und Vercel deployt nicht.
- **Secret-Scan:** `npm run security:secrets` (gitleaks über die ganze Historie, Ausgabe nur Regel/Datei/Commit/Zeile; anon- und `sb_publishable_`-Keys gelten als öffentlich).
- **ZIPs zum Teilen:** nur `npm run share:zip` (`git archive` aus HEAD, `export-ignore` für `.env*`, `*.har`, `*.csv`, Audit-Ergebnisse).
- **Supabase CLI:** 2.95.4 (Update auf 3.x geplant, danach Probe-Deploy)
- **Domain:** `app.friedensstifter.coach` (Vercel Custom Domain)

**Auth-Mails:** eigener SMTP-Absender `hallo@friedensstifter.coach` über One.com (SPF/DKIM/DMARC gesetzt). Die deutschen Vorlagen (Einladung, Registrierung, Magic Link, Passwort-Reset) liegen als Quelle in `supabase/templates/` und werden **manuell** ins Dashboard (Authentication → Emails → Templates) kopiert.

### Vor jedem Deployment prüfen

1. Sprachprinzip-Audit: Alle UI-Texte auf verbotene Wörter (`müssen`, `immer`, `nie`, `können nicht`, `du bist X`)
2. Migrationen ausgeführt: `supabase db push`
3. Edge Functions deployed (bei Bedarf, je nach Änderung): `chat`, `post-conversation`, `pre-session-briefing`, `validate-invite-code`, `admin-users`, `admin-feedback`, `admin-invite-user`, `admin-security`, `delete-account`, `export-my-data`, `mfa-recovery`, `supervision`, `security-monitor`, `backfill-embeddings`, `create-checkout-session`, `stripe-webhook`, `create-portal-session` (oder alle: `supabase functions deploy --no-verify-jwt`) — bei Änderungen an `_shared/*` alle, die das Modul importieren
4. **Angriffstest:** `npm run security:test` → alle PASS (vor jedem Release)
5. Neue Tabellen/Functions: RLS + Policies nur für `authenticated` + gezielte GRANTs; neue Functions mit `requireUser`/`requireInternalCaller` und Eintrag in `supabase/config.toml`; Log-Regel beachten
6. Neue externe Dienste/Origins: in die CSP (`vercel.json`) aufnehmen
7. Nachrichten schreibt nur der Server — kein `supabase.from('messages').insert` im Frontend
8. Änderungen an Tabellen mit Personenbezug oder an der Löschlogik: Löschtest (`npm run security:deletion-test` + `deletion-check.sql`) → überall 0
9. Texte über Datenverarbeitung (Datenschutzerklärung, Opt-in) mit dem tatsächlichen Stand abgleichen — offen laut Abschlussbericht Paket B: OpenAI-Embeddings, Lernbasis, Fristen

## Supabase-Dashboard: Einstellungen außerhalb des Codes (Paket K)

Diese Werte stehen nicht im Repository und werden von Jerome im Dashboard gepflegt. Ändert sich einer, die Stelle im Code mitziehen.

| Einstellung | Wert | Gegenstück im Code |
|---|---|---|
| Authentication → Email → Confirm email | **an** (seit 20.11.2026) | `/start/4` zeigt „Bestätige deine E-Mail“; Einladungscode wartet in `localStorage` (`pendingInviteCode`) bis zum ersten Login; `security:k7` nutzt dann den SQL-Weg |
| Authentication → Passwort-Mindestlänge | 12 | `PASSWORD_MIN_LENGTH` in `src/lib/passwordPolicy.js` |
| Require current password when updating | an | `mapAuthError` (`current_password_required`, `current_password_invalid`), Angriffstest K1/K2 |
| Redirect-URLs | u. a. `https://app.friedensstifter.coach/passwort-neu` | `ForgotPasswordForm`, `PasswordResetScreen` |
| E-Mail-Vorlagen | Reset Password, Password changed, Invite, Confirm signup, Magic Link | `supabase/templates/*.html` (Quelle, manuell übertragen) |
| SMTP | One.com, `send.one.com:465`, Absender `hallo@friedensstifter.coach` | Empfänger in `DATA_RECIPIENTS` (`legalTexts.js`); Functions-Mailer nutzt eigene Secrets (`SMTP_*`) |
| Database → Backups | täglich, 7 Tage; Point-in-Time-Recovery aus | `BACKUP_DELETION = 'spätestens nach 14 Tagen'` in `legalTexts.js` |
| Projekt-Region | `eu-west-1` (Irland) | `x-region` in `src/lib/functions.js`, Sicherheitsseite „Region“ |

## Stripe-Dashboard: Einstellungen außerhalb des Codes (Paket Z)

Eingerichtet in der Sandbox (J-Z1, 20.11.2026); für den Live-Modus in J-Z3 gleich anlegen. Ändert sich einer, die Stelle im Code mitziehen.

| Einstellung | Wert | Gegenstück im Code |
|---|---|---|
| Produkte | „Begleitung“, „Begleitung intensiv“, Metadaten `tier` = `begleitung` bzw. `intensiv` | `tierFromPrice()` in `_shared/stripe.ts` |
| Preise (inkl. Steuer, § 19 UStG) | Suchschlüssel `begleitung_monat` 9,90 €, `begleitung_jahr` 99 €, `intensiv_monat` 19,90 €, `intensiv_jahr` 199 € | `LOOKUP_KEYS`; Anzeige `src/content/plans.js` |
| Kundenportal | Upgrade sofort anteilig mit sofortiger Rechnung, Downgrade/Verkürzung zum Periodenende, Kündigung zum Periodenende, keine Umfrage/Halteangebote | `create-portal-session`, Webhook (`cancel_at`, `pending_tier`) |
| Rechnungen | Fußzeile mit Hinweis § 19 UStG | – |
| Webhook-Endpunkt | `…/functions/v1/stripe-webhook`, „Ihr Konto“, Nutzlast „Momentaufnahme“, API-Version `2026-10-28.endive`, genau 6 Ereignisse | `HANDLED` in `stripe-webhook`, Secret `STRIPE_WEBHOOK_SECRET` |
| Eingeschränkter Schlüssel | Customers, Checkout Sessions, Subscriptions, Customer Portal: Schreiben · Prices, Products: Lesen | Secret `STRIPE_SECRET_KEY` |
| Umsatzsicherung → Wiederholungsversuche | erster Fehlschlag: Abo „überfällig“ belassen · alle Versuche gescheitert: **Abonnement kündigen** | Z-9: `past_due` bleibt Begleitung, danach `free` |
| Sprache | Bezahlseite und Kundenportal auf Deutsch (A0-2) | `locale: 'de'` in `create-checkout-session` und `create-portal-session` |
