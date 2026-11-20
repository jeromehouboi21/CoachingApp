# Handoff: Zahlung und Abo (Paket Z)

> **Für:** Claude Code · **Von:** Jerome (vorbereitet mit Claude) · **Stand:** 20.11.2026 · **Version:** v1.1 **freigegeben (20.11.2026)** · v1.1: Ereignis `invoice.paid` ergänzt (4.2, J-Z2)
> **Grundlage:** `docs/Abo_Modell/friedensstifter-abo-modell-v1.md` (fachliche Vorgabe), `docs/billing/abo-discovery.md` (Bestandsaufnahme mit Entscheidungen Z-E1 bis Z-E3), `STRIPE_INTEGRATION_TODO.md` und Branch `feature/stripe-checkout-geruest` (Gerüst), `ARCHITECTURE.md`, Spielregeln aus `handoff-security-paket-c.md` Abschn. 0
> **Ziel:** Man kann die Begleitung über Stripe abschließen, wechseln und kündigen. Freigeschaltet wird nur über den Webhook. In der Begleitung gilt ein Monatskontingent eigener Nachrichten mit ruhigem Hinweis und Kulanz. Ein gelöschtes Konto beendet das Abo. „Begleitung intensiv“ ist gebaut, bleibt aber abgeschaltet, bis Prompt-Caching umgesetzt ist. **Live gehen Zahlungen erst nach der Freigabe der Abo-Rechtstexte (J-Z3).**

---

## Entscheidungen (von Jerome am 20.11.2026 eingetragen)

> Alle Entscheidungen sind getroffen (20.11.2026). **Claude Code trifft keine dieser Entscheidungen selbst.**

| # | Frage | Empfehlung | Jeromes Entscheidung |
|---|---|---|---|
| Z-E1 | Krisenantwort an der Monatsgrenze | nie blockieren, nicht buchen | ✅ entschieden (20.11.) |
| Z-E2 | Stufe im Plan | `plan = 'premium'` für jedes Abo, Stufe in `subscriptions.tier`, CHECK auf `plan` unverändert | ✅ entschieden (20.11.) |
| Z-E3 | Konto löschen mit laufendem Abo | Löschung beendet das Abo sofort, ohne Erstattung, Hinweis im Löschdialog; scheitert die Kündigung → Löschung bricht ab | ✅ entschieden (20.11.) |
| Z-1 | Branch | neuer Branch `feature/paket-z-zahlung` von `main`, das Gerüst aus `feature/stripe-checkout-geruest` per Merge übernehmen und anpassen | ✅ nach Empfehlung (20.11.) |
| Z-2 | Begleitung intensiv | komplett bauen, abgeschaltet über Secret `INTENSIV_ENABLED` und Konstante `INTENSIV_ENABLED` im Frontend. Live erst nach eigener Tranche „Prompt-Caching“ | ✅ nach Empfehlung (20.11.) |
| Z-3 | Wo die Nachrichtengrenzen stehen | als Konstanten in **einer** SQL-Funktion (`quota_limit_for(tier)`, wie `c_cap` in 038): Begleitung 150, intensiv 800, Kulanz 10, Hinweis ab 80 % | ✅ nach Empfehlung (20.11.) |
| Z-4 | Kündigen, Zahlungsart ändern, Stufe wechseln | Stripe-Kundenportal (gehostet), aufgerufen über eine neue Function `create-portal-session` | ✅ nach Empfehlung (20.11.) |
| Z-5 | Wechsel Begleitung → intensiv | sofort, Stripe verrechnet anteilig (Proration) und stellt die Differenz sofort in Rechnung | ✅ nach Empfehlung (20.11.) |
| Z-6 | Wechsel intensiv → Begleitung | zum Ende des Abrechnungszeitraums (im Kundenportal „Herabstufungen zum Periodenende“) | ✅ nach Empfehlung (20.11.) |
| Z-7 | Monat oder Jahr | beide Laufzeiten im Kundenportal und auf `/begleitung` wählbar | ✅ nach Empfehlung (20.11.) |
| Z-8 | Was an Stripe geht | Nutzer-ID (`client_reference_id`, Customer-Metadaten `user_id`) und E-Mail beim Anlegen des Stripe-Kunden. Name, Gesprächsinhalte und Profildaten gehen nicht an Stripe | ✅ nach Empfehlung (20.11.) |
| Z-9 | Zahlung fehlgeschlagen | Plan bleibt bei Status `past_due` aktiv, endet bei `unpaid`/`canceled` (Stripe: Smart Retries, danach Abo kündigen) | ✅ nach Empfehlung (20.11.) |
| Z-10 | Preisangabe vor dem Klick | Preise auf `/begleitung` aus einer Konstante im Frontend; beim Test J-Z2 mit Stripe abgleichen | ✅ nach Empfehlung (20.11.) |
| Z-11 | Ein Nutzer mit Tester-Plan | sieht keine Bezahlung (Phase `begleitung`), Webhook überschreibt `tester` nie | ✅ nach Empfehlung (20.11.) |

---

## 0. Spielregeln für Claude Code

Alle Regeln aus CLAUDE.md und den Paketen A–C, K, P gelten weiter. Besonders wichtig hier:

