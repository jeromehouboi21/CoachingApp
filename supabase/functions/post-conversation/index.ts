// supabase/functions/post-conversation/index.ts
// Aufgerufen nach jedem abgeschlossenen Gespräch (fire-and-forget vom Frontend)
// 4 parallele Prompts: Session-Notes · Akte-Updates · Profil-Update · Anonyme RAG-Zusammenfassung
// + Coach-Selbstreflexion

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js';

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
      "confidence": 2
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
- Leeres updates-Array ist vollkommen okay`;

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
  ]
}

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
  "improvement_note": "Ein konkreter Hinweis für zukünftige ähnliche Gespräche",
  "language_violations": []
}

SPRACHCHECK: Prüfe deine eigenen Antworten im Gespräch auf verbotene Wörter
(müssen, immer als Absolutheitsaussage, nie als Absolutheitsaussage, können nicht).
Trage Verstöße in language_violations ein — für die Qualitätssicherung.`;

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
      max_tokens: 600,
      messages: [{ role: 'user', content: `${prompt}\n\nGespräch:\n${conversationText}` }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    });
  }

  try {
    const { messages, conversationId, userId } = await req.json();

    if (!messages || messages.length < 3) {
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
    if (conversationId && sessionNotes.main_topic) {
      await supabase.from('session_notes').upsert({
        conversation_id: conversationId,
        user_id: userId || null,
        main_topic: sessionNotes.main_topic,
        emotional_intensity: sessionNotes.emotional_intensity ?? null,
        resistance_detected: sessionNotes.resistance_detected ?? false,
        resistance_location: sessionNotes.resistance_location ?? null,
        breakthrough_moment: sessionNotes.breakthrough_moment ?? null,
        where_we_left_off: sessionNotes.where_we_left_off ?? null,
        coach_effectiveness: sessionNotes.coach_effectiveness ?? null,
        next_session_rec: sessionNotes.next_session_rec ?? null,
        file_updates: fileUpdates.updates ?? [],
      });

      await supabase
        .from('conversations')
        .update({
          summary: sessionNotes.main_topic,
          open_thread: sessionNotes.where_we_left_off ?? null,
          open_thread_intensity: deriveIntensity(sessionNotes),
        })
        .eq('id', conversationId);
    }

    // 4. Coach-Akte aktualisieren
    if (userId && Array.isArray(fileUpdates.updates)) {
      for (const update of fileUpdates.updates) {
        if (update.action === 'add' && update.label && update.category) {
          await supabase.from('coach_file_entries').insert({
            user_id: userId,
            source_conversation_id: conversationId || null,
            category: update.category,
            label: update.label,
            description: update.description ?? null,
            example: update.example ?? null,
            confidence: update.confidence ?? 2,
          });
        } else if (update.action === 'update' && update.entry_id) {
          const { data: entry } = await supabase
            .from('coach_file_entries')
            .select('history')
            .eq('id', update.entry_id)
            .single();

          await supabase.from('coach_file_entries').update({
            confidence: update.new_confidence ?? undefined,
            status: update.new_status ?? undefined,
            last_updated: new Date().toISOString(),
            history: [...(entry?.history ?? []), {
              date: new Date().toISOString().split('T')[0],
              note: update.note,
              conversation_id: conversationId,
            }],
          }).eq('id', update.entry_id);
        } else if (update.action === 'resolve' && update.entry_id) {
          const { data: entry } = await supabase
            .from('coach_file_entries')
            .select('history')
            .eq('id', update.entry_id)
            .single();

          await supabase.from('coach_file_entries').update({
            status: 'resolved',
            last_updated: new Date().toISOString(),
            history: [...(entry?.history ?? []), {
              date: new Date().toISOString().split('T')[0],
              note: update.note,
              conversation_id: conversationId,
            }],
          }).eq('id', update.entry_id);
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

      await supabase.from('coachee_profile').upsert(patch, { onConflict: 'user_id' });
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
      await supabase.from('experience_patterns').insert(patternRow);
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
      if (refs.length) await supabase.from('pattern_references').insert(refs);
    }

    // 8. Coach-Selbstreflexion speichern
    if (reflection.what_worked || reflection.improvement_note) {
      await supabase.from('coach_reflections').insert({
        conversation_id: conversationId || null,
        was_helpful: reflection.was_helpful ?? null,
        what_worked: reflection.what_worked ?? null,
        what_missed: reflection.what_missed ?? null,
        resistance_detected: reflection.resistance_detected ?? false,
        resistance_handled: reflection.resistance_handled ?? null,
        improvement_note: reflection.improvement_note ?? null,
      });
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

      await supabase.from('resonance_map').upsert(patch, { onConflict: 'user_id' });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
