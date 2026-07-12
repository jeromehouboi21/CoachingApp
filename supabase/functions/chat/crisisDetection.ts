// supabase/functions/chat/crisisDetection.ts
// Leichte Klassifikation auf akute Suizid-/Selbstverletzungs-Hinweise in einer
// einzelnen Nutzernachricht. Siehe konzept-krisenprotokoll-suizidalitaet-v1_1.md, Teil 1.

import Anthropic from 'npm:@anthropic-ai/sdk';

const CRISIS_CLASSIFIER_PROMPT = `Prüfe NUR auf konkrete, akute Hinweise auf
Suizidgedanken oder Selbstverletzungsabsicht im folgenden Text — nicht auf
allgemeine Verzweiflung, Erschöpfung oder Trauer, die gehören zum normalen
Coaching-Gespräch.

Text: "{userMessage}"

Antworte NUR mit JSON:
{
  "acute_risk": true/false,
  "confidence": "low" | "medium" | "high",
  "reasoning": "1 Satz, intern, nicht für den Nutzer sichtbar"
}

Beispiele für acute_risk = true: konkrete Suizidgedanken, Todeswunsch mit
Handlungsabsicht, Ankündigung von Selbstverletzung.
Beispiele für acute_risk = false: "Ich halte das nicht mehr aus", "Ich will
nicht mehr so weiterleben wie bisher" (kann Coaching-Thema sein, keine
automatische Krise), allgemeine Erschöpfung.

Im Zweifel: acute_risk = true. Falsch-positiv ist hier der sicherere Fehler.`;

export interface CrisisClassification {
  acute_risk: boolean;
  confidence: 'low' | 'medium' | 'high';
  reasoning?: string;
}

// Darf die normale Antwort niemals blockieren — schlägt die Klassifikation
// selbst fehl (API-Fehler, kaputtes JSON), gilt im Zweifel: normale
// Coaching-Antwort statt gar keine Antwort (siehe Konzept-Dokument, Teil 5.2).
export async function detectCrisis(anthropic: Anthropic, userMessage: string): Promise<CrisisClassification> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: CRISIS_CLASSIFIER_PROMPT.replace('{userMessage}', userMessage),
      }],
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(text);
    const confidence: CrisisClassification['confidence'] =
      parsed.confidence === 'medium' || parsed.confidence === 'high' ? parsed.confidence : 'low';
    return {
      acute_risk: !!parsed.acute_risk,
      confidence,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
    };
  } catch {
    return { acute_risk: false, confidence: 'low' };
  }
}
