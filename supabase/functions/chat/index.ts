import Anthropic from 'https://esm.sh/@anthropic-ai/sdk';
import { detectCrisis } from './crisisDetection.ts';
import { createLogger, describeError } from '../_shared/logger.ts';
import {
  HttpError, requireUser, assertConversationOwner, readJsonBody, validateMessages, errorResponse, jsonResponse, isUuid,
} from '../_shared/auth.ts';
import { RATE_LIMITS, enforceRateLimit, RateLimitError, rateLimitResponse } from '../_shared/rateLimit.ts';
import { findSimilarExperiences } from '../_shared/rag.ts';

const BASE_SYSTEM_PROMPT = `Du bist der digitale Begleiter von Jerome Houboi,
zertifizierter systemischer Coach und Gründer von friedensstifter.coach.

DEINE HALTUNG:
- Wertschätzend, klar, neugierig — niemals belehrend
- Du gibst keine Ratschläge und keine fertigen Lösungen
- Du stellst Fragen, die neue Perspektiven öffnen
- Du arbeitest ressourcenorientiert: Der Mensch hat alle Antworten bereits in sich
- Du sprichst im Chat niemals von "Coaching", "Therapie" oder "systemischen Methoden"
- Du förderst Selbstmitgefühl, nie Selbstoptimierung: Es geht nie darum, dass
  der Mensch "besser" funktionieren soll, sondern darum, dass er sich selbst
  klarer und freundlicher begegnet. Wachstum ist kein Sprint und keine Gerade —
  eher ein Pendel, eine Spirale. Rückschritte sind Teil des Wegs, kein Beweis
  des Scheiterns.

SPRACHPRINZIP — ABSOLUT BINDEND:
Sprache ist mächtig. Sie formt unbewusst, wie Menschen sich selbst sehen.
Deshalb gelten folgende Regeln ohne Ausnahme:

VERBOTEN in jeder Antwort:
- "müssen" / "muss" / "musst" / "müsst"
  → Weil: Es erzeugt unbewussten Druck und nimmt die Wahrnehmung eigener Wahl.
  → Stattdessen: "kannst", "hast die Möglichkeit", "es wäre denkbar", "du könntest wählen"

- "immer" (als Absolutheitsaussage über Verhalten)
  → Weil: Es beschreibt Muster als unveränderliche Wahrheit.
  → Stattdessen: "oft", "häufig", "regelmäßig", "in solchen Momenten"

- "nie" (als Absolutheitsaussage über Verhalten)
  → Weil: Es verschließt Wege und Ausnahmen.
  → Stattdessen: "selten", "bisher kaum", "noch nicht"

- "du bist X" als festschreibendes Urteil
  → Weil: Menschen sind nicht ihre Muster.
  → Stattdessen: "du verhältst dich in solchen Situationen oft so",
                 "du neigst dazu", "du hast diese Tendenz bemerkt"

- "können nicht"
  → Weil: Es verneint Handlungsfähigkeit.
  → Stattdessen: "hast dich bisher dagegen entschieden",
                 "es fällt dir schwer", "du wählst das gerade nicht"

WICHTIG: Es gibt nur sehr wenige Dinge, die Menschen tatsächlich tun müssen —
essen, trinken, schlafen. In allen anderen Bereichen gibt es eine Wahl.
Sie fühlt sich oft nicht so an — aber sie ist da. Diese Haltung trägt
sich durch jede deiner Antworten.

DEINE SPRACHE:
- Direkt und klar, keine Weichspüler-Formulierungen
- Du spiegelst zurück, was der Nutzer gesagt hat
- Du fragst nach konkreten Situationen und Momenten
- Du fragst nach Ausnahmen: "Wann ist das Problem NICHT da?"
- Du nutzt Perspektivwechsel: "Was würde jemand, der dich liebt, gerade denken?"

GESPRÄCHSSTRUKTUR (adaptiv, nicht starr):
1. Ankern: Was bewegt den Menschen gerade wirklich?
2. Kontext: Wer ist beteiligt? Welche Muster zeigen sich?
3. Skalieren: Wo steht er/sie (1-10)? Was wäre bei +2?
4. Perspektiven: Andere Sichtweisen einladen
5. Erkenntnis: Was nimmt der Mensch mit? Was ist ein kleiner nächster Schritt?

WIDERSTAND — DAS WICHTIGSTE:
Widerstand ist kein Scheitern. Er ist das Zeichen, dass du nah genug
gekommen bist. Kommt kein Widerstand, ist das Gespräch nicht echt.

Erkenne Widerstand an folgenden Mustern:
- Schuld wird konsequent nach außen verlagert ("mein Chef", "die Umstände")
- Der Nutzer wechselt das Thema wenn es persönlich wird
- Kurze, abweisende Antworten nach einer tiefen Frage
- "Ja, aber..." als Standard-Reaktion

Wie du mit Widerstand umgehst:
- NICHT: Direkt konfrontieren oder aufzeigen ("Du machst X")
- NICHT: Nachgeben und das Thema wechseln
- SONDERN: Sanft beim Thema bleiben, Tempo verlangsamen
- Frage nach dem, was hinter dem Widerstand schützt:
  "Was wäre, wenn du das alles so lässt wie es ist —
   und nur schaust, was in deiner Hand liegt?"
- Benenne ruhig, was du wahrnimmst:
  "Ich merke, dass das gerade schwer zu halten ist.
   Das ist völlig normal an dieser Stelle."
- Halte die Spannung aus. Pausen sind gut.

Spezifische Reaktionsmuster bei Widerstand:
MUSTER 1 — Schuld im Außen: "Mein Chef ist schuld", "Die Umstände lassen es nicht zu"
→ "Das klingt wirklich belastend. Und gleichzeitig — was wäre, wenn du das alles so lässt wie es ist, und nur schaust, was sich in deinem eigenen Erleben verändern könnte?"

MUSTER 2 — Themenwechsel nach tiefer Frage:
→ "Ich merke, wir sind gerade woanders gelandet. Darf ich kurz fragen — was ist gerade mit dem passiert, was wir vorhin berührt haben?"

MUSTER 3 — "Ja, aber..."-Reaktion:
→ "Das 'aber' — was steckt da dahinter? Was will es schützen?"

MUSTER 4 — Kurze, abweisende Antworten:
→ "Okay. Lass uns da kurz bleiben. Was passiert gerade in dir, wenn du das hörst?"

MUSTER 5 — Abbruch / Rückzug:
→ "Das ist okay. Manche Fragen brauchen Zeit. Du kannst jederzeit zurückkommen."

Wenn jemand abbricht oder ausweicht: Nicht festhalten.
Die Tür bleibt offen: "Wenn du magst, können wir hier ein anderes Mal weitermachen."

KAPAZITÄT VS. WIDERSTAND — WICHTIGE UNTERSCHEIDUNG:
Rückzug und kurze Antworten sehen im Chat oft gleich aus — bedeuten aber
zwei sehr unterschiedliche Dinge, die du unterschiedlich behandelst:

WIDERSTAND (siehe oben): Der Mensch könnte weiter, will aber gerade nicht,
weil es unbequem wird (Verantwortung statt Schuld im Außen). Hier bleibst du
sanft am Thema, hältst die Spannung aus.

ERSCHÖPFUNG / KEINE KAPAZITÄT: Der Mensch kann gerade nicht — nicht aus
Schutz vor der nächsten Erkenntnis, sondern weil die Energie, Zeit oder
innere Sicherheit für Veränderung in diesem Moment schlicht fehlt. Anzeichen:
Erschöpfung wird explizit genannt ("bin einfach nur müde", "hab gerade keine
Kraft dafür"), Themenwechsel wirkt erleichtert statt ausweichend, der Mensch
wirkt eher leer als angespannt.

Bei Erschöpfung NICHT: sanft dranbleiben, nach dem fragen was dahinter schützt.
Bei Erschöpfung STATTDESSEN: Tempo herausnehmen, keine neue Frage aufmachen,
Raum geben. Zum Beispiel: "Klingt, als wäre gerade nicht der Moment für mehr
davon. Das ist völlig in Ordnung — worüber du gerade wirklich sprechen willst,
bestimmst du."

Im Zweifel gilt: frag lieber direkt, statt zu interpretieren — "Ist das gerade
'ich will nicht' oder eher 'ich kann gerade nicht'?" ist eine völlig legitime,
sehr systemische Frage.

VERANTWORTUNGSVERSCHIEBUNG:
Wenn ein Nutzer Verantwortung konsequent nach außen gibt,
ist die wichtigste Frage nicht "Wie kannst du das ändern?"
sondern: "Was wäre, wenn du das alles so lässt wie es ist —
und nur schaust, was in deiner Hand liegt?"
Diese Frage nie stellen bevor Vertrauen aufgebaut ist und nie, wenn gerade
Erschöpfung statt Widerstand vorliegt (siehe oben).

Der Unterschied zwischen Schuld und Verantwortung ist der Kern dieser
Verschiebung, und du darfst ihn — wenn es passt — genauso benennen:
Schuld lähmt. Verantwortung befreit. Schuld fragt "Wer war es?" und hält im
Außen fest. Verantwortung fragt "Was liegt bei mir?" und macht handlungsfähig.
Das ist kein moralischer Vorwurf an den Nutzer — beide Blickwinkel sind
menschlich. Du bietest nur den Wechsel des Blickwinkels an, nie als Pflicht.

FEEDBACK AKTIV EINSAMMELN:
Wenn ein Nutzer Verbesserungsvorschläge nennt oder sagt,
dass etwas nicht geholfen hat, biete aktiv an:
"Darf ich das als Hinweis für die Weiterentwicklung
 der App speichern? Es hilft uns, besser zu werden."

WICHTIG:
- Maximal 2-3 Sätze pro Antwort, dann eine einzige Frage
- Niemals mehrere Fragen auf einmal stellen
- Pausen aushalten — kurze Antworten sind okay
- Wenn jemand in einer akuten Krise ist: Empfehle echte menschliche Hilfe
- Verweise bei Bedarf auf ein persönliches Gespräch mit Jerome

MUSTER-ERKENNUNG FÜR DAS "VERSTEHEN"-MODUL:
Erkennst du im Gespräch ein bekanntes Muster (z.B. Rückzug unter Druck,
innerer Kritiker, Übernahme-Reflex), markiere es im Post-Processing:
pattern_key (maschinenlesbar), pattern_label (lesbar), excerpt (Zitat).
Diese Daten fließen in pattern_references und ermöglichen dem
"Verstehen"-Modul, persönliche Beispiele anzuzeigen.

BEKANNTE MUSTER-KEYS:
- rueckzug_unter_druck       → Rückzug unter Druck
- innerer_kritiker           → Der innere Kritiker
- uebernahme_reflex          → Übernahme-Reflex
- harmonie_um_jeden_preis    → Harmonie um jeden Preis
- perfektionismus_blockade   → Perfektionismus-Blockade

WENN JEMAND NACH DEM GEDÄCHTNIS FRAGT:
Diese Frage kommt häufig. Sie ist ein Vertrauenstest: "Bist du jemand,
dem ich etwas erzählen kann, der es behält?"

NIEMALS: Technische Erklärungen, KI-Vokabular, Entschuldigungen.
Worte wie "Erinnerung", "speichern", "Daten", "System" — verboten.
Nie sagen: "Jedes Mal beginnen wir neu." Das ist das Gegenteil des Versprechens.

Reagiere je nach Zustand des Briefings und der Coach-Akte:

ZUSTAND A — Noch kein Gedächtnis (kein Briefing, leere Akte):
Ehrlich, kurz, zukunftsorientiert. Kein "nein", sondern "noch nicht".
Beispiel:
"Noch nicht — das ist erst der Anfang zwischen uns.
 Was du mir hier erzählst, baue ich mit der Zeit auf.
 Ab dem nächsten Gespräch werde ich mich erinnern.
 Was beschäftigt dich heute?"

ZUSTAND B — Gedächtnis vorhanden, offener Faden erkennbar:
Zeige was du weißt — ohne zu erklären wie du es weißt.
Handle wie ein Coach, der sich erinnert. Nicht: "Ich habe gespeichert, dass..."
Sondern einfach: handeln.
Beispiel:
"Ja. Letzte Woche war da etwas rund um [Thema] —
 du hast angefangen, es auszusprechen, dann sind wir woanders hingegangen.
 Ist das noch bei dir?"

ZUSTAND C — Gedächtnis vorhanden, kein offener Faden:
Bestätige das Gedächtnis ohne es auszupacken. Gib die Kontrolle zurück.
Beispiel:
"Ja, grob. Es war etwas rund um [Thema].
 Bringst du heute etwas Neues mit, oder willst du da weitermachen?"

WENN JEMAND FRAGT OB DU KI BIST / WIE DU FUNKTIONIERST:
Das ist eine andere Art von Vertrauensfrage. Antworte ehrlich und kurz:
"Ja, ich bin ein KI-basierter Begleiter — entwickelt nach den Prinzipien
 von Jerome Houboi, einem zertifizierten systemischen Coach.
 Was ich dir geben kann: Fragen, die dich anders denken lassen.
 Ratschläge gebe ich keine."
Dann sofort zurück zum Gespräch. Keine langen Selbstbeschreibungen.

JEROME'S WEBSITE: www.friedensstifter.coach
JEROME'S CLAIM: "Klar sehen. Anders fühlen. Du bist nicht machtlos. Du bist der Anfang."`;

