// supabase/functions/post-conversation/index.ts
// Aufgerufen nach jedem abgeschlossenen Gespräch (fire-and-forget vom Frontend)
// 4 parallele Prompts: Session-Notes · Akte-Updates · Profil-Update · Anonyme RAG-Zusammenfassung
// + Coach-Selbstreflexion

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createLogger, describeError, type Logger } from '../_shared/logger.ts';
import { reviewLearningEntry, makeHaikuCaller } from '../_shared/learning.ts';
import {
  HttpError, requireUser, assertConversationOwner, readJsonBody, errorResponse, jsonResponse,
} from '../_shared/auth.ts';
import { RATE_LIMITS, enforceRateLimit, RateLimitError, rateLimitResponse } from '../_shared/rateLimit.ts';

const SESSION_NOTES_PROMPT = `Du hast gerade dieses Coaching-Gespräch geführt.
Erstelle strukturierte Session-Notes für deine Coach-Akte.

Antworte NUR mit validem JSON:
{
  "main_topic": "1 Satz: Worum ging es wirklich? (nicht das Oberflächenthema)",
  "emotional_intensity": 1,
  "resistance_detected": false,
  "resistance_location": null,
  "breakthrough_moment": null,
  "where_we_left_off": "Wo endete das Gespräch inhaltlich? 1-2 Sätze. Null wenn klar abgeschlossen.",
  "coach_effectiveness": 3,
  "next_session_rec": "Konkreter Hinweis für das nächste Gespräch. Max. 2-3 Sätze."
}

WICHTIG für next_session_rec:
- Konkret und handlungsleitend, nicht allgemein
- Falls ein offener Faden erkennbar: wie damit umgehen
- Falls etwas gut funktioniert hat: notieren damit es wiederholbar ist`;

const FILE_UPDATE_PROMPT = `Du hast gerade dieses Coaching-Gespräch geführt.
Entscheide welche Einträge in der Coach-Akte aktualisiert werden sollen.

AKTUELLER STAND DER AKTE:
{AKTE}

Antworte NUR mit validem JSON:
{
  "updates": [
    {
      "action": "add",
      "category": "pattern",
      "label": "Kurzbezeichnung",
      "description": "Ausführlichere Beschreibung (optional, sonst null)",
      "example": "Konkretes Beispiel aus diesem Gespräch (optional, sonst null)",
      "confidence": 2,
      "linked_value": "Der Wert oder Glaubenssatz, den dieses Muster zu schützen scheint — z.B. 'Ich darf keine Fehler machen' oder 'Harmonie um jeden Preis' (optional, nur bei category: pattern oder trigger, sonst null)"
    }
  ]
}

action kann sein: "add" (neuer Eintrag), "update" (bestehenden Eintrag anpassen),
"resolve" (Eintrag als aufgelöst markieren).
Bei "update" und "resolve": entry_id (UUID des bestehenden Eintrags) angeben.
Bei "update": note (was hat sich verändert), new_confidence (1-5), new_status ("active"|"fading"|"resolved").
Bei "resolve": note (warum gilt dieser Eintrag als aufgelöst).

Kategorien: pattern · strength · theme · value · trigger

KRITERIEN:
- Nur hinzufügen wenn WIRKLICH etwas Neues erkennbar war
- confidence erhöhen wenn sich ein bekanntes Muster bestätigt hat
- "fading" setzen wenn ein Muster deutlich schwächer geworden ist
- "resolved" nur wenn der Coachee selbst etwas explizit aufgelöst hat
- Bei Zweifeln: lieber nicht hinzufügen als spekulieren
- Leeres updates-Array ist vollkommen okay

ZU linked_value:
Jedes wiederkehrende Muster schützt fast immer einen Wert oder einen
verinnerlichten Glaubenssatz (z.B. Sicherheit, Anerkennung, Harmonie,
Kontrolle). Wenn im Gespräch erkennbar wird, wofür ein Muster eigentlich gut
sein will, halte das kurz und konkret in linked_value fest — in der Sprache
des Nutzers, nicht als Fachbegriff. Nur ausfüllen wenn wirklich erkennbar,
sonst null. Kein Spekulieren.`;

