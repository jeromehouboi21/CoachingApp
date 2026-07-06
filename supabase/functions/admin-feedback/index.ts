// supabase/functions/admin-feedback/index.ts
// Admin-geschützte Feedback-Übersicht (inkl. Beta-Feedback aus dem Profil-Modal).
// Zwei-Client-Muster wie in admin-users: ein Client nur für die Identitätsprüfung
// mit dem Nutzer-Token, ein echter Service-Role-Client ohne Nutzer-Token für
// alle eigentlichen Abfragen — sonst läuft die Anfrage versehentlich unter der
// "authenticated"-Rolle statt service_role und RLS lässt nur eigene Zeilen durch.

import { createClient } from 'npm:@supabase/supabase-js';
import { createLogger } from '../_shared/logger.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const logger = createLogger('admin-feedback');

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  // Client 1: NUR zur Identitätsprüfung, mit dem Nutzer-Token.
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

  // Client 2: echter Service-Role-Client, OHNE Nutzer-Token — umgeht RLS wirklich.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', caller.id)
    .single();

  if (!callerProfile?.is_admin) {
    logger.warn('Forbidden — non-admin attempted admin-feedback access', { userId: caller.id });
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const { data: feedback, error: feedbackError } = await supabase
      .from('user_feedback')
      .select('id, user_id, feedback_type, content, context, created_at')
      .order('created_at', { ascending: false });

    if (feedbackError) {
      logger.error('feedback list failed', { error: feedbackError.message });
      return new Response(JSON.stringify({ error: feedbackError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Profile + E-Mail nachladen und zusammenführen (gleiches Muster wie admin-users)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name');
    const { data: authUsers } = await supabase.auth.admin.listUsers();

    const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));
    const emailById = new Map((authUsers?.users ?? []).map((u: any) => [u.id, u.email]));

    const merged = (feedback ?? []).map((f: any) => ({
      ...f,
      display_name: f.user_id ? (nameById.get(f.user_id) ?? null) : null,
      email: f.user_id ? (emailById.get(f.user_id) ?? null) : null,
    }));

    logger.info('Admin fetched feedback list', { adminId: caller.id, count: merged.length });
    return new Response(JSON.stringify({ feedback: merged }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('admin-feedback failed', { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
});