1. **Branch** nach Z-1. Eine Tranche, ein Deploy. Was hier nicht steht, wird nicht gebaut. Auffälliges kommt unter „Beobachtungen“ ans Ende.
2. **Plan, Kontingent und Freischaltung nur serverseitig.** `plan` setzt ausschließlich `stripe-webhook` (service_role). Die Rückkehr-URL von Stripe schaltet nie etwas frei. Das Frontend zeigt nur an.
3. **Keine Zahlungsdaten bei uns.** Karten- und Kontodaten sieht nur Stripe (gehostete Bezahlseite, gehostetes Kundenportal). Kein Stripe.js, kein Stripe-Element im Frontend, keine Änderung an der CSP.
4. **Feste Versionen:** `npm:stripe@23.1.0` wie im Gerüst. Ein Update nur bewusst und mit Test.
5. **Keine Rechtstexte.** Abo-, Bestell-, Kündigungs- und Widerrufstexte schreibt Jerome bzw. der Anwalt in `legalTexts.js`. Claude Code baut nur die Stellen, die sie anzeigen, und macht Textvorschläge zur Freigabe. `PAYMENTS_ENABLED` setzt **nur Jerome**.
6. **Logs nur mit IDs und Codes.** Keine E-Mail-Adressen, keine Stripe-Fehlertexte, keine Beträge mit Personenbezug. Stripe-IDs (`cus_…`, `sub_…`, `evt_…`) dürfen ins Log.
7. **Keine stillen Fehler.** Jeder Write wird geprüft. Der Webhook antwortet nur dann mit 2xx, wenn alles gespeichert ist, sonst mit 5xx, damit Stripe es erneut versucht.
8. **Sprachprinzip** in allen neuen UI-Texten. Keine Verknappung, kein Countdown, kein ständiger Zähler, jedes Angebot mit Ausweg.
9. **Keine Deploys.** An jedem ⛔ STOPP an Jerome übergeben. Reihenfolge beim Deploy: Frontend → Functions → Migration (Befund C-5). Hier abweichend **Migration zuerst**, weil `chat` die neuen RPCs aufruft. Das ist in J-Z2 festgehalten.

**Ausnahme von der Sicherheitsregel, Jerome bestätigt sie mit diesem Handoff:** `stripe-webhook` ruft weder `requireUser` noch `requireInternalCaller` auf. Seine Authentifizierung ist die Prüfung der Stripe-Signatur, und sie kommt als Erstes. CLAUDE.md bekommt dazu nach der Abnahme eine Zeile.

---

## 1. Was der Nutzer am Ende erlebt

```
/begleitung
  Begleitung · 9,90 €/Monat oder 99 €/Jahr        [Monat | Jahr]
  (Begleitung intensiv · 19,90 € / 199 € – nur mit INTENSIV_ENABLED)
  [Weiter zur Bezahlung] → Stripe-Bezahlseite → zurück auf /begleitung
  „Danke. Sobald Stripe die Zahlung bestätigt, ist deine Begleitung aktiv.“
  (Phase wird neu geladen, bis der Webhook da ist – höchstens ca. 30 s, danach ruhiger Hinweis)

Im Gespräch (nur Begleitung)
  kein Zähler · einmal pro Zeitraum ab 80 %: „Noch 30 Nachrichten in diesem Monat.“
  Grenze erreicht: laufendes Gespräch bis zu 10 weitere Nachrichten, dann Hinweis
  „Für diesen Monat sind deine Nachrichten aufgebraucht. Ab dem 14.04. geht es weiter.“
  (+ „Begleitung intensiv →“, falls verfügbar) · Spiegel, Erkenntnisse, Verlauf bleiben

Profil
  „Begleitung · verlängert sich am 14.04.“ bzw. „… endet am 14.04.“ · [Abo verwalten] → Stripe-Kundenportal
  Konto löschen: zusätzlicher Satz „Dein Abo endet damit sofort. Bereits bezahlte Tage werden nicht erstattet.“
```

---

## 2. Phase 0: Bestandsaufnahme (Delta)

Die Bestandsaufnahme liegt schon vor (`docs/billing/abo-discovery.md`). Zu prüfen ist nur, was sich seitdem geändert hat. Ergebnis als Abschnitt „Delta“ am Ende derselben Datei.

1. Stimmen die Zeilenangaben in `chat/index.ts` (Kappung, `consume_session`, Speichern der Nachricht, Stream) noch? Ist inzwischen Prompt-Caching gebaut?
2. Letzte Migrationsnummer (erwartet 041 → Paket Z bekommt 042).
3. Stripe-SDK 23.1.0 unter Deno: Signaturprüfung mit `stripe.webhooks.constructEventAsync` und `Stripe.createSubtleCryptoProvider()`. Kurz mit der Stripe-Dokumentation abgleichen, ohne Aufruf.
4. Kundenportal: Lässt sich „Herabstufung zum Periodenende“ (Z-6) und „Upgrade sofort mit Proration“ (Z-5) im Dashboard einstellen? Wenn nicht: melden, nicht umgehen.
5. `delete-account`: an welcher Stelle die Stripe-Kündigung hingehört (vor dem ersten Löschschritt).
6. `export-my-data` (`EXPORT_TABLES`), `apply_retention` (Migration 033), `deletion-check.sql`: Stellen für die neuen Tabellen.

### ⛔ STOPP J-Z1 (vor dem Bau, Jerome)

