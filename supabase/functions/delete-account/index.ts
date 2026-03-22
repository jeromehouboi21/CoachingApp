// supabase/functions/delete-account/index.ts
// Löscht alle Nutzerdaten und den Auth-Account.
// Benötigt service_role — der anon-Key hat keine DELETE-Rechte auf auth.users.

import { createClient } from 'npm:@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Auth-Token prüfen
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // User aus Token extrahieren (service_role für auth.admin Zugriff)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Alle user-eigenen Daten löschen (das meiste ist durch ON DELETE CASCADE abgedeckt,
    // aber wir löschen explizit um sicher zu gehen)
    await Promise.all([
      supabase.from('messages').delete().in(
        'conversation_id',
        supabase.from('conversations').select('id').eq('user_id', userId)
      ),
      supabase.from('insights').delete().eq('user_id', userId),
      supabase.from('pattern_references').delete().eq('user_id', userId),
      supabase.from('user_feedback').delete().eq('user_id', userId),
      supabase.from('coach_file_entries').delete().eq('user_id', userId),
      supabase.from('coachee_profile').delete().eq('user_id', userId),
      supabase.from('session_notes').delete().eq('user_id', userId),
      supabase.from('resonance_map').delete().eq('user_id', userId),
      supabase.from('user_memory').delete().eq('user_id', userId),
    ]);

    // Gespräche löschen (Nachrichten sind bereits weg)
    await supabase.from('conversations').delete().eq('user_id', userId);

    // Profil löschen
    await supabase.from('profiles').delete().eq('id', userId);

    // Auth-User löschen — erfordert service_role
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError.message);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('delete-account error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
