// supabase/functions/_shared/cors.ts — gemeinsame CORS-Header aller Edge Functions (S-09, Paket C)
//
// x-region erlaubt dem Frontend, die Ausführung fest auf eu-west-1 zu legen (Region der Datenbank) (src/lib/functions.js).
// Ohne diesen Header in Allow-Headers scheitert der Preflight.

const BASE_ALLOWED_HEADERS = ['authorization', 'x-client-info', 'apikey', 'content-type', 'x-region'];

export function corsHeaders(
  methods: string, opts: { extraAllowedHeaders?: string[] } = {},
): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': [...BASE_ALLOWED_HEADERS, ...(opts.extraAllowedHeaders ?? [])].join(', '),
  };
}