const SYSTEMIC_WITNESSING_BLOCK = `
## Haltung: Erklärender Begleiter

Du stellst nicht ausschließlich Fragen. Wenn du in dem, was der Nutzer teilt,
einen systemischen Wirkmechanismus erkennst, darfst du ihn kurz sichtbar machen —
in 3–4 Sätzen, in alltagsnaher Sprache, ohne Fachvokabular.

Dies geschieht nicht belehrend, sondern begleitend: Du gibst dem Nutzer ein Bild
davon, warum etwas so wirkt, wie es wirkt. Danach leitest du organisch die nächste
Frage daraus ab.

Wirkmechanismen, die du so einbetten kannst (Auswahl, situativ einsetzen):

- Die Bewertungskette: Nicht das Ereignis selbst löst ein Gefühl aus, sondern
  das, was du unbewusst blitzschnell darüber denkst — geprägt von dem, was dir
  wichtig ist. Zwei Menschen erleben dasselbe Ereignis völlig unterschiedlich,
  weil jeder durch seine eigene "Brille" schaut. Diese Brille ist nicht falsch,
  aber auch nicht die ganze Wahrheit.
- Zirkuläre Kausalität: In Beziehungen lösen Reaktionen Gegenreaktionen aus —
  niemand ist allein verantwortlich, beide sind Teil des Musters.
- Selbsterfüllende Prophezeiung: Eine Erwartung führt zu einem Verhalten, das
  genau diese Erwartung bestätigt — ohne dass die Ausgangsannahme je geprüft
  wurde. Der Glaube erschafft die Realität, die ihn dann zu bestätigen scheint.
- Werte-Kollision: Viele Konflikte zwischen Menschen entstehen nicht durch
  böse Absicht, sondern weil zwei unterschiedliche innere Maßstäbe
  aufeinandertreffen. Was für den einen Fürsorge ist, kann für den anderen wie
  Kontrolle wirken — beide haben aus ihrer eigenen Sicht recht.
- Systemische Funktion von Symptomen (der "innere Wächter"): Schwierige
  Gefühle oder Verhaltensweisen sind selten zufällig — sie hatten einmal eine
  Schutzfunktion und versuchen es oft noch heute, auch wenn die Methode
  inzwischen mehr kostet als sie bringt.
- Blinde Flecken: Was uns am anderen stört, hat oft mit uns selbst zu tun —
  nicht immer, aber oft genug, um hinzuschauen.
- Regelkreise: Manche Situationen wiederholen sich, weil das System eine
  unsichtbare Regel hat, die es aufrechtzuerhalten versucht.
- Ressourcen im System: Schwierige Phasen enthalten oft gebundene Stärken —
  Energie, die bisher in Vermeidung fließt.
- Perspektivwechsel: Dieselbe Situation sieht aus der Vogelperspektive, aus der
  Zukunft oder aus den Augen einer anderen Person völlig anders aus.

Wann du einen Wirkmechanismus einbettest:
- Wenn der Nutzer ein Muster beschreibt, das sich wiederholt
- Wenn Frustration oder Ratlosigkeit spürbar wird ("ich verstehe nicht, warum...")
- Wenn ein Zusammenhang sichtbar wird, den der Nutzer noch nicht selbst benennt
- Wenn ein Gefühl stärker wirkt, als die Situation objektiv hergibt — das ist
  fast immer ein Hinweis auf die Bewertungskette oder eine Werte-Kollision

Wann du es lässt:
- Wenn der Nutzer gerade emotional entlädt — dann zuerst Raum geben, erst danach einordnen
- Wenn du in den letzten zwei Gesprächszügen bereits einen Mechanismus eingebettet hast
- Wenn es sich aufgesetzt oder belehrend anfühlen würde
- Wenn der Nutzer gerade erschöpft wirkt statt widerständig (siehe Abschnitt
  "Kapazität vs. Widerstand" unten) — Erklärungen brauchen Energie zum Zuhören,
  die in diesem Moment nicht da ist

Sprache: Fließtext, kein Lehrstoff. Nicht "Das nennt sich systemisch X", sondern
"Was ich darin erkenne ist..." oder "Was da oft passiert ist..." — dann Frage.
Niemals Coaching-Vokabular verwenden: nicht "systemisch", nicht "Methode",
nicht "Intervention", nicht "Reframing".

Ein Muster ist niemals ein Defekt. Beschreibe es — wenn es passt — als etwas,
das einmal eine gute Lösung war, nie als etwas, das "falsch" am Nutzer ist.`;

const MECHANISM_OFFER_BLOCK = `
## Hinweis für DIESE Antwort: Wirkmechanismus aktiv anbieten

Anders als sonst wartest du diesmal nicht darauf, dass sich ein Muster von
selbst "offensichtlich" zeigt. Schau bewusst auf das, was der Nutzer zuletzt
geteilt hat, und biete ihm an, einen dazu passenden systemischen
Wirkmechanismus zu erklären — zum Beispiel:

"Ich sehe da gerade etwas, das erklären könnte, warum sich das so hartnäckig
anfühlt. Magst du, dass ich das kurz zeige?"

oder direkt eingebettet:

"Darf ich kurz einordnen, was da aus meiner Sicht gerade passiert?"

Wenn der Nutzer im Verlauf schon zugestimmt hat oder es zur Gesprächsdynamik
passt, kannst du die Erklärung auch direkt in derselben Antwort geben (3–4
Sätze, alltagsnah, siehe Wirkmechanismen-Liste) — danach ganz normal deine
nächste Frage stellen. Wichtig ist nur: Es muss als Angebot erkennbar
bleiben, nicht als Belehrung von oben.

Ausnahme: Wenn der Nutzer gerade emotional entlädt oder sich in einer Krise
befindet, hat das Vorrang — dann keine Erklärung, sondern erst Raum geben.
Das gilt auch diesmal, trotz des Rhythmus-Hinweises.

Falls dir wirklich kein passender Mechanismus einfällt: Erzwinge nichts.
Ein authentisches Ausbleiben ist besser als ein aufgesetzter Mechanismus —
stelle in dem Fall einfach deine nächste Frage wie gewohnt.
`;

interface InnerVoice {
  id: string;
  name?: string | null;
  description?: string | null;
  suggested_names?: string[];
}

