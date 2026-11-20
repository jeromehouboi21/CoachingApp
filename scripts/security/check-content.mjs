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

// ── Rechtstexte (Paket K, W3 = R-1): Freigabe in drei Stufen ──────────────────
// entwurf: Produktion gesperrt · vorlaeufig: Produktion erlaubt, angezeigte Texte ohne [Klammern],
// Kennzeichnung sichtbar · freigegeben: zusätzlich keine offenen Prüfpunkte (LEGAL_REVIEW_OPEN).
const legal = await import(pathToFileURL(resolve('src/content/legalTexts.js')).href);
const isProduction = process.env.VERCEL_ENV === 'production';
const status = legal.LEGAL_TEXTS_STATUS;
const STATUS_VALUES = ['entwurf', 'vorlaeufig', 'freigegeben'];
if (!STATUS_VALUES.includes(status)) {
  problems.push(`Rechtstexte: unbekannter LEGAL_TEXTS_STATUS „${status}“`);
} else {
  if (isProduction && status === 'entwurf') {
    problems.push('Rechtstexte sind noch Entwurf (LEGAL_TEXTS_STATUS in src/content/legalTexts.js)');
  }
  if (status !== 'entwurf') {
    const open = legal.allLegalStrings().filter((t) => /\[/.test(t ?? '')).length;
    if (open) problems.push(`Rechtstexte „${status}“, aber ${open} Stelle(n) noch in [eckigen Klammern]`);
    if (!String(legal.PRELIMINARY_NOTICE ?? '').trim()) problems.push('Rechtstexte: PRELIMINARY_NOTICE fehlt');
  }
  if (status === 'freigegeben' && (legal.LEGAL_REVIEW_OPEN?.length ?? 0) > 0) {
    problems.push(`Rechtstexte „freigegeben“, aber ${legal.LEGAL_REVIEW_OPEN.length} Prüfpunkt(e) offen (LEGAL_REVIEW_OPEN)`);
  }
  console.log(`• Rechtstexte: ${status}${status !== 'freigegeben' ? `, ${legal.LEGAL_REVIEW_OPEN?.length ?? 0} Prüfpunkt(e) beim Anwalt` : ''}${isProduction ? ' (Produktions-Build)' : ''}`);
}

const live = SECURITY_MEASURES.filter((m) => m.status === 'live').length;
if (problems.length) {
  console.error(`✖ Inhaltsprüfung (Sicherheitsseite, Rechtstexte): ${problems.length} Problem(e)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✓ Sicherheitsseite: ${live} angezeigte Aussagen, alle mit Beleg, keine Platzhalter`);
