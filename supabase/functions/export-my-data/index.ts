// supabase/functions/export-my-data/index.ts — Selbstauskunft / Datenexport (S-16, Paket C, Welle C-4)
//
// Art. 15 / Art. 20 DSGVO: Die angemeldete Person lädt alles herunter, was die App über sie gespeichert hat.
// Sicherheitsmuster v2: Identität nur aus dem JWT (ctx.user.id). Gelesen wird über admin (service_role),
// deshalb filtert JEDE Abfrage auf uid bzw. die eigenen Gesprächs-IDs.
// Kein unvollständiger Export: Scheitert eine Tabelle, kommt 500 export_incomplete.
// Logs nur mit Zählern und Tabellennamen, nie mit Inhalten.

import { createLogger, describeError } from '../_shared/logger.ts';
import { HttpError, requireUser, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit, RateLimitError, rateLimitResponse, RATE_LIMITS } from '../_shared/rateLimit.ts';
import { sendMail } from '../_shared/mailer.ts';

const CORS_HEADERS = corsHeaders('POST, OPTIONS');
const PAGE_SIZE = 1000;          // = PostgREST max_rows des Projekts (Standard)
const IN_CHUNK = 100;            // Gesprächs-IDs pro .in()-Abfrage (URL-Länge)

type Filter = 'user_id' | 'source_user_id' | 'id' | 'conversation_id';
interface ExportTable {
  table: string;
  group: 'konto' | 'abo' | 'gespraeche' | 'spiegel_akte' | 'coach_notizen' | 'sicherheit_support' | 'lernbasis';
  filter: Filter;
  /** Stabile Sortierung für das seitenweise Lesen */
  order: string[];
}

// Alle Tabellen mit Personenbezug (Phase 0 / deletion-check.sql). Neue Tabelle mit user_id,
// source_user_id oder conversation_id → hier eintragen oder in EXCLUDED_TABLES begründen.
export const EXPORT_TABLES: ExportTable[] = [
  { table: 'profiles',            group: 'konto',              filter: 'id',              order: ['id'] },
  { table: 'mfa_recovery_codes',  group: 'konto',              filter: 'user_id',         order: ['created_at', 'id'] },   // ohne code_hash
  { table: 'subscriptions',         group: 'abo',                filter: 'user_id',         order: ['user_id'] },
  { table: 'message_quota_periods', group: 'abo',                filter: 'user_id',         order: ['period_start'] },
  { table: 'message_charges',       group: 'abo',                filter: 'user_id',         order: ['charged_at', 'client_message_id'] },
  { table: 'conversations',       group: 'gespraeche',         filter: 'user_id',         order: ['created_at', 'id'] },
  { table: 'messages',            group: 'gespraeche',         filter: 'conversation_id', order: ['created_at', 'id'] },
  { table: 'insights',            group: 'spiegel_akte',       filter: 'user_id',         order: ['created_at', 'id'] },
  { table: 'coach_file_entries',  group: 'spiegel_akte',       filter: 'user_id',         order: ['id'] },
  { table: 'coachee_profile',     group: 'spiegel_akte',       filter: 'user_id',         order: ['id'] },
  { table: 'user_memory',         group: 'spiegel_akte',       filter: 'user_id',         order: ['id'] },
  { table: 'pattern_references',  group: 'spiegel_akte',       filter: 'user_id',         order: ['id'] },
  { table: 'inner_voices',        group: 'spiegel_akte',       filter: 'user_id',         order: ['id'] },
  { table: 'session_notes',       group: 'coach_notizen',      filter: 'user_id',         order: ['id'] },
  { table: 'resonance_map',       group: 'coach_notizen',      filter: 'user_id',         order: ['id'] },
  { table: 'coach_reflections',   group: 'coach_notizen',      filter: 'conversation_id', order: ['id'] },
  { table: 'crisis_events',       group: 'sicherheit_support', filter: 'user_id',         order: ['id'] },
  { table: 'user_feedback',       group: 'sicherheit_support', filter: 'user_id',         order: ['id'] },
  { table: 'feedback_surveys',    group: 'sicherheit_support', filter: 'user_id',         order: ['id'] },
  { table: 'app_logs',            group: 'sicherheit_support', filter: 'user_id',         order: ['id'] },
  { table: 'rate_limit_counters', group: 'sicherheit_support', filter: 'user_id',         order: ['bucket', 'window_start'] },
  { table: 'experience_patterns', group: 'lernbasis',          filter: 'source_user_id',  order: ['id'] },
];

