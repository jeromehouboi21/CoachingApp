// scripts/security/attack-test.mjs
// Friedensstifter – Angriffs-Testskript (Security-Paket A, S-02)
//
// Aufruf:   npm run security:test
// Optional: ATTACK_TEST_SUPERVISION=1 npm run security:test   (siehe Test 15)
//
// Grundregeln dieses Skripts:
// - Läuft NUR gegen die zwei Testkonten aus .env.security.local.
// - Gibt NIE Zeileninhalte aus – nur Anzahlen, IDs, HTTP-Status, Fehlercodes.
// - Liest fremde Tabellen ausschließlich per HEAD/Count (es werden keine Zeilen übertragen,
//   selbst wenn RLS lückenhaft ist).
// - Schreibversuche auf A's Daten setzen nur den Wert, der schon drinsteht (No-op),
//   damit ein erfolgreicher Angriff nichts zerstört. Lösch-Versuche laufen zuletzt.
// - Erfolgreiche Manipulationen an B's Profil werden sofort zurückgesetzt.
// - Exit-Code 1, sobald ein FAIL dabei ist.

import { createClient } from '@supabase/supabase-js';

// ── Konfiguration ────────────────────────────────────────────────────────────
const env = process.env;
const SUPABASE_URL = (env.SUPABASE_URL ?? '').replace(/\/$/, '');
const ANON_KEY = env.SUPABASE_ANON_KEY ?? '';
const A = { email: env.TEST_A_EMAIL, password: env.TEST_A_PASSWORD };
const B = { email: env.TEST_B_EMAIL, password: env.TEST_B_PASSWORD };
// trim(): cmd.exe setzt bei 'set X=1 && …' den Wert inkl. Leerzeichen ('1 ')
const RUN_SUPERVISION = ['1', 'true', 'yes'].includes((env.ATTACK_TEST_SUPERVISION ?? '').trim().toLowerCase());

function abort(msg) {
  console.error(`\n✖ Abbruch: ${msg}\n`);
  process.exit(2);
}

if (!SUPABASE_URL || !ANON_KEY) abort('SUPABASE_URL oder SUPABASE_ANON_KEY fehlt in .env.security.local');
if (!A.email || !B.email) abort('TEST_A_EMAIL oder TEST_B_EMAIL fehlt');
if (!A.password || !B.password) abort('TEST_A_PASSWORD oder TEST_B_PASSWORD fehlt');
if (A.email.trim().toLowerCase() === B.email.trim().toLowerCase()) abort('TEST_A_EMAIL und TEST_B_EMAIL sind identisch');

// Tabellen mit Eigentümer-Spalte (Client darf höchstens eigene Zeilen sehen)
const OWNED_TABLES = [
  { name: 'profiles',               owner: 'id' },
  { name: 'conversations',          owner: 'user_id' },
  { name: 'user_memory',            owner: 'user_id' },
  { name: 'insights',               owner: 'user_id',  conv: 'conversation_id' },
  { name: 'pattern_references',     owner: 'user_id',  conv: 'conversation_id' },
  { name: 'coach_file_entries',     owner: 'user_id',  conv: 'source_conversation_id' },
  { name: 'coachee_profile',        owner: 'user_id' },
  { name: 'session_notes',          owner: 'user_id',  conv: 'conversation_id' },
  { name: 'resonance_map',          owner: 'user_id' },
  { name: 'inner_voices',           owner: 'user_id' },
  { name: 'user_feedback',          owner: 'user_id',  conv: 'conversation_id' },
  { name: 'feedback_surveys',       owner: 'user_id' },
  { name: 'feedback_survey_scores', owner: 'user_id' },   // View
];
// messages hat keine user_id – Eigentum über conversation_id
const MESSAGE_TABLE = { name: 'messages', conv: 'conversation_id' };
// Interne Tabellen: Client darf gar nichts sehen
const INTERNAL_TABLES = ['app_logs', 'experience_patterns', 'coach_reflections', 'supervision_logs', 'invite_codes', 'crisis_events', 'conversation_context'];
const ALL_TABLE_NAMES = [...OWNED_TABLES.map(t => t.name), MESSAGE_TABLE.name, ...INTERNAL_TABLES];

const EDGE_FUNCTIONS = [
  'chat', 'post-conversation', 'pre-session-briefing', 'validate-invite-code',
  'delete-account', 'admin-users', 'admin-feedback', 'admin-invite-user', 'supervision', 'backfill-embeddings',
];

// ── Ergebnis-Sammlung ────────────────────────────────────────────────────────
const results = [];
function record(no, check, expect, outcome, detail = '') {
  results.push({ no: String(no), check, expect, outcome, detail: String(detail ?? '') });
}
const PASS = 'PASS', FAIL = 'FAIL', SKIP = 'SKIP';

// ── Helfer ───────────────────────────────────────────────────────────────────
function newClient(accessToken) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
  });
}

async function signIn(who, creds) {
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({ email: creds.email, password: creds.password });
  if (error || !data?.session) abort(`Login für Testkonto ${who} fehlgeschlagen (${error?.code ?? error?.status ?? 'keine Session'})`);
  return { client, userId: data.user.id, token: data.session.access_token };
}

