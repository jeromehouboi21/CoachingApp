// Unit-Tests für die Buch-Bezüge (Handoff B1 6.1). Läuft mit `npm test` (node --test, Node v24).
// Die Stellen kommen aus der freigegebenen Landkarte über das Seed-Skript (gleiche Quelle wie Migration 046).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLandkarte } from '../../../scripts/build-book-seed.mjs';
import {
  modeAllows, bookPathOpen, eligiblePassages, bookStep, buildSelectionIndex, parseSelection,
  buildBookBlock, buildSelectionTranscript, type Passage,
} from './bookSelection.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ALL: Passage[] = parseLandkarte(readFileSync(resolve(root, 'docs/buch/buch-landkarte-v1.md'), 'utf8'))
  .map((e: Record<string, unknown>) => ({ ...e, is_active: true, approved_by_jerome_at: '2026-11-21' })) as Passage[];
const ids = (ps: Passage[]) => new Set(ps.map((p) => p.id));
const byId = (id: string) => ALL.find((p) => p.id === id) as Passage;

test('modeAllows', () => {
  assert.equal(modeAllows(undefined, true), false);
  assert.equal(modeAllows('off', true), false);
  assert.equal(modeAllows('admin', false), false);
  assert.equal(modeAllows('admin', true), true);
  assert.equal(modeAllows('all', false), true);
});

test('bookPathOpen', () => {
  const ok = { modeAllowed: true, status: 'read' as const, bookBlocked: false, crisisNow: false, ownThreadHigh: false, lastThreadHigh: false };
  assert.equal(bookPathOpen(ok), true);
  assert.equal(bookPathOpen({ ...ok, status: 'not_yet' }), false);
  assert.equal(bookPathOpen({ ...ok, status: null }), false);
  assert.equal(bookPathOpen({ ...ok, bookBlocked: true }), false);
  assert.equal(bookPathOpen({ ...ok, crisisNow: true }), false);
  assert.equal(bookPathOpen({ ...ok, ownThreadHigh: true }), false);
  assert.equal(bookPathOpen({ ...ok, lastThreadHigh: true }), false);
  assert.equal(bookPathOpen({ ...ok, modeAllowed: false }), false);
});

test('eligiblePassages: read → alle inkl. Epilog und 🔒', () => {
  const r = eligiblePassages(ALL, 'read', null);
  assert.equal(r.length, 58);
  assert.ok(ids(r).has('EP-3'));
  assert.ok(ids(r).has('T7-D5'));
});

test('eligiblePassages: reading 3 → Positionen 0–3, keine 🔒 mit Position 3, kein Epilog', () => {
  const r = eligiblePassages(ALL, 'reading', 3);
  assert.ok(r.every((p) => p.position <= 3));
  assert.ok(r.every((p) => !(p.is_resolution && p.position === 3)));
  assert.ok(!r.some((p) => p.position === 8));
  assert.ok(ids(r).has('V-1'));
});

test('eligiblePassages: reading 7 → ohne 🔒 aus Teil 7, mit T6-D1, kein Epilog', () => {
  const r = ids(eligiblePassages(ALL, 'reading', 7));
  for (const id of ['T7-D1', 'T7-D2', 'T7-D3', 'T7-D4', 'T7-D5', 'T7-D6', 'T7-J2']) {
    if (byId(id)?.is_resolution) assert.ok(!r.has(id), `${id} darf nicht enthalten sein`);
  }
  assert.ok(ALL.filter((p) => p.position === 7 && p.is_resolution).every((p) => !r.has(p.id)));
  assert.ok(r.has('T6-D1'));
  assert.ok(![...r].some((id) => id.startsWith('EP-')));
});

test('eligiblePassages: reading 6 → DD-1..3, nicht T6-D1 (🔒, Position 6)', () => {
  const r = ids(eligiblePassages(ALL, 'reading', 6));
  assert.ok(r.has('DD-1') && r.has('DD-2') && r.has('DD-3'));
  assert.ok(!r.has('T6-D1'));
});

test('eligiblePassages: nicht freigegeben oder inaktiv → fehlt; not_yet → leer', () => {
  const list = [{ ...byId('T1-D1'), approved_by_jerome_at: null }, { ...byId('T1-D2'), is_active: false }, byId('T1-D3')];
  assert.deepEqual([...ids(eligiblePassages(list, 'read', null))], ['T1-D3']);
  assert.equal(eligiblePassages(ALL, 'not_yet', null).length, 0);
  assert.equal(eligiblePassages(ALL, 'reading', null).length, 0);
});

