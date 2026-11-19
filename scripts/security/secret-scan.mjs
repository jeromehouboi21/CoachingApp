// scripts/security/secret-scan.mjs — Secret-Scan über die gesamte Git-Historie (S-05, Paket C)
//
// Aufruf: npm run security:secrets
// Voraussetzung: gitleaks im PATH (Windows: winget install Gitleaks.Gitleaks) oder GITLEAKS_BIN.
//
// Ausgaberegel: je Fund NUR Regel, Datei, Commit (kurz), Zeile, Datum – nie der Wert, auch nicht gekürzt.
// Der JSON-Report liegt nur kurz im OS-Temp-Verzeichnis und wird in finally gelöscht.
// JWTs mit role 'anon' (öffentlicher anon-Key) und Supabase-Keys sb_publishable_… gelten nicht als Fund.
// Exit-Code 1 bei mindestens einem Fund oder wenn der Scan nicht laufen konnte (kein stilles Scheitern).

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BIN = process.env.GITLEAKS_BIN || 'gitleaks';
const PUBLISHABLE_RE = /^sb_publishable_[A-Za-z0-9_-]+$/;
const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g;

function jwtRoles(text) {
  const roles = [];
  for (const m of String(text ?? '').matchAll(JWT_RE)) {
    try {
      const payload = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
      roles.push(typeof payload?.role === 'string' ? payload.role : 'unknown');
    } catch {
      roles.push('unknown');
    }
  }
  return roles;
}

function runGitleaks(reportPath) {
  const common = ['--config', '.gitleaks.toml', '--report-format', 'json', '--report-path', reportPath,
    '--exit-code', '0', '--no-banner', '--log-level', 'error'];
  // gitleaks ≥ 8.19: "gitleaks git <repo>", ältere Versionen: "gitleaks detect --source <repo>"
  let res = spawnSync(BIN, ['git', '.', ...common], { encoding: 'utf8' });
  if (res.status !== 0 && /unknown command/i.test(`${res.stderr}${res.stdout}`)) {
    res = spawnSync(BIN, ['detect', '--source', '.', ...common], { encoding: 'utf8' });
  }
  return res;
}

const dir = mkdtempSync(join(tmpdir(), 'fs-secret-scan-'));
const reportPath = join(dir, 'report.json');
let exitCode = 0;

try {
  const res = runGitleaks(reportPath);
  if (res.error) {
    console.error(`gitleaks nicht gefunden oder nicht startbar (${res.error.code ?? 'error'}).`);
    console.error('Installieren: winget install Gitleaks.Gitleaks  ·  oder GITLEAKS_BIN setzen.');
    exitCode = 1;
  } else if (res.status !== 0 || !existsSync(reportPath)) {
    // stderr kann Fundstellen enthalten → nicht ausgeben, nur den Status
    console.error(`gitleaks ist mit Status ${res.status} abgebrochen. Scan nicht vollständig.`);
    exitCode = 1;
  } else {
    const raw = readFileSync(reportPath, 'utf8').trim();
    const findings = raw ? JSON.parse(raw) : [];
    let publicAnon = 0;
    const real = [];
    for (const f of findings) {
      const roles = jwtRoles(`${f.Secret ?? ''} ${f.Match ?? ''}`);
      if (roles.length > 0 && roles.every((r) => r === 'anon')) { publicAnon++; continue; }
      if (PUBLISHABLE_RE.test(String(f.Secret ?? '').trim())) { publicAnon++; continue; }
      real.push({
        regel: f.RuleID,
        datei: f.File,
        commit: String(f.Commit ?? '').slice(0, 8),
        zeile: f.StartLine,
        datum: String(f.Date ?? '').slice(0, 10),
        ...(roles.length > 0 ? { jwtRolle: roles.join(',') } : {}),
      });
    }

    console.log(`Secret-Scan über die gesamte Historie: ${findings.length} Treffer von gitleaks`);
    console.log(`  davon öffentlich (anon-/publishable-Key): ${publicAnon}`);
    console.log(`  Funde: ${real.length}`);
    if (real.length > 0) {
      console.table(real);
      console.log('\nJeder Fund: Schlüssel in der jeweiligen Konsole rotieren und neu setzen (Entscheidung C-7).');
      console.log('Die Werte werden hier bewusst nicht angezeigt. Zum Nachsehen: git show <commit>:<datei>.');
      exitCode = 1;
    } else {
      console.log('Keine Secrets gefunden.');
    }
  }
} catch (err) {
  // Keine Fehlermeldung ausgeben: JSON.parse-Meldungen enthalten Textausschnitte des Reports
  console.error(`Auswertung fehlgeschlagen (${err?.name ?? 'Error'}).`);
  exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}

process.exit(exitCode);