> 👤 **Jerome:**
> 1. Entscheidungen Z-1 bis Z-11 eintragen.
> 2. **Stripe-Sandbox** prüfen bzw. anlegen:
>    - Produkte „Begleitung“ und „Begleitung intensiv“ mit Metadaten `tier` = `begleitung` | `intensiv`
>    - je ein Monats- und ein Jahrespreis mit den Lookup-Keys `begleitung_monat`, `begleitung_jahr`, `intensiv_monat`, `intensiv_jahr`, als „inklusive Steuer“
> 3. **Kundenportal** in der Sandbox einschalten: Kündigen zum Periodenende, Zahlungsart ändern, Wechsel zwischen den vier Preisen (Z-5/Z-6), Rechnungen anzeigen.
> 4. **Rechnungen:** Kleinunternehmer-Hinweis (§ 19 UStG) als Fußzeile in den Rechnungseinstellungen von Stripe. Belege per Mail von Stripe ja/nein.
> 5. **Webhook-Endpunkt** erst nach dem Deploy in J-Z2 anlegen (die URL gibt es erst dann).
> 6. **Anwaltsliste ergänzen** (siehe Abschn. 7.3).

---

## 3. Datenbank: Migration `042_z_billing.sql`

Additiv, mit Kommentar zum Rückgängigmachen. RLS auf jeder neuen Tabelle, die restriktive Policy `mfa_required` dort, wo der Client liest. Grants wie unten.

### 3.1 Tabellen

**`subscriptions`**, eine Zeile pro Nutzer (das jeweils aktuelle Abo)
```
user_id                UUID PK, FK → profiles ON DELETE CASCADE
stripe_customer_id     TEXT UNIQUE NOT NULL
stripe_subscription_id TEXT UNIQUE            -- null, solange nur der Kunde angelegt ist
tier                   TEXT CHECK ('begleitung' | 'intensiv')
billing_interval       TEXT CHECK ('month' | 'year')
status                 TEXT                   -- Stripe-Status 1:1 (active, past_due, canceled, …)
quota_anchor           TIMESTAMPTZ            -- Start des Abos (Stripe start_date), Ankertag der Monatszeiträume
current_period_end     TIMESTAMPTZ
cancel_at_period_end   BOOLEAN DEFAULT FALSE
pending_tier           TEXT                   -- geplante Herabstufung (Z-6), sonst null
updated_at             TIMESTAMPTZ
```
Grants: `service_role` alles. `authenticated` **kein** direkter Zugriff, Anzeige nur über `get_access_state()`.

**`message_quota_periods`**
```
user_id               UUID FK → profiles ON DELETE CASCADE
period_start          TIMESTAMPTZ
period_end            TIMESTAMPTZ
used                  INTEGER NOT NULL DEFAULT 0
grace_conversation_id UUID FK → conversations ON DELETE SET NULL
grace_used            INTEGER NOT NULL DEFAULT 0
warned_at             TIMESTAMPTZ
PRIMARY KEY (user_id, period_start)
```
Nur `service_role`.

**`message_charges`**, das Buchungsjournal mit genau einer Buchung pro Nutzernachricht
```
conversation_id    UUID FK → conversations ON DELETE CASCADE
client_message_id  UUID
user_id            UUID FK → profiles ON DELETE CASCADE
period_start       TIMESTAMPTZ
kind               TEXT CHECK ('quota' | 'grace')
charged_at         TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (conversation_id, client_message_id)
```
Nur `service_role`.

**`stripe_events`**, damit derselbe Webhook nicht doppelt verarbeitet wird
```
event_id     TEXT PK
type         TEXT
received_at  TIMESTAMPTZ DEFAULT now()
processed_at TIMESTAMPTZ
```
Nur `service_role`, kein Personenbezug. Aufbewahrung 90 Tage (in `apply_retention`).

### 3.2 Funktionen (alle `security definer`, `set search_path = ''`, `revoke … from public, anon`)

- **`quota_limit_for(p_tier text) → integer`**, `immutable`: begleitung 150, intensiv 800. Daneben die Konstanten Kulanz 10 und Hinweis 80 % (Z-3). Das ist die einzige Stelle mit diesen Zahlen.
- **`current_quota_period(p_anchor timestamptz, p_at timestamptz) → (start, end)`**: `p_anchor + n months` mit dem größten n, für das `start <= p_at` gilt. Postgres kürzt auf das Monatsende (31.01. → 28./29.02.). Dieselbe Rechnung gilt für Monats- und Jahresabo.
- **`access_state_for(uid)`** erweitern (Fassung 038 + Abo). Die bisherigen Felder bleiben, neu kommen hinzu:
  - `tier`, `period_end`, `messages_left` (nur `premium`)
  - `quota_reached` (boolean)
  - `can_start` wird zusätzlich `false`, wenn das Monatskontingent inklusive Kulanz erschöpft ist. Kulanz gilt nur im laufenden Gespräch, also bei `used >= limit` für neue Gespräche.
  - `cap` bleibt bei `premium` `null`.
  - `phase` bleibt `begleitung`, auch bei erschöpftem Kontingent. Das Frontend unterscheidet über `quota_reached`.