/** Zählt Zeilen per HEAD-Request – es werden nie Zeileninhalte übertragen. */
// Netzwerkaussetzer (kein Code, kein HTTP-Status) werden bis zu zweimal wiederholt. Bleibt es
// dabei, wird der Fehler als 'network' markiert — Aufrufer werten das NICHT als "kein Zugriff".
async function countRows(client, table, applyFilter) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let q = client.from(table).select('*', { count: 'exact', head: true });
    if (applyFilter) q = applyFilter(q);
    const { count, error, status } = await q;
    if (error && !error.code && !error.status) error.status = status;
    const isNetwork = error && !error.code && (!error.status || error.status === 0);
    if (!isNetwork) return { count: count ?? 0, error, status };
    if (attempt === 2) { error.code = 'network'; return { count: count ?? 0, error, status, network: true }; }
    await new Promise(r => setTimeout(r, 1000));
  }
}

/** PASS-Logik für Lesetests: Rechte-Fehler = kein Zugriff (PASS), Netzwerkfehler = FAIL (nicht verdecken). */
function noAccessOrZero(r) {
  if (r.network) return FAIL;
  return r.error || r.count === 0 ? PASS : FAIL;
}

function errCode(error) {
  if (!error) return '';
  return error.code || (error.status ? `HTTP ${error.status}` : '') || error.name || 'error';
}

/** Ruft eine Edge Function auf und liefert nur den HTTP-Status. Streams werden sofort abgebrochen. */
async function callFunction(name, { token, apikey = true, method = 'POST', body } = {}) {
  const headers = { 'Content-Type': 'application/json', 'x-region': 'eu-central-1' };   // S-09 wie im Frontend
  if (apikey) headers.apikey = ANON_KEY;
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method, headers, signal: controller.signal,
      ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
    });
    const isStream = (res.headers.get('content-type') ?? '').includes('text/event-stream');
    let json = null;
    if (isStream) {
      controller.abort();                 // Kosten minimal halten: Stream sofort abbrechen
      try { await res.body?.cancel(); } catch {}
    } else {
      try { json = await res.json(); } catch {}
    }
    return { status: res.status, json, isStream, region: res.headers.get('x-sb-edge-region') };
  } catch (e) {
    if (e?.name === 'AbortError') return { status: 'timeout/abort', json: null };
    return { status: `network:${e?.code ?? e?.name ?? 'error'}`, json: null };
  } finally {
    clearTimeout(timer);
  }
}

// ── Setup: Testkonto A ───────────────────────────────────────────────────────
async function setupA() {
  const a = await signIn('A', A);

  // Konversation: vorhandene nehmen oder über den normalen App-Weg anlegen
  let { data: convs, error } = await a.client
    .from('conversations').select('id, title').eq('user_id', a.userId)
    .order('created_at', { ascending: true }).limit(1);
  if (error) abort(`A kann eigene Konversationen nicht lesen (${errCode(error)})`);

  let conv = convs?.[0];
  if (!conv) {
    const ins = await a.client.from('conversations')
      .insert({ user_id: a.userId, title: 'Sicherheitstest' }).select('id, title').single();
    if (ins.error) abort(`Testkonversation für A konnte nicht angelegt werden (${errCode(ins.error)})`);
    conv = ins.data;
    const msg = await a.client.from('messages')
      .insert({ conversation_id: conv.id, role: 'user', content: 'Testnachricht für Sicherheitstest' });
    if (msg.error) abort(`Testnachricht für A konnte nicht angelegt werden (${errCode(msg.error)})`);
    console.log('• Testkonversation für A angelegt');
  }

  // Je eine Zeile in insights / inner_voices / coach_file_entries sicherstellen.
  // Später (nach S-02) darf der Client nicht mehr in inner_voices/coach_file_entries
  // schreiben – dann bleiben die Zeilen aus dem ersten Lauf bestehen, oder der Test wird SKIP.
  const targets = {};
  const ensure = async (table, select, insertRow) => {
    const { data } = await a.client.from(table).select(select).eq('user_id', a.userId).limit(1);
    if (data?.[0]) { targets[table] = data[0]; return; }
    const ins = await a.client.from(table).insert(insertRow).select(select).single();
    targets[table] = ins.error ? null : ins.data;
  };
  await ensure('insights', 'id, is_pinned',
    { user_id: a.userId, conversation_id: conv.id, content: 'Sicherheitstest', category: 'erkenntnis', source: 'user' });
  await ensure('inner_voices', 'id, status',
    { user_id: a.userId, status: 'dismissed', description: 'Sicherheitstest' });
  await ensure('coach_file_entries', 'id, confidence',
    { user_id: a.userId, category: 'theme', label: 'Sicherheitstest', confidence: 1 });

  // IDs aus A's Akte (nur IDs) – für den Briefing-Leak-Test
  const { data: fileIds } = await a.client.from('coach_file_entries').select('id').eq('user_id', a.userId);

  return { ...a, conv, targets, fileEntryIds: (fileIds ?? []).map(r => r.id) };
}