/** Bewusst nicht (vollständig) im Export – mit Begründung (Abschlussbericht). */
export const EXCLUDED_TABLES: Record<string, string> = {
  conversation_context: 'Enthält Erfahrungen anderer Menschen (RAG-Treffer); nur als „vorhanden“ je Gespräch aufgeführt.',
  supervision_logs: 'Wochen-Zähler und allgemeine Empfehlungen ohne Personenbezug.',
  security_alerts: 'Zusammengefasste Alarme ohne Bezug zu einzelnen Personen.',
  invite_codes: 'Einladungscodes ohne Bezug zu einzelnen Personen.',
  book_passages: 'Kuratierte Stellen aus dem Buch „Friedensstifter“, keine Nutzerdaten.',
  stripe_events: 'Technische Ereignis-IDs von Stripe zur Vermeidung doppelter Verarbeitung, ohne Bezug zu einzelnen Personen.',
};

// Spalten, die nie in die Datei gehören: Vektoren, Hashes, IDs anderer Menschen
const DROP_COLUMNS = new Set(['embedding', 'code_hash', 'invited_by']);

const GROUP_INFO: Record<string, string> = {
  konto: 'Dein Konto: E-Mail-Adresse, Anlage- und Anmeldezeitpunkte, eingerichtete zweite Faktoren (ohne Geheimnisse), wann Wiederherstellungscodes erzeugt und verwendet wurden (ohne die Codes) und dein Profil mit Einwilligungen.',
  abo: 'Dein Abo, falls du eines hast: Stufe, Laufzeit, Status und Daten, die Kennungen bei Stripe, deine Monatskontingente und wann eine Nachricht gezählt wurde (ohne Inhalte). Rechnungen und Zahlungsdaten liegen bei Stripe.',
  gespraeche: 'Alle deine Gespräche mit dem Coach, mit jeder Nachricht von dir und vom Coach.',
  spiegel_akte: 'Was im Spiegel steht und was der Coach sich über dich merkt: Erkenntnisse, Akte-Einträge, Personenprofil, erkannte Muster und Innere Stimmen.',
  coach_notizen: 'Die Notizen, die der Coach im Hintergrund führt: Gesprächsnotizen, Resonanzkarte und seine Selbstreflexion zu deinen Gesprächen.',
  sicherheit_support: 'Krisenhinweise aus Gesprächen (inklusive interner Notizen), dein Feedback, Fragebögen, technische Protokolle mit Bezug zu deinem Konto und Zähler der Nutzungsgrenzen.',
  lernbasis: 'Anonymisierte Beiträge aus deinen Gesprächen zur gemeinsamen Lernbasis (nur mit deiner Einwilligung), ohne technische Vektoren.',
  hinweise: 'Für einzelne Gespräche hat der Coach anonyme Erfahrungen anderer Menschen hinzugezogen. Diese gehören nicht zu deinen Daten und sind deshalb nur als „vorhanden“ aufgeführt.',
};

class TableError extends Error {
  constructor(public table: string, public code: string) { super(code); }
}

// deno-lint-ignore no-explicit-any
type Admin = any;
type Row = Record<string, unknown>;

function clean(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) if (!DROP_COLUMNS.has(k)) out[k] = v;
  return out;
}

async function readAll(admin: Admin, t: ExportTable, column: string, value: string | string[]): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = admin.from(t.table).select('*');
    q = Array.isArray(value) ? q.in(column, value) : q.eq(column, value);
    for (const o of t.order) q = q.order(o, { ascending: true });
    const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
    if (error) throw new TableError(t.table, error.code ?? 'unknown');
    rows.push(...(data ?? []).map(clean));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function readTable(admin: Admin, t: ExportTable, uid: string, convIds: string[]): Promise<Row[]> {
  if (t.filter !== 'conversation_id') return readAll(admin, t, t.filter, uid);
  const rows: Row[] = [];
  for (let i = 0; i < convIds.length; i += IN_CHUNK) {
    rows.push(...await readAll(admin, t, 'conversation_id', convIds.slice(i, i + IN_CHUNK)));
  }
  return rows;
}