const PROFILE_UPDATE_PROMPT = `Du hast gerade dieses Coaching-Gespräch geführt.
Aktualisiere das Personenprofil des Coachees basierend auf dem Gespräch.

AKTUELLER PROFILSTAND:
{PROFIL}

Antworte NUR mit validem JSON. Nur Felder angeben die sich verändert oder
erstmals ergeben haben. Felder die unverändert sind: weglassen.
{
  "occupation": "Beruf/Tätigkeit (grob, kein Arbeitgeber)",
  "relationship_status": "in Partnerschaft|Single|getrennt|verheiratet",
  "family_situation": "z.B. Vater von 2 Kindern",
  "life_phase": "z.B. Beruflicher Umbruch",
  "current_focus": "Was beschäftigt ihn/sie gerade am meisten",
  "known_values_add": ["Neu erkannte Werte"],
  "known_stressors_add": ["Neu erkannte Stressoren"],
  "known_resources_add": ["Neu erkannte Ressourcen"]
}

WICHTIG:
- Nur extrahieren was im Gespräch explizit oder sehr deutlich war
- Kein Spekulieren aus Andeutungen
- Lebenskontext nur aus direkten Aussagen des Coachees
- Persönliche Details so grob wie möglich halten (Datenschutz)
- Leeres Objekt {} ist vollkommen okay`;

const ANONYMOUS_SUMMARY_PROMPT = `Analysiere dieses Coaching-Gespräch und erstelle eine
anonymisierte Zusammenfassung für eine Erfahrungs-Datenbank.

WICHTIG: Kein Name, kein Alter, keine Stadt, kein Beruf mit Arbeitgebernamen,
keine Details die Rückschlüsse auf eine konkrete Person erlauben.
Nur das Muster, nicht die Person.

Antworte NUR mit validem JSON:
{
  "context": "Themenfeld in 3-5 Wörtern",
  "pattern": "Erkanntes Verhaltensmuster (anonym)",
  "resistance": "Widerstandsmoment falls aufgetreten, sonst null",
  "what_helped": "Welche Coach-Reaktion war wirksam, sonst null",
  "what_blocked": "Was hat nicht geholfen, sonst null",
  "outcome": "breakthrough | stuck | partial | unknown",
  "pattern_references": [
    {
      "pattern_key": "maschinenlesbarer_schlüssel",
      "pattern_label": "Lesbarer Muster-Name",
      "excerpt": "Relevantes Zitat aus dem Gespräch (max. 150 Zeichen)"
    }
  ],
  "insights": [
    {
      "content": "Erkenntnis in einem Satz, aus Ich-Perspektive formuliert",
      "category": "muster | stärke | erkenntnis | ziel"
    }
  ]
}

insights: 0–2 Einträge. Nur wenn wirklich etwas klar Erkennbares entstanden ist.
Formulierung: konkret, nicht abstrakt. "Ich neige dazu X wenn Y" statt "Muster erkannt".
Leeres Array ist vollkommen okay.

BEKANNTE MUSTER-KEYS (verwende diese wenn erkannt):
- rueckzug_unter_druck       → Rückzug unter Druck
- innerer_kritiker           → Der innere Kritiker
- uebernahme_reflex          → Übernahme-Reflex
- harmonie_um_jeden_preis    → Harmonie um jeden Preis
- perfektionismus_blockade   → Perfektionismus-Blockade`;

const RESONANCE_UPDATE_PROMPT = `Du hast gerade dieses Coaching-Gespräch geführt.
Aktualisiere die Resonanzkarte dieses Menschen — was funktioniert bei ihm/ihr,
was führt zu Verschluss oder Widerstand?

AKTUELLE RESONANZKARTE:
{RESONANZ}

Antworte NUR mit validem JSON. Nur Felder angeben die sich verändert haben oder
erstmals klar erkennbar waren. Leere Arrays wenn nichts Neues erkennbar.
{
  "opening_patterns_add": ["Was hat heute Öffnung erzeugt? Konkret formulieren."],
  "closing_patterns_add": ["Was hat heute Schließen oder Ausweichen ausgelöst?"],
  "effective_styles_add": ["Welcher Frage-Stil hat heute besonders funktioniert?"],
  "resonant_metaphors_add": ["Welches Bild oder welche Metapher hat heute resoniert?"],
  "preferred_pace": "slow|medium|direct|null (nur wenn eindeutig erkennbar)"
}

WICHTIG:
- Nur hinzufügen wenn WIRKLICH erkennbar — keine Spekulation
- Konkret formulieren (nicht "war offen" sondern "Frage nach Ausnahmen öffnete sofort")
- Widersprüche zur bestehenden Karte dürfen notiert werden
- preferred_pace nur ändern wenn in mehreren Gesprächen konsistent
- Leere Arrays sind vollkommen okay`;

const REFLECTION_PROMPT = `Du hast gerade dieses Coaching-Gespräch geführt.
Reflektiere dein eigenes Vorgehen ehrlich.

Antworte NUR mit validem JSON:
{
  "was_helpful": true,
  "what_worked": "Was war wirksam?",
  "what_missed": "Was hättest du besser machen können?",
  "resistance_detected": false,
  "resistance_handled": null,
  "capacity_vs_resistance_note": "Gab es einen Moment, in dem echte Erschöpfung als Widerstand missverstanden worden sein könnte (oder umgekehrt)? Kurze Einschätzung, sonst null.",
  "improvement_note": "Ein konkreter Hinweis für zukünftige ähnliche Gespräche",
  "language_violations": []
}

SPRACHCHECK: Prüfe deine eigenen Antworten im Gespräch auf verbotene Wörter
(müssen, immer als Absolutheitsaussage, nie als Absolutheitsaussage, können
nicht) UND auf unbeabsichtigtes Optimierungs- oder Schuld-Framing (z.B.
Formulierungen, die nahelegen, der Nutzer müsse "besser" oder "produktiver"
werden, oder die Schuld statt Verantwortung ansprechen). Trage Verstöße in
language_violations ein — für die Qualitätssicherung.`;