// ── Tests als B ──────────────────────────────────────────────────────────────
async function testsAsB(a, b) {
  // 1 + 2: Lesezugriffe
  const { data: bConvs } = await b.client.from('conversations').select('id').eq('user_id', b.userId);
  const bConvIds = (bConvs ?? []).map(r => r.id);

  for (const t of OWNED_TABLES) {
    const foreign = await countRows(b.client, t.name, q => q.or(`${t.owner}.neq.${b.userId},${t.owner}.is.null`));
    if (foreign.error) {
      record(1, `select ${t.name} (fremde Zeilen)`, 'nur eigene', foreign.network ? FAIL : PASS, `kein Zugriff (${errCode(foreign.error)})`);
    } else {
      const own = await countRows(b.client, t.name, q => q.eq(t.owner, b.userId));
      record(1, `select ${t.name} (fremde Zeilen)`, 'nur eigene', foreign.count === 0 ? PASS : FAIL,
        `fremd=${foreign.count}, eigen=${own.count}`);
    }

    const byA = await countRows(b.client, t.name, q => q.eq(t.owner, a.userId));
    record(2, `select ${t.name} where ${t.owner}=A`, '0 Zeilen',
      noAccessOrZero(byA), byA.error ? errCode(byA.error) : `zeilen=${byA.count}`);

    if (t.conv) {
      const byConv = await countRows(b.client, t.name, q => q.eq(t.conv, a.conv.id));
      record(2, `select ${t.name} where ${t.conv}=A's`, '0 Zeilen',
        noAccessOrZero(byConv), byConv.error ? errCode(byConv.error) : `zeilen=${byConv.count}`);
    }
  }

  {
    const filter = bConvIds.length
      ? q => q.not('conversation_id', 'in', `(${bConvIds.join(',')})`)
      : undefined;
    const foreign = await countRows(b.client, 'messages', filter);
    record(1, 'select messages (fremde Zeilen)', 'nur eigene',
      noAccessOrZero(foreign),
      foreign.error ? errCode(foreign.error) : `fremd=${foreign.count}`);
    const byConv = await countRows(b.client, 'messages', q => q.eq('conversation_id', a.conv.id));
    record(2, "select messages where conversation_id=A's", '0 Zeilen',
      noAccessOrZero(byConv), byConv.error ? errCode(byConv.error) : `zeilen=${byConv.count}`);
  }

  for (const name of INTERNAL_TABLES) {
    const r = await countRows(b.client, name);
    record(1, `select ${name} (intern)`, '0 / Fehler',
      noAccessOrZero(r), r.error ? errCode(r.error) : `zeilen=${r.count}`);
  }

  {
    const { data, error } = await b.client.rpc('get_conversation_history');
    const foreign = (data ?? []).filter(r => !bConvIds.includes(r.id)).length;
    record(1, 'rpc get_conversation_history', 'nur eigene',
      error || foreign === 0 ? PASS : FAIL, error ? errCode(error) : `fremd=${foreign}, gesamt=${(data ?? []).length}`);
  }

  // 3 + 4: Privilegierte Profilfelder (mit Selbstheilung)
  const { data: bProfile, error: bProfErr } = await b.client
    .from('profiles').select('is_admin, plan, session_limit, sessions_used_this_month').eq('id', b.userId).single();
  if (bProfErr || !bProfile) {
    record('3-4', 'profiles: privilegierte Felder', '42501', SKIP, `eigenes Profil nicht lesbar (${errCode(bProfErr)})`);
  } else {
    if (bProfile.is_admin) {
      console.warn('⚠ Testkonto B ist Admin – Test 10 wird dadurch verfälscht. Bitte is_admin für B im Dashboard zurücksetzen.');
    }
    const used = bProfile.sessions_used_this_month ?? 0;
    const attempts = [
      { no: 3, field: 'is_admin', value: true },
      { no: 4, field: 'plan', value: bProfile.plan === 'premium' ? 'free' : 'premium' },
      { no: 4, field: 'session_limit', value: bProfile.session_limit === null ? 999 : null },
      { no: 4, field: 'sessions_used_this_month', value: used > 0 ? 0 : -1 },
    ];
    for (const at of attempts) {
      const { data, error } = await b.client
        .from('profiles').update({ [at.field]: at.value }).eq('id', b.userId).select('id');
      if (error) {
        record(at.no, `update profiles.${at.field} (eigene Zeile)`, '42501',
          error.code === '42501' ? PASS : FAIL, errCode(error));
      } else if (!data?.length) {
        record(at.no, `update profiles.${at.field} (eigene Zeile)`, '42501', FAIL, '0 Zeilen, aber kein Fehler');
      } else {
        const restore = await b.client
          .from('profiles').update({ [at.field]: bProfile[at.field] }).eq('id', b.userId).select('id');
        record(at.no, `update profiles.${at.field} (eigene Zeile)`, '42501', FAIL,
          restore.error ? `GEÄNDERT – Zurücksetzen fehlgeschlagen (${errCode(restore.error)})!` : 'geändert, zurückgesetzt');
      }
    }
  }

  // 5: Nachricht in A's Konversation einschleusen
  {
    const { data, error } = await b.client.from('messages')
      .insert({ conversation_id: a.conv.id, role: 'user', content: 'Sicherheitstest' }).select('id');
    record(5, "insert messages in A's Konversation", 'Fehler',
      error ? PASS : FAIL, error ? errCode(error) : `eingefügt (${data?.length ?? 0})`);
  }

  // 5b (S-12, Welle 2b): Nachricht in die EIGENE Konversation schreiben — nur der Server darf das
  if (bConvIds.length) {
    for (const role of ['user', 'assistant']) {
      const { data, error } = await b.client.from('messages')
        .insert({ conversation_id: bConvIds[0], role, content: 'Sicherheitstest' }).select('id');
      record('5b', `insert messages (${role}) in B's eigene Konversation`, 'Fehler',
        error ? PASS : FAIL, error ? errCode(error) : `eingefügt (${data?.length ?? 0})`);
    }
  } else {
    record('5b', "insert messages in B's eigene Konversation", 'Fehler', SKIP, 'B hat noch kein Gespräch');
  }

  // 6a: Updates auf A's Zeilen (No-op-Werte)
  const updates = [
    { table: 'conversations', id: a.conv.id, patch: { title: a.conv.title } },
    { table: 'insights', row: a.targets.insights, patch: r => ({ is_pinned: r.is_pinned }) },
    { table: 'inner_voices', row: a.targets.inner_voices, patch: r => ({ status: r.status }) },
    { table: 'coach_file_entries', row: a.targets.coach_file_entries, patch: r => ({ confidence: r.confidence }) },
  ];
  for (const u of updates) {
    const id = u.id ?? u.row?.id;
    if (!id) { record(6, `update ${u.table} (A's Zeile)`, '0 Zeilen / Fehler', SKIP, 'A hat keine Zeile'); continue; }
    const patch = typeof u.patch === 'function' ? u.patch(u.row) : u.patch;
    const { data, error } = await b.client.from(u.table).update(patch).eq('id', id).select('id');
    record(6, `update ${u.table} (A's Zeile)`, '0 Zeilen / Fehler',
      error || !data?.length ? PASS : FAIL, error ? errCode(error) : `betroffen=${data.length}`);
  }

  // 7: post-conversation mit A's conversationId (+ altes Feld userId = A). Eigentumsprüfung
  //    greift vor allem anderen (auch vor der Format-Prüfung).
  {
    const r = await callFunction('post-conversation', {
      token: b.token,
      body: { conversationId: a.conv.id, userId: a.userId },
    });
    record(7, "post-conversation mit A's conversationId", 'HTTP 403', r.status === 403 ? PASS : FAIL, `HTTP ${r.status}`);
  }

  // 8: chat mit A's conversationId (Stream wird sofort abgebrochen)
  {
    const r = await callFunction('chat', {
      token: b.token,
      body: { message: { clientMessageId: crypto.randomUUID(), content: 'Hallo' }, conversationId: a.conv.id, requestId: 'sectest' },
    });
    record(8, "chat mit A's conversationId", 'HTTP 403', r.status === 403 ? PASS : FAIL,
      `HTTP ${r.status}${r.isStream ? ' (Stream, abgebrochen)' : ''}`);
  }

  // 9: pre-session-briefing enthält keine Kennungen aus A's Daten
  {
    const r = await callFunction('pre-session-briefing', { token: b.token, body: {} });
    if (r.status !== 200) {
      record(9, 'pre-session-briefing nur B-Daten', 'PASS', FAIL, `HTTP ${r.status}`);
    } else {
      const text = JSON.stringify(r.json ?? {});
      const leaked = [a.userId, a.conv.id, ...a.fileEntryIds].filter(id => text.includes(id)).length;
      record(9, 'pre-session-briefing nur B-Daten', 'keine A-IDs', leaked === 0 ? PASS : FAIL, `A-IDs gefunden=${leaked}`);
      // S-12: Akte, Resonanzkarte und Gesprächsinhalte gehen nicht mehr an den Client
      const forbidden = ['coachFile', 'resonanceMap', 'entries', 'lastTopicSummary', 'summary', 'text', 'topicHint']
        .filter(k => text.includes(`"${k}"`));
      record(9, 'pre-session-briefing ohne Akte/Resonanzkarte (S-12)', 'nur Eckdaten',
        forbidden.length === 0 ? PASS : FAIL, forbidden.length ? `Felder: ${forbidden.join(', ')}` : 'ok');
    }
  }

  // 10: Admin-Functions als Nicht-Admin
  for (const [name, method] of [['admin-users', 'GET'], ['admin-feedback', 'GET'], ['admin-invite-user', 'POST']]) {
    const r = await callFunction(name, { token: b.token, method, body: {} });
    record(10, `${name} als Nicht-Admin`, 'HTTP 403', r.status === 403 ? PASS : FAIL, `HTTP ${r.status}`);
  }

  // 11: consume_session mit A's Konversation (existiert erst ab Migration 023)
  {
    const { error } = await b.client.rpc('consume_session', { p_conversation_id: a.conv.id });
    if (error && (error.code === 'PGRST202' || error.code === '42883')) {
      record(11, "rpc consume_session(A's Konversation)", 'Fehler', SKIP, 'Funktion existiert noch nicht');
    } else {
      record(11, "rpc consume_session(A's Konversation)", 'Fehler', error ? PASS : FAIL, error ? errCode(error) : 'kein Fehler');
    }
  }

  // 12: app_logs-Zeile im Namen von A
  {
    const { error } = await b.client.from('app_logs')
      .insert({ level: 'info', source: 'attack-test', message: 'security test', user_id: a.userId });
    record(12, 'insert app_logs mit user_id=A', 'Fehler', error ? PASS : FAIL, error ? errCode(error) : 'eingefügt');
  }

  // 12b (Zusatz, K-2): redeem_invite_code direkt aufrufen – ungültiger Code, ändert nichts
  {
    const { error } = await b.client.rpc('redeem_invite_code', { p_code: 'SECTEST-INVALID-0000', p_user_id: b.userId });
    record('12b', 'rpc redeem_invite_code direkt (als B)', 'Fehler', error ? PASS : FAIL,
      error ? errCode(error) : 'aufrufbar');
  }

  // 6b: Löschversuche auf A's Zeilen – bewusst zuletzt
  const deletes = [
    { table: 'insights', id: a.targets.insights?.id },
    { table: 'inner_voices', id: a.targets.inner_voices?.id },
    { table: 'coach_file_entries', id: a.targets.coach_file_entries?.id },
    { table: 'conversations', id: a.conv.id },
  ];
  for (const d of deletes) {
    if (!d.id) { record(6, `delete ${d.table} (A's Zeile)`, '0 Zeilen / Fehler', SKIP, 'A hat keine Zeile'); continue; }
    const { data, error } = await b.client.from(d.table).delete().eq('id', d.id).select('id');
    record(6, `delete ${d.table} (A's Zeile)`, '0 Zeilen / Fehler',
      error || !data?.length ? PASS : FAIL,
      error ? errCode(error) : data?.length ? `GELÖSCHT=${data.length} (Testdaten von A, nächster Lauf legt neu an)` : 'betroffen=0');
  }
}

