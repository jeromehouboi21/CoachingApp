#!/usr/bin/env node
// B1: erzeugt die Seed-Migration für public.book_passages aus der freigegebenen Buch-Landkarte.
// Aufruf:
//   node scripts/build-book-seed.mjs docs/buch/buch-landkarte-v1.md --approved-at 2026-11-21 \
//     > supabase/migrations/046_b1_book_passages_seed.sql
// Ohne Abhängigkeiten. Bricht bei jeder Pflichtprüfung mit Fehler ab und gibt dann nichts aus.
// Die Ausgabe enthält Buchtexte, wird aber nie geloggt (nur Zähler auf stderr).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const EXPECTED = { total: 58, dialog: 28, erklaerung: 13, jerome: 17, sensitive: 8, resolution: 8 }
const ID_RE = /^(V-\d|T[1-7]-(D\d|E\d?|J\d?)|DD-\d|EP-\d)$/
const ENTRY_RE = /^\*\*([A-Z0-9-]+) · (.+?)\*\*(.*?)— `(dialog|erklaerung|jerome)` · Pos\. (\d)\s*$/
const FIELD_RE = /^- \*\*([^*:]+):\*\*\s*(.*)$/
const KNOWN_FIELDS = new Set([
  'Situation', 'Inhalt', 'Kernsatz', 'Muster', 'Mechanismen', 'Passt, wenn', 'Brückenfrage',
  'Fragen aus dem Buch', 'Hinweis', 'Sonderregel', 'Kette',
])

/** Die fünf Muster-Schlüssel der App aus src/lib/patterns.js (eine Quelle). */
export function readPatternKeys(patternsSource) {
  const keys = [...patternsSource.matchAll(/key:\s*'([a-z_]+)'/g)].map((m) => m[1])
  if (keys.length === 0) throw new Error('keine Muster-Schlüssel in src/lib/patterns.js gefunden')
  return new Set(keys)
}

/** Markdown-Hervorhebungen entfernen, typografische Zeichen unverändert lassen. */
function clean(s) {
  return s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim()
}

