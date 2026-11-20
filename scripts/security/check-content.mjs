// scripts/security/check-content.mjs — Build-Prüfung der Sicherheitsseite (Paket K, W2)
// Läuft im postbuild nach check-build.mjs. Bricht ab (Exit 1), wenn ein angezeigter Eintrag
// ('live') einen Platzhalter ([ oder <) oder keinen Beleg enthält. Grundregel Konzept 4.1:
// nur zeigen, was nachweisbar umgesetzt ist.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const file = resolve('src/content/securityMeasures.js');
const { SECURITY_MEASURES, SECURITY_HONESTY, SECURITY_GROUPS } = await import(pathToFileURL(file).href);

const problems = [];
const groups = new Set(SECURITY_GROUPS.map((g) => g.key));
const STATUSES = new Set(['live', 'geplant', 'text_offen']);

for (const m of SECURITY_MEASURES) {
  if (!STATUSES.has(m.status)) problems.push(`${m.id}: unbekannter Status „${m.status}“`);
  if (!groups.has(m.group)) problems.push(`${m.id}: unbekannte Gruppe „${m.group}“`);
  if (m.status !== 'live') continue;
  if (/[[<]/.test(m.text ?? '')) problems.push(`${m.id}: Platzhalter im angezeigten Text`);
  if (!m.evidence || !String(m.evidence).trim()) problems.push(`${m.id}: kein Beleg`);
  if (/[[<]/.test(m.evidence ?? '')) problems.push(`${m.id}: Beleg ist noch ein Platzhalter`);
}
for (const h of SECURITY_HONESTY) {
  if (h.status === 'live' && /[[<]/.test(h.text ?? '')) problems.push('Block „Was du wissen solltest“: Platzhalter im angezeigten Text');
}

// ── Rechtstexte des Einstiegs (Paket K, W3 = R-1) ──────────────────────────
// Produktion nur mit freigegebenen Texten; freigegebene Texte ohne offene [Stellen].
const legal = await import(pathToFileURL(resolve('src/content/legalTexts.js')).href);
const isProduction = process.env.VERCEL_ENV === 'production';
if (isProduction && legal.LEGAL_TEXTS_APPROVED !== true) {
  problems.push('Rechtstexte v2.0 nicht freigegeben (LEGAL_TEXTS_APPROVED in src/content/legalTexts.js)');
}
if (legal.LEGAL_TEXTS_APPROVED === true) {
  const open = legal.allLegalStrings().filter((t) => /\[/.test(t ?? '')).length;
  if (open) problems.push(`Rechtstexte freigegeben, aber ${open} Stelle(n) noch in [eckigen Klammern]`);
}
if (!isProduction && legal.LEGAL_TEXTS_APPROVED !== true) {
  console.log('• Rechtstexte v2.0: Entwurf (nur Vorschau-Builds, Produktion gesperrt)');
}

const live = SECURITY_MEASURES.filter((m) => m.status === 'live').length;
if (problems.length) {
  console.error(`✖ Inhaltsprüfung (Sicherheitsseite, Rechtstexte): ${problems.length} Problem(e)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✓ Sicherheitsseite: ${live} angezeigte Aussagen, alle mit Beleg, keine Platzhalter`);