// ── Tests ohne Login ─────────────────────────────────────────────────────────
async function testsAnonymous() {
  const anon = newClient();

  for (const name of ALL_TABLE_NAMES) {
    const r = await countRows(anon, name);
    record(13, `anon select ${name}`, '0 / Fehler',
      noAccessOrZero(r), r.error ? errCode(r.error) : `zeilen=${r.count}`);
  }

  {
    const { error } = await anon.from('app_logs').insert({ level: 'info', source: 'attack-test', message: 'security test (anon)' });
    record(14, 'anon insert app_logs', 'Fehler', error ? PASS : FAIL, error ? errCode(error) : 'eingefügt');
  }

  {
    const { error } = await anon.rpc('redeem_invite_code', { p_code: 'SECTEST-INVALID-0000', p_user_id: '00000000-0000-0000-0000-000000000000' });
    record('14b', 'anon rpc redeem_invite_code', 'Fehler', error ? PASS : FAIL, error ? errCode(error) : 'aufrufbar');
  }

  for (const name of EDGE_FUNCTIONS) {
    if (name === 'supervision' && !RUN_SUPERVISION) {
      record(15, 'supervision ohne Auth / anon-Key', 'HTTP 401/403', SKIP,
        'nicht aufgerufen – würde heute einen echten Lauf starten (ATTACK_TEST_SUPERVISION=1 setzen)');
      continue;
    }
    const okStatus = name === 'supervision' ? [401, 403] : [401];
    const method = ['admin-users', 'admin-feedback'].includes(name) ? 'GET' : 'POST';

    const noAuth = await callFunction(name, { method, body: {} });
    record(15, `${name} ohne Authorization`, okStatus.join('/'),
      okStatus.includes(noAuth.status) ? PASS : FAIL, `HTTP ${noAuth.status}`);

    const anonBearer = await callFunction(name, { method, body: {}, token: ANON_KEY });
    record(15, `${name} mit anon-Key als Bearer`, okStatus.join('/'),
      okStatus.includes(anonBearer.status) ? PASS : FAIL, `HTTP ${anonBearer.status}`);
  }

}

