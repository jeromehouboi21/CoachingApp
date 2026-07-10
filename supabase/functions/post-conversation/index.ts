// supabase/functions/post-conversation/index.ts
// Aufgerufen nach jedem abgeschlossenen Gespräch (fire-and-forget vom Frontend)
// 4 parallele Prompts: Session-Notes · Akte-Updates · Profil-Update · Anonyme RAG-Zusammenfassung
// + Coach-Selbstreflexion

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';
import { createLogger } from '../_shared/logger.ts';


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
benannten Stimme (thematisch, nicht nur oberflächlich ähnlich)? Wenn ja,
gib deren id in "existing_voice_id" zurück und liste die passenden
Eintrag-IDs in "cluster_entry_ids".

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

async function runPrompt(anthropic: Anthropic, prompt: string, conversationText: string): Promise<any> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: `${prompt}\n\nGespräch:\n${conversationText}` }],
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    // Strip markdown code fences that models sometimes add despite "NUR JSON" instruction
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    return JSON.parse(text);
  } catch {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body = await req.json();
    const { messages, conversationId, userId } = body;
    const logger = createLogger('post-conversation', undefined, userId ?? undefined);
    logger.info('Request body received', {
      hasMessages: !!messages,
      messageCount: messages?.length,
      hasConversationId: !!conversationId,
      hasUserId: !!userId,
    });

    if (!messages || messages.length < 3) {
      logger.info('Skipped — too few messages', { messageCount: messages?.length ?? 0, conversationId });
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    // Idempotenz-Guard (v2.9, Abschnitt 6b.0): Client- und serverseitige Trigger
    // können sich überschneiden (mehrere Trigger-Pfade, Netzwerk-Retries, mehrere
    // Tabs). Ein Gespräch darf erneut verarbeitet werden, wenn es gewachsen ist —
    // aber nicht zweimal für denselben Nachrichtenstand.
    if (conversationId) {
      const { data: existing } = await supabase
        .from('conversations')
        .select('post_processed_message_count')
        .eq('id', conversationId)
        .maybeSingle();

      if (existing && existing.post_processed_message_count >= messages.length) {
        logger.info('Skipped — already processed for this message count', {
          conversationId,
          messageCount: messages.length,
          alreadyProcessed: existing.post_processed_message_count,
        });
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'idempotent' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    logger.info('Started', { conversationId, messageCount: messages.length });

    const conversationText = messages
      .map((m: any) => `${m.role === 'user' ? 'Nutzer' : 'Coach'}: ${m.content}`)
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
      runPrompt(anthropic, SESSION_NOTES_PROMPT, conversationText),
      runPrompt(anthropic, fileUpdatePrompt, conversationText),
      runPrompt(anthropic, profileUpdatePrompt, conversationText),
      runPrompt(anthropic, ANONYMOUS_SUMMARY_PROMPT, conversationText),
      runPrompt(anthropic, REFLECTION_PROMPT, conversationText),
      conversationCount >= 3
        ? runPrompt(anthropic, resonancePrompt, conversationText)
        : Promise.resolve(null),
    ]);

    // 3. Session-Notes speichern + conversations aktualisieren
    if (!sessionNotes.main_topic) {
      logger.warn('session_notes skipped — main_topic missing (runPrompt returned empty)', { conversationId });
    }
    if (conversationId && sessionNotes.main_topic) {
      const { error: snError } = await supabase.from('session_notes').upsert({
        conversation_id: conversationId,
        user_id: userId || null,
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
      if (snError) logger.error('session_notes write failed', { error: snError.message, conversationId });

      await supabase
        .from('conversations')
        .update({
          summary: sessionNotes.main_topic,
          open_thread: sessionNotes.where_we_left_off ?? null,
          open_thread_intensity: deriveIntensity(sessionNotes),
          post_processed_at: new Date().toISOString(),
          post_processed_message_count: messages.length,
        })
        .eq('id', conversationId);
    }

    // 4. Coach-Akte aktualisieren
    if (userId && Array.isArray(fileUpdates.updates)) {
      for (const update of fileUpdates.updates) {
        if (update.action === 'add' && update.label && update.category) {
          const { error: addError } = await supabase.from('coach_file_entries').insert({
            user_id: userId,
            source_conversation_id: conversationId || null,
            category: update.category,
            label: update.label,
            description: update.description ?? null,
            example: update.example ?? null,
            confidence: update.confidence ?? 2,
            linked_value: update.linked_value ?? null,
          });
          if (addError) {
            logger.error('coach_file_entries insert failed', { error: addError.message, conversationId, label: update.label });
          } else {
            logger.info('coach_file_entries entry added', { conversationId, label: update.label, category: update.category });
          }
        } else if (update.action === 'update' && update.entry_id) {
          const { data: entry, error: readError } = await supabase
            .from('coach_file_entries')
            .select('history')
            .eq('id', update.entry_id)
            .single();
          if (readError) {
            logger.error('coach_file_entries read (for update) failed', { error: readError.message, conversationId, entryId: update.entry_id });
          }

          const { error: updateError } = await supabase.from('coach_file_entries').update({
            confidence: update.new_confidence ?? undefined,
            status: update.new_status ?? undefined,
            last_updated: new Date().toISOString(),
            history: [...(entry?.history ?? []), {
              date: new Date().toISOString().split('T')[0],
              note: update.note,
              conversation_id: conversationId,
            }],
          }).eq('id', update.entry_id);
          if (updateError) {
            logger.error('coach_file_entries update failed', { error: updateError.message, conversationId, entryId: update.entry_id });
          } else {
            logger.info('coach_file_entries entry updated', { conversationId, entryId: update.entry_id });
          }
        } else if (update.action === 'resolve' && update.entry_id) {
          const { data: entry, error: readError } = await supabase
            .from('coach_file_entries')
            .select('history')
            .eq('id', update.entry_id)
            .single();
          if (readError) {
            logger.error('coach_file_entries read (for resolve) failed', { error: readError.message, conversationId, entryId: update.entry_id });
          }

          const { error: resolveError } = await supabase.from('coach_file_entries').update({
            status: 'resolved',
            last_updated: new Date().toISOString(),
            history: [...(entry?.history ?? []), {
              date: new Date().toISOString().split('T')[0],
              note: update.note,
              conversation_id: conversationId,
            }],
          }).eq('id', update.entry_id);
          if (resolveError) {
            logger.error('coach_file_entries resolve failed', { error: resolveError.message, conversationId, entryId: update.entry_id });
          } else {
            logger.info('coach_file_entries entry resolved', { conversationId, entryId: update.entry_id });
          }
        }
      }
    }

    // 4b. Stimmen-Kandidaten erkennen ("Innere Stimmen")
    // Nur prüfen, wenn mind. 3 unverknüpfte, aktive Coach-Akte-Einträge mit
    // confidence >= 3 vorliegen — sonst zu wenig Grundlage für ein Cluster.
    if (userId) {
      const unlinkedEntries = (fileEntries ?? []).filter((e: any) => !e.voice_id && e.confidence >= 3);

      if (unlinkedEntries.length >= 3) {
        const { data: namedVoices } = await supabase
          .from('inner_voices')
          .select('id, name, description')
          .eq('user_id', userId)
          .eq('status', 'named');

        const existingVoicesContext = namedVoices?.length
          ? namedVoices.map((v: any) => `[${v.id}] ${v.name}: ${v.description ?? ''}`).join('\n')
          : 'Noch keine benannten Stimmen vorhanden.';

        const voiceClusterPrompt = VOICE_CLUSTER_PROMPT
          .replace('{ENTRIES}', JSON.stringify(unlinkedEntries.map((e: any) => ({
            id: e.id, category: e.category, label: e.label, description: e.description,
          }))))
          .replace('{EXISTING_VOICES}', existingVoicesContext);

        const voiceCandidate = await runPrompt(anthropic, voiceClusterPrompt, conversationText);

        if (voiceCandidate.existing_voice_id && voiceCandidate.cluster_entry_ids?.length) {
          const { error: linkError } = await supabase.from('coach_file_entries')
            .update({ voice_id: voiceCandidate.existing_voice_id })
            .in('id', voiceCandidate.cluster_entry_ids);
          if (linkError) {
            logger.error('inner_voices link to existing voice failed', { error: linkError.message, conversationId });
          } else {
            await supabase.from('inner_voices')
              .update({ last_active_at: new Date().toISOString() })
              .eq('id', voiceCandidate.existing_voice_id);
            logger.info('inner_voices entries linked to existing voice', { conversationId, voiceId: voiceCandidate.existing_voice_id, entryCount: voiceCandidate.cluster_entry_ids.length });
          }
        } else if (voiceCandidate.cluster_entry_ids?.length >= 3) {
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
            logger.error('inner_voices insert failed', { error: voiceError.message, conversationId });
          } else {
            const { error: linkError } = await supabase.from('coach_file_entries')
              .update({ voice_id: newVoice.id })
              .in('id', voiceCandidate.cluster_entry_ids);
            if (linkError) {
              logger.error('inner_voices link to new voice failed', { error: linkError.message, conversationId, voiceId: newVoice.id });
            } else {
              logger.info('inner_voices candidate created', { conversationId, voiceId: newVoice.id, entryCount: voiceCandidate.cluster_entry_ids.length });
            }
          }
        }
      }
    }

    // 5. Personenprofil aktualisieren
    if (userId && Object.keys(profileUpdates).length > 0) {
      const patch: any = { user_id: userId, last_updated: new Date().toISOString() };
      if (conversationId) patch.last_enriched_by = conversationId;
      if (profileUpdates.occupation)          patch.occupation = profileUpdates.occupation;
      if (profileUpdates.relationship_status) patch.relationship_status = profileUpdates.relationship_status;
      if (profileUpdates.family_situation)    patch.family_situation = profileUpdates.family_situation;
      if (profileUpdates.life_phase)          patch.life_phase = profileUpdates.life_phase;
      if (profileUpdates.current_focus)       patch.current_focus = profileUpdates.current_focus;

      if (profileUpdates.known_values_add?.length) {
        const existing = currentProfile?.known_values ?? [];
        patch.known_values = [...new Set([...existing, ...profileUpdates.known_values_add])];
      }
      if (profileUpdates.known_stressors_add?.length) {
        const existing = currentProfile?.known_stressors ?? [];
        patch.known_stressors = [...new Set([...existing, ...profileUpdates.known_stressors_add])];
      }
      if (profileUpdates.known_resources_add?.length) {
        const existing = currentProfile?.known_resources ?? [];
        patch.known_resources = [...new Set([...existing, ...profileUpdates.known_resources_add])];
      }

      const { error: profileError } = await supabase.from('coachee_profile').upsert(patch, { onConflict: 'user_id' });
      if (profileError) {
        logger.error('coachee_profile upsert failed', { error: profileError.message, conversationId, userId });
      } else {
        logger.info('coachee_profile updated', { conversationId, userId, fields: Object.keys(patch) });
      }
    }

    // 6. Anonymes Muster + RAG-Eintrag speichern
    if (anonSummary.context && anonSummary.pattern) {
      let embedding: number[] | null = null;
      if (openaiKey) {
        const textToEmbed = [anonSummary.context, anonSummary.pattern, anonSummary.what_helped]
          .filter(Boolean).join(' — ');
        embedding = await generateEmbedding(textToEmbed, openaiKey);
      }

      const patternRow: any = {
        context: anonSummary.context,
        pattern: anonSummary.pattern,
        resistance: anonSummary.resistance ?? null,
        what_helped: anonSummary.what_helped ?? null,
        what_blocked: anonSummary.what_blocked ?? null,
        outcome: anonSummary.outcome ?? 'unknown',
      };
      if (embedding) patternRow.embedding = JSON.stringify(embedding);
      const { error: patternError } = await supabase.from('experience_patterns').insert(patternRow);
      if (patternError) {
        logger.error('experience_patterns insert failed', { error: patternError.message, conversationId });
      } else {
        logger.info('experience_patterns entry saved', { conversationId, pattern: patternRow.pattern });
      }
    }

    // 7. Muster-Referenzen speichern (für "Verstehen"-Modul)
    if (userId && conversationId && Array.isArray(anonSummary.pattern_references)) {
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
          logger.error('pattern_references insert failed', { error: refsError.message, conversationId, count: refs.length });
        } else {
          logger.info('pattern_references saved', { conversationId, count: refs.length });
        }
      }
    }

    // 7b. Automatische Insights speichern
    if (userId && conversationId && Array.isArray(anonSummary.insights)) {
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
          logger.error('insights insert failed', { error: insightError.message, conversationId, count: insightRows.length });
        } else {
          logger.info('Insights saved', { conversationId, count: insightRows.length });
        }
      }
    }

    // 8. Coach-Selbstreflexion speichern
    if (reflection.what_worked || reflection.improvement_note) {
      const { error: reflectionError } = await supabase.from('coach_reflections').insert({
        conversation_id: conversationId || null,
        was_helpful: reflection.was_helpful ?? null,
        what_worked: reflection.what_worked ?? null,
        what_missed: reflection.what_missed ?? null,
        resistance_detected: reflection.resistance_detected ?? false,
        resistance_handled: reflection.resistance_handled ?? null,
        improvement_note: reflection.improvement_note ?? null,
      });
      if (reflectionError) {
        logger.error('coach_reflections insert failed', { error: reflectionError.message, conversationId });
      } else {
        logger.info('coach_reflections saved', { conversationId });
      }
    }

    // 9. Resonanzkarte aktualisieren (Idee 05 — ab 3. Gespräch)
    if (userId && resonanceUpdate && Object.keys(resonanceUpdate).length > 0) {
      const patch: any = { user_id: userId, last_updated: new Date().toISOString() };

      if (resonanceUpdate.opening_patterns_add?.length) {
        const existing = currentResonanceMap?.opening_patterns ?? [];
        patch.opening_patterns = [...new Set([...existing, ...resonanceUpdate.opening_patterns_add])];
      }
      if (resonanceUpdate.closing_patterns_add?.length) {
        const existing = currentResonanceMap?.closing_patterns ?? [];
        patch.closing_patterns = [...new Set([...existing, ...resonanceUpdate.closing_patterns_add])];
      }
      if (resonanceUpdate.effective_styles_add?.length) {
        const existing = currentResonanceMap?.effective_styles ?? [];
        patch.effective_styles = [...new Set([...existing, ...resonanceUpdate.effective_styles_add])];
      }
      if (resonanceUpdate.resonant_metaphors_add?.length) {
        const existing = currentResonanceMap?.resonant_metaphors ?? [];
        patch.resonant_metaphors = [...new Set([...existing, ...resonanceUpdate.resonant_metaphors_add])];
      }
      if (resonanceUpdate.preferred_pace && resonanceUpdate.preferred_pace !== 'null') {
        patch.preferred_pace = resonanceUpdate.preferred_pace;
      }

      const { error: resonanceError } = await supabase.from('resonance_map').upsert(patch, { onConflict: 'user_id' });
      if (resonanceError) {
        logger.error('resonance_map upsert failed', { error: resonanceError.message, conversationId, userId });
      } else {
        logger.info('resonance_map updated', { conversationId, userId, fields: Object.keys(patch) });
      }
    }

    logger.info('Completed', { conversationId });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const errorLogger = createLogger('post-conversation');
    errorLogger.error('Failed', { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
