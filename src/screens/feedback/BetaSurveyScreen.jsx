import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
import { SURVEY_SECTIONS, SCALE_LABELS } from '../../config/betaSurvey'

export function BetaSurveyScreen() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const plan = profile?.plan ?? 'free'
  const isPremium = plan === 'premium' || plan === 'tester'

  // Premium-Items ausblenden, wenn nicht freigeschaltet
  const sections = useMemo(
    () => SURVEY_SECTIONS
      .filter(s => !s.premiumOnly || isPremium)
      .map(s => ({ ...s, items: s.items.filter(i => !i.premiumOnly || isPremium) })),
    [isPremium],
  )

  const [answers, setAnswers] = useState({})   // { key: { rating?, text? } }
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'success' | 'error'

  const setRating = (key, rating) =>
    setAnswers(a => ({ ...a, [key]: { ...a[key], rating } }))
  const setText = (key, text) =>
    setAnswers(a => ({ ...a, [key]: { ...a[key], text } }))

  async function handleSubmit() {
    if (!user?.id) { setStatus('error'); return }
    setStatus('saving')

    // Guard: nur 1..5 als rating durchlassen; leere Texte verwerfen — der
    // CHECK-Constraint erlaubt nur 1..5, ein anderer Wert würde den Insert
    // sonst still scheitern lassen.
    const clean = {}
    for (const [key, val] of Object.entries(answers)) {
      const entry = {}
      if (Number.isInteger(val?.rating) && val.rating >= 1 && val.rating <= 5) entry.rating = val.rating
      if (typeof val?.text === 'string' && val.text.trim()) entry.text = val.text.trim()
      if (Object.keys(entry).length) clean[key] = entry
    }

    const row = {
      user_id: user.id,
      plan_at_submission: plan,
      usage_frequency: answers.ctx_frequency?.text ?? null, // select speichert Rohwert in .text
      weeks_testing: answers.ctx_weeks?.text ?? null,
      overall_satisfaction: clean.overall_satisfaction?.rating ?? null,
      overall_recommend: clean.overall_recommend?.rating ?? null,
      answers: clean,
      app_version: import.meta.env?.VITE_APP_VERSION ?? null,
    }

    const { error } = await supabase.from('feedback_surveys').insert(row)
    if (error) {
      console.error('[beta-survey] insert failed:', error.message)
      setStatus('error')
      return
    }
    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="px-5 py-10 text-center">
        <h1 className="font-display text-[26px] text-ink mb-3">Danke dir.</h1>
        <p className="text-[15px] text-ink-2 leading-[1.7] mb-8">
          Deine Rückmeldung hilft, die App genau da zu verbessern, wo es zählt.
        </p>
        <Button variant="primary" onClick={() => navigate('/profile')}>
          Zurück zum Profil
        </Button>
      </div>
    )
  }

  return (
    <div className="px-5 py-6 max-w-[560px] mx-auto">
      <header className="mb-8">
        <h1 className="font-display text-[28px] text-ink mb-2">Dein Feedback</h1>
        <p className="text-[15px] text-ink-2 leading-[1.7]">
          Nimm dir ein paar Minuten. Es gibt keine richtigen Antworten — nur deinen
          ehrlichen Eindruck. Freitextfelder sind freiwillig.
        </p>
      </header>

      {sections.map(section => (
        <section key={section.id} className="mb-9">
          <h2 className="font-display text-[19px] text-ink mb-1">{section.title}</h2>
          {section.intro && (
            <p className="text-[13px] text-ink-3 leading-[1.6] mb-4">{section.intro}</p>
          )}

          <div className="flex flex-col gap-6">
            {section.items.map(item => (
              <div key={item.key}>
                <label className="block text-[14px] text-ink-2 leading-[1.5] mb-2">
                  {item.label}
                  {item.optional && <span className="text-ink-3"> (optional)</span>}
                </label>

                {item.type === 'scale' && (
                  <ScaleRow
                    value={answers[item.key]?.rating}
                    onChange={r => setRating(item.key, r)}
                  />
                )}

                {item.type === 'select' && (
                  <SelectRow
                    options={item.options}
                    value={answers[item.key]?.text}
                    onChange={v => setText(item.key, v)}
                  />
                )}

                {item.type === 'text' && (
                  <textarea
                    rows={3}
                    value={answers[item.key]?.text ?? ''}
                    onChange={e => setText(item.key, e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-bg
                               p-3 text-[14px] text-ink leading-[1.6] resize-none
                               focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                    placeholder="…"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {status === 'error' && (
        <p className="text-[13px] text-coral mb-3">
          Das Speichern hat nicht geklappt. Versuch es bitte gleich noch einmal.
        </p>
      )}

      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={status === 'saving'}
        className="w-full"
      >
        {status === 'saving' ? 'Wird gespeichert…' : 'Feedback absenden'}
      </Button>
    </div>
  )
}

// ── Skala 1–5 mit Endpunkt-Labels ───────────────────────────────────────────
function ScaleRow({ value, onChange }) {
  return (
    <div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={[
              'flex-1 h-11 rounded-xl text-[15px] transition-colors',
              value === n
                ? 'bg-accent text-white'
                : 'bg-accent-light text-ink-2',
            ].join(' ')}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[11px] text-ink-3">
        <span>{SCALE_LABELS.min}</span><span>{SCALE_LABELS.max}</span>
      </div>
    </div>
  )
}

// ── Select als Chip-Reihe (mobilfreundlicher als <select>) ─────────────────
function SelectRow({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={[
            'px-3 h-9 rounded-full text-[13px] transition-colors',
            value === opt
              ? 'bg-accent text-white'
              : 'bg-accent-light text-ink-2',
          ].join(' ')}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