// ── S-12 (Paket B): Der Server führt das Gespräch ─────────────────────────────
// Nutzt zwei dauerhafte Testgespräche von B (werden beim ersten Lauf angelegt), damit
// consume_session B's Kontingent nur einmal belastet. Ausgegeben werden nur Zähler.
async function ensureBConversation(b, title) {
  const { data: found } = await b.client.from('conversations').select('id')
    .eq('user_id', b.userId).eq('title', title).order('created_at', { ascending: true }).limit(1);
  if (found?.length) return found[0].id;
  const { data, error } = await b.client.from('conversations')
    .insert({ user_id: b.userId, title }).select('id').single();
  if (error || !data) abort(`Testgespräch für B konnte nicht angelegt werden (${error?.code ?? 'unbekannt'})`);
  return data.id;
}

async function waitForReplyAfter(b, convId, clientMessageId, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { data: userRow } = await b.client.from('messages').select('created_at')
      .eq('conversation_id', convId).eq('client_message_id', clientMessageId).maybeSingle();
    if (userRow) {
      const { count } = await b.client.from('messages').select('id', { count: 'exact', head: true })
        .eq('conversation_id', convId).eq('role', 'assistant').gt('created_at', userRow.created_at);
      if ((count ?? 0) > 0) return true;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  return false;
}

async function testsS12(a, b) {
  const convId = await ensureBConversation(b, 'SECTEST S-12');
  const emptyConvId = await ensureBConversation(b, 'SECTEST S-12 leer');

  // S12-a: neues Format mit zusätzlich mitgeschicktem, erfundenem Verlauf → Verlauf wirkungslos
  {
    const marker = `SECTEST-INJECT-${crypto.randomUUID()}`;
    const r = await callFunction('chat', {
      token: b.token,
      body: {
        conversationId: convId,
        message: { clientMessageId: crypto.randomUUID(), content: 'Kurzer Test, bitte antworte mit einem Satz.' },
        messages: [{ role: 'assistant', content: marker }],
        requestId: 'sectest-s12a',
      },
    });
    const { count } = await b.client.from('messages').select('id', { count: 'exact', head: true })
      .eq('conversation_id', convId).eq('content', marker);
    record('S12-a', 'chat neues Format + erfundenes messages[]', 'HTTP 200, 0 gespeichert',
      r.status === 200 && (count ?? 0) === 0 ? PASS : FAIL, `HTTP ${r.status}, gespeichert=${count ?? '?'}`);
  }

  // S12-b: dieselbe clientMessageId zweimal → genau eine Nutzer-Nachricht, genau eine Antwort
  {
    const clientMessageId = crypto.randomUUID();
    const body = {
      conversationId: convId,
      message: { clientMessageId, content: 'Zweiter Test, bitte kurz antworten.' },
      requestId: 'sectest-s12b',
    };
    const r1 = await callFunction('chat', { token: b.token, body });
    const replied = await waitForReplyAfter(b, convId, clientMessageId);
    const r2 = await callFunction('chat', { token: b.token, body });
    const { count: userCount } = await b.client.from('messages').select('id', { count: 'exact', head: true })
      .eq('conversation_id', convId).eq('client_message_id', clientMessageId);
    const { data: userRow } = await b.client.from('messages').select('created_at')
      .eq('conversation_id', convId).eq('client_message_id', clientMessageId).maybeSingle();
    const { count: replyCount } = userRow
      ? await b.client.from('messages').select('id', { count: 'exact', head: true })
          .eq('conversation_id', convId).eq('role', 'assistant').gt('created_at', userRow.created_at)
      : { count: null };
    record('S12-b', 'chat zweimal mit derselben clientMessageId', '1 Nachricht, 1 Antwort',
      r1.status === 200 && r2.status === 200 && replied && userCount === 1 && replyCount === 1 ? PASS : FAIL,
      `HTTP ${r1.status}/${r2.status}, Antwort gespeichert=${replied}, user=${userCount ?? '?'}, antworten=${replyCount ?? '?'}`);
  }

  // S12-c: post-conversation mit 3 erfundenen Nachrichten → seit Welle 2b abgelehnt (409);
  //        ohne messages[] → aus der DB (leeres Gespräch) → übersprungen
  {
    const r = await callFunction('post-conversation', {
      token: b.token,
      body: {
        conversationId: emptyConvId,
        messages: [
          { role: 'user', content: 'erfunden 1' },
          { role: 'assistant', content: 'erfunden 2' },
          { role: 'user', content: 'erfunden 3' },
        ],
      },
    });
    record('S12-c', 'post-conversation mit erfundenem messages[]', '409 client_outdated',
      r.status === 409 && r.json?.error === 'client_outdated' ? PASS : FAIL, `HTTP ${r.status}, ${r.json?.error ?? ''}`);
    const r2 = await callFunction('post-conversation', { token: b.token, body: { conversationId: emptyConvId } });
    record('S12-c2', 'post-conversation neues Format, leeres Gespräch', 'HTTP 200, übersprungen',
      r2.status === 200 && r2.json?.skipped === true ? PASS : FAIL, `HTTP ${r2.status}, skipped=${r2.json?.skipped ?? '?'}`);
  }

  // S12-d: chat im alten Format (nur messages[]) → 409 client_outdated, nichts gespeichert
  {
    const r = await callFunction('chat', {
      token: b.token,
      body: { conversationId: convId, messages: [{ role: 'user', content: 'Altes Format' }], requestId: 'sectest-s12d' },
    });
    record('S12-d', 'chat im alten Format', '409 client_outdated',
      r.status === 409 && r.json?.error === 'client_outdated' ? PASS : FAIL, `HTTP ${r.status}, ${r.json?.error ?? ''}`);
  }
}

// ── S-13 (Paket B): Opt-in nur über die RPC ──────────────────────────────────
// B endet immer ohne Opt-in (erst einschalten, dann zurücknehmen).
async function testsS13(b) {
  {
    const on = await b.client.rpc('set_learning_opt_in', { p_opt_in: true, p_version: '1.0' });
    const off = await b.client.rpc('set_learning_opt_in', { p_opt_in: false, p_version: null });
    const ok = !on.error && !off.error && on.data?.opt_in === true && off.data?.opt_in === false
      && Number.isInteger(off.data?.deleted);
    record('S13-a', 'rpc set_learning_opt_in ein/aus (als B)', 'ok, deleted = Zahl',
      ok ? PASS : FAIL, on.error || off.error ? errCode(on.error || off.error) : `deleted=${off.data?.deleted}`);
  }
  {
    const { data, error } = await b.client.from('profiles')
      .update({ learning_opt_in: true }).eq('id', b.userId).select('id');
    record('S13-b', 'update profiles.learning_opt_in direkt', '42501',
      error?.code === '42501' ? PASS : FAIL, error ? errCode(error) : `betroffen=${data?.length ?? 0}`);
  }
  {
    const { error } = await b.client.rpc('set_learning_opt_in', { p_opt_in: true, p_version: 'x'.repeat(50) });
    record('S13-c', 'rpc set_learning_opt_in mit ungültiger Version', 'Fehler',
      error ? PASS : FAIL, error ? errCode(error) : 'angenommen');
    if (!error) await b.client.rpc('set_learning_opt_in', { p_opt_in: false, p_version: null });
  }
}

// ── S-15 (Paket B): Fristen- und Berichtsfunktionen nur serverseitig ─────────
async function testsS15(b) {
  for (const [fn, args] of [['apply_retention', {}], ['inactive_accounts_report', { p_months: 24 }]]) {
    const { data, error } = await b.client.rpc(fn, args);
    record('S15', `rpc ${fn} (als B)`, 'Fehler',
      error ? PASS : FAIL, error ? errCode(error) : `aufrufbar (${Array.isArray(data) ? data.length + ' Zeilen' : 'Ergebnis'})`);
  }
}

// ── S-22 (Paket C): Monitoring nur intern bzw. für Admins ───────────────────
async function testsS22(b) {
  {
    const r = await callFunction('security-monitor', { body: {} });            // ohne Secret/Token
    record(31, 'security-monitor ohne Secret', '401', r.status === 401 ? PASS : FAIL, String(r.status));
  }
  {
    const r = await callFunction('security-monitor', { token: b.token, body: { probe: true } });
    record(31, 'security-monitor als B', '401', r.status === 401 ? PASS : FAIL, String(r.status));
  }
  {
    const r = await callFunction('admin-security', { token: b.token, method: 'GET' });
    record(31, 'admin-security als B', '403', r.status === 403 ? PASS : FAIL, String(r.status));
  }
  {
    const r = await countRows(b.client, 'security_alerts');
    record(31, 'select security_alerts (als B)', '0 Zeilen/Fehler', noAccessOrZero(r), r.error ? errCode(r.error) : `${r.count} Zeilen`);
  }
  {
    const { error } = await b.client.rpc('security_log_counts', { p_since: new Date(0).toISOString(), p_codes: ['auth_rejected'] });
    record(31, 'rpc security_log_counts (als B)', 'Fehler', error ? PASS : FAIL, error ? errCode(error) : 'aufrufbar');
  }
  {
    // Gefälschte Herkunft: Der Trigger setzt origin unabhängig vom Body auf 'client'.
    // Kontrolle per SQL (J-C3): select origin, count(*) from app_logs where message = 'sectest_origin_probe' group by 1;
    const { error } = await b.client.from('app_logs').insert({
      level: 'info', source: 'attack-test', message: 'sectest_origin_probe', user_id: b.userId, origin: 'server',
    });
    record(31, 'app_logs-Insert mit origin=server (als B)', 'gespeichert, origin per SQL = client',
      error ? FAIL : PASS, error ? errCode(error) : 'eingefügt – Herkunft per SQL prüfen');
  }
}

async function testsRateLimits(a, b) {
  // 16 + 17: Rate-Limits (Migration 029). Bewusst am Ende: B ist danach für chat ca. 1 Minute
  // und für validate-invite-code bis zu 1 Stunde gesperrt. Keine KI-Kosten (ungültiger Code
  // bzw. fremde conversationId → abgelehnt vor jedem Modellaufruf).
  {
    const statuses = [];
    for (let i = 0; i < 7; i++) {
      const r = await callFunction('validate-invite-code', { token: b.token, body: { code: `SECTEST-INVALID-${i}` } });
      statuses.push(r.status);
      if (r.status === 429) break;
    }
    record(16, 'validate-invite-code Durchprobieren (7 Codes)', '429 spätestens beim 6.',
      statuses.includes(429) ? PASS : FAIL, statuses.join(','));
  }
  {
    const statuses = [];
    for (let i = 0; i < 12; i++) {
      const r = await callFunction('chat', {
        token: b.token,
        body: { message: { clientMessageId: crypto.randomUUID(), content: 'Hallo' }, conversationId: a.conv.id, requestId: 'sectest-rl' },
      });
      statuses.push(r.status);
      if (r.status === 429) break;
    }
    const rest = statuses.filter(s => s !== 429 && s !== 403);
    record(17, 'chat Flut (12 Anfragen/Minute)', '429 spätestens bei der 11.',
      statuses.includes(429) && rest.length === 0 ? PASS : FAIL, statuses.join(','));
  }
}

// ── S-08 (Paket B): Security-Header der App ─────────────────────────────────
const APP_URL = (env.APP_URL ?? 'https://app.friedensstifter.coach').replace(/\/$/, '');
async function testsHeaders() {
  let res;
  try { res = await fetch(APP_URL, { method: 'GET', redirect: 'manual' }); }
  catch (e) { record('HDR', 'App erreichbar', 'HTTP 200', FAIL, `network:${e?.code ?? e?.name ?? 'error'}`); return; }
  const h = (k) => res.headers.get(k) ?? '';
  const checks = [
    ['Strict-Transport-Security', /max-age=\d{8,}/i.test(h('strict-transport-security'))],
    ['X-Content-Type-Options', h('x-content-type-options').toLowerCase() === 'nosniff'],
    ['Referrer-Policy', h('referrer-policy') !== ''],
    ['Permissions-Policy', /camera=\(\)/.test(h('permissions-policy'))],
    ['Cross-Origin-Opener-Policy', h('cross-origin-opener-policy') === 'same-origin'],
    ['X-Frame-Options', h('x-frame-options').toUpperCase() === 'DENY'],
    ['Content-Security-Policy (erzwingend)', /script-src 'self'/.test(h('content-security-policy')) && /frame-ancestors 'none'/.test(h('content-security-policy'))],
  ];
  for (const [name, ok] of checks) record('HDR', `Header ${name}`, 'vorhanden', ok ? PASS : FAIL, ok ? 'ok' : 'fehlt/abweichend');
}

// ── S-09 (Paket C): Functions laufen in Frankfurt ───────────────────────────
// Ungültige Bodys reichen: Den Header x-sb-edge-region setzt die Edge-Runtime bei jeder Antwort.
// export-my-data kommt mit Welle C-4 dazu.
async function testsRegion(b) {
  const calls = [
    ['chat', { token: b.token, body: {} }],
    ['pre-session-briefing', { token: b.token, body: {} }],
  ];
  for (const [name, opts] of calls) {
    const r = await callFunction(name, opts);
    const ok = r.region === 'eu-central-1';
    record(32, `Region ${name}`, 'x-sb-edge-region: eu-central-1', ok ? PASS : FAIL,
      typeof r.status === 'number' ? `HTTP ${r.status} · ${r.region ?? 'kein Header'}` : String(r.status));
  }
}

// ── Ausgabe ──────────────────────────────────────────────────────────────────
function printResults() {
  const cols = [
    ['#', r => r.no], ['Prüfung', r => r.check], ['Erwartung', r => r.expect],
    ['Ergebnis', r => r.outcome], ['Detail', r => r.detail],
  ];
  const widths = cols.map(([h, f]) => Math.min(70, Math.max(h.length, ...results.map(r => f(r).length))));
  const line = cells => '| ' + cells.map((c, i) => c.slice(0, widths[i]).padEnd(widths[i])).join(' | ') + ' |';
  console.log('\n' + line(cols.map(([h]) => h)));
  console.log('|' + widths.map(w => '-'.repeat(w + 2)).join('|') + '|');
  for (const r of results) console.log(line(cols.map(([, f]) => f(r))));

  const n = o => results.filter(r => r.outcome === o).length;
  console.log(`\nGesamt: ${results.length} · PASS ${n(PASS)} · FAIL ${n(FAIL)} · SKIP ${n(SKIP)}\n`);
  return n(FAIL);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`Friedensstifter Angriffstest · ${new Date().toISOString()}`);
  const a = await setupA();
  const b = await signIn('B', B);
  if (a.userId === b.userId) abort('A und B sind dasselbe Konto');
  console.log('• Testkonten A und B angemeldet');

  await testsAsB(a, b);
  await testsAnonymous();
  await testsS12(a, b);
  await testsS13(b);
  await testsS15(b);
  await testsHeaders();
  await testsS22(b);
  await testsRateLimits(a, b);
  await testsRegion(b);   // nach den Rate-Limit-Tests, damit deren Zählung unberührt bleibt (auch 429 trägt den Header)

  // scope 'local': nur die Sitzung dieses Skripts beenden – nicht die Browser-Sitzungen
  // der Testkonten auf anderen Geräten (Standard von signOut() ist 'global').
  await Promise.allSettled([a.client.auth.signOut({ scope: 'local' }), b.client.auth.signOut({ scope: 'local' })]);
  const fails = printResults();
  process.exit(fails > 0 ? 1 : 0);
})().catch(e => {
  console.error(`\n✖ Unerwarteter Fehler: ${e?.name ?? 'Error'} ${e?.code ?? ''}`);
  process.exit(2);
});