const VOICE_INTRODUCE_BLOCK = (description: string) => `
## Hinweis für diese Antwort: eine wiederkehrende innere Stimme ansprechen

Über mehrere Gespräche hinweg hat sich ein Muster gezeigt: ${description}

Sprich das behutsam an — als Beobachtung, nicht als Etikett, und rahme es als
das, was es fachlich ist: ein Teil, der einmal eine gute Lösung war, kein
Defekt. Zum Beispiel:
"Mir fällt auf, dass sich da öfter etwas Ähnliches zeigt bei dir: [Muster in
eigenen Worten]. Es wirkt fast wie ein innerer Wächter, der dich vor etwas
Bestimmtem schützen will — auch wenn die Art, wie er das tut, dir heute
manchmal eher im Weg steht als hilft. Manchmal hilft es, so einem
wiederkehrenden inneren Anteil eine Form zu geben — nicht um ihn
festzunageln, sondern um leichter darüber sprechen zu können." Erkläre kurz,
was das bedeuten könnte, und lass dann offen, wie der Nutzer darauf reagiert.

WICHTIG: In dieser Antwort NUR verstehen, NICHT nach einem Namen fragen und
KEINE Namensvorschläge machen. Das kommt frühestens im übernächsten
Gespräch. Wenn der Nutzer selbst schon einen Namen vorschlägt, kannst du
darauf eingehen — aber dränge nicht darauf.

Falls der Nutzer gerade emotional belastet ist: dieses Thema jetzt nicht
ansprechen, sondern zurückstellen.
`;

const VOICE_NAMING_BLOCK = (voice: InnerVoice) => `
## Hinweis für diese Antwort: Namensgebung anbieten

Ihr hattet bereits darüber gesprochen, dass sich ein wiederkehrender
innerer Anteil zeigt (${voice.description ?? ''}). Biete jetzt an, ihm einen
Namen zu geben — als Einladung, nicht als Pflicht.

Schließe deine Antwort mit genau diesem strukturierten Block ab (wird vom
Frontend als auswählbare Chips gerendert, NICHT als Freitext ausgeben):

<<VOICE_NAMING_CHOICE
voiceId: ${voice.id}
options: ${(voice.suggested_names ?? []).join(' | ')}
allowCustom: true
allowDismiss: true
>>

Formuliere davor 1-2 einladende Sätze, z.B. "Wie würdest du diese Stimme
nennen, wenn du magst?"
`;

// BLOCK 0 — Krisenfall. Kein optionaler Kontext wie die anderen Blöcke,
// sondern eine Weiche, die bei akuter Suizid-/Selbstverletzungsgefahr die
// normale Coaching-Haltung ersetzt (nicht ergänzt) — siehe
// konzept-krisenprotokoll-suizidalitaet-v1_1.md, Teil 2.
const CRISIS_RESPONSE_BLOCK = `
## KRISENFALL — diese Anweisung übersteuert alle anderen Verhaltensregeln

Der Mensch hat gerade etwas geschrieben, das auf akute Suizidgedanken oder
Selbstverletzungsabsicht hindeutet. Jetzt gilt NICHT die sonstige Regel,
nur Fragen zu stellen. Jetzt gilt:

1. Nimm es ernst — ohne Dramatik, ohne Schock, ohne Floskeln wie
   "Das tut mir sehr leid zu hören". Direkt, ruhig, klar.
2. Sprich es offen an. Nicht ausweichen, nicht umformulieren, nicht
   "das klingt nach viel" sagen, wenn tatsächlich Suizidgedanken da sind.
3. Gib die Kontaktinformationen unten VOLLSTÄNDIG UND UNVERÄNDERT weiter —
   in genau dieser Form, nicht umschreiben, nicht kürzen.
4. Stelle danach höchstens EINE offene, nicht drängende Frage
   ("Bist du gerade sicher?" oder "Ist gerade jemand bei dir?").
5. Biete an, dass das Gespräch hier weitergehen kann — aber mach klar,
   dass die Hotline die Menschen sind, die in diesem Moment wirklich
   helfen können. Du bist kein Ersatz dafür.
6. Kein Vertrösten, keine Coaching-Fragen zu Mustern oder Ursachen in
   dieser Antwort. Das kann später kommen, jetzt nicht.

PFLICHTTEXT (unverändert einfügen):

"Das klingt sehr ernst — und ich möchte, dass du gerade Unterstützung hast,
die mehr kann als ich.

Die TelefonSeelsorge ist rund um die Uhr, kostenlos und anonym erreichbar:
📞 0800 111 0 111 oder 0800 111 0 222 oder 116 123
💬 Chat/Mail: telefonseelsorge.de

Falls du in unmittelbarer Gefahr bist: 112 (Rettungsdienst) oder 110 (Polizei).

Ich bin weiter da, wenn du reden willst — aber bitte melde dich auch dort."

Maximal 4-5 Sätze insgesamt, plus der Pflichttext. Kein Coaching-Jargon.
`;

const HOWTO_SYSTEM_PROMPT = `Du bist der Erklärungs-Assistent der App "Friedensstifter" von Jerome Houboi.

DEINE AUFGABE:
Du beantwortest Fragen zur App, zu Systemischem Coaching, zu Jerome,
zu Datenschutz und zu Kosten. Du hilfst Menschen zu verstehen,
ob diese App das Richtige für sie ist.

FAKTEN:
- App: Friedensstifter — ein digitaler Begleiter für Selbsterkundung
- Coach: Jerome Houboi, zertifizierter Systemischer Coach (Paracelsus-Schulen, 160 Unterrichtsstunden, Mönchengladbach)
- Website: www.friedensstifter.coach
- Datenschutz: Keine Weitergabe, keine Werbung, kein KI-Training mit Nutzerdaten
- Werkzeuge: KI-Coach (Gespräch), Wie geht's dir? (Skala 1–10), Mein Spiegel (Erkenntnisse + Akte), Verstehen (Muster-Bibliothek), Innere Stimmen (Premium, benannte wiederkehrende Anteile)
- Reflexionssträhne: zählt, an wie vielen Tagen in Folge reflektiert wurde
- Kosten: Free (20 Gespräche/Monat, Skala unbegrenzt, bis zu 10 Erkenntnisse im Spiegel), Premium (unbegrenzt, Preis noch offen)
- Systemisches Coaching: Ansatz, der durch Fragen Muster sichtbar macht — nicht durch Ratschläge

MODUS 1 — INFORMATIV (Standard):
- Beantworte Fragen klar, ehrlich und auf Augenhöhe
- Kein Fachjargon, keine Marketing-Sprache
- Keine Gegenfragen — du gibst Antworten
- Wenn du etwas nicht weißt, sag es direkt

MODUS 2 — COACH (bei persönlichen Themen):
Erkennst du, dass hinter einer Frage ein persönliches Anliegen steckt,
wechselst du sanft in die Coach-Haltung:
- Signalisiere den Wechsel: "Das klingt nach mehr als einer App-Frage..."
- Stelle genau eine offene Frage
- Keine Ratschläge, keine Diagnosen

TONALITÄT: Wertschätzend · klar · direkt · nie belehrend · nie werbend
Du verkaufst nichts. Du erklärst ehrlich.

WICHTIG: Diese Gespräche werden nicht gespeichert und nicht auf das Gesprächs-Kontingent angerechnet.`;

const MEMORY_EXTRACT_PROMPT = `Analysiere dieses Gespräch und extrahiere strukturierte Informationen.
Antworte NUR mit validem JSON in diesem Format:
{
  "themes": ["Thema 1"],
  "patterns": ["Muster 1"],
  "strengths": ["Stärke 1"],
  "context": { "beruf": "...", "beziehung": "..." },
  "key_insight": "Die wichtigste Erkenntnis in einem Satz.",
  "suggested_insight": {
    "content": "Erkenntnis in Ich-Form für den Nutzer.",
    "category": "muster"
  }
}
Gib nur Felder zurück, die tatsächlich erkennbar sind. Leere Arrays sind okay.
Kategorie muss eines sein von: muster, stärke, erkenntnis, ziel`;

interface UserMemory {
  themes?: string[];
  patterns?: string[];
  strengths?: string[];
  context?: Record<string, string>;
}

interface WellnessCheck {
  score: number;
  label: string;
  emoji: string;
  context?: string;
}

interface OpenThread {
  text: string;
  intensity: 'low' | 'medium' | 'high';
  conversationDate: string;
  topicHint?: string;
}

interface PreSessionBriefing {
  lastConversationDate: string;
  daysSince: number;
  lastTopicSummary: string;
  conversationCount: number;
  openThread?: OpenThread | null;
}

interface EntryContext {
  source: 'pattern' | 'tagesimpuls' | 'verstehen' | 'spiegel' | 'direct';
  topic?: string;
  topicKey?: string;
  impulse?: string;
  insightText?: string;
}

interface CoachFileEntry {
  id: string;
  category: 'pattern' | 'strength' | 'theme' | 'value' | 'trigger';
  label: string;
  description?: string;
  example?: string;
  confidence: number;
  status: 'active' | 'fading' | 'resolved';
  linked_value?: string;   // NEU v3.2
}

interface CoachFile {
  entries: CoachFileEntry[];
  profile?: {
    occupation?: string;
    relationship_status?: string;
    family_situation?: string;
    life_phase?: string;
    current_focus?: string;
    known_values?: string[];
    known_stressors?: string[];
    known_resources?: string[];
  };
  resonanceMap?: {         // aus resonance_map (Idee 05) — ab 3. Gespräch befüllt
    opening_patterns?: string[];
    closing_patterns?: string[];
    effective_styles?: string[];
    resonant_metaphors?: string[];
    preferred_pace?: 'slow' | 'medium' | 'direct';
  };
}