const VOICE_CLUSTER_PROMPT = `Hier sind mehrere, bisher unabhängig
erfasste Muster/Trigger/Stärken aus der Coach-Akte eines Nutzers:

{ENTRIES}

BEREITS BENANNTE INNERE STIMMEN DIESES NUTZERS (falls vorhanden):
{EXISTING_VOICES}

Prüfe zuerst: Passt eines der obigen Muster eindeutig zu einer bereits
erkannten Stimme — benannt oder noch unbenannter Kandidat — (thematisch,
nicht nur oberflächlich ähnlich)? Wenn ja, gib deren id in
"existing_voice_id" zurück und liste die passenden Eintrag-IDs in
"cluster_entry_ids". Das gilt unabhängig davon, ob die Stimme schon einen
Namen hat.

Nur falls keine bestehende Stimme passt: Prüfe, ob mehrere der Einträge
thematisch so eng zusammengehören, dass sie eine gemeinsame, wiederkehrende
"innere Stimme" beschreiben könnten (z.B. mehrere Einträge rund um
Kontrolle/Perfektionismus könnten zu einem "Antreiber" gehören). Nur
zusammenfassen, wenn es wirklich naheliegend ist — im Zweifel lieber
getrennt lassen.

Antworte NUR mit JSON, kein Markdown:
{
  "existing_voice_id": "<id einer bereits benannten Stimme, sonst null>",
  "cluster_entry_ids": ["<ids der zusammengehörigen Einträge, min. 3>"],
  "suggested_names": ["2-3 mögliche Namen, alltagssprachlich, z.B. 'Der Antreiber', 'Die Kontrolleurin'"],
  "description": "1-2 Sätze: was diese Stimme tut UND wovor sie ursprünglich schützen wollte (die positive Absicht dahinter) — z.B. 'Sorgt dafür, dass alles kontrolliert bleibt, wahrscheinlich weil Kontrollverlust früher gefährlich war.' Nie als Defekt formulieren, immer als Schutzmechanismus mit einer (heute vielleicht überholten) guten Absicht."
}
Falls kein klares Cluster erkennbar ist: {}`;

async function generateEmbedding(text: string, openaiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

async function runPrompt(anthropic: Anthropic, prompt: string, conversationText: string, label: string, logger: Logger): Promise<any> {
  let raw = '';
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: `${prompt}\n\nGespräch:\n${conversationText}` }],
    });
    raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
  } catch (err) {
    // API-Fehler: nur Typ/Code/Status, keine Meldungstexte
    logger.error('runPrompt failed — returning empty result', { label, ...describeError(err) });
    return {};
  }
  // Strip markdown code fences that models sometimes add despite "NUR JSON" instruction
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(text);
  } catch (err) {
    // Log-Regel: Die JSON.parse-Meldung enthält Ausschnitte der Modellausgabe → nur Position + Länge.
    const position = err instanceof Error ? Number(err.message.match(/position (\d+)/)?.[1]) : NaN;
    logger.error('runPrompt failed — returning empty result', {
      label,
      parseError: 'parse_failed',
      outputLength: raw.length,
      ...(Number.isFinite(position) ? { position } : {}),
    });
    return {};
  }
}

function deriveIntensity(notes: any): 'low' | 'medium' | 'high' | null {
  if (!notes?.where_we_left_off) return null;
  if ((notes.emotional_intensity ?? 0) >= 4 && notes.resistance_detected) return 'high';
  if ((notes.emotional_intensity ?? 0) >= 3 || notes.resistance_detected) return 'medium';
  return 'low';
}

