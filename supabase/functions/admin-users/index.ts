// supabase/functions/admin-users/index.ts
// Admin-Nutzerverwaltung: Beta-Tester-Status & individuelle Gesprächslimits.
// Absicherung passiert HIER serverseitig (is_admin-Prüfung) — ein versteckter
// Frontend-Screen allein wäre kein Zugriffsschutz.

import { createClient } from 'npm:@supabase/supabase-js';
import { createLogger } from '../_shared/logger.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const logger = createLogger('admin-users');

  // Gleiches Auth-Muster wie in chat/index.ts: Bearer-Token extrahieren,
  // Service-Role-Client mit dem Nutzer-Token initialisieren, Identität prüfen.
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Client 1: NUR für die Identitätsprüfung — mit dem Nutzer-Token. PostgREST
  // bestimmt die effektive DB-Rolle über den Authorization-Header, nicht über
  // den API-Key — mit dem Nutzer-Token liefe dieser Client sonst unter der
  // "authenticated"-Rolle der aufrufenden Person, nicht als service_role.
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );

  const { data: { user: caller }, error: authError } = await callerClient.auth.getUser(token);
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Client 2: echter Service-Role-Client, OHNE Nutzer-Token — umgeht RLS
  // wirklich. Alle Admin-Abfragen/-Änderungen laufen über diesen Client.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  // Kernprüfung: nur Admins kommen hier weiter.
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', caller.id)
    .single();

  if (!callerProfile?.is_admin) {
    logger.warn('Forbidden — non-admin attempted admin-users access', { userId: caller.id });
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    if (req.method === 'GET') {
      // Alle Profile laden ...
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, plan, is_beta_tester, session_limit, sessions_used_this_month, created_at, invited_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        logger.error('profiles list failed', { error: profilesError.message });
        return new Response(JSON.stringify({ error: profilesError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      // ... und mit E-Mail-Adressen aus auth.users zusammenführen.
      // profiles selbst speichert keine E-Mail — das liegt in Supabase's
      // geschütztem auth-Schema, nur über die Admin-API erreichbar.
      const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();
      if (authListError) {
        logger.error('auth.admin.listUsers failed', { error: authListError.message });
      }
      const authById = new Map(
        (authUsers?.users ?? []).map((u: any) => [u.id, { email: u.email, lastSignInAt: u.last_sign_in_at }])
      );

      const merged = (profiles ?? []).map((p: any) => ({
        ...p,
        email: authById.get(p.id)?.email ?? null,
        last_sign_in_at: authById.get(p.id)?.lastSignInAt ?? null,
      }));

      logger.info('Admin fetched user list', { adminId: caller.id, count: merged.length });
      return new Response(JSON.stringify({ users: merged }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    if (req.method === 'PATCH') {
      const { userId, is_beta_tester, session_limit } = await req.json();
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId fehlt' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const patch: Record<string, unknown> = {};
      if (typeof is_beta_tester === 'boolean') patch.is_beta_tester = is_beta_tester;
      if (session_limit === null || typeof session_limit === 'number') patch.session_limit = session_limit;

      if (Object.keys(patch).length === 0) {
        return new Response(JSON.stringify({ error: 'Keine gültigen Felder übergeben' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId);

      if (updateError) {
        logger.error('profile update failed', { error: updateError.message, targetUserId: userId });
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }

      logger.info('Admin updated user profile', { adminId: caller.id, targetUserId: userId, patch });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('admin-users failed', { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