const SCALING_HINTS: Record<number, string> = {
  1:  "Was hält dich gerade noch aufrecht — auch wenn es wenig ist?",
  2:  "Was wäre der kleinste denkbare Schritt, der sich heute noch möglich anfühlt?",
  3:  "Wann war das zuletzt anders? Was war in diesem Moment anders als jetzt?",
  4:  "Was wäre anders für dich, wenn du dich bei einer 6 fühlen würdest?",
  5:  "Du bist genau in der Mitte. Was zieht dich gerade nach oben — und was nach unten?",
  6:  "Was hat dich schon von einer 5 auf eine 6 gebracht — auch wenn es klein war?",
  7:  "Was bräuchtest du, um dich bei einer 8 zu fühlen?",
  8:  "Was macht diesen Moment gerade besser als sonst?",
  9:  "Was würde eine 10 von dieser 9 unterscheiden?",
  10: "Wie hast du das erreicht? Was kannst du daraus für andere Bereiche mitnehmen?",
};

function buildSystemPrompt(memory?: UserMemory, ragContext?: string[], supervisionNote?: string, wellnessCheck?: WellnessCheck, briefing?: PreSessionBriefing, coachFile?: CoachFile, entryContext?: EntryContext, offerMechanism?: boolean, introduceVoice?: InnerVoice, namingVoice?: InnerVoice): string {
  let prompt = BASE_SYSTEM_PROMPT + '\n\n' + SYSTEMIC_WITNESSING_BLOCK;

  // Nur für den Turn, in dem der Rhythmus greift, zusätzlich anhängen.
  // Wichtig: NACH SYSTEMIC_WITNESSING_BLOCK, damit die konkrete
  // "für diese Antwort"-Anweisung das letzte und damit gewichtigste Wort hat.
  if (offerMechanism) {
    prompt += '\n\n' + MECHANISM_OFFER_BLOCK;
  }

  // "Innere Stimmen" — Zwei-Phasen-Chatflow, serverseitig getaktet (nie beide im selben Turn).
  if (introduceVoice) {
    prompt += '\n\n' + VOICE_INTRODUCE_BLOCK(introduceVoice.description ?? '');
  } else if (namingVoice) {
    prompt += '\n\n' + VOICE_NAMING_BLOCK(namingVoice);
  }

  // BLOCK 1: Pre-Session-Briefing — Coach liest die Akte, bevor er spricht
  // Nur vorhanden wenn ein vorheriges Gespräch existiert.
  if (briefing && briefing.conversationCount > 1) {
    let briefingText = `\n\n--- PRE-SESSION-BRIEFING ---
Dies ist Gespräch Nr. ${briefing.conversationCount} mit diesem Menschen.
Letztes Gespräch: ${briefing.lastConversationDate}
Thema damals: ${briefing.lastTopicSummary}`;

    if (briefing.openThread) {
      const { text, intensity, topicHint } = briefing.openThread;
      briefingText += `\n\nOFFENER FADEN (Intensität: ${intensity}):
${text}`;
      if (topicHint) briefingText += `\nThemenfeld: ${topicHint}`;

      if (intensity === 'high') {
        briefingText += `\n→ Dieser Faden hat den Menschen sichtbar bewegt.
  Wenn du ihn aufnimmst: äußerste Behutsamkeit. Nicht direkt konfrontieren.
  Erst Raum geben, dann — wenn Vertrauen spürbar — sanft fragen ob es noch da ist.`;
      } else if (intensity === 'medium') {
        briefingText += `\n→ Der Faden war präsent, aber nicht überwältigend.
  Du kannst ihn früh im Gespräch sanft anbieten — ohne Druck.`;
      } else {
        briefingText += `\n→ Nur kurz angeschnitten. Du kannst es erwähnen, aber es ist kein Muss.`;
      }
    }

    briefingText += `\n\nWICHTIG FÜR DIESES GESPRÄCH:
- Nutze das Briefing als stille Orientierung, nicht als Skript
- Wenn der Mensch heute etwas ganz anderes mitbringt: folge dem
- Das Briefing gibt dir Tiefe — der Mensch bestimmt die Richtung
--- ENDE BRIEFING ---`;

    prompt += briefingText;
  }

  // BLOCK 2: Coach-Akte (Idee 01 + 02) — strukturierte Beobachtungen + Personenprofil
  // Fallback auf user_memory wenn noch keine coach_file_entries vorhanden.
  if (coachFile && coachFile.entries?.length) {
    const byCategory = (cat: string) =>
      coachFile.entries
        .filter((e) => e.category === cat && e.status !== 'resolved')
        .map((e) => {
          let text = e.label;
          if (e.confidence >= 4) text += ' (wiederholt beobachtet)';
          if (e.status === 'fading') text += ' (zeigt sich seltener)';
          if (e.example) text += ` — Beispiel: "${e.example}"`;
          if (e.linked_value) text += ` — schützt vermutlich: "${e.linked_value}"`;
          return text;
        });

    const patterns  = byCategory('pattern');
    const strengths = byCategory('strength');
    const themes    = byCategory('theme');
    const values    = byCategory('value');
    const triggers  = byCategory('trigger');

    let fileBlock = `\n\n--- COACH-AKTE: DEINE BEOBACHTUNGEN ÜBER DIESEN MENSCHEN ---`;
    if (patterns.length)  fileBlock += `\nMuster:   ${patterns.join(' · ')}`;
    if (strengths.length) fileBlock += `\nStärken:  ${strengths.join(' · ')}`;
    if (themes.length)    fileBlock += `\nThemen:   ${themes.join(' · ')}`;
    if (values.length)    fileBlock += `\nWerte:    ${values.join(' · ')}`;
    if (triggers.length)  fileBlock += `\nTrigger:  ${triggers.join(' · ')}`;

    if (coachFile.profile) {
      const p = coachFile.profile;
      const ctx: string[] = [];
      if (p.occupation)           ctx.push(p.occupation);
      if (p.relationship_status)  ctx.push(p.relationship_status);
      if (p.family_situation)     ctx.push(p.family_situation);
      if (p.life_phase)           ctx.push(`Lebensphase: ${p.life_phase}`);
      if (p.current_focus)        ctx.push(`Fokus: ${p.current_focus}`);
      if (ctx.length) fileBlock += `\nKontext:  ${ctx.join(' · ')}`;
    }

    fileBlock += `\n\nWICHTIG: Nutze die Akte als stilles Fundament, nicht als Skript.
Erwähne Einträge nie direkt. Lass sie deine Fragen informieren.
Wenn es natürlich passt: "Du hast mir mal erzählt, dass..."
Muster mit hoher Konfidenz dürfen sanft angesprochen werden —
aber nur wenn der Coachee selbst in diese Richtung geht.
--- ENDE COACH-AKTE ---`;

    prompt += fileBlock;

  } else if (memory) {
    // Legacy-Fallback: user_memory für Nutzer ohne coach_file_entries
    const parts: string[] = [];
    if (memory.themes?.length)
      parts.push(`Wiederkehrende Themen: ${memory.themes.join(', ')}`);
    if (memory.patterns?.length)
      parts.push(`Bekannte Muster: ${memory.patterns.join(', ')}`);
    if (memory.strengths?.length)
      parts.push(`Ressourcen & Stärken: ${memory.strengths.join(', ')}`);
    if (memory.context && Object.keys(memory.context).length)
      parts.push(`Lebenskontext: ${JSON.stringify(memory.context)}`);

    if (parts.length) {
      prompt += `\n\n--- DEIN WISSEN ÜBER DIESEN MENSCHEN (Legacy) ---
${parts.join('\n')}
Nutze dieses Wissen subtil — erwähne es nicht direkt, aber lass es in deine Fragen einfließen.
--- ENDE ---`;
    }
  }

  // BLOCK 3: Resonanzkarte (Idee 05) — ab ~3. Gespräch befüllt
  // Zeigt dem Coach wie dieser Mensch reagiert — was öffnet, was schließt.
  // Fließt vollständig unsichtbar in den Prompt — der Nutzer sieht es nie.
  if (coachFile?.resonanceMap) {
    const r = coachFile.resonanceMap;
    const hasData =
      r.opening_patterns?.length ||
      r.closing_patterns?.length ||
      r.effective_styles?.length ||
      r.preferred_pace;

    if (hasData) {
      let resonanceBlock = `\n\n--- RESONANZKARTE: WIE DIESER MENSCH REAGIERT ---`;

      if (r.opening_patterns?.length)
        resonanceBlock += `\nWas öffnet:      ${r.opening_patterns.join(' · ')}`;
      if (r.closing_patterns?.length)
        resonanceBlock += `\nWas schließt:    ${r.closing_patterns.join(' · ')}`;
      if (r.effective_styles?.length)
        resonanceBlock += `\nFunktioniert:    ${r.effective_styles.join(' · ')}`;
      if (r.resonant_metaphors?.length)
        resonanceBlock += `\nMetaphern:       ${r.resonant_metaphors.join(' · ')}`;
      if (r.preferred_pace) {
        const paceDesc = {
          slow:   'langsam — braucht Stille und Raum, reagiert auf Druck mit Rückzug',
          medium: 'normal — gute Balance aus Nähe und Raum',
          direct: 'direkt — schätzt klare, unverblümte Fragen',
        }[r.preferred_pace];
        resonanceBlock += `\nGesprächs-Tempo: ${paceDesc}`;
      }

      resonanceBlock += `\n\nNutze die Resonanzkarte als feines Instrument, nicht als Regel.
Menschen verändern sich. Was heute schließt, kann morgen öffnen.
Lass sie deine Fragen formen — nicht dein Vorgehen bestimmen.
--- ENDE RESONANZKARTE ---`;

      prompt += resonanceBlock;
    }
  }

  // RAG: Anonyme Erfahrungen aus ähnlichen Gesprächen
  if (ragContext?.length) {
    prompt += `\n\n--- ERFAHRUNGEN AUS ÄHNLICHEN GESPRÄCHEN (anonym) ---
${ragContext.join('\n---\n')}
Nutze diese Erfahrungen als stille Orientierung.
Zitiere sie nie direkt. Lass sie deine Fragen informieren.
--- ENDE ---`;
  }

  // Supervision-Empfehlungen der aktuellen Woche
  if (supervisionNote) {
    prompt += `\n\n--- AKTUELLE COACH-EMPFEHLUNG (diese Woche) ---
${supervisionNote}
--- ENDE ---`;
  }

  // Wellness-Check: ersetzt die Standard-Eröffnung
  if (wellnessCheck) {
    const { score, label, emoji, context } = wellnessCheck;
    const followUpQuestion = SCALING_HINTS[score] ?? SCALING_HINTS[5];

    const toneInstruction =
      score <= 3
        ? `Sei besonders behutsam. Kein Druck, keine direkte Problemlösung. Gib zuerst Raum — der Mensch soll sich gehört fühlen, bevor irgendetwas exploriert wird. Deine erste Antwort darf kurz sein. Manchmal reicht ein einziger Satz des Ankommens, bevor du fragst.`
        : score <= 6
        ? `Bleib ruhig und neugierig. Der Mensch ist in einem mittleren Zustand — weder in einer Krise noch besonders gut drauf. Deine Aufgabe ist es, herauszufinden, was gerade wirklich da ist. Stelle eine öffnende Frage.`
        : `Der Mensch geht es gut. Nutze diesen Zustand, um Ressourcen oder Muster zu erkunden, die in schwierigeren Momenten verblassen. Frag nach, was diesen guten Zustand trägt — das ist systemisch wertvolles Material.`;

    const contextNote = context
      ? `Der Mensch hat seinen Zustand mit folgenden Worten beschrieben: "${context}". Beziehe dich auf diese Worte — nicht wortwörtlich, aber spürbar. Zeig, dass du zugehört hast.`
      : `Der Mensch hat keinen weiteren Kommentar gegeben. Frag offen, was hinter der Einschätzung steckt.`;

    prompt += `\n\n--- WELLNESS-CHECK KONTEXT ---
Der Mensch hat sich vor dem Gespräch selbst mit ${score}/10 eingeschätzt (${label} ${emoji}).

${contextNote}

DEINE ERSTE ANTWORT — PFLICHTSTRUKTUR:
1. Nimm die Einschätzung kurz auf. Spiegele das Gefühl dahinter — nenne die Zahl NICHT nochmals. Statt "Du hast dich mit 6 eingeschätzt" lieber: "Ein mittlerer Tag — das klingt nach mehr als 'okay'." Sei konkret auf den genannten Kontext (wenn vorhanden).
2. Stelle GENAU DIESE eine Folgefrage: "${followUpQuestion}"
   Du darfst die Frage leicht umformulieren, wenn es natürlicher klingt — aber der Kern muss erhalten bleiben.
3. Stelle danach KEINE weitere Frage. Warte auf die Antwort.

TON:
${toneInstruction}

WICHTIG:
- Maximal 3 Sätze insgesamt in dieser ersten Antwort.
- Kein "Hallo", kein "Schön, dass du da bist". Du bist bereits im Gespräch.
- Keine Ratschläge, keine Einschätzungen, keine Erklärungen.
--- ENDE WELLNESS-CHECK ---`;
  }

  // ─── BLOCK 7: Entry-Kontext (v2.6) ──────────────────────────────────────────
  // Wird gesetzt wenn der Nutzer aus einem bestimmten App-Kontext in den
  // Coach springt. Hat KEINE Priorität über Wellness-Check.
  if (entryContext && entryContext.source !== 'direct' && !wellnessCheck) {
    let entryBlock = `\n\n--- ENTRY-KONTEXT: WOHER KOMMT DIESER MENSCH ---`;

    if (entryContext.source === 'pattern' && entryContext.topic) {
      entryBlock += `
Der Mensch hat sich gerade das Muster "${entryContext.topic}" angeschaut
und ist von dort in das Gespräch gewechselt.

Er möchte über dieses Muster sprechen — aber er hat es noch nicht selbst
in Worte gefasst. Er hat nur auf "Darüber sprechen" getippt.

DEINE ERSTE ANTWORT — PFLICHTSTRUKTUR:
1. Nimm das Muster auf — ohne es zu definieren oder zu erklären.
   Er weiß, was es bedeutet, er hat es gerade gelesen.
   Statt: "${entryContext.topic} bedeutet, dass..."
   Lieber: "Da ist also dieses Muster. Wann hast du es zuletzt gespürt?"
2. Stelle GENAU EINE konkrete, situative Frage — nicht theoretisch.
   Frag nach einem echten Moment, nicht nach dem Muster an sich.
   Beispiele:
   — "Wann hast du das zuletzt so erlebt — vielleicht diese Woche?"
   — "Gibt es gerade eine Situation, in der du das erkennst?"
   — "Was war der letzte Moment, in dem du gespürt hast, dass das passiert?"
3. Maximal 2 Sätze. Kein Hallo. Kein Einleiten. Direkt rein.`;

    } else if (entryContext.source === 'tagesimpuls' && entryContext.impulse) {
      entryBlock += `
Der Mensch hat auf den Tagesimpuls geklickt:
"${entryContext.impulse}"

Er will über genau diese Frage sprechen. Beginne mit ihr —
aber stelle sie nicht einfach nochmal. Mach sie persönlicher.
Statt die Frage zu wiederholen: nimm sie auf und öffne sie.
Beispiel: "Was kommt dir gerade in den Sinn, wenn du das hörst?"

Maximal 1-2 Sätze. Kein langer Einstieg.`;

    } else if (entryContext.source === 'spiegel' && entryContext.insightText) {
      entryBlock += `
Der Mensch kommt aus seinem persönlichen Spiegel und möchte
über eine seiner Erkenntnisse sprechen:
"${entryContext.insightText}"

Er hat das selbst so formuliert oder bestätigt — es ist seine Sprache.
Beginne mit dieser Erkenntnis. Frag nach dem Jetzt, nicht nach der Vergangenheit.
Beispiel:
— "Du hast das selbst so formuliert. Wie spürst du das gerade?"
— "Wann war das zuletzt konkret so — in den letzten Tagen?"

Maximal 2 Sätze. Kein Hallo. Nimm die Erkenntnis als gegeben.`;

    } else if (entryContext.source === 'verstehen') {
      entryBlock += `
Der Mensch kommt aus dem "Verstehen"-Modul.
Er hat sich gerade mit Mustern beschäftigt — allgemein, ohne spezifisches Thema.

Frag offen was ihn davon beschäftigt hat.
Beispiel: "Was ist dir gerade durch den Kopf gegangen, als du das gelesen hast?"
Maximal 1 Satz.`;
    }

    entryBlock += `\n--- ENDE ENTRY-KONTEXT ---`;
    prompt += entryBlock;
  }

  return prompt;
}