- **`consume_message(p_user_id, p_conversation_id, p_client_message_id) → jsonb`**, nur `service_role`. Ablauf in einer Transaktion:
  1. Ist das Konto nicht `premium` oder ohne `quota_anchor` → `{ allowed: true, charged: false, reason: 'no_quota' }`.
  2. Zeile des Zeitraums anlegen, falls sie fehlt, dann `select … for update`.
  3. Gibt es die Buchung schon (Schlüssel aus Gespräch und Nachricht) → `{ allowed: true, charged: false }`.
  4. Ist `used < limit` → Buchung `quota`, `used + 1`.
  5. Sonst Kulanz: `grace_conversation_id` ist null oder gleich diesem Gespräch, und `grace_used < 10` → Buchung `grace`, Gespräch merken, `grace_used + 1`.
  6. Sonst `{ allowed: false, reason: 'quota_reached', period_end }`.
  7. Rückgabe enthält `remaining` und `warn: true` beim ersten Überschreiten von 80 % (setzt `warned_at`).
- **`refund_message(p_conversation_id, p_client_message_id)`**, nur `service_role`: löscht die Buchung und senkt `used` bzw. `grace_used` im Zeitraum der Buchung. Fehlt die Buchung, passiert nichts.
- **`apply_retention()`** erweitern: `message_charges` und `message_quota_periods` älter als 13 Monate, `stripe_events` älter als 90 Tage.

### 3.3 Schutz-Trigger

Keine Änderung nötig. `plan` ist schon server-only. Die neuen Tabellen haben keine Client-Rechte.

---

## 4. Edge Functions

### 4.1 `create-checkout-session` (aus dem Gerüst anpassen)

- Body: `{ tier: 'begleitung'|'intensiv', interval: 'month'|'year' }`, Werte geprüft. `intensiv` ohne Secret `INTENSIV_ENABLED=1` → `403 tier_unavailable`.
- Sperren wie im Gerüst: `requireUser`, `PAYMENTS_ENABLED=1`, `requireConsent`, Rate-Limit `checkout`.
- **Schon ein aktives Abo** (`subscriptions.status` in active/trialing/past_due) → `409 already_subscribed`. Das Frontend bietet dann „Abo verwalten“ an.
- **Plan `tester`** → `409 not_applicable` (Z-11).
- **Preis:** `stripe.prices.list({ lookup_keys: [key], active: true })`. Fehlt der Preis → `503 checkout_not_configured`. Das Secret `STRIPE_PRICE_ID` entfällt.
- **Kunde:** Ist schon ein `stripe_customer_id` gespeichert, wird er wiederverwendet. Sonst `stripe.customers.create({ email, metadata: { user_id } })` (Z-8), danach sofort in `subscriptions` speichern (Write prüfen) und dann erst die Session anlegen.
  - Gegen doppelte Kunden bei zwei Klicks hilft `idempotencyKey: 'customer-' + user.id`.
  - Die E-Mail kommt aus `ctx.user.email` und wird nicht geloggt.
- **Session:** die Parameter aus dem Gerüst unverändert (`fixed_by_ui`), dazu `customer`, `client_reference_id`, `subscription_data.metadata.user_id`, `line_items` mit der ermittelten Preis-ID. `customer_email` entfällt, weil `customer` gesetzt ist.
  - **Offen für den Anwalt (7.3):** ob `consent_collection` bzw. `custom_text` (Hinweis Widerruf und sofortiger Beginn der Leistung) nötig ist. Bis dahin unverändert lassen.

### 4.2 `stripe-webhook` (neu)

- `verify_jwt = false` in `config.toml`. Keine CORS-Antwort nötig, aber der `OPTIONS`-Zweig bleibt wie überall.
- **Als Erstes:** `const raw = await req.text()`, dann `constructEventAsync(raw, signature, STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider())`.
  - Fehlt die Signatur oder ist sie falsch → `400`, Log `stripe_webhook_signature_invalid`.
  - Fehlt das Secret → `503`, Log `stripe_webhook_not_configured`.
- **Idempotenz:** `insert into stripe_events (event_id, type)`. Bei Konflikt mit `processed_at` gesetzt → `200` ohne Arbeit.
- **Behandelte Ereignisse:**
  - `checkout.session.completed`
  - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  - `invoice.paid`: bei jeder bezahlten Rechnung, auch bei jeder Verlängerung. Die Abo-ID kommt aus der Rechnung (bei der aktuellen API-Version unter `parent.subscription_details.subscription`), danach wie bei den Abo-Ereignissen frisch laden und speichern. Ohne Abo-ID (Einzelrechnung) → wie „alles andere“. Bei einer Verlängerung (`billing_reason = 'subscription_cycle'`) Log `subscription_renewed`. Zweck: Eine Verlängerung hängt nicht allein an `customer.subscription.updated`.
  - `invoice.payment_failed` (nur Log)
  - Alles andere → `200`, Log `stripe_webhook_ignored` mit `type`.
- **Grundsatz: immer frisch laden.** Bei jedem Abo-Ereignis wird das Abo über `stripe.subscriptions.retrieve(id)` neu von Stripe geholt, statt den Event-Inhalt zu übernehmen. Damit spielt die Reihenfolge der Ereignisse keine Rolle.
- **Nutzer zuordnen:** über `subscriptions.stripe_customer_id`. Ist dort niemand gespeichert, über `client_reference_id` bzw. `metadata.user_id`, aber nur, wenn diese ID ein existierendes Profil ist **und** die Kunden-ID passt bzw. noch leer ist. Keine Zuordnung möglich → `200`, Log `stripe_webhook_unmatched` (Alarm).
- **Schreiben (service_role, alles prüfen):**
  - `subscriptions`: Status, Stufe aus den Metadaten `tier` des Preises, Laufzeit, `quota_anchor` = `start_date` (bleibt bei einem Stufenwechsel gleich), `current_period_end`, `cancel_at_period_end`, `pending_tier` aus dem Zeitplan, falls vorhanden.
  - `profiles.plan`: `premium` bei active/trialing/past_due (Z-9), sonst `free`. Ein `tester` wird nie überschrieben.
