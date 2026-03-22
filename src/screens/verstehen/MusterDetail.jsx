import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { ChevronLeft } from 'lucide-react'

const PATTERN_DATA = {
  rueckzug_unter_druck: {
    label: 'Rückzug unter Druck',
    icon: '🪞',
    iconBg: 'bg-accent-light',
    subtitle: 'Wenn der Druck steigt, zieht sich etwas in dir zurück',
    steps: [
      {
        title: 'Ein Moment, der sich zu viel anfühlte',
        text: 'Irgendwann war der Rückzug die beste Antwort, die du hattest. Nicht weil du schwach bist — sondern weil du instinktiv geschützt hast, was dir wichtig ist.',
      },
      {
        title: 'Das Muster wiederholt sich',
        text: 'Dein Gehirn erinnert sich: Rückzug hat funktioniert. Deshalb greift es wieder darauf zurück — auch wenn die Situation heute eine andere ist.',
      },
      {
        title: 'Was es heute kosten kann',
        text: 'In manchen Momenten bleibt ungesagt, was gesagt werden könnte. Kontakt entsteht durch Nähe — und die braucht manchmal Reibung.',
      },
    ],
    action: 'Das Muster sehen, bevor es steuert. "Ah. Da ist es wieder." — das ist der erste Schritt.',
    prompt: 'Ich habe gerade etwas über das Muster "Rückzug unter Druck" gelesen. Ich erkenne das bei mir. Kannst du mir helfen zu verstehen, wann das bei mir auftaucht?',
  },
  innerer_kritiker: {
    label: 'Der innere Kritiker',
    icon: '🔍',
    iconBg: 'bg-surface-2',
    subtitle: 'Eine Stimme, die selten zufrieden ist',
    steps: [
      {
        title: 'Ein Moment, der sich zu viel anfühlte',
        text: 'Der innere Kritiker entstand oft als Schutzstrategie — er hat dich vor Fehlern, vor Scham, vor Ablehnung bewahrt. Er meinte es gut.',
      },
      {
        title: 'Das Muster wiederholt sich',
        text: 'Die Stimme hat sich verfestigt. Sie kommentiert, bewertet, zweifelt — oft bevor du überhaupt angefangen hast.',
      },
      {
        title: 'Was es heute kosten kann',
        text: 'Manche Dinge bleiben ungetan. Manche Ideen werden nicht gezeigt. Der Anspruch schützt — aber er kann auch einengen.',
      },
    ],
    action: 'Die Stimme hören, ohne ihr zu gehorchen. "Da ist sie wieder." — das ist genug für den Anfang.',
    prompt: 'Ich habe gerade etwas über den "inneren Kritiker" gelesen und erkenne ihn bei mir. Wann taucht diese Stimme bei mir auf — und was löst sie aus?',
  },
  uebernahme_reflex: {
    label: 'Übernahme-Reflex',
    icon: '⚡',
    iconBg: 'bg-premium-light',
    subtitle: 'Verantwortung übernehmen — auch wenn niemand gefragt hat',
    steps: [
      {
        title: 'Ein Moment, der sich zu viel anfühlte',
        text: 'Irgendwann war es einfacher, selbst zu machen als darauf zu warten, dass andere es tun. Vielleicht war Kontrolle ein Weg, Chaos zu vermeiden.',
      },
      {
        title: 'Das Muster wiederholt sich',
        text: 'Der Reflex greift schnell. Kaum ist eine Lücke da, springst du hinein — manchmal ohne zu merken, dass du es getan hast.',
      },
      {
        title: 'Was es heute kosten kann',
        text: 'Erschöpfung. Das Gefühl, allein zu tragen. Und manchmal der leise Gedanke: Warum tut das sonst niemand?',
      },
    ],
    action: 'Innehalten, bevor du übernimmst. "Wurde ich gebeten?" — eine Frage, die viel verändern kann.',
    prompt: 'Ich habe gerade etwas über den "Übernahme-Reflex" gelesen. Ich glaube, ich erkenne das bei mir. Was steckt dahinter, wenn man ständig Verantwortung übernimmt — auch ungefragt?',
  },
  harmonie_um_jeden_preis: {
    label: 'Harmonie um jeden Preis',
    icon: '🕊️',
    iconBg: 'bg-coral-light',
    subtitle: 'Konflikte vermeiden — auch wenn es dich kostet',
    steps: [
      {
        title: 'Ein Moment, der sich zu viel anfühlte',
        text: 'Konflikte haben sich früh gefährlich angefühlt. Harmonie zu erhalten war klug — sie hat Beziehungen geschützt und Eskalation verhindert.',
      },
      {
        title: 'Das Muster wiederholt sich',
        text: 'Der Drang, es allen recht zu machen, läuft im Hintergrund. Oft unbewusst. Der Körper kennt das Signal: Bloß keinen Konflikt.',
      },
      {
        title: 'Was es heute kosten kann',
        text: 'Manchmal bleibt du dabei unsichtbar. Was du fühlst, was du brauchst — es bleibt ungesagt, um Frieden zu wahren.',
      },
    ],
    action: 'Deine Stimme zählt. "Was würde ich sagen, wenn ich keine Konsequenzen fürchten würde?" — das ist eine gute Frage.',
    prompt: 'Ich habe gerade etwas über "Harmonie um jeden Preis" gelesen. Ich glaube, ich vermeide Konflikte öfter als mir bewusst ist. Was passiert in mir, wenn ein Konflikt droht?',
  },
  perfektionismus_blockade: {
    label: 'Perfektionismus-Blockade',
    icon: '🎯',
    iconBg: 'bg-surface-2',
    subtitle: 'Wenn "gut genug" sich nicht gut genug anfühlt',
    steps: [
      {
        title: 'Ein Moment, der sich zu viel anfühlte',
        text: 'Perfektion war oft ein Schutz vor Kritik, vor Scham, vor dem Gefühl, nicht zu genügen. Hohe Ansprüche haben gute Ergebnisse gesichert.',
      },
      {
        title: 'Das Muster wiederholt sich',
        text: 'Der innere Maßstab liegt hoch. Manchmal so hoch, dass der Start schwerfällt — oder das Fertige nicht gezeigt wird.',
      },
      {
        title: 'Was es heute kosten kann',
        text: 'Dinge bleiben halb fertig. Ideen werden nicht geteilt. Die Energie fließt in Verbesserung statt in Fertigstellung.',
      },
    ],
    action: 'Fertig ist besser als perfekt. "Was wäre der kleinste Schritt, den ich jetzt tun könnte?" — oft reicht das.',
    prompt: 'Ich habe gerade etwas über die "Perfektionismus-Blockade" gelesen. Ich glaube, das hält mich manchmal auf. Kannst du mir helfen zu verstehen, was dahintersteckt?',
  },
}

