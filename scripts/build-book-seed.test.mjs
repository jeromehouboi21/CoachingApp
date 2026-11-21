// Test für das Seed-Skript (Handoff B1 6.2). Läuft mit `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLandkarte, validateEntries, readPatternKeys, buildSeedSql } from './build-book-seed.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const md = readFileSync(resolve(root, 'docs/buch/buch-landkarte-v1.md'), 'utf8')
const keys = readPatternKeys(readFileSync(resolve(root, 'src/lib/patterns.js'), 'utf8'))
const entries = parseLandkarte(md)
const byId = Object.fromEntries(entries.map((e) => [e.id, e]))

test('Landkarte: 58 Einträge, alle Pflichtprüfungen bestanden', () => {
  assert.equal(entries.length, 58)
  assert.doesNotThrow(() => validateEntries(entries, keys))
})

test('Stichproben', () => {
  assert.equal(byId['T4-D2'].key_quote, 'Ich bin nur was wert, wenn ich’s draufhab')
  assert.match(byId['T1-D1'].bridge_question, /Danach:/)
  assert.equal(byId['T5-D2'].is_sensitive, true)
  assert.ok(byId['T5-D2'].sensitive_rule)
  assert.equal(byId['T7-D5'].is_resolution, true)
  assert.equal(byId['DD-1'].position, 6)
  assert.equal(byId['DD-1'].part_title, 'Davor und danach')
  assert.equal(byId['EP-3'].part_title, 'Epilog')
  assert.equal(byId['T3-D1'].season_label, 'erster Frost')
  assert.equal(byId['V-1'].position, 0)
})

test('Muster, Mechanismen, Themen, Fragen aus dem Buch', () => {
  assert.deepEqual(byId['T4-D2'].pattern_keys, ['innerer_kritiker', 'perfektionismus_blockade'])
  assert.deepEqual(byId['T4-D2'].mechanisms, ['glaubenssatz'])
  assert.deepEqual(byId['T4-D2'].themes, ['Selbstwert', 'Leistung', 'Kindheit'])
  // „Kette“ steht in derselben Zeile wie die Mechanismen und wird nicht übernommen
  assert.deepEqual(byId['T1-E'].mechanisms, ['gesagt_ist_nicht_gehoert', 'beteiligt_statt_schuld'])
  assert.equal(byId['T3-E'].book_questions.length, 2)
  assert.equal(byId['T3-E'].book_questions[0], 'Woher wusstest du, was er braucht?')
  assert.equal(byId['T4-D2'].coach_note?.startsWith('Mara fragt hier erst um Erlaubnis'), true)
  // Markdown-Hervorhebung entfernt, Inhalt bleibt
  assert.doesNotMatch(byId['T1-D1'].bridge_question, /\*/)
})

test('SQL: alle Einträge, Upsert, Freigabedatum', () => {
  const sql = buildSeedSql(entries, '2026-11-21', 'docs/buch/buch-landkarte-v1.md')
  assert.equal((sql.match(/^ {2}\(\$bp\$/gm) ?? []).length, 58)
  assert.match(sql, /on conflict \(id\) do update set/)
  assert.match(sql, /'2026-11-21'::timestamptz/)
  assert.throws(() => buildSeedSql(entries, 'gestern', 'x'))
})

test('kaputte Kopie (Eintrag ohne Kernsatz) bricht ab', () => {
  const broken = md.replace(/^- \*\*Kernsatz:\*\* „Du hast mehr Einfluss, als du glaubst\."\r?\n/m, '')
  assert.notEqual(broken, md)
  assert.throws(() => validateEntries(parseLandkarte(broken), keys), /Kernsatz fehlt/)
})

test('unbekannter Muster-Schlüssel bricht ab', () => {
  const broken = md.replace('**Muster:** `innerer_kritiker` · `perfektionismus_blockade`', '**Muster:** `gibt_es_nicht`')
  assert.throws(() => validateEntries(parseLandkarte(broken), keys), /unbekannter Muster-Schlüssel/)
})