- **Bei einem neuen Abo** (vorher kein `stripe_subscription_id` oder `canceled`): Der Zeitraum beginnt neu, `used = 0`. Das ergibt sich aus dem neuen `quota_anchor`.
- Erst wenn alles gespeichert ist: `processed_at` setzen, dann `200`. Bei einem Fehler → `500`, Log `stripe_webhook_failed` mit `type` und Fehlercode, und Stripe versucht es erneut.
- **Logs:** `subscription_started`, `subscription_changed` (mit `fromTier`/`toTier`), `subscription_renewed`, `subscription_ended`, `payment_failed`, alle mit `userId` und Stripe-IDs, ohne Beträge.

### 4.3 `create-portal-session` (neu)

`requireUser`, `PAYMENTS_ENABLED=1`, Rate-Limit `portal` (10/Stunde, fail-closed), Kunde aus `subscriptions` (fehlt er → `404 no_customer`), `stripe.billingPortal.sessions.create({ customer, return_url: SITE_URL + '/profile' })` → `{ url }`.

### 4.4 `chat`: eigene Nachrichten buchen

An der Stelle aus der Bestandsaufnahme, Abschn. 2 und 8 (`chat/index.ts`):

1. **Nach** `consume_session` und **vor** dem Speichern der Nutzernachricht, nur bei `newMessage && isCoaching && !crisisDetected` (Z-E1): `admin.rpc('consume_message', …)`.
   - RPC-Fehler → `503 quota_check_failed`, fail-closed, damit es keine Nachrichten ohne Buchung gibt. Log `quota_check_failed`.
   - `allowed: false` → `409 { error: 'quota_reached', periodEnd }`, nichts gespeichert, Log `quota_reached`.
2. Eine Wiederholung mit derselben `clientMessageId` wird nicht doppelt gebucht, das regelt das Journal.
3. **Zurückbuchen** über `refund_message`:
   - wenn `anthropic.messages.stream(...)` sofort scheitert (catch um den Aufruf, danach Fehler weiterwerfen)
   - wenn im Hintergrund `full` leer bleibt (`assistant_empty`)
   - Log `quota_refunded`. Scheitert das Zurückbuchen → Log `quota_refund_failed` (Alarm), Nachricht bleibt gebucht.
4. **Hinweis:** Bei `warn: true` bzw. bei einer Buchung aus der Kulanz schickt das erste SSE-`meta` zusätzlich `quota: { remaining, grace: boolean, periodEnd }` mit. Sonst nichts, also kein ständiger Zähler.
5. **Neue Gespräche:** Bei erschöpftem Kontingent liefert `consume_session` `allowed: false` (über `can_start`). Die Antwort wird erweitert zu `429 { error: 'session_limit', phase: 'begleitung', reason: 'quota', periodEnd }`.
6. Howto, Extraktion und Starts, bei denen der Coach zuerst spricht, buchen nicht (Vorgabe Abschn. 2).

### 4.5 `delete-account` (Z-E3)

- **Vor** dem ersten Löschschritt: Gibt es ein `stripe_subscription_id` mit einem Status, der nicht `canceled` ist, dann `stripe.subscriptions.cancel(id, { prorate: false, invoice_now: false })`.
- Scheitert das → `502 { error: 'subscription_cancel_failed' }`, **nichts gelöscht**, Log `subscription_cancel_failed` (Alarm). Das Frontend zeigt einen ruhigen Hinweis mit Kontaktweg.
- Den Stripe-**Kunden** nicht löschen. Rechnungen bleiben für die Aufbewahrungspflicht bei Stripe, das ist eine Frage für den Anwalt (7.3). Unsere Zeile in `subscriptions` geht mit dem Konto per Cascade weg.
- Ohne `PAYMENTS_ENABLED` bzw. ohne `STRIPE_SECRET_KEY`, aber mit gespeichertem Abo → ebenfalls `502 subscription_cancel_failed`. Ohne gespeichertes Abo läuft alles wie bisher.

### 4.6 Gemeinsames

- `_shared/stripe.ts`: Client mit `STRIPE_SECRET_KEY`, ohne API-Version (wie im Gerüst), Lookup-Keys, Statuslisten.
- `_shared/rateLimit.ts`: `portal` neu, `checkout` bleibt.
- `config.toml`: `stripe-webhook`, `create-portal-session`.

---

## 5. Frontend

Alles hinter `PAYMENTS_ENABLED`, „intensiv“ zusätzlich hinter `INTENSIV_ENABLED` (beide in `legalTexts.js`, Schalterblock). Texte sind Vorschläge zur Freigabe.

### 5.1 `/begleitung`

