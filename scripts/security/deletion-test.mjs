// scripts/security/deletion-test.mjs
// Friedensstifter – Löschtest (Security-Paket B, S-15)
//
// Aufruf: npm run security:deletion-test
//
// Ablauf: Meldet sich mit einem FRISCHEN Testkonto C an, erzeugt Daten über die normalen
// Wege (Opt-in, zwei Gespräche über chat, post-conversation, Erkenntnis, Feedback), löscht
// das Konto über delete-account und prüft, dass der Login danach scheitert.
// Danach im SQL-Editor supabase/security/deletion-check.sql mit den ausgegebenen IDs
// ausführen → Erwartung: überall 0.
//
// Regeln: nur Testkonto C aus .env.security.local, nur synthetische Texte, Ausgabe nur
// IDs/Status/Codes. Konto C ist danach gelöscht — für jeden Lauf ein neues Konto anlegen.

import { createClient } from '@supabase/supabase-js';

const env = process.env;
const SUPABASE_URL = (env.SUPABASE_URL ?? '').replace(/\/$/, '');
const ANON_KEY = env.SUPABASE_ANON_KEY ?? '';
const C = { email: (env.TEST_C_EMAIL ?? '').trim(), password: env.TEST_C_PASSWORD ?? '' };

const results = [];
const PASS = 'PASS', FAIL = 'FAIL', INFO = 'INFO';
function record(step, expect, outcome, detail = '') {
  results.push({ step, expect, outcome, detail: String(detail ?? '') });
}
function abort(msg) {
  console.error(`\n✖ Abbruch: ${msg}\n`);
  process.exit(2);
}

if (!SUPABASE_URL || !ANON_KEY) abort('SUPABASE_URL / SUPABASE_ANON_KEY fehlen in .env.security.local');
if (!C.email || !C.password) abort('TEST_C_EMAIL / TEST_C_PASSWORD fehlen in .env.security.local');
const others = [env.TEST_A_EMAIL, env.TEST_B_EMAIL].map(e => (e ?? '').trim().toLowerCase());
if (others.includes(C.email.toLowerCase())) abort('Testkonto C darf nicht Testkonto A oder B sein');

function newClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function callFunction(name, token, body, timeoutMs = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
    const isStream = (res.headers.get('content-type') ?? '').includes('text/event-stream');
    let json = null;
    if (isStream) {
      // Stream vollständig lesen (Inhalt wird verworfen, nicht ausgegeben)
      const reader = res.body.getReader();
      while (!(await reader.read()).done) { /* weiterlesen */ }
    } else {
      try { json = await res.json(); } catch { /* kein JSON */ }
    }
    return { status: res.status, json };
  } catch (e) {
    return { status: e?.name === 'AbortError' ? 'timeout' : `network:${e?.code ?? e?.name ?? 'error'}`, json: null };
  } finally {
    clearTimeout(timer);
  }
}

const SYNTHETIC = [
  'Das ist ein Löschtest. Bitte antworte mit einem kurzen Satz.',
  'Zweite Testnachricht. Ein Satz genügt.',
];