export function MusterDetail() {
  const { key } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [personalExcerpt, setPersonalExcerpt] = useState(null)

  const pattern = PATTERN_DATA[key]

  useEffect(() => {
    if (!user || !key) return
    supabase
      .from('pattern_references')
      .select('excerpt')
      .eq('user_id', user.id)
      .eq('pattern_key', key)
      .order('detected_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.excerpt) setPersonalExcerpt(data.excerpt)
      })
  }, [user, key])

  if (!pattern) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <p className="text-ink-2">Muster nicht gefunden.</p>
      </div>
    )
  }

  const handleStartChat = () => {
    navigate('/coach', { state: { entryContext: { source: 'pattern', topic: pattern.label, topicKey: key } } })
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div className="bg-accent px-5 pt-12 pb-8">
        <button
          onClick={() => navigate('/verstehen')}
          className="flex items-center gap-1 text-white/70 text-[13px] mb-6"
        >
          <ChevronLeft size={16} />
          Zurück
        </button>
        <p className="text-[11px] text-white/60 uppercase tracking-[0.06em] mb-3">MODUL · MUSTER ERKENNEN</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{pattern.icon}</span>
          <h1 className="font-display text-[24px] text-white leading-[1.2]">{pattern.label}</h1>
        </div>
        <p className="text-[14px] text-white/80">{pattern.subtitle}</p>
      </div>

      <div className="px-5 pb-24">
        {/* Persönliches Coach-Zitat */}
        {personalExcerpt && (
          <div className="bg-accent-light border border-accent/20 rounded-xl p-4 mt-6">
            <p className="text-[11px] text-accent uppercase tracking-[0.06em] font-medium mb-2">Dein Coach hat bemerkt</p>
            <p className="text-[14px] text-ink-2 italic leading-relaxed">"{personalExcerpt}"</p>
          </div>
        )}

        {/* Entstehungsgeschichte */}
        <div className="mt-6 mb-6">
          <h2 className="text-[17px] font-medium text-ink mb-4">Wie dieses Muster entsteht</h2>
          <div className="flex flex-col gap-4">
            {pattern.steps.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                    <span className="text-[12px] font-medium text-accent">{i + 1}</span>
                  </div>
                  {i < pattern.steps.length - 1 && (
                    <div className="w-px flex-1 bg-[var(--color-border)] mt-2" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-[14px] font-medium text-ink mb-1">{step.title}</p>
                  <p className="text-[13px] text-ink-2 leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Handlungs-Box */}
        <div className="bg-accent-light rounded-xl p-5 mb-6">
          <p className="text-[11px] text-accent uppercase tracking-[0.06em] font-medium mb-2">Was hilft</p>
          <p className="text-[14px] text-ink leading-relaxed">{pattern.action}</p>
        </div>

        {/* CTA */}
        <button
          onClick={handleStartChat}
          className="w-full bg-accent text-white text-[15px] font-medium py-4 rounded-full hover:bg-accent-2 transition-colors"
        >
          Darüber sprechen →
        </button>
      </div>
    </div>
  )
}