- Preise aus `src/content/plans.js` (neu, nur Anzeige): Stufe, Monat und Jahr, Preis in Euro, Nachrichten pro Monat. Umschalter Monat | Jahr, ohne „Spare X %“-Werbung.
- Button aus dem Gerüst (`CheckoutButton`) mit `tier` und `interval`.
- `409 already_subscribed` → Link „Abo verwalten“.
- **Nach der Rückkehr mit `?checkout=success`:** `useAccessState().refresh()` alle 3 s, höchstens 10-mal, bis `phase === 'begleitung'`. Danach kommt ein ruhiger Hinweis: „Die Bestätigung dauert etwas länger. Schau gleich noch einmal vorbei.“ Freigeschaltet wird dadurch nichts.
- Bestehende Texte „Der Preis steht noch nicht fest“ (BegleitungScreen, HowItWorksScreen Z. 195) mit Schalter ersetzen.

### 5.2 Im Gespräch

- `useChat` liest `meta.quota` aus und reicht `{ remaining, grace, periodEnd }` an den CoachScreen.
- **Hinweiszeile** an der Stelle des Kappungshinweises (zwischen Nachrichten und `ChatInput`):
  - bei `warn`: „Noch {n} Nachrichten in diesem Monat.“
  - bei Kulanz: „Für diesen Monat sind deine Nachrichten aufgebraucht. Dieses Gespräch kannst du noch in Ruhe abschließen.“
- **`409 quota_reached`:** Hinweis mit Datum „Ab dem {periodEnd} geht es weiter.“, bei `tier === 'begleitung'` und `INTENSIV_ENABLED` dazu der Link „Begleitung intensiv →“. Eingabe gesperrt wie bei der Kappung.
- **`429 session_limit` mit `reason: 'quota'`:** `RestModeSheet` mit eigenem Textzweig (Datum statt „Kennenlernen vorbei“).
- Der Hinweis auf die TelefonSeelsorge bleibt unverändert sichtbar (S-14).

### 5.3 Profil

- **Phasenzeile:** „Begleitung · verlängert sich am …“ bzw. „… endet am …“ (aus `period_end`, `cancel_at_period_end` über `get_access_state`). Bei `pending_tier`: „Ab dem … Begleitung.“
- **Eintrag „Abo verwalten“** → `create-portal-session` → Weiterleitung (Adresse muss mit `https://billing.stripe.com/` beginnen).
- **Löschdialog:** Mit aktivem Abo kommt ein zusätzlicher Satz (Text von Jerome freizugeben): „Dein Abo endet damit sofort. Bereits bezahlte Tage werden nicht erstattet.“ Für `502 subscription_cancel_failed` gibt es einen eigenen Fehlertext.

### 5.4 `get_access_state`

`useAccessState` bekommt die neuen Felder, ohne Änderung am Aufruf.

---

## 6. Datenschutz, Export, Löschung, Sicherheitsseite

- **`EXPORT_TABLES`:**
  - `subscriptions` (Stufe, Laufzeit, Status, Datumswerte; Stripe-IDs auch, sie gehören zum Nutzer)
  - `message_quota_periods`
  - `message_charges` (nur Zeitpunkt und Art, keine Inhalte)
  - `stripe_events` → `EXCLUDED_TABLES` mit Begründung (kein Personenbezug)
- **Löschkette:** alle neuen Tabellen per `ON DELETE CASCADE`. `deletion-check.sql` und `deletion-test.mjs` erweitern. Erwartung überall 0.
- **`DATA_RECIPIENTS`:** Eintrag Stripe (Zweck, Daten: E-Mail, Nutzer-ID, Zahlungsdaten direkt bei Stripe, Sitz, Grundlage) mit `requires: 'payments'`. **Den Text schreibt Jerome.** Den AVV mit Stripe legt Jerome nach `docs/DPA/`.
- **`securityMeasures.js`:** Eintrag „Zahlungsdaten liegen nur bei Stripe“ als `geplant`, Beleg Function `create-checkout-session` + Angriffstest. `live` erst nach der Abnahme J-Z3.

---

## 7. Prüfungen, Monitoring, Recht

### 7.1 `attack-test.mjs` (neue Fälle, mit Testkonten)

| # | Fall | Erwartung |
|---|---|---|
| Z1 | `stripe-webhook` ohne Signatur | 400 |
| Z2 | `stripe-webhook` mit gefälschter Signatur und Event `customer.subscription.created` für Testkonto A | 400, `plan` von A unverändert |
| Z3 | Client setzt `plan = 'premium'` | 42501 (wie bisher, Regressionstest) |
| Z4 | Client liest `subscriptions`, `message_quota_periods`, `message_charges` | keine Zeilen bzw. kein Recht |
| Z5 | `create-checkout-session` mit `tier: 'intensiv'` ohne `INTENSIV_ENABLED` | 403 `tier_unavailable` |
| Z6 | `create-checkout-session` / `create-portal-session` ohne Token | 401 |
| Z7 | `create-checkout-session` mit ungültigem `tier`/`interval` | 400 |

### 7.2 Monitoring (`_shared/monitorRules.ts`)

Alarm:
- `stripe_webhook_signature_invalid` ab 5/Stunde
- `stripe_webhook_failed` ab 1
- `stripe_webhook_unmatched` ab 1
- `stripe_webhook_not_configured` ab 1
- `quota_check_failed` ab 1
- `quota_refund_failed` ab 1
- `subscription_cancel_failed` ab 1
- `checkout_session_failed` / `checkout_not_configured` (bestehend aus dem Gerüst)