function berlinDate(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(d);   // JJJJ-MM-TT
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

  let logger = createLogger('export-my-data');
  try {
    const ctx = await requireUser(req);
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
    const uid = ctx.user.id;
    const admin = ctx.admin;
    logger = createLogger('export-my-data', undefined, uid);

    await enforceRateLimit(admin, uid, RATE_LIMITS.export, logger, false);   // fail-closed

    // Konto: nur ausgewählte Felder aus auth.users, Faktoren ohne IDs und Geheimnisse
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(uid);
    if (authError || !authData?.user) throw new TableError('auth.users', authError?.code ?? 'not_found');
    const authUser = authData.user;
    const { data: factorData, error: factorError } = await admin.auth.admin.mfa.listFactors({ userId: uid });
    if (factorError) throw new TableError('auth.mfa_factors', factorError.code ?? 'unknown');
    // deno-lint-ignore no-explicit-any
    const factors = (factorData?.factors ?? []).map((f: any) => ({
      friendly_name: f.friendly_name ?? null, factor_type: f.factor_type, status: f.status, created_at: f.created_at,
    }));

    // Eigene Gesprächs-IDs (Grundlage für messages, coach_reflections, Hinweise)
    const conversationsTable = EXPORT_TABLES.find((t) => t.table === 'conversations')!;
    const conversations = await readAll(admin, conversationsTable, 'user_id', uid);
    const convIds = conversations.map((c) => String(c.id));

    const groups: Record<string, Record<string, unknown>> = {
      konto: {
        auth: {
          email: authUser.email ?? null,
          created_at: authUser.created_at ?? null,
          last_sign_in_at: authUser.last_sign_in_at ?? null,
        },
        zweite_faktoren: factors,
      },
      abo: {}, gespraeche: {}, spiegel_akte: {}, coach_notizen: {}, sicherheit_support: {}, lernbasis: {},
    };

    let rowCount = 1 + factors.length;
    for (const t of EXPORT_TABLES) {
      const rows = t.table === 'conversations' ? conversations : await readTable(admin, t, uid, convIds);
      groups[t.group][t.table] = rows;
      rowCount += rows.length;
    }

    // conversation_context: nur „vorhanden“ – Inhalt stammt aus Erfahrungen anderer Menschen
    const withContext: string[] = [];
    for (let i = 0; i < convIds.length; i += IN_CHUNK) {
      const { data, error } = await admin.from('conversation_context').select('conversation_id')
        .eq('user_id', uid).in('conversation_id', convIds.slice(i, i + IN_CHUNK));
      if (error) throw new TableError('conversation_context', error.code ?? 'unknown');
      withContext.push(...(data ?? []).map((r: Row) => String(r.conversation_id)));
    }

    const now = new Date();
    const body = {
      _erklaerung: {
        was_ist_das: 'Diese Datei enthält alles, was Friedensstifter über dich gespeichert hat (Auskunft nach Art. 15 DSGVO, maschinenlesbar nach Art. 20 DSGVO).',
        gruppen: GROUP_INFO,
        nicht_enthalten: 'Technische Vektoren (Embeddings), Hashes, IDs anderer Menschen und die Erfahrungen anderer Menschen, die der Coach anonym hinzugezogen hat.',
        verantwortlich: 'Jerome Houboi, Damer Str. 41, 41372 Niederkrüchten',
        kontakt: 'jerome@houboi.de',
      },
      erstellt_am: now.toISOString(),
      ...groups,
      hinweise: {
        ergaenzende_erfahrungen: withContext.map((id) => ({ conversation_id: id, vorhanden: true })),
      },
    };

    const tableCount = EXPORT_TABLES.length + 3;   // + auth.users, auth.mfa_factors, conversation_context
    logger.info('export_created', { tables: tableCount, rows: rowCount });   // überwacht S-22

    // Bestätigung an die eigene Adresse – ohne Inhalte; Download wartet nicht darauf
    if (authUser.email) {
      const mail = sendMail(authUser.email, 'Dein Datenexport wurde erstellt',
        'Hallo,\n\nfür dein Friedensstifter-Konto wurde gerade ein Datenexport erstellt und heruntergeladen.\n\n' +
        'Warst du das nicht? Antworte auf diese Mail, dann schauen wir gemeinsam darauf.\n\nFriedensstifter')
        .then((r) => { if (!r.ok) logger.warn('export_mail_failed', { code: r.code ?? 'unknown' }); })
        .catch((e) => logger.warn('export_mail_failed', describeError(e)));
      // deno-lint-ignore no-explicit-any
      const runtime = (globalThis as any).EdgeRuntime;
      if (runtime?.waitUntil) runtime.waitUntil(mail); else await mail;
    }

    return new Response(JSON.stringify(body, null, 2), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="friedensstifter-export-${berlinDate(now)}.json"`,
        'Cache-Control': 'no-store',
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    });
  } catch (error: unknown) {
    if (error instanceof RateLimitError) return rateLimitResponse(error, CORS_HEADERS);
    if (error instanceof TableError) {
      logger.error('export_incomplete', { table: error.table, code: error.code });   // überwacht S-22
      return jsonResponse({ error: 'export_incomplete' }, CORS_HEADERS, 500);
    }
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('export_failed', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
