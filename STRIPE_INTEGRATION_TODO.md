# Stripe – Einrichtung für Paket Z (J-Z2) und Live-Gang (J-Z3)

**Stand:** 20.11.2026 · Branch `feature/paket-z-zahlung` · Handoff `docs/Neues_Zielbild/handoff-paket-z-zahlung.md` v1.1
**Nach der Abnahme (J-Z3) wird diese Datei gelöscht** (Handoff Abschnitt 8).

Alles hier macht Jerome. Claude Code setzt keine Secrets und deployt nicht.

---

## 1. Secrets in Supabase (Sandbox)

Nur Testschlüssel (`sk_test_…` bzw. `rk_test_…`) bis zur Freigabe. Nie ins Repo, nie als `VITE_`-Variable.

```
supabase secrets set STRIPE_SECRET_KEY=rk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...     (erst nach Schritt 3)
supabase secrets set PAYMENTS_ENABLED=1
supabase secrets unset STRIPE_PRICE_ID                   (aus dem Gerüst, wird nicht mehr gebraucht)
```

`INTENSIV_ENABLED` vorerst **nicht** setzen (Z-2). `SITE_URL` ist optional (Standard `https://app.friedensstifter.coach`).

**Eingeschränkter Schlüssel (empfohlen)**, Stripe-Dashboard → Entwickler → API-Schlüssel → „Eingeschränkten Schlüssel erstellen“:

| Bereich | Recht | Wofür |
|---|---|---|
| Customers | Schreiben | Kunde anlegen (`create-checkout-session`) |
| Checkout Sessions | Schreiben | Bezahlseite |
| Prices | Lesen | Preis über Lookup-Key |
| Products | Lesen | Stufe aus den Produkt-Metadaten `tier` |
| Subscriptions | Schreiben | Abo lesen (Webhook), Kündigung bei Kontolöschung |
| Subscription Schedules | Lesen | geplante Herabstufung (`pending_tier`) |
| Customer portal | Schreiben | „Abo verwalten“ (`create-portal-session`) |

Alles andere: keine Rechte.

## 2. Deploy (Reihenfolge J-Z2, hier ausnahmsweise Migration zuerst)

```
supabase db push
supabase functions deploy create-checkout-session stripe-webhook create-portal-session chat delete-account export-my-data security-monitor --no-verify-jwt
```

Danach das Frontend (Merge → Vercel). `PAYMENTS_ENABLED` in `src/content/legalTexts.js` bleibt **aus**. Getestet wird lokal (`npm run dev`) mit dem Schalter vorübergehend auf `true`, ohne Commit.

## 3. Webhook in der Sandbox anlegen

Stripe-Dashboard → Entwickler → Webhooks → Endpunkt hinzufügen:

- **URL:** `https://<projekt>.supabase.co/functions/v1/stripe-webhook`
- **Ereignisse (genau diese sechs):** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- Das Signatur-Geheimnis (`whsec_…`) als `STRIPE_WEBHOOK_SECRET` setzen (Schritt 1).

## 4. Was in Stripe schon eingerichtet ist (J-Z1, 20.11.2026)

- Produkte „Begleitung“ und „Begleitung intensiv“, Metadaten `tier` = `begleitung` | `intensiv`
- Vier Preise, inklusive Steuer, Suchschlüssel `begleitung_monat` (9,90 €), `begleitung_jahr` (99 €), `intensiv_monat` (19,90 €), `intensiv_jahr` (199 €)
- Kundenportal: Erhöhung sofort, Senkung und Verkürzung zum Periodenende, anteilig mit sofortiger Abrechnung, Kündigung zum Periodenende, keine Umfrage und keine Halteangebote
- Fußzeile der Rechnungen mit Hinweis § 19 UStG

## 5. Testhilfen

- **Testkarten:** `4242 4242 4242 4242` (klappt), `4000 0025 0000 3155` (3D Secure), `4000 0000 0000 0341` (Karte wird angenommen, Verlängerung scheitert), beliebiges künftiges Datum, beliebige Prüfziffer.
- **Kontingent setzen:** `supabase/diagnostics/z-quota-test.sql` (nur Testkonten, Platzhalter ersetzen, nicht mit echten Adressen einchecken).
- **Verlängerung/Periodenende (Tests 8 und 12):** Stripe-Testuhren (Billing → Testuhren). Kunden in der Testuhr anlegen, mit Block 4 aus `z-quota-test.sql` dem Testkonto zuordnen, dann auf `/begleitung` bezahlen und die Uhr vorstellen.
- **Angriffstest:** `npm run security:test` (Z1–Z7). Löschtest mit Abo: `set DELETION_TEST_SUBSCRIPTION=1 && npm run security:deletion-test`.

## 6. Live-Gang (J-Z3, erst nach dem Anwaltstermin)

1. Abo-Rechtstexte freigegeben, Stripe in `DATA_RECIPIENTS` (Text von Jerome), Fragen 15–21 der Anwaltsliste geklärt.
   Offen für den Anwalt: ob die Bezahlseite `consent_collection` / `custom_text` braucht (Frage 16). Das wäre dann ein zusätzlicher Parameter in `create-checkout-session`.
2. Live-Modus in Stripe: Produkte, Preise mit denselben Suchschlüsseln, Kundenportal, Rechnungsfußzeile, Webhook (Live-Secret), AGB-Link im Kundenportal.
3. Live-Secrets setzen, `PAYMENTS_ENABLED = true` in `legalTexts.js` (nur Jerome), Deploy.
4. Ein echter Kauf mit eigener Karte, danach im Portal kündigen.
5. `securityMeasures.js`: Eintrag „Z Zahlung“ auf `live`, `SECURITY_PAGE_AS_OF` hochsetzen.

## Parameter der Bezahlseite (aus Checkout Studio, unverändert)

`ui_mode: 'hosted_page'` · `billing_address_collection: 'auto'` · `phone_number_collection: { enabled: false }` · `automatic_tax: { enabled: false }` · `allow_promotion_codes: false` · `submit_type: 'auto'` · `integration_identifier: 'hosted_web_0001'` · `origin_context: 'web'` · `payment_method_collection: 'always'`

Dazu aus Paket Z: `customer`, `client_reference_id` (Nutzer-ID), `subscription_data.metadata.user_id`, `line_items` mit der Preis-ID aus dem Suchschlüssel.