/** Äußere Anführungszeichen („ … “ bzw. " … ") entfernen, das Innere unverändert. */
function stripOuterQuotes(s) {
  let t = s.trim()
  if (/^[„"“]/.test(t)) t = t.slice(1)
  if (/["“”]$/.test(t)) t = t.slice(0, -1)
  return t.trim()
}

function backtickTokens(s) {
  return [...(s ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1])
}

function section(name, line) {
  if (line === '## Vorweg') return { position: 0, part_title: 'Vorweg', season_label: null }
  if (line === '## Davor und danach (Jerome)') return { position: 6, part_title: 'Davor und danach', season_label: null }
  if (line === '## Epilog') return { position: 8, part_title: 'Epilog', season_label: null }
  const m = line.match(/^## Teil ([1-7]) – (.+?) \((.+)\)$/)
  if (m) return { position: Number(m[1]), part_title: m[2], season_label: m[3] }
  throw new Error(`unbekannter Abschnitt: ${name}`)
}

/** Zerlegt die Zeile „Muster · Mechanismen · Themen · Kette“. */
function parseTagLine(text) {
  const grab = (label, next) => {
    const re = new RegExp(`\\*\\*${label}:\\*\\*(.*?)(?=${next.map((n) => `\\*\\*${n}:\\*\\*`).join('|')}|$)`)
    return text.match(re)?.[1] ?? null
  }
  const muster = grab('Muster', ['Mechanismen', 'Themen', 'Kette'])
  const mech = grab('Mechanismen', ['Themen', 'Kette'])
  const themes = grab('Themen', ['Kette'])
  return {
    pattern_keys: backtickTokens(muster),
    mechanisms: backtickTokens(mech),
    themes: themes
      ? themes.replace(/·\s*$/, '').split(',').map((t) => clean(t).replace(/·$/, '').trim()).filter(Boolean)
      : [],
  }
}

/** Liest alle Einträge aus der Landkarte. */
export function parseLandkarte(markdown) {
  const lines = markdown.split(/\r?\n/)
  const entries = []
  let sec = null
  let cur = null
  let active = false
  const finish = () => { if (cur) { entries.push(cur); cur = null } }

  for (const [i, raw] of lines.entries()) {
    const line = raw.trimEnd()
    if (line.startsWith('## ')) {
      finish()
      if (line === '## Vorweg') active = true
      if (line === '## Hinweise für die Umsetzung') active = false
      if (active) sec = section(`Z. ${i + 1}`, line)
      continue
    }
    if (!active) continue
    const head = line.match(ENTRY_RE)
    if (head) {
      finish()
      const [, id, title, marks, kind, pos] = head
      cur = {
        id, kind, position: Number(pos), section: sec,
        part_title: sec.part_title, season_label: sec.season_label,
        title: clean(title),
        situation_summary: null, key_quote: null, bridge_question: null, fits_when: null,
        book_questions: [], pattern_keys: [], mechanisms: [], themes: [], coach_note: null,
        is_resolution: marks.includes('🔒'), is_sensitive: marks.includes('⚠'), sensitive_rule: null,
      }
      continue
    }
    if (line === '' || line === '---') continue
    if (!cur) throw new Error(`Z. ${i + 1}: Text außerhalb eines Eintrags`)
    const f = line.match(FIELD_RE)
    if (!f) throw new Error(`Z. ${i + 1} (${cur.id}): unbekanntes Zeilenformat`)
    const [, name, value] = f
    if (!KNOWN_FIELDS.has(name)) throw new Error(`Z. ${i + 1} (${cur.id}): unbekanntes Feld „${name}“`)
    switch (name) {
      case 'Situation':
      case 'Inhalt':
        if (cur.situation_summary) throw new Error(`${cur.id}: Situation/Inhalt doppelt`)
        cur.situation_summary = clean(value); break
      case 'Kernsatz': cur.key_quote = stripOuterQuotes(clean(value)); break
      case 'Muster':
      case 'Mechanismen':
        Object.assign(cur, parseTagLine(line)); break
      case 'Passt, wenn': cur.fits_when = clean(value); break
      case 'Brückenfrage': cur.bridge_question = clean(value); break
      case 'Fragen aus dem Buch':
        cur.book_questions = clean(value).split(/["“”]\s*·\s*„/).map(stripOuterQuotes).filter(Boolean); break
      case 'Hinweis': cur.coach_note = clean(value); break
      case 'Sonderregel': cur.sensitive_rule = clean(value); break
      case 'Kette': break
    }
  }
  finish()
  return entries
}

/** Pflichtprüfungen (Handoff B1 3.2). Wirft beim ersten Verstoß. */
export function validateEntries(entries, patternKeys) {
  const count = (pred) => entries.filter(pred).length
  const want = (label, got, exp) => { if (got !== exp) throw new Error(`${label}: ${got} statt ${exp}`) }
  want('Einträge', entries.length, EXPECTED.total)
  want('dialog', count((e) => e.kind === 'dialog'), EXPECTED.dialog)
  want('erklaerung', count((e) => e.kind === 'erklaerung'), EXPECTED.erklaerung)
  want('jerome', count((e) => e.kind === 'jerome'), EXPECTED.jerome)
  want('⚠', count((e) => e.is_sensitive), EXPECTED.sensitive)
  want('🔒', count((e) => e.is_resolution), EXPECTED.resolution)
  const seen = new Set()
  for (const e of entries) {
    if (!ID_RE.test(e.id)) throw new Error(`ungültige Kennung ${e.id}`)
    if (seen.has(e.id)) throw new Error(`Kennung doppelt: ${e.id}`)
    seen.add(e.id)
    if (e.position !== e.section.position) throw new Error(`${e.id}: Position ${e.position} passt nicht zum Abschnitt (${e.section.position})`)
    if (!e.situation_summary) throw new Error(`${e.id}: Situation/Inhalt fehlt`)
    if (!e.key_quote) throw new Error(`${e.id}: Kernsatz fehlt`)
    if (e.is_sensitive && !e.sensitive_rule) throw new Error(`${e.id}: ⚠ ohne Sonderregel`)
    for (const k of e.pattern_keys) if (!patternKeys.has(k)) throw new Error(`${e.id}: unbekannter Muster-Schlüssel ${k}`)
  }
}

const TAG = '$bp$'
function lit(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  const s = String(v)
  if (s.includes(TAG)) throw new Error('Text enthält das Quoting-Kennzeichen')
  return `${TAG}${s}${TAG}`
}
function arr(a) {
  return a.length === 0 ? `'{}'::text[]` : `array[${a.map(lit).join(', ')}]::text[]`
}

const COLUMNS = ['id', 'kind', 'position', 'part_title', 'season_label', 'title', 'situation_summary',
  'key_quote', 'bridge_question', 'fits_when', 'book_questions', 'pattern_keys', 'mechanisms', 'themes',
  'coach_note', 'is_resolution', 'is_sensitive', 'sensitive_rule', 'is_active', 'approved_by_jerome_at']

/** Erzeugt die Seed-Migration. */
export function buildSeedSql(entries, approvedAt, source) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(approvedAt ?? '')) throw new Error('--approved-at JJJJ-MM-TT fehlt')
  const rows = entries.map((e) => `  (${[
    lit(e.id), lit(e.kind), lit(e.position), lit(e.part_title), lit(e.season_label), lit(e.title),
    lit(e.situation_summary), lit(e.key_quote), lit(e.bridge_question), lit(e.fits_when),
    arr(e.book_questions), arr(e.pattern_keys), arr(e.mechanisms), arr(e.themes), lit(e.coach_note),
    lit(e.is_resolution), lit(e.is_sensitive), lit(e.sensitive_rule), 'true', `'${approvedAt}'::timestamptz`,
  ].join(', ')})`)
  const update = COLUMNS.filter((c) => c !== 'id').map((c) => `  ${c} = excluded.${c}`).join(',\n')
  return [
    `-- B1 Seed: ${entries.length} Stellen aus der freigegebenen Buch-Landkarte (B-8, ${approvedAt})`,
    `-- Erzeugt von scripts/build-book-seed.mjs aus ${source}. Nicht von Hand ändern.`,
    '-- Spätere Änderungen: Landkarte ändern, Skript erneut laufen lassen, NEUE Migration anlegen.',
    '-- Rückgängig machen: delete from public.book_passages;',
    '',
    `insert into public.book_passages (${COLUMNS.join(', ')})`,
    'values',
    rows.join(',\n'),
    'on conflict (id) do update set',
    `${update},`,
    '  updated_at = now();',
    '',
  ].join('\n')
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  try {
    const args = process.argv.slice(2)
    const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--approved-at')
    const approvedAt = args[args.indexOf('--approved-at') + 1]
    if (!file || !args.includes('--approved-at')) throw new Error('Aufruf: build-book-seed.mjs <landkarte.md> --approved-at JJJJ-MM-TT')
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const patternKeys = readPatternKeys(readFileSync(resolve(root, 'src/lib/patterns.js'), 'utf8'))
    const entries = parseLandkarte(readFileSync(resolve(file), 'utf8'))
    validateEntries(entries, patternKeys)
    process.stdout.write(buildSeedSql(entries, approvedAt, file.replace(/\\/g, '/')))
    process.stderr.write(`[build-book-seed] ${entries.length} Einträge, alle Prüfungen bestanden\n`)
  } catch (err) {
    process.stderr.write(`[build-book-seed] Abbruch: ${err.message}\n`)
    process.exit(1)
  }
}
