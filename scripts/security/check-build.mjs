// scripts/security/check-build.mjs — Build-Prüfung auf Schlüssel (S-05, Paket C)
//
// Läuft als "postbuild" automatisch nach "npm run build" – lokal und auf Vercel.
// Findet sich ein Schlüsselmuster oder ein JWT mit einer anderen Rolle als 'anon' in dist/,
// scheitert der Build (Exit 1) und Vercel deployt nicht.
// Ausgabe nur Dateiname + Typ, nie der gefundene Wert.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const DIST = 'dist';
const EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css', '.json', '.map', '.webmanifest', '.txt']);

const PATTERNS = [
  ['anthropic_key', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['openai_key', /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/],
  ['supabase_secret_key', /sb_secret_[A-Za-z0-9_-]{10,}/],
  ['secret_env_name', /\b(SUPABASE_SERVICE_ROLE_KEY|SMTP_PASS|CRON_SECRET|ANTHROPIC_API_KEY|OPENAI_API_KEY|MFA_CODE_PEPPER)\b/],
];
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error('[check-build] dist/ fehlt – Build-Prüfung nicht möglich.');
  process.exit(1);
}

const findings = [];
let mapFiles = 0;
let scanned = 0;

for (const file of walk(DIST)) {
  const ext = extname(file).toLowerCase();
  if (ext === '.map') mapFiles++;
  if (!EXTENSIONS.has(ext)) continue;
  scanned++;
  const text = readFileSync(file, 'utf8');
  const rel = relative(DIST, file);

  for (const [type, re] of PATTERNS) {
    if (re.test(text)) findings.push({ datei: rel, typ: type });
  }
  for (const m of text.matchAll(JWT)) {
    let role = 'unknown';
    try {
      const payload = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
      if (typeof payload?.role === 'string') role = payload.role;
    } catch { /* bleibt unknown */ }
    if (role !== 'anon') findings.push({ datei: rel, typ: 'non_anon_jwt' });
  }
}

if (mapFiles > 0) {
  console.warn(`[check-build] Hinweis: ${mapFiles} Sourcemap-Datei(en) in dist/. Sourcemaps in Produktion vermeiden.`);
}

if (findings.length > 0) {
  console.error(`[check-build] ${findings.length} Fund(e) im Build – Build wird abgebrochen:`);
  console.table(findings);
  process.exit(1);
}

console.log(`[check-build] ${scanned} Dateien in dist/ geprüft – keine Schlüssel gefunden.`);