Wochenübersicht (`infoOnly`):
- `subscription_started`, `subscription_changed`, `subscription_renewed`, `subscription_ended`
- `payment_failed`
- `quota_warned`, `quota_reached`, `quota_refunded`
- `stripe_webhook_ignored`
- `checkout_session_created`

### 7.3 Für die Anwaltsliste (`docs/konto/anwaltstermin-fragen.md`, übernommen als Teil C, Nr. 16–21)

1. **Widerrufsrecht bei sofortigem Beginn:** Ist auf der Bezahlseite eine ausdrückliche Zustimmung nötig (Checkbox per `consent_collection`/`custom_text`)? Welcher Wortlaut?
2. **Button-Beschriftung:** Erfüllt die Stripe-Seite die Pflicht „zahlungspflichtig bestellen“ (`submit_type: 'auto'` → „Abonnieren“)?
3. **Keine Erstattung bei Kontolöschung** (Z-E3): zulässig, und wie muss es in den Abo-Bedingungen stehen?
4. **Preisangabe:** Reicht sie auf `/begleitung` und auf der Stripe-Seite? Hinweis Kleinunternehmer (§ 19 UStG) auf der Seite und in der Rechnung.
5. **Aufbewahrung:** Rechnungen bleiben bei Stripe nach der Kontolöschung (§ 147 AO). Reicht das, oder braucht es eine eigene Kopie?
6. **Monatsgrenze:** Wie wird das Kontingent (150/800 Nachrichten, Kulanz) in den Abo-Bedingungen beschrieben?

### 7.4 Weitere Prüfungen

- `npm run build` (inkl. `postbuild`)
- `npm run security:test` → alle PASS
- `npm run security:deletion-test` + `deletion-check.sql` → überall 0, auch mit einem Testkonto, das ein Sandbox-Abo hat

---

### ⛔ STOPP J-Z2: Deploy in der Sandbox und Test

> 👤 **Jerome:**
> 1. Diff prüfen, mergen.
> 2. Reihenfolge: `supabase db push` (042) → Functions deployen (`create-checkout-session`, `stripe-webhook`, `create-portal-session`, `chat`, `delete-account`, `export-my-data`, `security-monitor`) → Frontend. `PAYMENTS_ENABLED` bleibt im Frontend **aus**. Getestet wird lokal (`npm run dev`) mit dem Schalter vorübergehend an.
> 3. **Secrets:** `STRIPE_SECRET_KEY` (Sandbox, eingeschränkter Schlüssel), `STRIPE_WEBHOOK_SECRET`, `PAYMENTS_ENABLED=1`, `INTENSIV_ENABLED` vorerst nicht setzen. Das alte `STRIPE_PRICE_ID` entfernen.
> 4. **Webhook** in der Sandbox anlegen: URL `…/functions/v1/stripe-webhook`, genau diese sechs Ereignisse: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Nicht abonnieren: `payment_intent.succeeded`, `setup_intent.succeeded` (werden nicht gebraucht).
> 5. **Testablauf** mit Testkonto (Karte `4242 4242 4242 4242`):
>
> | # | Schritt | Erwartung | ok |
> |---|---|---|---|
> | 1 | Begleitung Monat abschließen | nach wenigen Sekunden Phase Begleitung, Profilzeile mit Datum | |
> | 2 | Preise auf `/begleitung` = Preise in Stripe | gleich | |
> | 3 | per SQL `used = 119` setzen (Vorlage kommt mit), 1 Nachricht | Hinweis „Noch 30 …“ genau einmal | |
> | 4 | `used = 150`, im laufenden Gespräch weiterschreiben | 10 Nachrichten gehen, dann Hinweis mit Datum | |
> | 5 | neues Gespräch starten | Ruhemodus-Hinweis mit Datum | |
> | 6 | Krisen-Testsatz bei erschöpftem Kontingent | Krisenantwort kommt, `used` unverändert | |
> | 7 | Kundenportal: kündigen | Profil „endet am …“, Phase bleibt bis dahin | |
> | 8 | Stripe Test Clock bis nach dem Periodenende | Phase Ruhemodus | |
> | 9 | Karte `4000 0000 0000 0341` (Zahlung scheitert bei Verlängerung) | `payment_failed` im Log, Plan bleibt bis Stripe beendet | |
> | 10 | Konto mit laufendem Abo löschen | Abo bei Stripe `canceled`, Konto weg, Löschtest 0 | |
> | 11 | Webhook in Stripe erneut senden („Resend“) | keine Doppelwirkung (`stripe_events`) | |
> | 12 | Zweites Testkonto mit Monatsabo, Test Clock über den Abrechnungstag (ohne Kündigung) | `invoice.paid` verarbeitet, `subscription_renewed` im Log, neues Periodenende im Profil, Kontingent beginnt neu | |
>
> 6. `npm run security:test` → alle PASS, Löschtest → 0.

### ⛔ STOPP J-Z3: Live schalten (erst nach dem Anwaltstermin)

