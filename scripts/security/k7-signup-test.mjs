// scripts/security/k7-signup-test.mjs
// Friedensstifter – Angriffstest K7 (Paket K, W3 / Migration 040)
//
// Aufruf: npm run security:k7
//
// Prüft: Eine Registrierung, die in den Signup-Metadaten eine FREMDE Version mitschickt
// (consent_version / agreement_version = '9.9', Häkchen auf true), erzeugt KEINE Zustimmung.
// handle_new_user setzt die Zustimmungsfelder nur für Version '2.0'.
//
// Ablauf:
//   1. signUp mit TEST_K7_EMAIL, zufälligem Passwort (wird nie ausgegeben) und manipulierten Metadaten
//   2a. E-Mail-Bestätigung AUS (Sitzung vorhanden): eigenes Profil lesen → PASS/FAIL,
//       danach das Konto über delete-account wieder löschen.
//   2b. E-Mail-Bestätigung AN (keine Sitzung): USER_ID ausgeben; Prüfung und Aufräumen per SQL
//       (Vorlage wird ausgegeben, liefert nur Metadaten).
//
// Regeln: nur eine Wegwerf-Adresse aus .env.security.local, keine echten Nutzer, Ausgabe nur IDs/Codes.
// Die Adresse darf nicht schon registriert sein (sonst liefert Supabase keine neue ID).

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const env = process.env;
const SUPABASE_URL = (env.SUPABASE_URL ?? '').replace(/\/$/, '');
const ANON_KEY = env.SUPABASE_ANON_KEY ?? '';
const EMAIL = (env.TEST_K7_EMAIL ?? '').trim();

function abort(msg) {
  console.error(`\n✖ Abbruch: ${msg}\n`);
  process.exit(2);
}
if (!SUPABASE_URL || !ANON_KEY) abort('SUPABASE_URL / SUPABASE_ANON_KEY fehlen in .env.security.local');
if (!EMAIL) abort('TEST_K7_EMAIL fehlt in .env.security.local (Wegwerf-Adresse, die du erreichst)');
const reserved = [env.TEST_A_EMAIL, env.TEST_B_EMAIL, env.TEST_C_EMAIL].map((e) => (e ?? '').trim().toLowerCase());
if (reserved.includes(EMAIL.toLowerCase())) abort('TEST_K7_EMAIL darf nicht Testkonto A, B oder C sein');

const client = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

(async () => {
  console.log(`Friedensstifter K7 · ${new Date().toISOString()}`);

  const password = randomBytes(18).toString('base64url');   // nie ausgeben
  const { data, error } = await client.auth.signUp({
    email: EMAIL,
    password,
    options: {
      data: {
        display_name: 'SECTEST K7',
        onboarding_completed: true,
        age_confirmed: true,
        consent_art9: true,
        agreement_accepted: true,
        consent_version: '9.9',               // fremde Version
        agreement_version: '9.9',
        coaching_agreement_version: '9.9',    // altes Feld aus Version 1.0
      },
    },
  });
  if (error) abort(`signUp fehlgeschlagen (${error.code ?? error.status ?? 'unbekannt'})`);
  const userId = data.user?.id;
  // Ist die Adresse schon registriert, liefert Supabase (bei aktiver Bestätigung) ein Schein-Konto ohne Identität.
  if (!userId || (Array.isArray(data.user?.identities) && data.user.identities.length === 0)) {
    abort('Adresse ist bereits registriert – bitte eine neue Wegwerf-Adresse in TEST_K7_EMAIL eintragen');
  }

  if (!data.session) {
    // 2b: E-Mail-Bestätigung aktiv
    console.log('\nE-Mail-Bestätigung ist aktiv → Prüfung per SQL (nur Metadaten):');
    console.log(`  USER_ID = ${userId}\n`);
    console.log(`select consent_version, coaching_agreement_version,
       consent_given_at is not null               as zustimmung_gesetzt,
       coaching_agreement_accepted_at is not null as vereinbarung_gesetzt,
       age_confirmed_at is not null               as alter_bestaetigt
from public.profiles where id = '${userId}';`);
    console.log('\nErwartung: consent_version und coaching_agreement_version leer, zustimmung_gesetzt = false,');
    console.log('vereinbarung_gesetzt = false (alter_bestaetigt = true ist korrekt).');
    console.log(`\nDanach aufräumen: Authentication → Users → Nutzer löschen, oder im SQL-Editor:`);
    console.log(`  delete from auth.users where id = '${userId}';`);
    console.log('\nK7 | Signup mit consent_version 9.9 | keine Zustimmung | MANUELL (SQL oben)\n');
    process.exit(0);
  }

  // 2a: Sitzung vorhanden → eigenes Profil lesen (RLS: nur eigene Zeile)
  const { data: p, error: pError } = await client.from('profiles')
    .select('consent_version, coaching_agreement_version, consent_given_at, coaching_agreement_accepted_at')
    .eq('id', userId).single();
  let outcome = 'FAIL';
  let detail = '';
  if (pError) {
    detail = `Profil nicht lesbar (${pError.code ?? 'unbekannt'})`;
  } else {
    const noConsent = !p.consent_version && !p.coaching_agreement_version
      && !p.consent_given_at && !p.coaching_agreement_accepted_at;
    outcome = noConsent ? 'PASS' : 'FAIL';
    detail = `consent=${p.consent_version ?? '-'}, agreement=${p.coaching_agreement_version ?? '-'}`;
  }

  // Aufräumen über die normale Löschung (verlangt keine Zustimmung)
  let cleanup = 'unbekannt';
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${data.session.access_token}`, 'x-region': 'eu-west-1' },
      body: '{}',
    });
    cleanup = res.ok ? 'gelöscht' : `HTTP ${res.status} – bitte Nutzer ${userId} im Dashboard löschen`;
  } catch (e) {
    cleanup = `Netzwerkfehler (${e?.name ?? 'Error'}) – bitte Nutzer ${userId} im Dashboard löschen`;
  }

  console.log(`\n| K7 | Signup mit consent_version 9.9 | keine Zustimmung | ${outcome} | ${detail} |`);
  console.log(`Aufräumen: ${cleanup}\n`);
  process.exit(outcome === 'PASS' ? 0 : 1);
})().catch((e) => {
  console.error(`\n✖ Unerwarteter Fehler: ${e?.name ?? 'Error'} ${e?.code ?? ''}`);
  process.exit(2);
});
