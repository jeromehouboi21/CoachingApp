// scripts/security/check-sw.mjs – Build-Prüfung Service Worker und Manifest (Paket P, Regel 0.2)
// Läuft im postbuild. Bricht ab (Exit 1), wenn
//   1. dist/sw.js eine Laufzeit-Route für Supabase, Mistral oder eine andere Fremd-Origin enthält
//      (der Worker darf nur statische Build-Dateien vorhalten, nie API-Antworten oder Nutzerdaten),
//   2. dist/manifest.webmanifest fehlt oder name, start_url, display, ein 192er- und ein 512er-Icon fehlen,
//   3. ein im Manifest genanntes Icon nicht in dist/ liegt.
// Ausgabe nur „OK“ oder der Prüfpunkt, kein Datei-Inhalt.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const problems = [];

// 1. Laufzeit-Routen
const swPath = join(DIST, 'sw.js');
if (!existsSync(swPath)) {
  problems.push('dist/sw.js fehlt');
} else {
  const sw = readFileSync(swPath, 'utf8');
  const forbidden = ['supabase.co', '/rest/v1', '/auth/v1', '/functions/v1', '/storage/v1', 'mistral.ai', 'openai.com', 'anthropic.com'];
  for (const f of forbidden) if (sw.includes(f)) problems.push(`sw.js enthält eine Route bzw. URL mit „${f}“`);
  // Jede registerRoute außer der Navigations-Route auf index.html ist eine Laufzeit-Regel
  const routes = sw.match(/registerRoute\(/g)?.length ?? 0;
  const navRoutes = sw.match(/registerRoute\(new [\w$]+\.NavigationRoute\(/g)?.length ?? 0;
  if (routes - navRoutes > 0) problems.push(`sw.js enthält ${routes - navRoutes} Laufzeit-Route(n) – runtimeCaching muss leer bleiben`);
  if (/https?:\/\/(?!localhost)[a-z0-9.-]+\.[a-z]{2,}/i.test(sw.replace(/https?:\/\/(www\.)?w3\.org[^"'\s]*/g, ''))) {
    problems.push('sw.js enthält eine Fremd-Origin');
  }
}

// 2./3. Manifest und Icons
const mfPath = join(DIST, 'manifest.webmanifest');
if (!existsSync(mfPath)) {
  problems.push('dist/manifest.webmanifest fehlt');
} else {
  let mf = null;
  try { mf = JSON.parse(readFileSync(mfPath, 'utf8')); } catch { problems.push('manifest.webmanifest ist kein gültiges JSON'); }
  if (mf) {
    for (const k of ['name', 'start_url', 'display']) if (!mf[k]) problems.push(`Manifest: „${k}“ fehlt`);
    const icons = Array.isArray(mf.icons) ? mf.icons : [];
    if (!icons.some((i) => String(i.sizes).split(' ').includes('192x192'))) problems.push('Manifest: 192er-Icon fehlt');
    if (!icons.some((i) => String(i.sizes).split(' ').includes('512x512') && String(i.purpose ?? 'any').split(' ').includes('any'))) problems.push('Manifest: 512er-Icon mit purpose any fehlt');
    for (const i of icons) {
      const file = join(DIST, String(i.src ?? '').replace(/^\//, ''));
      if (!i.src || !existsSync(file)) problems.push(`Manifest-Icon fehlt in dist/: ${i.src ?? '(ohne src)'}`);
    }
  }
}

if (problems.length) {
  console.error(`✖ Service Worker/Manifest: ${problems.length} Problem(e)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('✓ Service Worker/Manifest: OK (nur Precache, Manifest vollständig)');