> 👤 **Jerome:**
> 1. Abo-Rechtstexte freigegeben (`legalTexts.js`), Stripe in `DATA_RECIPIENTS`, AVV abgelegt, Fragen 7.3 geklärt.
> 2. Live-Modus in Stripe: Produkte und Preise mit denselben Lookup-Keys, Kundenportal, Rechnungsfußzeile, Webhook mit Live-Secret.
> 3. Live-Secrets setzen, `PAYMENTS_ENABLED = true` in `legalTexts.js` (nur Jerome), Deploy. Zustimmung v2.1, falls die Rechtstexte das verlangen.
> 4. Ein echter Kauf mit eigener Karte, danach im Portal kündigen.

---

## 8. Abschluss

- `docs/billing/paket-z-abschlussbericht.md`: was gebaut wurde, Testtabellen J-Z2, Abweichungen, offene Punkte.
- Erst nach der Abnahme: CLAUDE.md (Abschnitt 8 Kennenlernen · Ruhemodus · Begleitung, Datenbankschema, Edge Functions, Migration 042, Webhook-Ausnahme, Monitoring-Codes), ARCHITECTURE.md, `securityMeasures.js` auf `live`. `STRIPE_INTEGRATION_TODO.md` löschen.

## 9. Definition of Done

- [ ] Abschluss, Wechsel, Kündigung und fehlgeschlagene Zahlung wirken nur über den Webhook. Doppelt zugestellte Ereignisse wirken nicht doppelt.
- [ ] Monatskontingent zählt nur eigene Nachrichten, einmal pro Nachricht, mit Zurückbuchung bei Fehlschlag. Kulanz 10, Hinweis einmal ab 80 %, Krisenantwort nie blockiert und nicht gebucht.
- [ ] Neue Gespräche starten bei erschöpftem Kontingent nicht, Spiegel, Erkenntnisse und Verlauf bleiben.
- [ ] Konto löschen beendet das Abo. Scheitert das, wird nichts gelöscht.
- [ ] Keine Zahlungsdaten und kein Stripe-Skript im Frontend, CSP unverändert.
- [ ] Export, Löschkette, Aufbewahrung, Monitoring und Angriffstest erweitert, alles PASS bzw. 0.
- [ ] „Begleitung intensiv“ gebaut und abgeschaltet.
- [ ] Testtabelle J-Z2 vollständig.

## Beobachtungen

_(von Claude Code während des Baus ergänzt)_

**Abweichungen vom Handoff (begründet):**
1. **`tier` aus den Produkt-Metadaten**, nicht vom Preis (4.2). So wurde es in J-Z1 eingerichtet. Als Rückfall gilt der Anfang des Suchschlüssels.
2. **Neue Spalte `subscriptions.cancel_at`.** Stripe setzt bei Kündigung zum Periodenende je nach Abrechnungsmodus nur `cancel_at` statt `cancel_at_period_end`. Beides zählt als „endet“.
3. **`access_state_for` liefert zwei Daten:** `period_end` (Ende des bezahlten Zeitraums, für das Profil) und `quota_resets_at` (nächstes Monatskontingent, für Hinweise und Ruhemodus). Beim Jahresabo unterscheiden sie sich.
4. **Die Regeln stehen in drei SQL-Funktionen** (`quota_limit_for`, `quota_grace`, `quota_warn_percent`) statt in einer. Sie stehen alle im selben Abschnitt der Migration 042 (Z-3).
5. **Zurückbuchen** passiert zusätzlich, wenn das Speichern der Nutzernachricht scheitert (4.4 nennt nur den Abbruch des Streams und eine leere Antwort).
6. **Webhook nach einer Kontolöschung:** Das beendete Abo kommt ohne Konto an. Es wird als `stripe_webhook_orphan_ended` (Wochenübersicht) geloggt, nicht als Alarm `stripe_webhook_unmatched`. Das gilt auch, wenn das Profil zwischen Lesen und Schreiben verschwindet (FK-Fehler 23503).
7. **Export:** Für die Abo-Tabellen gibt es eine eigene Gruppe `abo` mit Erklärtext (Vorschlag zur Freigabe).

**Beobachtungen:**
- **Periodenende an den Positionen:** In der API-Version von `stripe@23.1.0` (`2026-10-28.endive`) gibt es das Periodenende nur an den Abo-Positionen. Gespeichert wird das späteste.
- **Ankertag nach Laufzeitwechsel:** Wechselt jemand sofort von Monat auf Jahr, setzt Stripe den Abrechnungsanker neu. Der Kontingent-Anker bleibt `start_date` (Vorgabe 4.2). Dann laufen Monatskontingent und Rechnungsdatum auseinander, für Nutzer sichtbar höchstens am Datum im Hinweis.
- **Von Hand gesetztes `premium` (Admin, ohne Abo):** bleibt ohne Monatskontingent. Schließt so jemand ein Abo ab und kündigt es, setzt der Webhook am Ende `free`.
- **Starts zählen auch in der Begleitung:** `consume_session` zählt Starts auch dort weiter (`trial_sessions_used`), wie bisher in 038. Wer nach dem Ende des Abos auf `free` fällt, ist deshalb im Ruhemodus.
- **Nicht geprüft:** Deno ist lokal nicht installiert, also gibt es keinen Typcheck der Functions, nur eine Syntaxprüfung mit esbuild.
- **Geprüft:** Die SQL-Logik der Migration 042 wurde mit PGlite getestet (25 Fälle: Zeiträume, Buchung, 80 %, Kulanz, Zurückbuchen, Sperre neuer Gespräche, Tester, Cascade).