(async () => {
  console.log(`Friedensstifter Löschtest · ${new Date().toISOString()}`);

  // 1. Anmelden
  const client = newClient();
  const { data: login, error: loginError } = await client.auth.signInWithPassword(C);
  if (loginError || !login?.session) abort(`Login für Testkonto C fehlgeschlagen (${loginError?.code ?? 'keine Session'})`);
  const token = login.session.access_token;
  const userId = login.user.id;
  record('Login C', 'ok', PASS);

  // 2. Opt-in Lernbasis (damit post-conversation einen Lernbasis-Eintrag erzeugen KANN)
  {
    const { data, error } = await client.rpc('set_learning_opt_in', { p_opt_in: true, p_version: '1.0' });
    record('Opt-in Lernbasis', 'ok', !error && data?.opt_in === true ? PASS : FAIL, error?.code ?? '');
  }

  // 3. Zwei Gespräche mit je zwei Nutzer-Nachrichten
  const conversationIds = [];
  for (let c = 0; c < 2; c++) {
    const { data: conv, error } = await client.from('conversations')
      .insert({ user_id: userId, title: `Löschtest ${c + 1}` }).select('id').single();
    if (error || !conv) { record(`Gespräch ${c + 1} anlegen`, 'ok', FAIL, error?.code ?? ''); continue; }
    conversationIds.push(conv.id);
    let ok = true;
    for (const content of SYNTHETIC) {
      const r = await callFunction('chat', token, {
        conversationId: conv.id,
        message: { clientMessageId: crypto.randomUUID(), content },
        requestId: 'deltest',
      });
      if (r.status !== 200) ok = false;
    }
    record(`Gespräch ${c + 1}: 2 Nachrichten über chat`, 'HTTP 200', ok ? PASS : FAIL);
  }

  // Der Server speichert die Antworten nach dem Stream (waitUntil) — kurz warten
  await new Promise(r => setTimeout(r, 5000));

  // 4. post-conversation für beide
  for (const [i, convId] of conversationIds.entries()) {
    const r = await callFunction('post-conversation', token, { conversationId: convId });
    record(`post-conversation Gespräch ${i + 1}`, 'HTTP 200', r.status === 200 ? PASS : FAIL,
      `HTTP ${r.status}${r.json?.skipped ? ', übersprungen' : ''}`);
  }

  // 5. Erkenntnis und Feedback über die normalen Client-Wege
  {
    const { error } = await client.from('insights').insert({
      user_id: userId, conversation_id: conversationIds[0] ?? null,
      content: 'Löschtest-Erkenntnis', category: 'erkenntnis', source: 'user',
    });
    record('Erkenntnis anlegen', 'ok', error ? FAIL : PASS, error?.code ?? '');
  }
  {
    const { error } = await client.from('user_feedback').insert({
      user_id: userId, conversation_id: conversationIds[0] ?? null,
      feedback_type: 'general', content: 'Löschtest-Feedback',
    });
    record('Feedback anlegen', 'ok', error ? FAIL : PASS, error?.code ?? '');
  }

  // 6. IDs für deletion-check.sql
  console.log('\nFür supabase/security/deletion-check.sql:');
  console.log(`  USER_ID          = ${userId}`);
  console.log(`  CONVERSATION_IDS = ${conversationIds.join(', ')}`);

  // 7. Konto löschen
  {
    const r = await callFunction('delete-account', token, {});
    record('delete-account', 'HTTP 200', r.status === 200 ? PASS : FAIL,
      `HTTP ${r.status}${r.json?.error ? `, ${r.json.error}` : ''}`);
  }

  // 8. Login danach muss scheitern
  {
    const { data, error } = await newClient().auth.signInWithPassword(C);
    record('Login nach Löschung', 'Fehler', error && !data?.session ? PASS : FAIL, error?.code ?? 'Login möglich');
  }

  record('Lernbasis-Eintrag', 'nur mit RAG_LEARNING_ENABLED=1', INFO,
    'Ob ein Eintrag entstand, zeigt deletion-check.sql nicht mehr (gelöscht). Bei Schalter aus: Opt-in-Pfad nur teilweise geprüft.');

  // Ausgabe
  const cols = [['Schritt', r => r.step], ['Erwartung', r => r.expect], ['Ergebnis', r => r.outcome], ['Detail', r => r.detail]];
  const widths = cols.map(([h, f]) => Math.min(60, Math.max(h.length, ...results.map(r => f(r).length))));
  const line = cells => '| ' + cells.map((c, i) => c.slice(0, widths[i]).padEnd(widths[i])).join(' | ') + ' |';
  console.log('\n' + line(cols.map(([h]) => h)));
  console.log('|' + widths.map(w => '-'.repeat(w + 2)).join('|') + '|');
  for (const r of results) console.log(line(cols.map(([, f]) => f(r))));
  const fails = results.filter(r => r.outcome === FAIL).length;
  console.log(`\nGesamt: ${results.length} · FAIL ${fails}\n`);
  process.exit(fails > 0 ? 1 : 0);
})().catch(e => {
  console.error(`\n✖ Unerwarteter Fehler: ${e?.name ?? 'Error'} ${e?.code ?? ''}`);
  process.exit(2);
});
