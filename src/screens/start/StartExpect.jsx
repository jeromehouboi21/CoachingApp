// Screen 1 – Was dich hier erwartet (Paket K W3, Konzept 2.2)
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { StartDots } from './StartDots'

const POINTS = [
  { symbol: '💬', text: 'Du sprichst über das, was dich gerade bewegt. Der Begleiter gibt dir keine Ratschläge. Er stellt Fragen, die dir helfen, klarer zu sehen.' },
  { symbol: '✦', text: 'Was du dabei erkennst, wird für dich festgehalten, damit es nicht verloren geht.' },
  { symbol: '↻', text: 'Mit der Zeit wird sichtbar, was sich bei dir wiederholt und wie du dich bewegst.' },
]

export function StartExpect({ onNext }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-bg max-w-lg mx-auto flex flex-col px-6 py-10 animate-[fadeSlideUp_0.4s_ease]">
      <StartDots current={1} />

      <h1 className="font-display text-[30px] text-ink leading-[1.2] mb-8">
        Ein Begleiter, der zuhört<br />und <em>Fragen stellt.</em>
      </h1>

      <ul className="flex flex-col gap-5 mb-6">
        {POINTS.map(p => (
          <li key={p.symbol} className="flex gap-4">
            <span className="w-6 text-center text-accent flex-none text-[18px]" aria-hidden="true">{p.symbol}</span>
            <span className="text-[15px] text-ink-2 leading-[1.6]">{p.text}</span>
          </li>
        ))}
        <li className="flex gap-4 items-center">
          <span className="flex-none"><Avatar name="Jerome Houboi" size="sm" /></span>
          <span className="text-[15px] text-ink-2 leading-[1.6]">Entwickelt und verantwortet von Jerome Houboi, zertifizierter systemischer Coach.</span>
        </li>
      </ul>

      <p className="text-[12px] text-ink-3 leading-relaxed mb-8">
        Der Begleiter ersetzt keine Therapie. Wenn es dir gerade sehr schlecht geht, ist die TelefonSeelsorge rund um die Uhr erreichbar:{' '}
        <a href="tel:08001110111" className="underline">0800 111 0 111</a>.
      </p>

      <div className="mt-auto flex flex-col gap-2 pb-4">
        <Button variant="primary" className="w-full text-base py-4" onClick={onNext}>Weiter</Button>
        <button onClick={() => navigate('/auth?mode=login')} className="text-[14px] text-ink-3 hover:text-ink-2 py-2">
          Ich habe schon ein Konto → Anmelden
        </button>
      </div>
    </div>
  )
}
