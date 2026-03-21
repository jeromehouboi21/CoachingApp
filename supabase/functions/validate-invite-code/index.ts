// supabase/functions/validate-invite-code/index.ts
// Validiert einen Einladungscode und löst ihn für den Nutzer ein.
// Verwendet service_role, da invite_codes keine SELECT-Policy für Nutzer hat.

import { createClient } from 'npm:@supabase/supabase-js';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // User aus Token ermitteln
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'missing_code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Atomar einlösen via RPC (SECURITY DEFINER)
    const { data, error } = await supabase.rpc('redeem_invite_code', {
      p_code: code.trim().toUpperCase(),
      p_user_id: user.id,
    });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: 'rpc_error', detail: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
