// scripts/share-zip.mjs — ZIP zum Teilen (z. B. in Chats) nur aus eingecheckten Dateien (S-05, Paket C)
//
// Aufruf: npm run share:zip  →  ../friedensstifter-share-JJJJ-MM-TT.zip
// git archive nimmt nur den letzten Commit (HEAD). Lokale Dateien wie .env*, .env.security.local,
// Audit-Ergebnisse, CSV- oder HAR-Exporte kommen nie hinein (zusätzlich export-ignore in .gitattributes).

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const date = new Date().toISOString().slice(0, 10);
const target = resolve('..', `friedensstifter-share-${date}.zip`);

try {
  const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
  if (dirty) {
    console.warn('Hinweis: Nicht committete Änderungen sind nicht im ZIP.');
  }
  execFileSync('git', ['archive', '--format=zip', '-o', target, 'HEAD'], { stdio: 'inherit' });
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  console.log(`ZIP erstellt: ${target} (Stand ${head})`);
} catch (err) {
  console.error(`ZIP konnte nicht erstellt werden (${err?.status ?? err?.code ?? 'error'}).`);
  process.exit(1);
}