test('bookStep: Prüf-Zeitpunkte 3, 6, 8 (A4)', () => {
  assert.equal(bookStep({ replyNo: 2, historyLength: 6, offeredReply: null, collision: false }), 'none');
  assert.equal(bookStep({ replyNo: 3, historyLength: 3, offeredReply: null, collision: false }), 'none');
  assert.equal(bookStep({ replyNo: 3, historyLength: 4, offeredReply: null, collision: false }), 'check');
  assert.equal(bookStep({ replyNo: 6, historyLength: 10, offeredReply: null, collision: true }), 'check_skip');
  assert.equal(bookStep({ replyNo: 8, historyLength: 14, offeredReply: null, collision: false }), 'check');
  assert.equal(bookStep({ replyNo: 9, historyLength: 16, offeredReply: null, collision: false }), 'none');
});

test('bookStep: Fenster von 3 Antworten, kein zweites Fenster', () => {
  const s = (replyNo: number, collision = false) => bookStep({ replyNo, historyLength: 20, offeredReply: 3, collision });
  assert.equal(s(3), 'window');
  assert.equal(s(4), 'window');
  assert.equal(s(5), 'window');
  assert.equal(s(6), 'none');
  assert.equal(s(4, true), 'window_skip');
  assert.equal(s(9), 'none');
});

test('parseSelection', () => {
  const allowed = new Set(['T3-D1', 'T3-D2', 'T4-D4']);
  assert.deepEqual(parseSelection('{"ids":["T3-D1"]}', allowed), { ok: true, ids: ['T3-D1'] });
  assert.deepEqual(parseSelection('{"ids":[]}', allowed), { ok: true, ids: [] });
  const fenced = parseSelection('```json\n{"ids":["T3-D1","T3-D1","T3-D2","T4-D4"]}\n```', allowed);
  assert.deepEqual(fenced, { ok: true, ids: ['T3-D1', 'T3-D2'] });
  assert.deepEqual(parseSelection('{"ids":["X-9"]}', allowed), { ok: false, reason: 'invalid_ids' });
  assert.deepEqual(parseSelection('Ich denke T3-D1', allowed), { ok: false, reason: 'parse' });
  assert.deepEqual(parseSelection('{"ids":"T3-D1"}', allowed), { ok: false, reason: 'parse' });
});

test('buildSelectionIndex: ⚠ mit Themen, ohne Kernsatz', () => {
  const p = byId('T5-D2');
  const line = buildSelectionIndex([p]);
  assert.match(line, /^T5-D2 \| /);
  assert.match(line, /\[SENSIBEL/);
  assert.ok(p.themes.every((t) => line.includes(t)));
  assert.ok(!line.includes(p.key_quote));
  const plain = buildSelectionIndex([byId('T1-D1')]);
  assert.match(plain, /passt, wenn:/);
  assert.ok(!plain.includes(byId('T1-D1').key_quote));
});

test('buildBookBlock', () => {
  const resolution = ALL.find((p) => p.is_resolution) as Passage;
  const sensitive = ALL.find((p) => p.is_sensitive) as Passage;
  const both = buildBookBlock({ passages: [resolution, sensitive], status: 'read', progress: null, windowReply: 1 });
  assert.match(both, /löst einen früheren Erzählstrang auf/);
  assert.match(both, /SONDERREGEL/);
  assert.match(both, /^--- BUCH-STELLEN/);
  assert.match(both, /--- ENDE BUCH-STELLEN ---$/);
  assert.doesNotMatch(both, /vorigen Antwort/);
  const reading = buildBookBlock({ passages: [byId('T1-D1')], status: 'reading', progress: 4, windowReply: 1 });
  assert.match(reading, /liest gerade Teil 4/);
  const second = buildBookBlock({ passages: [byId('T1-D1')], status: 'read', progress: null, windowReply: 2 });
  assert.match(second, /schon in einer vorigen Antwort bekommen/);
  assert.match(buildBookBlock({ passages: [byId('DD-1')], status: 'read', progress: null, windowReply: 1 }), /Davor und danach \(zwischen Teil 6 und 7\)/);
});

test('buildSelectionTranscript: letzte 6, gekürzt', () => {
  const msgs = Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(700) }));
  const t = buildSelectionTranscript(msgs).split('\n');
  assert.equal(t.length, 6);
  assert.ok(t.every((l) => l.length <= 'Mensch: '.length + 600));
});
