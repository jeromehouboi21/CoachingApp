# Stripe Checkout – offene Schritte

**Stand:** 20.11.2026 · Branch `feature/stripe-checkout-geruest` · **Gerüst, abgeschaltet**

Diese Datei ist die einzige Quelle für alles, was bis zur echten Bezahlung noch fehlt.
Gebaut ist nur der serverseitige Aufruf, der eine Checkout Session erzeugt. Er ist dreifach gesperrt:
Secret `PAYMENTS_ENABLED=1`, Zustimmung v2.0, Stripe-Schlüssel und Preis-ID gesetzt.
Ohne diese Bedingungen antwortet die Function mit `403 payments_disabled` bzw. `503 checkout_not_configured`.

> **Hinweis zur Arbeitsweise (CLAUDE.md):** Für Zahlungen gibt es noch keinen Handoff und keine Tranche
> im Umsetzungsplan. Dieses Gerüst entstand auf direkten Auftrag und ist bewusst minimal. Alles unter
> „Nächste Schritte“ gehört in eine eigene Tranche mit Handoff.

---

## Values to Replace

Diese Werte sind Platzhalter und müssen vor dem Livegang ersetzt bzw. gesetzt werden.

**Files containing placeholders:**
- [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | `subscription` | Gewählt, weil die Begleitung ein Abo ist. Bei Einmalzahlung `payment` setzen (dann entfällt `payment_method_collection`). |
| success_url | `${SITE_URL}/begleitung?checkout=success&session_id={CHECKOUT_SESSION_ID}` | Eigene Erfolgsseite, falls gewünscht. `{CHECKOUT_SESSION_ID}` beibehalten. Die Seite `/begleitung` wertet den Parameter heute noch nicht aus. |
| cancel_url | `${SITE_URL}/begleitung?checkout=cancel` | Seite, auf die man nach „Zurück“ landet. |
| line_items[].price | Secret `STRIPE_PRICE_ID` (ungesetzt, Platzhalter `price_...`) | Preis-ID der Begleitung aus dem Dashboard (https://dashboard.stripe.com/test/prices), als wiederkehrender Preis. |

## Configured Parameters

Diese Parameter kommen aus Checkout Studio und sind unverändert übernommen.

**Files containing these parameters:**
- [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | `hosted_page` (Stripe-SDK 23.1.0, ab 21.0.0 gilt `hosted_page`) |
| billing_address_collection | `auto` |
| phone_number_collection | `{ enabled: false }` |
| automatic_tax | `{ enabled: false }` |
| allow_promotion_codes | `false` |
| payment_method_collection | `always` (nur bei `mode: subscription`) |
| submit_type | `auto` |
| integration_identifier | `hosted_web_0001` |
| origin_context | `web` |

Zusätzlich (nicht aus Checkout Studio): `client_reference_id = Nutzer-ID aus dem JWT`, damit der spätere Webhook die Zahlung dem Konto zuordnen kann. E-Mail und Name werden **nicht** an Stripe übergeben.

---

## Einrichtung

**Secrets (nur serverseitig, nicht in `.env.local`, nie mit `VITE_`):**

```
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_PRICE_ID=price_...
supabase secrets set PAYMENTS_ENABLED=1        (erst, wenn alles andere fertig ist)
```

- Nur Test-Schlüssel (`sk_test_…`) bis zur Freigabe. Am besten einen eingeschränkten Schlüssel (Restricted Key) mit Schreibrecht nur auf Checkout Sessions.
- Ein Publishable Key ist **nicht** nötig: Die gehostete Bezahlseite braucht kein Stripe.js im Frontend. Die CSP in `vercel.json` bleibt unverändert, weil die Weiterleitung eine normale Seitennavigation ist.
- `SITE_URL` ist optional (Standard `https://app.friedensstifter.coach`), für lokale Tests z. B. `http://localhost:5173`.
- Abhängigkeit: `npm:stripe@23.1.0`, fest gepinnt (CLAUDE.md, Ausfall 19.11.2026). Updates bewusst und mit Test.

**Deploy (macht Jerome):**

```
supabase functions deploy create-checkout-session --no-verify-jwt
```

`verify_jwt = false` ist bereits in `supabase/config.toml` eingetragen.

## Neue und geänderte Dateien

```
supabase/functions/create-checkout-session/index.ts   neu – erzeugt die Checkout Session
supabase/functions/_shared/rateLimit.ts               + RATE_LIMITS.checkout (10/Stunde, fail-closed)
supabase/functions/_shared/monitorRules.ts            + checkout_failed (Alarm ab 3/Stunde), checkout_usage (Wochenübersicht)
supabase/config.toml                                  + [functions.create-checkout-session]
src/components/begleitung/CheckoutButton.jsx          neu – Button „Weiter zur Bezahlung“, Rückkehr-Hinweis
src/screens/begleitung/BegleitungScreen.jsx           Button + Hinweis nur mit PAYMENTS_ENABLED
STRIPE_INTEGRATION_TODO.md                            diese Datei
```

## So funktioniert es

1. Frontend ([CheckoutButton.jsx](src/components/begleitung/CheckoutButton.jsx), versteckt hinter `PAYMENTS_ENABLED` in `legalTexts.js`, nicht sichtbar in der Phase Begleitung): `POST` an `functionUrl('create-checkout-session')` mit `functionHeaders`.
2. Function prüft Anmeldung, Schalter, Zustimmung, Rate-Limit und Konfiguration.
3. Function erzeugt die Session bei Stripe und antwortet mit `{ url }`.
4. Frontend prüft, dass die Adresse mit `https://checkout.stripe.com/` beginnt, und leitet mit `window.location.assign(url)` weiter.
5. Stripe schickt nach der Zahlung zurück auf `success_url` bzw. bei Abbruch auf `cancel_url`. `/begleitung` zeigt dann einen kurzen Hinweis und entfernt `checkout` und `session_id` aus der Adresse.
6. **Fehlt noch:** Webhook `checkout.session.completed` → `plan = 'premium'` serverseitig setzen. Ohne Webhook bekommt niemand Zugang durch eine Zahlung.

Log-Codes: `checkout_session_created`, `checkout_disabled`, `checkout_not_configured`, `checkout_session_failed` (nur Stripe-Fehlertyp und -Code, keine Meldungstexte).

## Testen

- Testmodus im Stripe-Dashboard (Schalter „Testmodus“), nur `sk_test_…`.
- Testkarten: `4242 4242 4242 4242` (Erfolg), `4000 0025 0000 3155` (3-D-Secure), `4000 0000 0000 9995` (abgelehnt). Ablaufdatum in der Zukunft, beliebige Prüfziffer und PLZ.
- Nur mit Testkonten (S-17). Erwartung ohne `PAYMENTS_ENABLED`: `403 payments_disabled`.
- Für einen Angriffstest-Eintrag (`attack-test.mjs`): ohne Token → 401, mit Token und Schalter aus → 403 `payments_disabled`.

## Nächste Schritte (eigene Tranche mit Handoff)

1. **Rechtstexte:** Abo, Bestellung, Kündigung, Widerruf und Zahlungsdienstleister freigeben (Jerome bzw. Anwalt). Stripe als Empfänger in `DATA_RECIPIENTS`, AVV mit Stripe nach `docs/DPA/`. Erst dann `PAYMENTS_ENABLED = true` in `legalTexts.js`. Klären: Button-Beschriftung „zahlungspflichtig bestellen“ (`submit_type`), Widerrufsbelehrung, Steuern (`automatic_tax` ist aus).
2. **Webhook** `stripe-webhook`: Signatur prüfen (`STRIPE_WEBHOOK_SECRET`), Nutzer über `client_reference_id`, `plan` per service_role setzen (privilegiertes Feld, Schutz-Trigger), Ereignisse für Verlängerung, Zahlungsausfall und Kündigung (`customer.subscription.*`, `invoice.payment_failed`).
3. **Datenmodell:** Spalten für `stripe_customer_id` / `stripe_subscription_id` (Migration, server-only, in Löschung, Export und `apply_retention` aufnehmen; Löschtest). Beim Löschen eines Kontos das Abo bei Stripe kündigen.
4. **Frontend:** Button und Rückkehr-Hinweis sind vorbereitet (UI-Texte sind Vorschläge, bitte freigeben). Offen: Preisangabe auf `/begleitung` vor dem Klick (heute nur auf der Stripe-Seite – mit dem Anwalt klären), Kundenportal für Kündigung, Aktualisieren der Phase nach erfolgreicher Zahlung. Sprachprinzip: keine Verknappung, kein Drängen.
5. **Angriffstest** und Monitoring-Regeln für den Webhook ergänzen; Sicherheitsseite (`securityMeasures.js`) nur mit Beleg.

## Ressourcen

- https://support.stripe.com
- https://docs.stripe.com/mcp
- https://docs.stripe.com/payments/checkout
- https://docs.stripe.com/keys-best-practices