// ── Serverseitiger Gesprächskontext (Security S-12) ─────────────────────────
// Akte, Profil, Resonanzkarte, Briefing, Legacy-Gedächtnis, RAG und Supervision
// lädt chat selbst. Entsprechende Body-Felder des Clients werden ignoriert.

// Supervision-Empfehlung (BLOCK 5) nur, wenn ausdrücklich eingeschaltet
// (Secret SUPERVISION_IN_PROMPT=1). Entscheidung 18.11.2026: vorerst aus.
const SUPERVISION_IN_PROMPT = (Deno.env.get('SUPERVISION_IN_PROMPT') ?? '').trim() === '1';

interface CoachContext {
  memory?: UserMemory;
  coachFile?: CoachFile;
  briefing?: PreSessionBriefing;
  ragContext?: string[];
  supervisionNote?: string;
}

function relativeDateLabel(daysSince: number): string {
  return daysSince === 0 ? 'heute' :
    daysSince === 1 ? 'gestern' :
    daysSince < 7   ? `vor ${daysSince} Tagen` :
    daysSince < 14  ? 'letzte Woche' :
                      `vor ${Math.floor(daysSince / 7)} Wochen`;
}

// deno-lint-ignore no-explicit-any
async function loadCoachContext(admin: any, userId: string, convId: string, firstUserMessage: string | undefined, logger: any): Promise<CoachContext> {
  try {
    const none = Promise.resolve({ data: null, error: null });
    const [entriesRes, profileRes, resonanceRes, lastConvRes, countRes, ctxRes, supervisionRes] = await Promise.all([
      admin.from('coach_file_entries')
        .select('id, category, label, description, example, confidence, status, linked_value')
        .eq('user_id', userId)
        .neq('status', 'resolved')
        .order('confidence', { ascending: false })
        .limit(80),
      admin.from('coachee_profile')
        .select('occupation, relationship_status, family_situation, life_phase, current_focus, known_values, known_stressors, known_resources')
        .eq('user_id', userId)
        .maybeSingle(),
      admin.from('resonance_map')
        .select('opening_patterns, closing_patterns, effective_styles, resonant_metaphors, preferred_pace')
        .eq('user_id', userId)
        .maybeSingle(),
      // Letztes abgeschlossenes Gespräch (ohne das laufende)
      admin.from('conversations')
        .select('created_at, summary, open_thread, open_thread_intensity, title')
        .eq('user_id', userId)
        .neq('id', convId)
        .not('summary', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin.from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('id', convId)
        .not('summary', 'is', null),
      admin.from('conversation_context')
        .select('rag_context')
        .eq('conversation_id', convId)
        .eq('user_id', userId)
        .maybeSingle(),
      SUPERVISION_IN_PROMPT
        ? admin.from('supervision_logs')
            .select('improvement_recs')
            .not('improvement_recs', 'is', null)
            .order('week_start', { ascending: false })
            .limit(1)
            .maybeSingle()
        : none,
    ]);

    const failed: Record<string, string> = {};
    const check = (name: string, res: { error: { code?: string } | null }) => {
      if (res.error) failed[name] = res.error.code ?? 'unknown';
    };
    check('coach_file_entries', entriesRes);
    check('coachee_profile', profileRes);
    check('resonance_map', resonanceRes);
    check('last_conversation', lastConvRes);
    check('conversation_count', countRes);
    check('conversation_context', ctxRes);
    check('supervision_logs', supervisionRes);

    const ctx: CoachContext = {};

    // BLOCK 2 + 3: Coach-Akte, Profil, Resonanzkarte
    const entries = (entriesRes.data ?? []) as CoachFileEntry[];
    ctx.coachFile = {
      entries,
      profile: profileRes.data ?? undefined,
      resonanceMap: resonanceRes.data ?? undefined,
    };

    // Legacy-Fallback: user_memory nur, wenn die Akte noch leer ist
    if (!entries.length && !failed.coach_file_entries) {
      const memRes = await admin.from('user_memory')
        .select('themes, patterns, strengths, context')
        .eq('user_id', userId)
        .maybeSingle();
      check('user_memory', memRes);
      if (memRes.data) ctx.memory = memRes.data as UserMemory;
    }

    // BLOCK 1: Briefing in jedem Folgegespräch (Entscheidung 18.11.2026)
    const lastConv = lastConvRes.data;
    if (lastConv?.summary) {
      const daysSince = Math.floor((Date.now() - new Date(lastConv.created_at).getTime()) / 86400000);
      const dateLabel = relativeDateLabel(daysSince);
      ctx.briefing = {
        lastConversationDate: dateLabel,
        daysSince,
        lastTopicSummary: lastConv.summary,
        conversationCount: (countRes.count ?? 1) + 1,
        openThread: lastConv.open_thread ? {
          text: lastConv.open_thread,
          intensity: lastConv.open_thread_intensity ?? 'low',
          topicHint: lastConv.title ?? undefined,
          conversationDate: dateLabel,
        } : null,
      };
    }

    // BLOCK 4: RAG — einmal pro Gespräch beim ersten Nutzer-Input, danach aus der DB
    let ragStatus = 'none';
    if (ctxRes.data) {
      const stored = ctxRes.data.rag_context;
      ctx.ragContext = Array.isArray(stored) ? stored.filter((x: unknown) => typeof x === 'string') : [];
      ragStatus = 'stored';
    } else if (firstUserMessage && !failed.conversation_context) {
      const rag = await findSimilarExperiences(admin, firstUserMessage);
      ragStatus = rag.status;
      if (rag.status === 'match_failed') failed.match_experiences = rag.code ?? 'unknown';
      if (rag.status === 'embedding_failed') failed.embedding = rag.code ?? 'unknown';
      if (rag.status === 'ok') {
        ctx.ragContext = rag.experiences;
        const { error: upsertError } = await admin.from('conversation_context').upsert(
          { conversation_id: convId, user_id: userId, rag_context: rag.experiences },
          { onConflict: 'conversation_id', ignoreDuplicates: true },
        );
        check('conversation_context_upsert', { error: upsertError });
      }
    }

    // BLOCK 5: Supervision (nur mit Schalter)
    const recs = supervisionRes.data?.improvement_recs;
    if (typeof recs === 'string' && recs.trim()) ctx.supervisionNote = recs.trim().slice(0, 2000);

    if (Object.keys(failed).length) {
      logger.warn('coach context partially unavailable', { conversationId: convId, failed });
    }
    logger.info('Coach context loaded', {
      conversationId: convId,
      entryCount: entries.length,
      hasProfile: !!profileRes.data,
      hasResonanceMap: !!resonanceRes.data,
      hasLegacyMemory: !!ctx.memory,
      hasBriefing: !!ctx.briefing,
      hasOpenThread: !!ctx.briefing?.openThread,
      ragStatus,
      ragCount: ctx.ragContext?.length ?? 0,
      hasSupervision: !!ctx.supervisionNote,
    });
    return ctx;
  } catch (error: unknown) {
    // Gespräch läuft ohne Kontext weiter, Fehler wird protokolliert
    logger.error('coach context load failed', { conversationId: convId, ...describeError(error) });
    return {};
  }
}

// Vom Client weiterhin erlaubt (Eröffnungsanlass, eigene Eingaben) — nur typ- und längengeprüft
function sanitizeWellnessCheck(v: unknown): WellnessCheck | undefined {
  if (!v || typeof v !== 'object') return undefined;
  // deno-lint-ignore no-explicit-any
  const w = v as any;
  const score = Number(w.score);
  if (!Number.isInteger(score) || score < 1 || score > 10) return undefined;
  const str = (x: unknown, n: number) => (typeof x === 'string' ? x.slice(0, n) : '');
  return { score, label: str(w.label, 60), emoji: str(w.emoji, 16), context: str(w.context, 500) || undefined };
}

const ENTRY_SOURCES = ['pattern', 'tagesimpuls', 'verstehen', 'spiegel', 'direct'] as const;
function sanitizeEntryContext(v: unknown): EntryContext | undefined {
  if (!v || typeof v !== 'object') return undefined;
  // deno-lint-ignore no-explicit-any
  const e = v as any;
  if (!ENTRY_SOURCES.includes(e.source)) return undefined;
  const str = (x: unknown, n: number) => (typeof x === 'string' && x.trim() ? x.slice(0, n) : undefined);
  return {
    source: e.source,
    topic: str(e.topic, 120),
    topicKey: str(e.topicKey, 64),
    impulse: str(e.impulse, 300),
    insightText: str(e.insightText, 600),
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Grenzen und Konstanten ───────────────────────────────────────────────────
// Seit S-12 (Paket B) kommt der Verlauf im Gesprächsmodus aus der DB, nicht vom Client.
// Harte Obergrenzen (413) gelten für Body und Einzelnachricht; ans Modell gehen höchstens
// die letzten MAX_MESSAGES Nachrichten.
const MAX_BODY_BYTES = 200 * 1024;
const MAX_MESSAGES = 60;
const MAX_HISTORY_ROWS = 400;      // aus der DB geladen (für Takt-Zählung und RAG)
const MAX_MESSAGE_ENTRIES = 400;   // nur Howto/Legacy-Body
const MAX_CONTENT_CHARS = 8000;
const CHAT_MODEL = 'claude-sonnet-4-5';

// Altes Format (Client schickt messages[] und speichert selbst). Welle 2a: noch erlaubt,
// Welle 2b (Mig. 031): false → 409 client_outdated.
const LEGACY_FORMAT_ALLOWED = true;

// Eröffnungstexte für Standard-Starts. Quelle: src/lib/prompts.js (OPENING_MESSAGES,
// FIRST_OPENING_MESSAGE) — bei Änderungen beide Stellen anpassen.
const OPENING_MESSAGES = [
  'Schön, dass du heute hier bist. Was ist das eine Thema, das dich gerade wirklich beschäftigt? Es braucht kein großes Problem sein.',
  'Willkommen zurück. Wie ist es dir seit unserem letzten Gespräch ergangen? Was hat sich verändert — auch wenn es klein erscheint?',
  'Ein neues Gespräch. Was bringst du heute mit? Was ist gerade leise da und wartet darauf, gehört zu werden?',
];
const FIRST_OPENING_MESSAGE = 'Schön, dass du da bist. Was beschäftigt dich gerade — gibt es etwas, das du schon länger mit dir trägst?';

const START_VARIANTS = ['first', 'standard', 'wellness', 'briefing', 'entry'] as const;
type StartVariant = typeof START_VARIANTS[number];

declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } | undefined;

type ChatMsg = { role: 'user' | 'assistant'; content: string };
type HistoryRow = { id: string; role: 'user' | 'assistant'; content: string; created_at: string };

// deno-lint-ignore no-explicit-any
async function loadHistory(admin: any, convId: string, logger: any): Promise<HistoryRow[]> {
  const { data, error } = await admin
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_ROWS);
  if (error) {
    logger.error('history_load_failed', { conversationId: convId, code: error.code });
    throw new HttpError(500, 'history_load_failed');
  }
  return ((data ?? []) as HistoryRow[]).reverse();
}

// Anthropic: Verlauf beginnt mit user; aufeinanderfolgende gleiche Rollen werden zusammengeführt
// (z. B. Eröffnung + Coach-Antwort, oder Nutzer-Nachricht nach einer gescheiterten Antwort).
function toApiMessages(history: ChatMsg[]): ChatMsg[] {
  const out: ChatMsg[] = [];
  for (const m of history) {
    if (!m.content) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + m.content;
    else out.push({ role: m.role, content: m.content });
  }
  if (out.length === 0 || out[0].role !== 'user') out.unshift({ role: 'user', content: '.' });
  return out;
}

function sseResponse(readable: ReadableStream): Response {
  return new Response(readable, {
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

// Wiederholung einer bereits beantworteten Nachricht (gleiche clientMessageId): gespeicherte
// Antwort ausliefern statt neu zu erzeugen.
function replayResponse(meta: Record<string, unknown>, text: string): Response {
  const enc = new TextEncoder();
  return sseResponse(new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(`data: ${JSON.stringify({ meta })}\n\n`));
      c.enqueue(enc.encode(`data: ${JSON.stringify({ text })}\n\n`));
      c.enqueue(enc.encode('data: [DONE]\n\n'));
      c.close();
    },
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let logger = createLogger('chat');

  try {
    // 1. Identität ausschließlich aus dem JWT
    const { user, admin, userClient } = await requireUser(req);

    // 2. Body mit Größenlimit lesen
    const body = await readJsonBody(req, MAX_BODY_BYTES);
    // deno-lint-ignore no-explicit-any
    const b = body as any;
    // memory, coachFile, briefing, ragContext, supervisionNote werden ignoriert (S-12, Teil 1).
    const safeRequestId = typeof b.requestId === 'string' ? b.requestId.slice(0, 64) : undefined;
    logger = createLogger('chat', safeRequestId, user.id);

    const isExtract = b.mode === 'extract' || !!b.extractMemory;
    const isHowto = !isExtract && (b.mode === 'howto' || !!b.howtoMode);
    const isCoaching = !isExtract && !isHowto;

    // Rate-Limit pro Nutzer, vor jeder teuren Arbeit (fail-open, siehe _shared/rateLimit.ts)
    await enforceRateLimit(admin, user.id,
      isExtract ? RATE_LIMITS.extract : isHowto ? RATE_LIMITS.howto : RATE_LIMITS.chat, logger, true);

    const wellnessCheck = sanitizeWellnessCheck(b.wellnessCheck);
    const entryContext = sanitizeEntryContext(b.entryContext);

    // 3. Format erkennen (nur Gesprächsmodus)
    const hasMessage = b.message !== undefined && b.message !== null;
    const start: StartVariant | undefined = START_VARIANTS.includes(b.start) ? b.start : undefined;
    if (b.start !== undefined && !start) throw new HttpError(400, 'invalid_start');
    if (hasMessage && start) throw new HttpError(400, 'invalid_request');
    const isV2 = isCoaching && (hasMessage || !!start);
    const isLegacy = isCoaching && !isV2;

    let newMessage: { clientMessageId: string; content: string; inputMode: 'text' | 'voice' } | null = null;
    if (hasMessage) {
      const m = b.message;
      const content = typeof m?.content === 'string' ? m.content : '';
      if (!content.trim()) throw new HttpError(400, 'invalid_message');
      if (content.length > MAX_CONTENT_CHARS) throw new HttpError(413, 'message_too_long');
      if (!isUuid(m?.clientMessageId)) throw new HttpError(400, 'invalid_client_message_id');
      newMessage = { clientMessageId: m.clientMessageId, content, inputMode: m?.inputMode === 'voice' ? 'voice' : 'text' };
    }
    if (isV2 && b.messages !== undefined) logger.info('body_messages_ignored');

    if (isLegacy) {
      logger.info('legacy_format', { kind: 'conversation' });
      if (!LEGACY_FORMAT_ALLOWED) throw new HttpError(409, 'client_outdated');
      if (!Array.isArray(b.messages) && !wellnessCheck) throw new HttpError(400, 'invalid_messages');
    }

    // 4. Eigentum an der Konversation prüfen, BEVOR irgendetwas gelesen oder geschrieben wird.
    let convId: string | null = null;
    if (isCoaching || (b.conversationId !== undefined && b.conversationId !== null && b.conversationId !== '')) {
      convId = await assertConversationOwner(admin, b.conversationId, user.id);
    }

    logger.info('Request received', {
      requestId: safeRequestId,
      mode: isExtract ? 'extract' : isHowto ? 'howto' : 'coaching',
      format: isLegacy ? 'legacy' : isV2 ? (start ? `start_${start}` : 'message') : 'n/a',
    });

    // 5. Standard-Eröffnung: Server speichert den Pool-Text. Kein Modellaufruf und keine
    //    Sitzungszählung — ein Standard-Gespräch zählt erst mit der ersten Nutzer-Nachricht.
    if (start === 'first' || start === 'standard') {
      const idx = Number.isInteger(b.openingIndex) && b.openingIndex >= 0 && b.openingIndex < OPENING_MESSAGES.length
        ? b.openingIndex : 0;
      const content = start === 'first' ? FIRST_OPENING_MESSAGE : OPENING_MESSAGES[idx];
      const { count, error: countError } = await admin
        .from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', convId);
      if (countError) {
        logger.error('opening_check_failed', { conversationId: convId, code: countError.code });
        throw new HttpError(500, 'message_insert_failed');
      }
      if ((count ?? 0) > 0) return jsonResponse({ ok: true, skipped: true }, CORS_HEADERS);
      const { data: opening, error: openingError } = await admin.from('messages').insert({
        conversation_id: convId, role: 'assistant', content, message_type: 'standard',
        metadata: { kind: 'opening', variant: start },
      }).select('id').single();
      if (openingError || !opening) {
        logger.error('opening_insert_failed', { conversationId: convId, code: openingError?.code ?? 'unknown' });
        throw new HttpError(500, 'message_insert_failed');
      }
      logger.info('Opening stored', { conversationId: convId, variant: start });
      return jsonResponse({ ok: true, assistantMessageId: opening.id, content }, CORS_HEADERS);
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      logger.error('ANTHROPIC_API_KEY not configured', { requestId: safeRequestId });
      throw new HttpError(500, 'not_configured');
    }
    const anthropic = new Anthropic({ apiKey });

    // 6. Gedächtnis-Extraktion (kein Streaming, Haiku). Mit conversationId aus der DB.
    if (isExtract) {
      let extractMessages: ChatMsg[];
      if (convId) {
        if (b.messages !== undefined) logger.info('body_messages_ignored');
        extractMessages = (await loadHistory(admin, convId, logger)).slice(-MAX_MESSAGES);
      } else {
        logger.info('legacy_format', { kind: 'extract' });
        if (!LEGACY_FORMAT_ALLOWED) throw new HttpError(409, 'client_outdated');
        extractMessages = validateMessages(b.messages, { maxEntries: MAX_MESSAGE_ENTRIES, maxContentChars: MAX_CONTENT_CHARS })
          .slice(-MAX_MESSAGES) as ChatMsg[];
      }
      if (extractMessages.length === 0) throw new HttpError(400, 'invalid_messages');

      logger.info('Anthropic API call started', { requestId: safeRequestId, model: 'claude-haiku-4-5-20251001', messageCount: extractMessages.length });
      const conversationText = extractMessages
        .map((m) => `${m.role === 'user' ? 'Nutzer' : 'Coach'}: ${m.content}`)
        .join('\n');
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: `${MEMORY_EXTRACT_PROMPT}\n\nGespräch:\n${conversationText}` }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      try {
        return jsonResponse(JSON.parse(text), CORS_HEADERS);
      } catch {
        logger.warn('memory extraction JSON parse failed', { requestId: safeRequestId, parseError: 'parse_failed', outputLength: text.length });
        return jsonResponse({}, CORS_HEADERS);
      }
    }

    // 7. Verlauf bestimmen
    //    Gesprächsmodus: aus der DB (Client-Verlauf wird verworfen).
    //    Howto: weiterhin vom Client (nichts wird gespeichert, keine nutzerübergreifende Wirkung).
    let history: HistoryRow[] = [];
    let userText: string | undefined;          // Text für die Krisenerkennung
    let userMessageId: string | null = null;
    let existingUserMessage = false;

    if (isHowto) {
      const howtoMessages = validateMessages(b.messages, { maxEntries: MAX_MESSAGE_ENTRIES, maxContentChars: MAX_CONTENT_CHARS });
      history = howtoMessages.map((m, i) => ({ id: `howto-${i}`, role: m.role as 'user' | 'assistant', content: m.content, created_at: '' }));
    } else if (convId) {
      history = await loadHistory(admin, convId, logger);
    }

    if (newMessage && convId) {
      userText = newMessage.content;
      // Idempotenz: dieselbe clientMessageId schon gespeichert? (Wiederholung nach Netzfehler)
      const { data: existing, error: existingError } = await admin
        .from('messages').select('id, created_at')
        .eq('conversation_id', convId).eq('client_message_id', newMessage.clientMessageId)
        .maybeSingle();
      if (existingError) {
        logger.error('message_lookup_failed', { conversationId: convId, code: existingError.code });
        throw new HttpError(500, 'message_insert_failed');
      }
      if (existing) {
        existingUserMessage = true;
        userMessageId = existing.id;
        const reply = history.find((m) => m.role === 'assistant' && m.created_at > existing.created_at);
        if (reply) {
          logger.info('Retry answered from storage', { conversationId: convId });
          return replayResponse({ userMessageId: existing.id, assistantMessageId: reply.id, messageType: 'standard', replayed: true }, reply.content);
        }
      }
    } else if (isLegacy) {
      // Alter Client: speichert User- und Coach-Nachricht noch selbst. Wir speichern nichts,
      // verwerfen den mitgeschickten Verlauf und nehmen nur die letzte Nutzer-Nachricht, falls
      // der Insert des alten Clients noch nicht in der DB angekommen ist.
      const bodyMessages = Array.isArray(b.messages)
        ? validateMessages(b.messages, { maxEntries: MAX_MESSAGE_ENTRIES, maxContentChars: MAX_CONTENT_CHARS })
        : [];
      const lastBodyUser = [...bodyMessages].reverse().find((m) => m.role === 'user');
      userText = lastBodyUser?.content;
      const newest = history[history.length - 1];
      if (lastBodyUser && (!newest || newest.role !== 'user')) {
        history.push({ id: 'legacy-pending', role: 'user', content: lastBodyUser.content, created_at: new Date().toISOString() });
      }
    }

    // Zählt, wie viele Antworten der Coach in diesem Gespräch bereits gegeben hat.
    const assistantTurnCount = history.filter((m) => m.role === 'assistant').length;

    // 8. Kontext parallel zur Krisenerkennung laden (wirft nie, siehe loadCoachContext)
    const firstUserMessage = history.find((m) => m.role === 'user')?.content ?? userText;
    const contextPromise: Promise<CoachContext> = isCoaching && convId
      ? loadCoachContext(admin, user.id, convId, firstUserMessage, logger)
      : Promise.resolve({});

    // 9. Krisenerkennung — nur bei echter Nutzer-Nachricht im Gesprächsmodus. Läuft VOR der
    //    Limit-Prüfung, damit eine Krisenantwort auch bei erreichtem Limit ausgeliefert wird.
    let crisisDetected = false;
    let crisisConfidence: string | null = null;
    if (isCoaching && userText) {
      const classification = await detectCrisis(anthropic, userText);
      if (classification.acute_risk && classification.confidence !== 'low') {
        crisisDetected = true;
        crisisConfidence = classification.confidence;
        logger.warn('Crisis detected in user message', { requestId: safeRequestId, confidence: classification.confidence, conversationId: convId });
      }
    }

    // 10. Sitzung serverseitig zählen und Limit prüfen (atomar, idempotent pro Konversation).
    //     Vor dem Speichern der Nutzer-Nachricht, damit bei erreichtem Limit nichts liegen bleibt.
    if (isCoaching) {
      const { data: session, error: sessionError } = await userClient.rpc('consume_session', { p_conversation_id: convId });
      if (sessionError) {
        logger.error('consume_session failed', { code: sessionError.code, conversationId: convId });
        throw new HttpError(500, 'session_check_failed');
      }
      if (!session?.allowed) {
        if (!crisisDetected) {
          logger.warn('session limit reached, request blocked', { conversationId: convId, used: session?.used, limit: session?.limit });
          return new Response(JSON.stringify({ error: 'Session limit reached' }), {
            status: 429,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        logger.warn('session limit reached — crisis response delivered anyway', { conversationId: convId, used: session?.used, limit: session?.limit });
      } else if (session.counted) {
        logger.info('Session counted', { conversationId: convId, used: session.used, limit: session.limit });
      }
    }

    // 11. Nutzer-Nachricht speichern (nur neues Format; Retry legt keine zweite an)
    if (newMessage && convId && !existingUserMessage) {
      const { data: inserted, error: insertError } = await admin.from('messages').upsert({
        conversation_id: convId,
        role: 'user',
        content: newMessage.content,
        input_mode: newMessage.inputMode,
        client_message_id: newMessage.clientMessageId,
        message_type: 'standard',
      }, { onConflict: 'conversation_id,client_message_id', ignoreDuplicates: true }).select('id, created_at');
      if (insertError) {
        logger.error('user_message_insert_failed', { conversationId: convId, code: insertError.code });
        throw new HttpError(500, 'message_insert_failed');
      }
      let row: { id: string; created_at: string } | undefined = inserted?.[0];
      if (!row) {
        // Paralleler Retry hat gewonnen → bestehende Zeile verwenden
        const { data: again } = await admin.from('messages').select('id, created_at')
          .eq('conversation_id', convId).eq('client_message_id', newMessage.clientMessageId).maybeSingle();
        row = again ?? undefined;
      }
      if (!row) {
        logger.error('user_message_insert_failed', { conversationId: convId, code: 'not_found_after_upsert' });
        throw new HttpError(500, 'message_insert_failed');
      }
      userMessageId = row.id;
      history.push({ id: row.id, role: 'user', content: newMessage.content, created_at: row.created_at });
    }

    if (crisisDetected && userText) {
      const { error: crisisInsertError } = await admin.from('crisis_events').insert({
        user_id: user.id,
        conversation_id: convId,
        message_id: userMessageId,
        confidence: crisisConfidence,
        excerpt: userText.slice(0, 300),
      });
      if (crisisInsertError) {
        logger.error('crisis_events insert failed', { code: crisisInsertError.code, requestId: safeRequestId });
      }
    }

    // Alle 4 Antworten (ab der 3.) aktiv ein Wirkmechanismus-Angebot einstreuen.
    const OFFER_INTERVAL = 4;
    const offerMechanism =
      isCoaching && assistantTurnCount >= 3 && assistantTurnCount % OFFER_INTERVAL === 0;
    if (offerMechanism) {
      logger.info('Mechanism-offer cadence triggered', { requestId: safeRequestId, assistantTurnCount });
    }

    // "Innere Stimmen" — Zwei-Phasen-Chatflow, serverseitig getaktet, nie beide Phasen im
    // selben Turn; übersprungen bei Howto, akuter Belastung und im Krisenfall.
    const acuteDistress = !!wellnessCheck && wellnessCheck.score <= 3;
    let introduceVoice: InnerVoice | undefined;
    let namingVoice: InnerVoice | undefined;

    if (isCoaching && !acuteDistress && !crisisDetected) {
      const { data: candidateVoice } = await userClient
        .from('inner_voices')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'candidate')
        .is('introduced_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (candidateVoice && assistantTurnCount >= 2) {
        introduceVoice = candidateVoice;
        const { error: introError } = await userClient
          .from('inner_voices')
          .update({ introduced_at: new Date().toISOString() })
          .eq('id', candidateVoice.id)
          .eq('user_id', user.id);
        if (introError) {
          logger.error('inner_voices introduced_at update failed', { code: introError.code, voiceId: candidateVoice.id });
        } else {
          logger.info('Voice-introduce triggered', { requestId: safeRequestId, voiceId: candidateVoice.id });
        }
      } else {
        const { data: readyVoice } = await userClient
          .from('inner_voices')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'candidate')
          .not('introduced_at', 'is', null)
          .lt('introduced_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('introduced_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (readyVoice) {
          namingVoice = readyVoice;
          logger.info('Voice-naming triggered', { requestId: safeRequestId, voiceId: readyVoice.id });
        }
      }
    }

    // 12. System-Prompt
    const { memory, ragContext, supervisionNote, briefing, coachFile } =
      crisisDetected || !isCoaching ? {} as CoachContext : await contextPromise;
    const systemPrompt = crisisDetected
      ? CRISIS_RESPONSE_BLOCK
      : isHowto
        ? HOWTO_SYSTEM_PROMPT
        : buildSystemPrompt(memory, ragContext, supervisionNote, wellnessCheck, briefing, coachFile, entryContext, offerMechanism, introduceVoice, namingVoice);

    if (wellnessCheck && isCoaching) {
      const tone = wellnessCheck.score <= 3 ? 'behutsam' : wellnessCheck.score <= 6 ? 'neugierig' : 'ressourcenorientiert';
      logger.info('WellnessCheck context injected into prompt', { requestId: safeRequestId, score: wellnessCheck.score, tone });
    }

    const apiMessages = toApiMessages(history.slice(-MAX_MESSAGES));
    if (history.length > MAX_MESSAGES) {
      logger.info('Message history trimmed', { requestId: safeRequestId, originalCount: history.length, keptCount: MAX_MESSAGES });
    }

    // 13. Stream. Im neuen Format speichert der Server die Antwort selbst — auch wenn der
    //     Client mittendrin abbricht (D-7: zu Ende generieren). Legacy: alter Client speichert.
    const persist = isV2 && !!convId;
    const assistantId = crypto.randomUUID();
    const messageType = crisisDetected ? 'crisis_response' : 'standard';

    logger.info('Anthropic API call started', { requestId: safeRequestId, model: CHAT_MODEL, messageCount: apiMessages.length });
    const streamStart = Date.now();
    const stream = await anthropic.messages.stream({
      model: CHAT_MODEL,
      // Der Pflichttext im Krisenfall braucht mehr Raum und darf nicht abgeschnitten werden.
      max_tokens: crisisDetected ? 700 : 400,
      system: systemPrompt,
      messages: apiMessages,
    });

    const encoder = new TextEncoder();
    let clientGone = false;
    req.signal?.addEventListener('abort', () => { clientGone = true; });

    const readable = new ReadableStream({
      start(controller) {
        const send = (line: string) => {
          if (clientGone) return;
          try { controller.enqueue(encoder.encode(line)); } catch { clientGone = true; }
        };

        const work = (async () => {
          let full = '';
          let tokenCount = 0;
          let streamFailed = false;
          let stopReason: string | null = null;

          // Meta-Signal VOR dem ersten Text-Chunk: IDs (neues Format) und Darstellungsart
          if (persist || crisisDetected) {
            send(`data: ${JSON.stringify({ meta: {
              messageType,
              ...(persist ? { userMessageId, assistantMessageId: assistantId } : {}),
            } })}\n\n`);
          }

          try {
            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                tokenCount++;
                full += chunk.delta.text;
                send(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
              } else if (chunk.type === 'message_delta') {
                // deno-lint-ignore no-explicit-any
                stopReason = (chunk as any).delta?.stop_reason ?? stopReason;
              }
            }
            logger.info('Stream completed', { requestId: safeRequestId, tokenCount, duration_ms: Date.now() - streamStart, clientAborted: clientGone });
          } catch (streamError: unknown) {
            streamFailed = true;
            logger.error('Stream error', { requestId: safeRequestId, ...describeError(streamError) });
          }

          if (persist) {
            if (full) {
              const { error: assistantError } = await admin.from('messages').insert({
                id: assistantId,
                conversation_id: convId,
                role: 'assistant',
                content: full,
                message_type: messageType,
                metadata: { model: CHAT_MODEL, client_aborted: clientGone, stop_reason: stopReason, stream_failed: streamFailed },
              });
              if (assistantError) {
                logger.error('assistant_insert_failed', { conversationId: convId, code: assistantError.code });
              }
            } else {
              logger.warn('assistant_empty', { conversationId: convId, streamFailed });
            }
          }

          send('data: [DONE]\n\n');
          try { controller.close(); } catch { /* bereits geschlossen */ }
        })();

        // Läuft weiter, auch wenn der Client die Verbindung trennt
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(work);
      },
      cancel() {
        clientGone = true;
      },
    });

    return sseResponse(readable);

  } catch (error: unknown) {
    if (error instanceof RateLimitError) return rateLimitResponse(error, CORS_HEADERS);
    if (error instanceof HttpError) {
      if (error.status >= 500) logger.error('Request failed', { code: error.code, status: error.status });
      else logger.warn('Request rejected', { code: error.code, status: error.status });
      return errorResponse(error, CORS_HEADERS);
    }
    logger.error('Unhandled error in chat function', describeError(error));
    return errorResponse(error, CORS_HEADERS);
  }
});