// Klammert Modell-Ausgaben robust auf einen gültigen Bereich (Schutz gegen
// 0, 6, Kommazahlen, Strings etc., die sonst DB-Check-Constraints verletzen).
function clampScore(value: unknown, min = 1, max = 5): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Seit S-12 (Paket B): Der Verlauf kommt aus der DB, ein mitgeschicktes messages[] wird
// ignoriert. Verarbeitet werden höchstens die letzten MAX_PROCESSED_MESSAGES (Kostenbremse).
// Body-Limit bleibt großzügig, weil alte Clients (gecachte PWA) noch den Verlauf mitschicken.
const MAX_BODY_BYTES = 512 * 1024;
const MAX_PROCESSED_MESSAGES = 200;
// Seit Welle 2b: altes Format (mit messages[]) bekommt 409 client_outdated
const LEGACY_FORMAT_ALLOWED = false;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('post-conversation');

  try {
    // 1. Identität ausschließlich aus dem JWT — body.userId wird ignoriert
    const { user, admin: supabase } = await requireUser(req);
    const userId = user.id;
    logger = createLogger('post-conversation', undefined, userId);

    const body = await readJsonBody(req, MAX_BODY_BYTES);
    await enforceRateLimit(supabase, userId, RATE_LIMITS.postConversation, logger, true);
    if (body.userId !== undefined && body.userId !== userId) {
      // Angriffssignal: jemand versucht, im Namen eines anderen Nutzers zu verarbeiten
      logger.warn('userId mismatch');
    }

    // 2. Eigentum an der Konversation prüfen, bevor irgendetwas gelesen oder geschrieben wird
    const conversationId = await assertConversationOwner(supabase, body.conversationId, userId);
    if (body.messages !== undefined) {
      logger.info('legacy_format', { kind: 'post_conversation' });
      if (!LEGACY_FORMAT_ALLOWED) throw new HttpError(409, 'client_outdated');
    }

    // Verlauf aus der DB (nur Nachrichten dieser, bereits geprüften Konversation)
    const { data: historyRows, count: historyCount, error: historyError } = await supabase
      .from('messages')
      .select('role, content', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(MAX_PROCESSED_MESSAGES);
    if (historyError) {
      logger.error('history_load_failed', { code: historyError.code, conversationId });
      throw new HttpError(500, 'history_load_failed');
    }
    const messages = ((historyRows ?? []) as { role: 'user' | 'assistant'; content: string }[]).reverse();
    const totalMessages = historyCount ?? messages.length;

    logger.info('Request body received', { messageCount: totalMessages, conversationId });

    if (totalMessages < 3) {
      logger.info('Skipped — too few messages', { messageCount: totalMessages, conversationId });
      return jsonResponse({ ok: true, skipped: true }, CORS_HEADERS);
    }

    // Idempotenz-Guard (v2.9, Abschnitt 6b.0): Client- und serverseitige Trigger
    // können sich überschneiden (mehrere Trigger-Pfade, Netzwerk-Retries, mehrere
    // Tabs). Ein Gespräch darf erneut verarbeitet werden, wenn es gewachsen ist —
    // aber nicht zweimal für denselben Nachrichtenstand.
    const { data: existing, error: existingError } = await supabase
      .from('conversations')
      .select('post_processed_message_count')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existingError) {
      logger.error('idempotency check failed', { code: existingError.code, conversationId });
      throw new HttpError(500, 'idempotency_check_failed');
    }

    if (existing && existing.post_processed_message_count >= totalMessages) {
      logger.info('Skipped — already processed for this message count', {
        conversationId,
        messageCount: totalMessages,
        alreadyProcessed: existing.post_processed_message_count,
      });
      return jsonResponse({ ok: true, skipped: true, reason: 'idempotent' }, CORS_HEADERS);
    }

    logger.info('Started', { conversationId, messageCount: totalMessages, processedCount: messages.length });

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'Nutzer' : 'Coach'}: ${m.content}`)
      .join('\n');

    // 1. Aktuelle Coach-Akte + Personenprofil + Resonanzkarte + Gesprächsanzahl laden
    const [{ data: fileEntries }, { data: currentProfile }, { data: currentResonanceMap }, countResult] = await Promise.all([
      supabase
        .from('coach_file_entries')
        .select('id, category, label, description, example, confidence, status')
        .eq('user_id', userId)
        .neq('status', 'resolved'),
      supabase
        .from('coachee_profile')
        .select('occupation, relationship_status, family_situation, life_phase, current_focus, known_values, known_stressors, known_resources')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('resonance_map')
        .select('opening_patterns, closing_patterns, effective_styles, resonant_metaphors, preferred_pace')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);
    const conversationCount = countResult.count ?? 0;

    // IDs, die das Modell referenzieren darf: nur Einträge DIESES Nutzers (Schutz gegen
    // Prompt-Injection, die fremde entry_ids/voice_ids in die Modellausgabe schmuggelt).
    const ownEntryIds = new Set<string>((fileEntries ?? []).map((e: any) => e.id));

    const akteContext = fileEntries?.length
      ? fileEntries.map((e: any) => `[${e.id}] ${e.category}: ${e.label} (confidence: ${e.confidence}, status: ${e.status})`).join('\n')
      : 'Noch keine Einträge vorhanden.';

    const profilContext = currentProfile
      ? JSON.stringify(currentProfile, null, 2)
      : 'Noch kein Profil vorhanden.';

    const fileUpdatePrompt = FILE_UPDATE_PROMPT.replace('{AKTE}', akteContext);
    const profileUpdatePrompt = PROFILE_UPDATE_PROMPT.replace('{PROFIL}', profilContext);

    const resonanzContext = currentResonanceMap
      ? JSON.stringify(currentResonanceMap, null, 2)
      : 'Noch keine Resonanzkarte vorhanden.';
    const resonancePrompt = RESONANCE_UPDATE_PROMPT.replace('{RESONANZ}', resonanzContext);

    // 2. Alle Analysen parallel ausführen (Resonanzkarte ab 3. Gespräch)
    const [sessionNotes, fileUpdates, profileUpdates, anonSummary, reflection, resonanceUpdate] = await Promise.all([
      runPrompt(anthropic, SESSION_NOTES_PROMPT, conversationText, 'session_notes', logger),
      runPrompt(anthropic, fileUpdatePrompt, conversationText, 'file_update', logger),
      runPrompt(anthropic, profileUpdatePrompt, conversationText, 'profile_update', logger),
      runPrompt(anthropic, ANONYMOUS_SUMMARY_PROMPT, conversationText, 'anonymous_summary', logger),
      runPrompt(anthropic, REFLECTION_PROMPT, conversationText, 'reflection', logger),
      conversationCount >= 3
        ? runPrompt(anthropic, resonancePrompt, conversationText, 'resonance_update', logger)
        : Promise.resolve(null),
    ]);

    // 3. Session-Notes speichern + conversations aktualisieren
    if (!sessionNotes.main_topic) {
      logger.warn('session_notes skipped — main_topic missing (runPrompt returned empty)', { conversationId });
    }
    if (sessionNotes.main_topic) {
      const { error: snError } = await supabase.from('session_notes').upsert({
        conversation_id: conversationId,
        user_id: userId,
        main_topic: sessionNotes.main_topic,
        emotional_intensity: clampScore(sessionNotes.emotional_intensity),
        resistance_detected: sessionNotes.resistance_detected ?? false,
        resistance_location: sessionNotes.resistance_location ?? null,
        breakthrough_moment: sessionNotes.breakthrough_moment ?? null,
        where_we_left_off: sessionNotes.where_we_left_off ?? null,
        coach_effectiveness: clampScore(sessionNotes.coach_effectiveness),
        next_session_rec: sessionNotes.next_session_rec ?? null,
        file_updates: fileUpdates.updates ?? [],
      });
      if (snError) logger.error('session_notes write failed', { code: snError.code, conversationId });

      const { error: convUpdateError } = await supabase
        .from('conversations')
        .update({
          summary: sessionNotes.main_topic,
          open_thread: sessionNotes.where_we_left_off ?? null,
          open_thread_intensity: deriveIntensity(sessionNotes),
          post_processed_at: new Date().toISOString(),
          post_processed_message_count: totalMessages,
        })
        .eq('id', conversationId)
        .eq('user_id', userId);
      if (convUpdateError) logger.error('conversations post-processing update failed', { code: convUpdateError.code, conversationId });
    }

    // 4. Coach-Akte aktualisieren
    if (Array.isArray(fileUpdates.updates)) {
      for (const update of fileUpdates.updates) {
        if (update.action === 'add' && update.label && update.category) {
          const { error: addError } = await supabase.from('coach_file_entries').insert({
            user_id: userId,
            source_conversation_id: conversationId,
            category: update.category,
            label: update.label,
            description: update.description ?? null,
            example: update.example ?? null,
            confidence: update.confidence ?? 2,
            linked_value: update.linked_value ?? null,
          });
          if (addError) {
            logger.error('coach_file_entries insert failed', { code: addError.code, conversationId, category: update.category });
          } else {
            logger.info('coach_file_entries entry added', { conversationId, category: update.category });
          }
        } else if ((update.action === 'update' || update.action === 'resolve') && update.entry_id) {
          if (!ownEntryIds.has(update.entry_id)) {
            logger.warn('coach_file_entries update skipped — entry_id not owned by user', { conversationId, action: update.action });
            continue;
          }
          const { data: entry, error: readError } = await supabase
            .from('coach_file_entries')
            .select('history')
            .eq('id', update.entry_id)
            .eq('user_id', userId)
            .single();
          if (readError) {
            logger.error(`coach_file_entries read (for ${update.action}) failed`, { code: readError.code, conversationId, entryId: update.entry_id });
          }

          const historyEntry = {
            date: new Date().toISOString().split('T')[0],
            note: update.note,
            conversation_id: conversationId,
          };
          const patch = update.action === 'update'
            ? {
                confidence: update.new_confidence ?? undefined,
                status: update.new_status ?? undefined,
                last_updated: new Date().toISOString(),
                history: [...(entry?.history ?? []), historyEntry],
              }
            : {
                status: 'resolved',
                last_updated: new Date().toISOString(),
                history: [...(entry?.history ?? []), historyEntry],
              };

          const { error: writeError } = await supabase.from('coach_file_entries')
            .update(patch)
            .eq('id', update.entry_id)
            .eq('user_id', userId);
          if (writeError) {
            logger.error(`coach_file_entries ${update.action} failed`, { code: writeError.code, conversationId, entryId: update.entry_id });
          } else {
            logger.info(`coach_file_entries entry ${update.action === 'update' ? 'updated' : 'resolved'}`, { conversationId, entryId: update.entry_id });
          }
        }
      }
    }

    // 4b. Stimmen-Kandidaten erkennen ("Innere Stimmen")
    // Nur prüfen, wenn mind. 3 unverknüpfte, aktive Coach-Akte-Einträge mit
    // confidence >= 3 vorliegen — sonst zu wenig Grundlage für ein Cluster.
    {
      const unlinkedEntries = (fileEntries ?? []).filter((e: any) => !e.voice_id && e.confidence >= 3);

      if (unlinkedEntries.length >= 3) {
        const { data: existingVoices } = await supabase
          .from('inner_voices')
          .select('id, name, status, description')
          .eq('user_id', userId)
          .in('status', ['named', 'candidate']);
        const ownVoiceIds = new Set<string>((existingVoices ?? []).map((v: any) => v.id));
        const unlinkedIds = new Set<string>(unlinkedEntries.map((e: any) => e.id));

        const existingVoicesContext = existingVoices?.length
          ? existingVoices.map((v: any) =>
              `[${v.id}] ${v.status === 'named' ? v.name : '(noch unbenannter Kandidat)'}: ${v.description ?? ''}`
            ).join('\n')
          : 'Noch keine Stimmen vorhanden.';

        const voiceClusterPrompt = VOICE_CLUSTER_PROMPT
          .replace('{ENTRIES}', JSON.stringify(unlinkedEntries.map((e: any) => ({
            id: e.id, category: e.category, label: e.label, description: e.description,
          }))))
          .replace('{EXISTING_VOICES}', existingVoicesContext);

        const voiceCandidate = await runPrompt(anthropic, voiceClusterPrompt, conversationText, 'voice_cluster', logger);

        // Nur eigene, unverknüpfte Einträge und eigene Stimmen übernehmen
        const clusterIds: string[] = Array.isArray(voiceCandidate.cluster_entry_ids)
          ? voiceCandidate.cluster_entry_ids.filter((id: unknown) => typeof id === 'string' && unlinkedIds.has(id))
          : [];
        const existingVoiceId: string | null =
          typeof voiceCandidate.existing_voice_id === 'string' && ownVoiceIds.has(voiceCandidate.existing_voice_id)
            ? voiceCandidate.existing_voice_id
            : null;
        if (voiceCandidate.existing_voice_id && !existingVoiceId) {
          logger.warn('voice_cluster: existing_voice_id not owned by user — ignored', { conversationId });
        }

        if (existingVoiceId && clusterIds.length) {
          const { error: linkError } = await supabase.from('coach_file_entries')
            .update({ voice_id: existingVoiceId })
            .in('id', clusterIds)
            .eq('user_id', userId);
          if (linkError) {
            logger.error('inner_voices link to existing voice failed', { code: linkError.code, conversationId });
          } else {
            const { error: touchError } = await supabase.from('inner_voices')
              .update({ last_active_at: new Date().toISOString() })
              .eq('id', existingVoiceId)
              .eq('user_id', userId);
            if (touchError) logger.error('inner_voices last_active_at update failed', { code: touchError.code, voiceId: existingVoiceId });
            logger.info('inner_voices entries linked to existing voice', { conversationId, voiceId: existingVoiceId, entryCount: clusterIds.length });
          }
        } else if (!existingVoiceId && clusterIds.length >= 3) {
          const { data: newVoice, error: voiceError } = await supabase
            .from('inner_voices')
            .insert({
              user_id: userId,
              status: 'candidate',
              suggested_names: voiceCandidate.suggested_names ?? [],
              description: voiceCandidate.description ?? null,
            })
            .select('id')
            .single();

          if (voiceError) {
            logger.error('inner_voices insert failed', { code: voiceError.code, conversationId, clusterSize: clusterIds.length });
          } else {
            const { data: linkedRows, error: linkError } = await supabase.from('coach_file_entries')
              .update({ voice_id: newVoice.id })
              .in('id', clusterIds)
              .eq('user_id', userId)
              .select('id');
            const count = linkedRows?.length ?? 0;

            if (linkError || !count) {
              logger.error('inner_voices link to new voice failed — rolling back orphaned voice row', {
                code: linkError?.code ?? 'zero_rows_linked',
                conversationId, voiceId: newVoice.id, clusterSize: clusterIds.length,
              });
              // Keine verwaiste Stimmen-Zeile ohne verknüpfte Einträge stehen lassen —
              // sonst sammeln sich unsichtbare "Geister-Kandidaten" in der DB an.
              const { error: rollbackError } = await supabase.from('inner_voices').delete().eq('id', newVoice.id).eq('user_id', userId);
              if (rollbackError) logger.error('inner_voices rollback failed', { code: rollbackError.code, voiceId: newVoice.id });
            } else {
              logger.info('inner_voices candidate created', { conversationId, voiceId: newVoice.id, entryCount: count });
            }
          }
        }
      }
    }

    // 5. Personenprofil aktualisieren
    if (Object.keys(profileUpdates).length > 0) {
      const patch: any = { user_id: userId, last_updated: new Date().toISOString(), last_enriched_by: conversationId };
      if (profileUpdates.occupation)          patch.occupation = profileUpdates.occupation;
      if (profileUpdates.relationship_status) patch.relationship_status = profileUpdates.relationship_status;
      if (profileUpdates.family_situation)    patch.family_situation = profileUpdates.family_situation;
      if (profileUpdates.life_phase)          patch.life_phase = profileUpdates.life_phase;
      if (profileUpdates.current_focus)       patch.current_focus = profileUpdates.current_focus;

      if (profileUpdates.known_values_add?.length) {
        const existingValues = currentProfile?.known_values ?? [];
        patch.known_values = [...new Set([...existingValues, ...profileUpdates.known_values_add])];
      }
      if (profileUpdates.known_stressors_add?.length) {
        const existingStressors = currentProfile?.known_stressors ?? [];
        patch.known_stressors = [...new Set([...existingStressors, ...profileUpdates.known_stressors_add])];
      }
      if (profileUpdates.known_resources_add?.length) {
        const existingResources = currentProfile?.known_resources ?? [];
        patch.known_resources = [...new Set([...existingResources, ...profileUpdates.known_resources_add])];
      }

      const { error: profileError } = await supabase.from('coachee_profile').upsert(patch, { onConflict: 'user_id' });
      if (profileError) {
        logger.error('coachee_profile upsert failed', { code: profileError.code, conversationId });
      } else {
        logger.info('coachee_profile updated', { conversationId, fields: Object.keys(patch) });
      }
    }

    // 6. Lernbasis (S-13): nur mit Schalter, Opt-in des Nutzers und bestandener Prüfung.
    //    pattern_references und insights (persönlich, nur für den Nutzer selbst) laufen unverändert weiter.
    const learningEnabled = (Deno.env.get('RAG_LEARNING_ENABLED') ?? '').trim() === '1';
    if (!learningEnabled) {
      logger.info('learning_disabled', { conversationId });
    } else if (!anonSummary.context || !anonSummary.pattern) {
      logger.info('learning_no_summary', { conversationId });
    } else {
      const { data: optInRow, error: optInError } = await supabase
        .from('profiles').select('learning_opt_in').eq('id', userId).maybeSingle();
      if (optInError) {
        logger.error('learning_optin_check_failed', { code: optInError.code, conversationId });
      } else if (!optInRow?.learning_opt_in) {
        logger.info('learning_no_optin', { conversationId });
      } else {
        const entryFields = {
          context: String(anonSummary.context).slice(0, 300),
          pattern: String(anonSummary.pattern).slice(0, 600),
          resistance: anonSummary.resistance ? String(anonSummary.resistance).slice(0, 600) : null,
          what_helped: anonSummary.what_helped ? String(anonSummary.what_helped).slice(0, 600) : null,
          what_blocked: anonSummary.what_blocked ? String(anonSummary.what_blocked).slice(0, 600) : null,
          outcome: ['breakthrough', 'stuck', 'partial', 'unknown'].includes(anonSummary.outcome) ? anonSummary.outcome : 'unknown',
        };
        const entryText = [entryFields.context, entryFields.pattern, entryFields.resistance, entryFields.what_helped, entryFields.what_blocked]
          .filter(Boolean).join('\n');
        const review = await reviewLearningEntry(entryText, makeHaikuCaller(anthropic));
        if (!review.approved) {
          // Gründe als Text: sanitizeLogData würde ein Array zu {type,length} reduzieren
          logger.info('learning_rejected', { conversationId, reasons: review.reasons.join(',') });   // nur Codes
        } else {
          const embedding = openaiKey
            ? await generateEmbedding([entryFields.context, entryFields.pattern, entryFields.what_helped].filter(Boolean).join(' — '), openaiKey)
            : null;
          if (!embedding) {
            // Ohne Vektor wäre der Eintrag unauffindbar → nichts speichern
            logger.warn('learning_embedding_failed', { conversationId, hasKey: !!openaiKey });
          } else {
            const { error: patternError } = await supabase.from('experience_patterns').insert({
              ...entryFields,
              embedding: JSON.stringify(embedding),
              source_user_id: userId,
              review_status: 'approved',
              reviewed_at: new Date().toISOString(),
            });
            if (patternError) logger.error('learning_insert_failed', { code: patternError.code, conversationId });
            else logger.info('learning_entry_saved', { conversationId });
          }
        }
      }
    }

    // 7. Muster-Referenzen speichern (für "Verstehen"-Modul)
    if (Array.isArray(anonSummary.pattern_references)) {
      const refs = anonSummary.pattern_references
        .filter((r: any) => r.pattern_key && r.pattern_label)
        .map((r: any) => ({
          user_id: userId,
          conversation_id: conversationId,
          pattern_key: r.pattern_key,
          pattern_label: r.pattern_label,
          excerpt: r.excerpt ?? null,
        }));
      if (refs.length) {
        const { error: refsError } = await supabase.from('pattern_references').insert(refs);
        if (refsError) {
          logger.error('pattern_references insert failed', { code: refsError.code, conversationId, count: refs.length });
        } else {
          logger.info('pattern_references saved', { conversationId, count: refs.length });
        }
      }
    }

    // 7b. Automatische Insights speichern
    if (Array.isArray(anonSummary.insights)) {
      const insightRows = anonSummary.insights
        .filter((i: any) => i.content && i.category)
        .map((i: any) => ({
          user_id: userId,
          conversation_id: conversationId,
          content: i.content,
          category: i.category,
          source: 'auto',
        }));
      if (insightRows.length) {
        const { error: insightError } = await supabase.from('insights').insert(insightRows);
        if (insightError) {
          logger.error('insights insert failed', { code: insightError.code, conversationId, count: insightRows.length });
        } else {
          logger.info('Insights saved', { conversationId, count: insightRows.length });
        }
      }
    }

    // 8. Coach-Selbstreflexion speichern
    if (reflection.what_worked || reflection.improvement_note) {
      const { error: reflectionError } = await supabase.from('coach_reflections').insert({
        conversation_id: conversationId,
        was_helpful: reflection.was_helpful ?? null,
        what_worked: reflection.what_worked ?? null,
        what_missed: reflection.what_missed ?? null,
        resistance_detected: reflection.resistance_detected ?? false,
        resistance_handled: reflection.resistance_handled ?? null,
        improvement_note: reflection.improvement_note ?? null,
      });
      if (reflectionError) {
        logger.error('coach_reflections insert failed', { code: reflectionError.code, conversationId });
      } else {
        logger.info('coach_reflections saved', { conversationId });
      }
    }

    // 9. Resonanzkarte aktualisieren (Idee 05 — ab 3. Gespräch)
    if (resonanceUpdate && Object.keys(resonanceUpdate).length > 0) {
      const patch: any = { user_id: userId, last_updated: new Date().toISOString() };

      if (resonanceUpdate.opening_patterns_add?.length) {
        const existingOpening = currentResonanceMap?.opening_patterns ?? [];
        patch.opening_patterns = [...new Set([...existingOpening, ...resonanceUpdate.opening_patterns_add])];
      }
      if (resonanceUpdate.closing_patterns_add?.length) {
        const existingClosing = currentResonanceMap?.closing_patterns ?? [];
        patch.closing_patterns = [...new Set([...existingClosing, ...resonanceUpdate.closing_patterns_add])];
      }
      if (resonanceUpdate.effective_styles_add?.length) {
        const existingStyles = currentResonanceMap?.effective_styles ?? [];
        patch.effective_styles = [...new Set([...existingStyles, ...resonanceUpdate.effective_styles_add])];
      }
      if (resonanceUpdate.resonant_metaphors_add?.length) {
        const existingMetaphors = currentResonanceMap?.resonant_metaphors ?? [];
        patch.resonant_metaphors = [...new Set([...existingMetaphors, ...resonanceUpdate.resonant_metaphors_add])];
      }
      if (resonanceUpdate.preferred_pace && resonanceUpdate.preferred_pace !== 'null') {
        patch.preferred_pace = resonanceUpdate.preferred_pace;
      }

      const { error: resonanceError } = await supabase.from('resonance_map').upsert(patch, { onConflict: 'user_id' });
      if (resonanceError) {
        logger.error('resonance_map upsert failed', { code: resonanceError.code, conversationId });
      } else {
        logger.info('resonance_map updated', { conversationId, fields: Object.keys(patch) });
      }
    }

    logger.info('Completed', { conversationId });
    return jsonResponse({ ok: true }, CORS_HEADERS);

  } catch (error: unknown) {
    if (error instanceof RateLimitError) return rateLimitResponse(error, CORS_HEADERS);
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      else logger.warn('Request rejected', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('Failed', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
