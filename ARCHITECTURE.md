# Friedensstifter — Architektur-Dokumentation

> Stand: 19.11.2026 · nach v3.2 + Admin-Bereich, Krisenprotokoll, Gesprächsverlauf, Coaching-Vereinbarung-Rückblick · Security-Paket A (S-01 bis S-04) · Rate-Limits · Security-Paket B Welle 1 (Header/CSP, Schriften lokal, Admin-MFA), Welle 2a/2b (Server schreibt Nachrichten, Client ohne Schreibrecht), Welle 3 (Lernbasis mit Opt-in und Prüfschritt) und Welle 4 (Löschregeln, Fristen, Löschtest) · CSP erzwingend · **Paket B abgeschlossen** (Bericht: `docs/security/paket-b-abschlussbericht.md`) · **T0 Modellwechsel Sonnet 5.5** (19.11.2026, `_shared/models.ts`) · **U1 Navigation** (19.11.2026: Heute · Gespräch · Spiegel, Profil über Avatar) · **U2 Spiegel** (19.11.2026: drei Ebenen, wertfrei, ohne Anzeige-Sperren) · **U3 Heute & Einstieg** (19.11.2026: Zustände A–D/C2, Weitermachen ohne neues Gespräch, Migration 035) · **Paket C Welle C-3** (S-11: Feedback nur mit Einwilligung, 18+, Hinweis Spracheingabe, Migration 036)

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
9. [Freemium-Logik](#9-freemium-logik)
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
| PWA | `vite-plugin-pwa` (Workbox) |
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
│   │   ├── useAuth.js                   ← User, Session, Profile, Consent, Coaching-Vereinbarung
│   │   ├── useChat.js                   ← Gesprächs-State, Streaming, Start-/Resume-Varianten, Senden mit clientMessageId
│   │   ├── useAdminMfa.js               ← Zweiter Faktor (TOTP) für den Admin-Bereich + AdminMfaContext
│   │   ├── useMemory.js                 ← Legacy Coach-Gedächtnis (user_memory)
│   │   ├── useStreak.js                 ← Tage-in-Folge (streak_count), seit U1 nirgends angezeigt
│   │   └── useVoiceInput.js             ← Web Speech API (de-DE)
│   │
│   ├── lib/
│   │   ├── supabase.js                  ← Supabase-Client (anon key)
│   │   ├── prompts.js                   ← UI-Texte: Eröffnungen (Kopie in chat/index.ts!), Wellness-Scores, Impulsfragen
│   │   ├── rateLimit.js                 ← 429 rate_limited erkennen + Hinweistext
│   │   ├── consent.js                   ← Versionen der Zustimmungstexte (inkl. LEARNING_CONSENT_VERSION)
│   │   ├── functions.js                 ← functionUrl/functionHeaders (Region eu-central-1, S-09)
│   │   └── logger.ts                    ← Frontend-Logger (console + app_logs)
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
│   │   │   ├── AppShell.jsx             ← <Outlet> + BottomNav
│   │   │   ├── BottomNav.jsx            ← 3 Tabs: Heute · Gespräch · Spiegel (ohne Zähler)
│   │   │   └── ProfileButton.jsx        ← Avatar oben rechts → /profile (Heute, Gespräch, Spiegel)
│   │   ├── coach/                       ← Chat-spezifische Komponenten
│   │   │   ├── ChatBubble.jsx
│   │   │   ├── ChatInput.jsx            ← Textarea + Mikrofon-Button
│   │   │   ├── QuickReplies.jsx
│   │   │   ├── TypingIndicator.jsx
│   │   │   ├── ConversationEndModal.jsx
│   │   │   └── CrisisResponseCard.jsx   ← Eigene Card statt Bubble bei Krisenfall (v-Krise)
│   │   ├── profile/
│   │   │   └── LearningConsentCard.jsx  ← Opt-in „Zur Lernbasis beitragen“ (S-13)
│   │   └── legal/
│   │       └── CoachingAgreementContent.jsx ← Vertragstext, single source of truth
│   │
│   └── screens/
│       ├── landing/                     ← Öffentliche Einstiegsseiten
│       │   ├── LandingScreen.jsx
│       │   ├── AuthScreen.jsx
│       │   └── WelcomeScreen.jsx
│       ├── onboarding/                  ← 5-stufiger Onboarding-Flow
│       │   ├── OnboardingFlow.jsx
│       │   ├── Step1Welcome.jsx
│       │   ├── Step2Question.jsx
│       │   ├── Step3Reveal.jsx
│       │   ├── Step3bAgreement.jsx      ← Coaching-Vereinbarung, nutzt CoachingAgreementContent
│       │   └── Step4Auth.jsx
│       ├── home/
│       │   └── HomeScreen.jsx           ← Dashboard mit Tool-Kacheln (Coach/Wellness/Stimmen/Verstehen → Spiegel)
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
│       ├── premium/
│       │   └── PremiumScreen.jsx
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
│   │   │   ├── auth.ts                  ← requireUser/requireAdmin(aal2)/requireInternalCaller, Eigentum, Limits
│   │   │   ├── logger.ts                ← Zentraler Logger (sanitizeLogData, describeError)
│   │   │   ├── rag.ts                   ← Embedding + match_experiences (nur serverseitig)
│   │   │   ├── learning.ts              ← Prüfschritt (Vorfilter + Haiku, fail-closed) für Lernbasis und Supervision
│   │   │   └── rateLimit.ts             ← Rate-Limit-Regeln + enforceRateLimit
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
│   │   ├── delete-account/index.ts      ← Account-Löschung (hard delete)
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
│   │   └── 036_s11_privacy_fixes.sql    ← Feedback-Einwilligung (RLS), age_confirmed_at, confirm_age, consent_ip entfernt
│   ├── security/                        ← Audit-SQL (nur Metadaten) für Jerome
│   ├── templates/                       ← Auth-Mail-Vorlagen (Quelle fürs Dashboard)
│   └── config.toml                      ← verify_jwt = false je Function
│
├── scripts/security/attack-test.mjs     ← Angriffstest (npm run security:test)
├── scripts/security/deletion-test.mjs   ← Löschtest (npm run security:deletion-test, Testkonto C)
├── scripts/security/secret-scan.mjs     ← gitleaks über die ganze Historie (npm run security:secrets, nur Fundorte)
├── scripts/security/check-build.mjs     ← postbuild: dist/ auf Schlüssel prüfen, Build bricht ab
├── scripts/share-zip.mjs                ← ZIP zum Teilen nur aus HEAD (npm run share:zip)
├── .gitleaks.toml                       ← Allowlist öffentlicher Werte (Projekt-URL)
├── docs/security/                       ← Discovery, Handoffs, Lösungsdesign, Abschlussberichte
├── vercel.json                          ← SPA-Rewrite, Cache-, Security-Header, CSP
├── tailwind.config.js                   ← Custom Colors via CSS-Variablen
├── vite.config.js                       ← PWA-Manifest, Workbox (keine Fremd-Origins)
├── index.html                           ← viewport-fit=cover (Schriften kommen aus dem Build)
├── CLAUDE.md                            ← Technische Dokumentation für Claude Code
└── ARCHITECTURE.md                      ← dieses Dokument
```

---

## 3. Routing & Navigation

### Routen-Tabelle

| Pfad | Screen | Auth | Zusatz-Guard | AppShell |
|---|---|---|---|---|
| `/landing` | LandingScreen | nein (auth → `/home`) | — | nein |
| `/auth` | AuthScreen (nur Anmeldung; Registrieren → `/onboarding`, Magic Link ohne Kontoanlage) | nein (auth → `/home`) | — | nein |
| `/onboarding` | OnboardingFlow | nein (auth → `/home`) | — | nein |
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
| `/premium` | PremiumScreen | **ja** | — | nein |
| `/coach/verlauf` | HistoryScreen | **ja** | — | nein |
| `/verlauf` | Weiterleitung → `/coach/verlauf` (alte Lesezeichen, U1) | — | — | — |
| `/` | Weiterleitung → `/home` (angemeldet) bzw. `/landing` | — | — | — |
| `/verstehen`, `/verstehen/aus-gespraechen`, `/stimmen` | Weiterleitung → `/mirror/muster` (U2) | — | — | — |
| `/verstehen/:key` | Weiterleitung → `/mirror/muster/:key` (U2) | — | — | — |
| `/vereinbarung` | CoachingAgreementScreen | **ja** | — | nein |
| `/admin/users` | AdminUsersScreen | **ja** | `AdminRoute` (`profile.is_admin`) | nein |
| `/impressum` | ImpressumScreen | nein | — | nein |
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
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <Navigate to="/landing" replace />
  return children
}

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
- **C – Ruhe:** Tagesimpuls (`DailyImpulseCard`) · „Erst mal ankommen → Wie geht's dir?“ · „Ins Gespräch →“
- Dauerhaft: Erklärzeile unter verdeckten Karten („Verdeckt, damit niemand mitliest …“), Link „Wie funktioniert die App?“
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

**Session-Limit:** Nur `plan === 'premium'` ist unbegrenzt. `'tester'` zählt wie jeder unbezahlte Account und wird durch `profile.session_limit` begrenzt (individuell pro Nutzer im Admin-Bereich setzbar, `null` = unbegrenzt). Durchsetzung passiert **zweifach**: clientseitig in `handleSend()` (UX, zeigt Limit-Modal) und serverseitig in `chat/index.ts` (harte Grenze, 429 bei Überschreitung — ein direkter Funktionsaufruf am Frontend vorbei wird ebenfalls blockiert).

**Krisenfall-Rendering:** Nachrichten mit `messageType === 'crisis_response'` werden als `CrisisResponseCard` statt als `ChatBubble` gerendert (siehe [Krisenfall-Flow](#krisenfall-flow)).

**Gescheitertes Senden (S-12):** Eigene Nachrichten mit `status === 'failed'` zeigen darunter „Nicht gesendet – nochmal versuchen“ → `retryMessage(msg)` (gleiche `clientMessageId`, der Server legt nichts doppelt an). Eine Bubble mit `action === 'reload'` („Es gibt eine neue Version der App …“) lädt die Seite neu. Rate-Limit-Hinweise erscheinen als Coach-Bubble inkl. Telefonseelsorge (`src/lib/rateLimit.js`).

**"Innere Stimmen"-Namensgebung:** Enthält eine Nachricht den `<<VOICE_NAMING_CHOICE ...>>`-Steuerblock, wird er aus dem sichtbaren Text entfernt und stattdessen als Chip-Auswahl (`VoiceNamingChips`) gerendert — Auswahl schreibt direkt in `inner_voices` und wird als normale Folgenachricht weitergeführt.

---

#### MirrorScreen (`/mirror`, `/mirror/muster`, `/mirror/entwicklung`) – seit U2

**Rolle:** „Spiegel“ mit drei Ebenen, jede mit eigener Route (Segment-Umschalter navigiert, Zurück-Taste und Lesezeichen funktionieren). Alle in der AppShell, Tab „Spiegel“ aktiv. **Keine Anzeige-Sperren** (UX-Konzept 5.2: Was über dich entsteht, ist für dich sichtbar). **Wertfrei** (4.3c): eine neutrale Farbe, keine Konfidenz- oder Aktivitätspunkte, kein „Aufgelöst“; `confidence`/`status` steuern nur die Sortierung. Dateien in `src/screens/mirror/`: `MirrorScreen`, `InsightsLevel`, `PatternsLevel`, `DevelopmentLevel`, `FileEntrySheet`, `PatternDetailScreen`, `shared` (Ladeanzeige, `LoadError`, `statusText`, `momentsText`).

**Ebene Erkenntnisse** (`/mirror`, `InsightsLevel`):
- Filter Alle · Erkenntnisse · Stärken · Vorhaben (`ziel` heißt in der Anzeige „Vorhaben“; `muster` nur unter „Alle“)
- Karte mit Kategorie (eine neutrale Farbe), Anheften, Entfernen. Writes mit `.select('id')` bestätigt; Fehler → Hinweis, UI ändert sich erst nach Erfolg (`insight_pin_failed`, `insight_delete_failed`). Ladefehler → `LoadError` statt Leerzustand.

**Ebene Muster** (`/mirror/muster`, `PatternsLevel`) – jedes Muster an genau einem Ort:
1. **Deine Stimmen**: `inner_voices` `status='named'`, „zeigt sich bei: …“ (Akte-Labels mit `voice_id`), „Mit <Name> sprechen“ → `/coach`
2. **Was sich bei dir zeigt**: Akte-Muster (`coach_file_entries`, `category='pattern'`, „N Momente aus Gesprächen“ = Anzahl `history`, mind. 1, Status beschreibend, „gehört zu: <Stimme>“) → `FileEntrySheet` (Beschreibung, Beispiel, Verlauf; per `createPortal` in `document.body`). Dazu Bibliotheks-Muster mit eigenen `pattern_references` („N Momente“) → Detail
3. **Kandidat** (eingeführt, unbenannt): „Da ist etwas, das sich wiederholt. Magst du es dir ansehen? Darüber reden →“. Nicht eingeführte Kandidaten bleiben unsichtbar
4. **Kennst du das?**: übrige Bibliotheks-Muster

Akte-Muster und `pattern_references` sind im Datenmodell nicht verknüpft (kein gemeinsamer Schlüssel); deshalb gibt es das Detail nur für die fünf Bibliotheks-Muster.

**Ebene Entwicklung** (`/mirror/entwicklung`, `DevelopmentLevel`, bisher „Deine Akte“): „Was sich bei dir bewegt · Aus N Gesprächen“ (N = `session_notes`) → **Deine Entwicklung** (Zeitachse aus `session_notes.file_updates`, neueste oben, ein Punkt in Akzentfarbe; Texte: zum ersten Mal bemerkt / neue Beobachtung / seltener in den letzten Gesprächen / zeigt sich gerade kaum) → **Deine Stärken** (ohne ✦) → **Wie du reagierst** (`trigger` + `value`) → **Dein Alltag** (`coachee_profile`).

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
- Einstellungsliste: Profil bearbeiten, Wie es funktioniert, Plan (nicht Tester), Beta-Feedback/-Fragebogen (Tester), Coaching-Vereinbarung, Datenschutzerklärung, Impressum, Abmelden, **Konto löschen** (`delete-account`, siehe [Abschnitt 5](#delete-account--account-löschung)).

---

#### CoachingAgreementScreen (`/vereinbarung`)

**Rolle:** Nachträglicher Rückblick auf die im Onboarding akzeptierte Coaching-Vereinbarung.

- Nachweis-Card oben: Zustimmungsdatum (`coaching_agreement_accepted_at`, Format „12. Juli 2026, 14:32 Uhr") oder Fallback-Hinweis bei fehlendem Datum
- Vertragstext aus `CoachingAgreementContent.jsx` — identisch zur Onboarding-Version (single source of truth)

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

#### OnboardingFlow (`/onboarding`)

**Rolle:** Ersteinrichtung für neue User vor der Registrierung.

**Schritte:**
| Schritt | Komponente | Inhalt |
|---|---|---|
| 1 | Step1Welcome | Begrüßung, Produktversprechen |
| 2 | Step2Question | Bereichswahl (Arbeit, Beziehung, Inneres, etc.) |
| 3 | Step3Reveal | Systemisches Coaching erklären (hier darf der Begriff fallen) |
| 3b | Step3bAgreement | Coaching-Vereinbarung — Zustimmung (nutzt `CoachingAgreementContent`) |
| 4 | Step4Auth | E-Mail + Passwort (Registrierung mit Einwilligung) / Login; Magic Link nur für bestehende Konten (`shouldCreateUser: false`) |

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
- Mikrofon-Button togglet `useVoiceInput`; während der Aufnahme erscheint Interim-Text in der Box
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

#### Legal-Komponenten (`src/components/legal/`)

**CoachingAgreementContent:** reiner Vertragstext (4 Abschnitte + Jerome-Signatur), wird sowohl im Onboarding als auch im Rückblick-Screen gerendert.

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

  signUp(email, password, displayName, meta)  — meta (Einwilligung, Vereinbarung, Onboarding) landet über handle_new_user im Profil
  signIn(email, password)
  sendMagicLink(email)                — nur bestehende Konten (shouldCreateUser: false)
  signOut()
  updateProfile(updates)
  refreshProfile()                    — Profil neu laden (z. B. nach Opt-in oder Einlösen eines Codes)
  checkConsent(profileData)           → 'missing' | 'outdated' | 'valid'
  checkCoachingAgreement(profileData) → 'missing' | 'outdated' | 'valid'
```

**Besonderheiten:**
- Session wird beim Mount aus Supabase wiederhergestellt (`onAuthStateChange`)
- Pending Invite Code: Wenn ein Code in `localStorage` liegt (gesetzt im Onboarding), wird er nach E-Mail-Verifikation automatisch eingelöst
- Consent-Versioning: `consent_version = '1.0'`, `coaching_agreement_version = '1.0'`, Lernbasis `learning_opt_in_version = '1.0'` (Konstanten in `src/lib/consent.js`)
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
7. Fehler **vor** dem Meta-Chunk (Netz, 5xx, Rate-Limit, Monatslimit): Nachricht `status: 'failed'` → „Nicht gesendet – nochmal versuchen“ (`retryMessage`, idempotent). Fehler **nach** dem Meta-Chunk: Platzhalter zeigt den Aussetzer-Text, der Server speichert die Antwort trotzdem zu Ende.
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

Gemeinsame Bausteine für alle Edge-Function-Aufrufe (S-09): `functionUrl(name)` und `functionHeaders(accessToken, extra)` (Authorization, Content-Type, `apikey`, **`x-region: eu-central-1`**). Für künftige `supabase.functions.invoke`-Aufrufe: Option `region: INVOKE_REGION`. Jeder neue Function-Aufruf nutzt diese Bausteine — sonst entscheidet Supabase die Region selbst.

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

`readRateLimit(response)` erkennt `429 { error: 'rate_limited', retryAfter }` (abgegrenzt vom Monatslimit), `rateLimitMessage(retryAfter)` liefert den Hinweistext (Minuten- bzw. Tageslimit, immer mit Telefonseelsorge).

---

#### `src/lib/consent.js`

Versionen der Zustimmungstexte: `CONSENT_VERSION`, `COACHING_AGREEMENT_VERSION`, `LEARNING_CONSENT_VERSION`. Bei inhaltlicher Änderung eines Textes die Version erhöhen.

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

Alle Edge Functions laufen in Deno und haben Zugriff auf `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` und `OPENAI_API_KEY`. **Imports haben feste Versionen** (`npm:@supabase/supabase-js@2.119.0`, `npm:@anthropic-ai/sdk@1.10.0` bzw. `https://esm.sh/@anthropic-ai/sdk@1.10.0`) — ohne Version zieht jeder Deploy die neueste Version (Ausfall 19.11.2026). Schalter-Secrets: `RAG_LEARNING_ENABLED` (Lernbasis, `1` = an), `SUPERVISION_IN_PROMPT` (BLOCK 5, `1` = an) — beide seit 19.11.2026 an. `admin-invite-user` nutzt zusätzlich optional `SITE_URL` (Fallback: `https://app.friedensstifter.coach`), `supervision` das Secret `CRON_SECRET`.

**Sicherheitsmuster v2 (Pflicht, Security-Paket A):** Jede Function ruft nach dem CORS-Preflight als Erstes `requireUser(req)` bzw. `requireInternalCaller(req)` aus `_shared/auth.ts` auf. Die Identität kommt **ausschließlich** aus dem JWT, nie aus dem Body; jede `conversationId` wird mit `assertConversationOwner()` geprüft (403). Gateway-Schalter „Verify JWT“ ist aus (`supabase/config.toml`), die Prüfung passiert im Code. Details: [Abschnitt 10](#sicherheitsmuster-v2-security-paket-a).

**CORS und Region (S-09, Paket C):** Alle Functions holen ihre CORS-Header aus `_shared/cors.ts` (`corsHeaders('POST, OPTIONS')`, interne Functions zusätzlich `x-cron-secret`). Erlaubt ist u. a. `x-region`; das Frontend schickt `x-region: eu-central-1`, die Antwort trägt `x-sb-edge-region: eu-central-1` (Angriffstest #32).

---

### `chat` — Haupt-KI-Proxy

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
3. **Sitzungszählung + Limit** — `userClient.rpc('consume_session', { p_conversation_id })` zählt atomar und idempotent pro Konversation (siehe [Abschnitt 6](#rpcs)). `allowed: false` → `429 { error: 'Session limit reached' }` (außer Krisenfall), die Nutzer-Nachricht wird dann **nicht** gespeichert. RPC-Fehler → `500`, kein Durchlassen.
4. **Nutzer-Nachricht speichern** (Upsert, Fehler → `500 message_insert_failed`, kein Modellaufruf)
5. **"Innere Stimmen"-Taktung** — prüft auf einen unangesprochenen Kandidaten (`introduceVoice`, ab 2. Antwort) oder einen seit ≥24h eingeführten, noch unbenannten Kandidaten (`namingVoice`); beide nie im selben Turn, übersprungen bei akuter Belastung (`wellnessCheck.score <= 3`)
6. **Wirkmechanismus-Rhythmus** (`offerMechanism`) — alle 4 Coach-Antworten (ab der 3.) wird aktiv ein Mechanismus angeboten, unabhängig davon ob im Gesagten etwas "offensichtlich" ist

**System-Prompt-Aufbau (`buildSystemPrompt`), wenn kein Krisenfall vorliegt:**

```
BASE_SYSTEM_PROMPT          (Haltung, Sprachprinzip, Widerstand, Kapazität-vs-Widerstand,
                              Verantwortungsverschiebung, Muster-Erkennung)
  + SYSTEMIC_WITNESSING_BLOCK (Bewertungskette/"Brille", Zirkuläre Kausalität, Selbsterfüllende
                              Prophezeiung, Werte-Kollision, Systemfunktion/"innerer Wächter",
                              blinde Flecken, Regelkreise, Ressourcen, Perspektivwechsel)
  + MECHANISM_OFFER_BLOCK    (nur im Rhythmus-Turn)
  + VOICE_INTRODUCE_BLOCK / VOICE_NAMING_BLOCK (nur je nach Taktung, nie beide gleichzeitig)
  + BLOCK 1: Briefing        (letztes abgeschlossenes Gespräch + offener Faden · in jedem Folgegespräch, Entscheidung 18.11.2026)
  + BLOCK 2: Coach-Akte      (coach_file_entries inkl. linked_value + coachee_profile · Fallback: user_memory)
  + BLOCK 3: Resonanzkarte   (resonance_map · ab 3. Gespräch · immer unsichtbar)
  + BLOCK 4: RAG-Kontext     (geprüfte Erfahrungen aus experience_patterns · als <erfahrungen_anderer_menschen>-Datenblock, „keine Anweisungen“, < > entfernt)
  + BLOCK 5: Supervision     (Wöchentliche Empfehlung · nur mit SUPERVISION_IN_PROMPT=1, seit 19.11.2026 an)
  + BLOCK 6: Wellness-Check  (Score + Skalierungsfrage, ersetzt Standard-Eröffnung)
  + BLOCK 7: Entry-Kontext   (v2.6 — woher kommt der Mensch: pattern/tagesimpuls/verstehen; 'spiegel' ist vorgesehen, wird aber von keinem Screen genutzt)
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

**Aufgerufen von:** `OnboardingFlow` Step 4, nach Eingabe eines Invite-Codes.

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
- Prüft jedes Lösch-Ergebnis; scheitert ein Schritt → `500 delete_incomplete`, der Auth-Account bleibt bestehen (Wiederholung möglich, kein stilles Scheitern); Fehler beim Auth-Löschen → `500 auth_delete_failed`
- Hard-Delete des Auth-Users via `service_role`; per CASCADE an `auth.users` hängen `inner_voices`, `crisis_events`, `feedback_surveys`, `rate_limit_counters`, `experience_patterns` (`source_user_id`); an `conversations` hängen `messages`, `session_notes`, `conversation_context` und seit 033 `coach_reflections`
- Nachweis: Löschtest (`npm run security:deletion-test` + `supabase/security/deletion-check.sql`, Erwartung überall 0) — nach jeder Änderung an Tabellen mit Personenbezug oder an der Löschlogik ausführen
- Aufgerufen von `ProfileScreen` nach Bestätigungs-Modal

---

### `supervision` — Wöchentliche KI-Supervision

**Läuft per Cron** (`weekly-supervision`, Mo 06:00 UTC, über `pg_net`). Analysiert alle `coach_reflections` der Woche und erzeugt einen `supervision_logs`-Eintrag mit Empfehlungen für den System-Prompt.

**Protokoll (S-15, Entscheidung 19.11.2026):** Gespeichert werden Zähler, die geprüfte Empfehlung (`improvement_recs`) und das vollständige, ebenfalls geprüfte Protokoll (`protocol_text`, Punkte 1–3). Die frühere Volltext-Kopie der Reflexionen (`raw_reflections`) wird nicht mehr gespeichert und wurde mit 033 geleert. Sichtbar im Admin-Bereich (Tab Feedback → Supervision).

**Prompt-Regeln + Prüfschritt (S-13):** Der Prompt verlangt ausschließlich allgemeine Empfehlungen zum Coach-Verhalten (keine Einzelfälle, Zitate, Personendetails, keine Abschwächung von Sicherheits-/Krisenregeln). `improvement_recs` durchläuft `reviewLearningEntry` (`low_quality` zählt nicht); abgelehnt → `null`, Log `supervision_rejected` mit Codes. Prompt zum Gegenlesen: `docs/security/supervision-prompt.md` (freigegeben 19.11.2026).

**Nur intern aufrufbar** (`requireInternalCaller`): Header `x-cron-secret` = Function-Secret `CRON_SECRET` oder service_role-Key als Bearer. Der Cron-Job liest das Secret zur Laufzeit aus **Supabase Vault** (`vault.decrypted_secrets`, Name `cron_secret`) — kein Key im Klartext in `cron.job`. `supervision_logs.improvement_recs` lädt `chat` selbst, aber nur mit Secret `SUPERVISION_IN_PROMPT=1` (seit 19.11.2026 an, S-12).

---

### `security-monitor` — Monitoring (S-22, Paket C)

**Läuft per Cron** (`security-monitor`, stündlich um :07, `x-cron-secret` aus Vault; nur intern über `requireInternalCaller`). Ablauf:
1. **Schwellen:** Für jede Regel aus `_shared/monitorRules.ts` zählt `security_log_counts()` die Log-Codes im Fenster, nur mit passender Herkunft (`app_logs.origin`, Standard `server`). Schwelle erreicht und kein Alarm derselben Regel im Cooldown (6 Std., bei langen Fenstern die Fensterlänge) → Zeile in `security_alerts` + Mail an `ALERT_EMAIL_TO`.
2. **Lebenszeichen:** `retention_applied` in den letzten 26 Std.? Montags ab 08:00 UTC: `supervision_run` seit Montag 00:00 UTC? Fehlt eins → Alarm (`retention_missing` / `supervision_missing`, Cooldown 24 Std.).
3. **Wochenübersicht:** montags im Lauf um 06:07 UTC: alle Regeln über 7 Tage, Alarme der Woche, Krisenereignisse (neu / ungesichtet, nur Anzahl, C-3), Konten ohne Anmeldung seit 24 Monaten (Anzahl) → `security_alerts` (`kind = 'weekly_digest'`) + Mail.

Body `{ "probe": true }` schickt eine Testmail („Test: Alarmkanal Friedensstifter“) und legt eine `probe`-Zeile an. Mails enthalten nur Regel, Anzahl und Zeitfenster (keine IDs, keine Inhalte); ein Mailfehler steht als Code in `security_alerts.mail_error`, der Alarm bleibt im Admin-Tab sichtbar. Jeder Lauf loggt `security_monitor_run`. Secrets: `SMTP_HOST`, `SMTP_PORT` (465), `SMTP_USER`, `SMTP_PASS`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO`.

**Überwachte Codes** (Schnittstelle, Änderungen nur zusammen mit `monitorRules.ts`): `auth_rejected` (aus `errorResponse` bei 401/403), `userId mismatch`, `mfa_required` (Admin), `mfa_verify_failed` (nur Client-Herkunft), `assistant_insert_failed`, `user_message_insert_failed`/`opening_insert_failed`, `rate_limit_db_error`, `delete_incomplete`/`auth_delete_failed`, `learning_review_failed` (technischer Ausfall des Prüfschritts in post-conversation und supervision), `supervision_rejected`; ab C-4/C-5 `export_created`, `mfa_recovery_used`, `mfa_recovery_failed`; Info: `user_mfa_required`, `legacy_format`, `learning_entry_saved`, `learning_rejected`, `supervision_protocol_rejected`. Lebenszeichen: `retention_applied`, `supervision_run`.

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
| `requireUser(req)` | Token aus `Authorization: Bearer`, Prüfung über `admin.auth.getUser(token)` → `{ user, token, admin, userClient }`; sonst `401` |
| `admin` | echter service_role-Client **ohne** Nutzer-Token (umgeht RLS) — nur für Daten, deren Eigentum geprüft ist |
| `userClient` | anon-Key + Nutzer-Token → Rolle `authenticated`, `auth.uid()` gesetzt (z. B. für `consume_session`) |
| `assertConversationOwner(admin, id, userId)` | UUID-Format (400) + Eigentum (403) |
| `requireAdmin(ctx)` | `profiles.is_admin` über `admin` prüfen (403 `forbidden`) **und** JWT-Claim `aal = 'aal2'` (403 `mfa_required`, S-06) — Claims nur aus dem in `requireUser` geprüften Token |
| `isUuid(value)` | UUID-Formatprüfung (z. B. `clientMessageId`) |
| `requireInternalCaller(req)` | service_role-Bearer oder `x-cron-secret` (401) |
| `readJsonBody(req, maxBytes)` / `validateMessages()` | Größenlimits (413), JSON-Fehler ohne Inhalt (400) |
| `errorResponse()` / `jsonResponse()` | einheitliche Antworten `{ error: <code> }` ohne Fehlertexte |

---

### `_shared/models.ts`, `_shared/rag.ts`, `_shared/rateLimit.ts`, `_shared/learning.ts`

| Modul | Zweck |
|---|---|
| `models.ts` | **Einzige Stelle für Modell-IDs** (`COACH_MODEL` = `claude-sonnet-5-5`, `HAIKU_MODEL`). `COACH_REQUEST_DEFAULTS`: `thinking: { type: 'between_tools' }` (kein Vorab-Denken; `disabled` gibt auf 5.5 einen 400) + `output_config.effort: 'medium'` (konstant, darf sich im Gespräch nicht ändern). `COACH_MAX_TOKENS` 560 / `COACH_CRISIS_MAX_TOKENS` 980 (neuer Tokenizer, × 1,4). `extractText()` liest Antworten nach Blocktyp statt `content[0]` (leer → `empty_text_response`). `ensureEndsWithUser()` hängt einen nicht gespeicherten Nutzer-Turn an, wenn der Verlauf auf `assistant` endet (Sonnet 5.5 kennt kein Prefill; geloggt als `synthetic_user_turn_added`). |
| `rag.ts` | `generateEmbedding()` (OpenAI `text-embedding-3-small`, Timeout 2,5 s, Fehlergrund nur als Code) und `findSimilarExperiences()` (`match_experiences`). Nur serverseitig — Treffer verlassen den Server nicht. |
| `rateLimit.ts` | Grenzwerte (`RATE_LIMITS`), `enforceRateLimit()` (RPC `consume_rate_limits`, fail-open/-closed wählbar), `rateLimitResponse()` (429 + `Retry-After`). |
| `learning.ts` | Prüfschritt `reviewLearningEntry()` für alles Nutzerübergreifende (Lernbasis, Supervision): Regex-Vorfilter (`contact`, `instruction`) → Haiku-Prüfung (`identifier`, `instruction`, `contact`, `crisis`, `low_quality`). Das JSON wird aus der Antwort herausgelöst (robust gegen Text drumherum); technische Fehler → `review_api_failed` / `review_parse_failed`; immer fail-closed. `makeHaikuCaller()` als Adapter. |

---

## 6. Datenbank-Schema

### Kern-Tabellen

**`profiles`** (erweitert `auth.users`)
```
id                                UUID PK → auth.users
display_name                      TEXT
onboarding_completed              BOOLEAN DEFAULT false
onboarding_data                   JSONB
streak_count                      INTEGER DEFAULT 0
streak_last_date                  DATE
plan                              TEXT ('free' | 'premium' | 'tester')
sessions_used_this_month          INTEGER DEFAULT 0
last_return_greeting_at           TIMESTAMPTZ
consent_given_at                  TIMESTAMPTZ
consent_version                   TEXT ('1.0')
coaching_agreement_accepted_at    TIMESTAMPTZ
coaching_agreement_version        TEXT ('1.0')
is_admin                          BOOLEAN DEFAULT false      -- v3.x, manuell im SQL-Editor gesetzt
is_beta_tester                    BOOLEAN DEFAULT false      -- v3.x, über Admin-Bereich steuerbar
session_limit                     INTEGER DEFAULT 20         -- v3.x (Default 20 seit Migration 027), null = unbegrenzt, individuell pro Nutzer
invited_at                        TIMESTAMPTZ                -- v3.x, gesetzt bei admin-invite-user
invited_by                        UUID → auth.users ON DELETE SET NULL  -- v3.x (seit 033; vorher NO ACTION, blockierte das Löschen des Einladenden)
age_confirmed_at                  TIMESTAMPTZ                 -- S-11 (036): 18+ bestätigt (handle_new_user aus Signup-Metadaten oder RPC confirm_age); consent_ip entfernt
learning_opt_in                   BOOLEAN DEFAULT false      -- Migration 032 (S-13), nur über RPC set_learning_opt_in
learning_opt_in_updated_at        TIMESTAMPTZ
learning_opt_in_version           TEXT ("1.0")
```
Trigger **`trg_protect_profile_privileges`** (Migration 024): Für die Client-Rollen `authenticated`/`anon` sind `id`, `is_admin`, `is_beta_tester`, `plan`, `session_limit`, `sessions_used_this_month`, `invited_at`, `invited_by`, `created_at` sowie (seit 032) `learning_opt_in`, `learning_opt_in_updated_at`, `learning_opt_in_version` und (seit 036) `age_confirmed_at` nicht änderbar (`42501`). service_role, Cron und SECURITY-DEFINER-Funktionen sind nicht betroffen. Clients legen keine Profile an — das macht `handle_new_user` (Migration 027): Name, `onboarding_completed`, `onboarding_data.area`, `consent_version`, `coaching_agreement_version` und (seit 036) `age_confirmed` kommen aus `signUp({ options: { data: … } })`, die Zeitstempel setzt der Server. Bestandsnutzer ohne `age_confirmed_at` sehen in der AppShell einmal `AgeConfirmSheet` (RPC `confirm_age`; „Ich bin jünger“ → 116 111 und Löschweg im Profil, kein automatisches Löschen). So funktioniert die Registrierung auch bei aktiver E-Mail-Bestätigung. Im Onboarding fragt nur der Invite-Flow (`user.invited_at`) nach einem Passwort; andere eingeloggte Nutzer ohne gültige Vereinbarung bestätigen nur die Vereinbarung.

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
notes              TEXT       -- nie dem Nutzer sichtbar
```
RLS: `USING (false) WITH CHECK (false)` für **alle** — auch der eigene Nutzer sieht seine Einträge nicht. Nur ein echter `service_role`-Client (ohne Nutzer-Token, `BYPASSRLS`) kann schreiben. Keine Echtzeit-Benachrichtigung — wöchentliche Sichtung durch Jerome, analog zum Supervision-Cron.

### RPCs

**`get_conversation_history()`** — `SECURITY INVOKER`, `search_path = ''`, liefert die Gesprächsliste des eingeloggten Nutzers (Datum, Nachrichtenanzahl, `main_topic`/erste Nutzer-Nachricht) für `/coach/verlauf` und die Profil-Statistik, ohne N+1-Queries. Ausführbar nur für `authenticated`.

**`consume_session(p_conversation_id)`** — `SECURITY DEFINER`, `search_path = ''` (Migration 023). Zählt atomar und idempotent: Ist `conversations.session_counted_at` gesetzt → `{ allowed: true, counted: false }`. Sonst Limit-Prüfung (`plan <> 'premium'` und `session_limit` nicht null) → bei Überschreitung `{ allowed: false, used, limit }`, sonst `session_counted_at` setzen und `sessions_used_this_month + 1`. Fremde Konversation → `42501`. Ausführbar für `authenticated` (aufgerufen von `chat` mit dem Nutzer-Token).

**`redeem_invite_code(p_code, p_user_id)`** — `SECURITY DEFINER`, `search_path = ''`, löst einen Invite-Code ein. **Nur für `service_role` ausführbar** (vorher für jeden inkl. anon — Befund K-2).

**`match_experiences()`** — pgvector-Suche, nur für `service_role` (Aufrufer: `_shared/rag.ts`). Seit 032 nur `review_status = 'approved'`; `source_user_id` ist nicht Teil der Rückgabe.

**`set_learning_opt_in(p_opt_in, p_version)`** — `SECURITY DEFINER`, `search_path = ''`, ausführbar für `authenticated` (Migration 032). Setzt die Zustimmung für `auth.uid()`; bei Rücknahme löscht sie in derselben Transaktion alle eigenen `experience_patterns` und liefert `{ opt_in, deleted }`.

**`security_log_counts(p_since, p_codes)`** — `SECURITY DEFINER`, nur `service_role` (Migration 034). Liefert je Code und Herkunft nur die Anzahl (`code, origin, n`), keine Inhalte. Aufrufer: `security-monitor`.

**`consume_rate_limits(p_user_id, p_rules)`** — `SECURITY DEFINER`, nur `service_role` (Migration 029). Erhöht feste Zeitfenster-Zähler atomar, liefert `null` oder `{ bucket, retry_after }`.

### Cron-Jobs (pg_cron + pg_net)

| Job | Zeitplan (UTC) | Aufgabe |
|---|---|---|
| `reset-monthly-sessions` | `0 0 1 * *` | `sessions_used_this_month = 0` (Migration 023) |
| `weekly-supervision` | `0 6 * * 1` | `supervision` per `net.http_post` mit `x-cron-secret` aus Vault |
| `purge-app-logs` | `17 3 * * *` | `app_logs` älter als 30 Tage löschen (Migration 026) |
| `purge-rate-limits` | `23 3 * * *` | `rate_limit_counters` älter als 2 Tage löschen (Migration 029) |
| `apply-retention` | `41 3 * * *` | `apply_retention()` — Fristen nach D-4 (Migration 033), Ergebnis als `retention_applied` in `app_logs` |
| `security-monitor` | `7 * * * *` | `security-monitor` per `net.http_post` mit `x-cron-secret` aus Vault (Migration 034) |
| `purge-security-alerts` | `29 3 * * *` | `security_alerts` älter als 12 Monate löschen (Migration 034) |

**Fristen (`apply_retention()`, D-4, keine Rechtsberatung — mit Anwalt bestätigen, R-4):** `crisis_events.excerpt` nach Sichtung (`reviewed_by_jerome`) bzw. spätestens 90 Tagen leeren · `crisis_events` 3 Jahre ab Ende des Kalenderjahres · `coach_reflections` 12 Monate · `supervision_logs`, `user_feedback` und (seit 036) `feedback_surveys` 24 Monate · `app_logs` 30 Tage · `rate_limit_counters` 2 Tage. Inaktive Konten (24 Monate ohne Anmeldung) werden nur gezählt (`inactive_accounts_report`, nur service_role); gelöscht wird erst mit Mailkanal für den Vorab-Hinweis (Paket D). `security_alerts` 12 Monate (`purge-security-alerts`).

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
| `user_feedback`, `feedback_surveys` | INSERT | `user_id = auth.uid()` |
| `app_logs` | INSERT | `user_id = auth.uid()` (Migration 026) |
| `resonance_map`, `experience_patterns`, `coach_reflections`, `supervision_logs`, `invite_codes`, `crisis_events`, `conversation_context`, `rate_limit_counters`, View `feedback_survey_scores` | **keine** | nur service_role |

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

## 9. Freemium-Logik

| Feature | Free | Premium | Tester |
|---|---|---|---|
| Coach-Gespräche | `profile.session_limit` (Default 20, individuell setzbar) | Unbegrenzt | wie Free, eigener `session_limit`-Wert (Admin-Bereich, z. B. 300/500) |
| Spiegel (Erkenntnisse, Muster, Entwicklung inkl. Zeitachse, Stimmen, Momente) | vollständig (seit U2, keine Anzeige-Sperren) | vollständig | vollständig |
| Gesprächsverlauf | vollständig (seit U2) | vollständig | vollständig |
| Coach-Gedächtnis | Begrenzt | Vollständig | Vollständig |

**Wichtig (Fix, siehe `session_limit` oben):** `isPaidUser` in `CoachScreen`/`HistoryScreen` prüft **nur** `plan === 'premium'` — `'tester'` galt früher fälschlich als unbegrenzt, wodurch individuelle Admin-Limits wirkungslos waren.

**Zähler:** `profiles.sessions_used_this_month`
**Zählung:** ausschließlich serverseitig und idempotent pro Konversation über `consume_session` (beim ersten `chat`-Aufruf im Gesprächsmodus). Wellness, Briefing, Entry-Kontext zählen sofort beim Start; ein Standard-Gespräch bei der ersten Nutzer-Nachricht; „Neues Gespräch“ zählt beim nächsten Schreiben; Fortsetzen zählt nicht; Howto-FAQ und Gedächtnis-Extraktion zählen nie. Der Client schreibt den Zähler nicht mehr (Schutz-Trigger).
**Durchsetzung:** serverseitig (`consume_session` in `chat`, `429` → Limit-Modal über `onSessionLimit`), clientseitig nur UX-Vorprüfung in `handleSend()` (bereits gezählte Gespräche dürfen weiterlaufen). Krisenantwort, Howto und Extraktion sind vom Limit ausgenommen.

**Rate-Limits pro Nutzer** (Migration 029, RPC `consume_rate_limits`, Werte zentral in `supabase/functions/_shared/rateLimit.ts`): `chat` Gespräch 10/Minute + 200/Tag · Howto 30/Stunde · Extraktion 30/Tag · `post-conversation` 60/Tag · `validate-invite-code` 5/Stunde + 10/Tag. Antwort `429 { error: 'rate_limited', retryAfter }` + `Retry-After`-Header; das Frontend zeigt dann einen Hinweis inkl. Telefonseelsorge statt des Limit-Modals (`src/lib/rateLimit.js`). chat/post-conversation fail-open bei DB-Fehler (protokolliert), Invite-Code fail-closed. Zähler werden täglich nach 2 Tagen gelöscht (Cron `purge-rate-limits`).
**Reset:** Cron-Job `reset-monthly-sessions` am 1. des Monats, 00:00 UTC (seit Migration 023 — vorher existierte kein Reset)
**Upgrade-Flow:** Limit-Modal → `/premium`

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

1. Erste Zeile nach dem CORS-Preflight: `requireUser(req)` (Nutzer-Functions) bzw. `requireInternalCaller(req)` (Cron). Admin-Functions zusätzlich `requireAdmin(ctx)`.
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

**Prüfschritt (`_shared/learning.ts`, S-13):** Alles, was nutzerübergreifend wirkt (Lernbasis, Supervision-Empfehlung), läuft durch `reviewLearningEntry`: Regex-Vorfilter (E-Mail, Telefon, URL, Anweisungsmuster) → Haiku-Prüfung (`identifier`, `instruction`, `contact`, `crisis`, `low_quality`), fail-closed. Geloggt werden nur die Gründe als Codes.

**Angriffstest:** `npm run security:test` (`scripts/security/attack-test.mjs`, Zugangsdaten zweier Testkonten in `.env.security.local`, Vorlage `.env.security.example`) prüft RLS-Trennung, Profil-Schutz, Eigentumsprüfung der Functions, Admin-Schutz, anonymen Zugriff, S-12 (kein Client-Insert in `messages` — auch nicht in eigene Gespräche, erfundener Verlauf wirkungslos, Idempotenz der `clientMessageId`, altes Format → 409), S-13 (Opt-in nur per RPC), S-15 (Fristen-/Berichtsfunktionen gesperrt), Rate-Limits und die Security-Header der App (`HDR`). Netzwerkaussetzer werden wiederholt und zählen nicht als „kein Zugriff“. Nur Zähler/Status-Ausgabe, keine Inhalte. `ATTACK_TEST_SUPERVISION=1` bezieht `supervision` ein. Der Test legt bei Testkonto B zwei dauerhafte Gespräche „SECTEST S-12“ an und sperrt B danach kurz (Rate-Limit-Prüfung).

**Löschtest:** `npm run security:deletion-test` (`scripts/security/deletion-test.mjs`, frisches Testkonto C in `.env.security.local`) erzeugt Daten über die normalen Wege, löscht das Konto und prüft den Login; `supabase/security/deletion-check.sql` zählt danach die Reste je Tabelle (Erwartung überall 0; Stand 19.11.2026: 31 Prüfpunkte, alle 0).

### Browser-Schutz (S-08)

`vercel.json` setzt für alle Pfade: `Strict-Transport-Security` (2 Jahre, inkl. Subdomains), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (Mikrofon nur `self`, Kamera/Standort/Zahlung/USB aus), `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: DENY` und die **erzwingende** `Content-Security-Policy` (seit 19.11.2026; die Beobachtungswoche wurde übersprungen, weil die App noch keine aktiven Nutzer hat — Brüche fallen bei den nächsten Tests auf):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self';
img-src 'self' data: blob:; connect-src 'self' https://<projekt>.supabase.co wss://<projekt>.supabase.co;
worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none';
upgrade-insecure-requests
```

**Wenn etwas nicht lädt:** In der Browser-Konsole steht `Refused to load … because it violates the following Content Security Policy directive …` — die genannte Quelle bewusst prüfen und ggf. in `vercel.json` ergänzen. Der Angriffstest prüft die Header (`HDR`).

`'unsafe-inline'` nur für Styles (React-`style`-Props, `offline.html`); Skripte strikt `'self'` (`registerSW.js` ist eine eigene Datei). **Jeder neue externe Dienst muss in die CSP.**

### Admin-Berechtigung

Jede Admin-Function prüft über `requireAdmin()` `profiles.is_admin` **und** den zweiten Faktor (`aal2`), **bevor** irgendetwas gelesen/geschrieben wird — ein versteckter Frontend-Screen (`AdminRoute`) ist ausdrücklich kein Ersatz dafür, da jede Anfrage auch direkt gegen die API gerichtet werden könnte. Nicht-Admins erhalten `403 forbidden`, Admins ohne zweiten Faktor `403 mfa_required`. Neue Admin-Functions (z. B. Datenexport S-16, protokollierte Einsicht S-20) laufen ebenfalls über `requireAdmin`.

`is_admin` wird **nie** über die App gesetzt (Henne-Ei-Problem) — einmaliges manuelles Update im Supabase-SQL-Editor:
```sql
update profiles set is_admin = true where id = '<user_id>';
```

---

## 11. Build & Deployment

### Vite-Konfiguration

- Plugin: `@vitejs/plugin-react` + `vite-plugin-pwa`
- PWA Manifest: `name: Friedensstifter`, `theme_color: #2D5A4E`, `display: standalone`
- Workbox: Precache inkl. lokaler Schriften (`woff2`), keine Runtime-Regeln für Fremd-Origins; `registerType: 'autoUpdate'` (neue Version gilt nach dem nächsten Laden — wichtig für Übergänge wie S-12 Welle 2a/2b)
- PWA-Icons: 192×192, 512×512 (maskable)

### Umgebungsvariablen

```bash
# .env.local (Frontend)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase Edge Functions (serverseitig, nie im Client)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=   # automatisch in Edge Functions verfügbar
SITE_URL=                    # optional, Fallback: https://app.friedensstifter.coach (nur admin-invite-user)
CRON_SECRET=                 # nur supervision; derselbe Wert liegt in Vault als 'cron_secret'
```

`.env.security.local` (nur lokal, nicht eingecheckt): Zugangsdaten der Testkonten A und B für `npm run security:test` und eines frischen Kontos C für `npm run security:deletion-test` (Vorlage `.env.security.example`).

### Deployment

- **Frontend:** Vercel (Auto-Deploy aus `main`-Branch)
- **Edge Functions:** `supabase functions deploy <name>` — `supabase/config.toml` hält `verify_jwt = false` für alle Functions fest (zur Sicherheit zusätzlich `--no-verify-jwt`)
- **Migrationen:** `supabase db push` vor jedem Deployment das DB-Änderungen enthält
- **Reihenfolge:** Erst den Branch nach `main` mergen (bzw. auschecken), **dann** `db push` und `functions deploy` — die CLI arbeitet mit dem lokalen Stand (Panne 19.11.2026: „Remote database is up to date“, weil die neue Migration lokal noch fehlte). Nach neuen RPCs: `notify pgrst, 'reload schema';`
- **Build-Prüfung:** `postbuild` (`scripts/security/check-build.mjs`) läuft nach jedem `npm run build`, auch auf Vercel. Findet sie ein Schlüsselmuster (`sk-ant-`, OpenAI, `sb_secret_`, Namen geheimer Variablen) oder ein JWT mit einer anderen Rolle als `anon`, scheitert der Build und Vercel deployt nicht.
- **Secret-Scan:** `npm run security:secrets` (gitleaks über die ganze Historie, Ausgabe nur Regel/Datei/Commit/Zeile; anon- und `sb_publishable_`-Keys gelten als öffentlich).
- **ZIPs zum Teilen:** nur `npm run share:zip` (`git archive` aus HEAD, `export-ignore` für `.env*`, `*.har`, `*.csv`, Audit-Ergebnisse).
- **Supabase CLI:** 2.95.4 (Update auf 3.x geplant, danach Probe-Deploy)
- **Domain:** `app.friedensstifter.coach` (Vercel Custom Domain)

**Auth-Mails:** eigener SMTP-Absender `hallo@friedensstifter.coach` über One.com (SPF/DKIM/DMARC gesetzt). Die deutschen Vorlagen (Einladung, Registrierung, Magic Link, Passwort-Reset) liegen als Quelle in `supabase/templates/` und werden **manuell** ins Dashboard (Authentication → Emails → Templates) kopiert.

### Vor jedem Deployment prüfen

1. Sprachprinzip-Audit: Alle UI-Texte auf verbotene Wörter (`müssen`, `immer`, `nie`, `können nicht`, `du bist X`)
2. Migrationen ausgeführt: `supabase db push`
3. Edge Functions deployed (bei Bedarf, je nach Änderung): `chat`, `post-conversation`, `pre-session-briefing`, `validate-invite-code`, `admin-users`, `admin-feedback`, `admin-invite-user`, `admin-security`, `delete-account`, `supervision`, `security-monitor`, `backfill-embeddings` (oder alle: `supabase functions deploy --no-verify-jwt`) — bei Änderungen an `_shared/*` alle, die das Modul importieren
4. **Angriffstest:** `npm run security:test` → alle PASS (vor jedem Release)
5. Neue Tabellen/Functions: RLS + Policies nur für `authenticated` + gezielte GRANTs; neue Functions mit `requireUser`/`requireInternalCaller` und Eintrag in `supabase/config.toml`; Log-Regel beachten
6. Neue externe Dienste/Origins: in die CSP (`vercel.json`) aufnehmen
7. Nachrichten schreibt nur der Server — kein `supabase.from('messages').insert` im Frontend
8. Änderungen an Tabellen mit Personenbezug oder an der Löschlogik: Löschtest (`npm run security:deletion-test` + `deletion-check.sql`) → überall 0
9. Texte über Datenverarbeitung (Datenschutzerklärung, Opt-in) mit dem tatsächlichen Stand abgleichen — offen laut Abschlussbericht Paket B: OpenAI-Embeddings, Lernbasis, Fristen
