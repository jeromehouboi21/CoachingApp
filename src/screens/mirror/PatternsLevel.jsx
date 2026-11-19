import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { createLogger } from '../../lib/logger'
import { PATTERNS } from '../../lib/patterns'
import { FileEntrySheet } from './FileEntrySheet'
import { LoadingDots, LoadError, SectionLabel, statusText, momentsText } from './shared'

const logger = createLogger('PatternsLevel')

// Ebene „Muster“ (UX-Konzept 4.3b, E-U2-3): Stimmen · Was sich bei dir zeigt · Kandidat · Kennst du das?
// Jedes Muster erscheint an genau einem Ort. Keine Konfidenz- oder Aktivitätspunkte.

function Card({ onClick, children }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className="w-full text-left bg-surface border border-[var(--color-border)] rounded-xl p-4 shadow-sm hover:shadow transition-all flex items-start gap-3"
    >
      <div className="flex-1 min-w-0">{children}</div>
      {onClick && <ChevronRight size={16} color="var(--color-ink-3)" className="flex-none mt-1" />}
    </Tag>
  )
}

export function PatternsLevel({ userId }) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [sheetEntry, setSheetEntry] = useState(null)

  const load = useCallback(() => {
    if (!userId) return
    setData(null)
    setLoadFailed(false)
    Promise.all([
      supabase.from('inner_voices').select('id, name, description, status, introduced_at, last_active_at')
        .eq('user_id', userId).in('status', ['named', 'candidate'])
        .order('last_active_at', { ascending: false }),
      supabase.from('coach_file_entries')
        .select('id, category, label, description, example, history, status, confidence, voice_id, first_detected')
        .eq('user_id', userId)
        .order('confidence', { ascending: false })
        .order('first_detected', { ascending: true }),
      supabase.from('pattern_references').select('pattern_key, detected_at')
        .eq('user_id', userId)
        .order('detected_at', { ascending: false }),
    ]).then(([voicesRes, entriesRes, refsRes]) => {
      const failed = [voicesRes, entriesRes, refsRes].find(r => r.error)
      if (failed) {
        logger.error('patterns_load_failed', { code: failed.error.code })
        setLoadFailed(true)
        return
      }
      setData({ voices: voicesRes.data ?? [], entries: entriesRes.data ?? [], refs: refsRes.data ?? [] })
    })
  }, [userId])

  useEffect(() => { load() }, [load])

  if (loadFailed) return <LoadError onRetry={load} />
  if (!data) return <LoadingDots />

  const namedVoices = data.voices.filter(v => v.status === 'named')
  // Nur eingeführte Kandidaten – vorher bleiben sie unsichtbar (wie bisher bei den Stimmen)
  const hasCandidate = data.voices.some(v => v.status === 'candidate' && v.introduced_at)
  const voiceNameById = Object.fromEntries(namedVoices.map(v => [v.id, v.name]))

  const labelsByVoice = {}
  for (const e of data.entries) {
    if (!e.voice_id) continue
    if (!labelsByVoice[e.voice_id]) labelsByVoice[e.voice_id] = []
    labelsByVoice[e.voice_id].push(e.label)
  }

  const filePatterns = data.entries.filter(e => e.category === 'pattern')

  const refCount = {}
  for (const r of data.refs) refCount[r.pattern_key] = (refCount[r.pattern_key] ?? 0) + 1
  const personalLibrary = PATTERNS.filter(p => refCount[p.key])
  const otherLibrary = PATTERNS.filter(p => !refCount[p.key])

  const hasPersonal = namedVoices.length > 0 || filePatterns.length > 0 || personalLibrary.length > 0 || hasCandidate

  return (
    <div>
      {!hasPersonal && (
        <p className="text-[14px] text-ink-2 leading-relaxed mb-6">
          Was sich bei dir wiederholt, zeigt sich hier nach deinen ersten Gesprächen.
        </p>
      )}

      {namedVoices.length > 0 && (
        <section className="mb-7">
          <SectionLabel>Deine Stimmen</SectionLabel>
          <div className="flex flex-col gap-3">
            {namedVoices.map(voice => {
              const labels = labelsByVoice[voice.id] ?? []
              return (
                <div key={voice.id} className="bg-surface border border-[var(--color-border)] rounded-xl p-4 shadow-sm">
                  <h3 className="font-display text-[17px] text-ink mb-1">„{voice.name}“</h3>
                  {voice.description && <p className="text-[13px] text-ink-2 leading-relaxed mb-2">{voice.description}</p>}
                  {labels.length > 0 && (
                    <p className="text-[12px] text-ink-3 mb-3">zeigt sich bei: {labels.slice(0, 3).join(', ')}</p>
                  )}
                  <button
                    onClick={() => navigate('/coach')}
                    className="text-[13px] text-accent font-medium flex items-center gap-0.5 hover:underline"
                  >
                    Mit {voice.name} sprechen <ChevronRight size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {(filePatterns.length > 0 || personalLibrary.length > 0) && (
        <section className="mb-7">
          <SectionLabel>Was sich bei dir zeigt</SectionLabel>
          <div className="flex flex-col gap-3">
            {filePatterns.map(entry => {
              const status = statusText(entry.status)
              const voiceName = voiceNameById[entry.voice_id]
              return (
                <Card key={entry.id} onClick={() => setSheetEntry(entry)}>
                  <p className="text-[15px] font-medium text-ink">{entry.label}</p>
                  <p className="text-[12px] text-ink-3 mt-1">
                    {momentsText(Math.max(1, entry.history?.length ?? 0))}
                    {status ? ` · ${status}` : ''}
                  </p>
                  {voiceName && <p className="text-[12px] text-ink-3 mt-0.5">gehört zu: {voiceName}</p>}
                </Card>
              )
            })}
            {personalLibrary.map(p => (
              <Card key={p.key} onClick={() => navigate(`/mirror/muster/${p.key}`)}>
                <p className="text-[15px] font-medium text-ink">{p.label}</p>
                <p className="text-[12px] text-ink-3 mt-1">{momentsText(refCount[p.key])}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {hasCandidate && (
        <section className="mb-7 px-1">
          <p className="text-[14px] text-ink-2 leading-relaxed">
            Da ist etwas, das sich wiederholt. Magst du es dir ansehen?
          </p>
          <button
            onClick={() => navigate('/coach')}
            className="text-[13px] text-accent font-medium mt-1 hover:underline"
          >
            Darüber reden →
          </button>
        </section>
      )}

      {otherLibrary.length > 0 && (
        <section className="mb-4">
          <SectionLabel>Kennst du das?</SectionLabel>
          <div className="flex flex-col gap-3">
            {otherLibrary.map(p => (
              <Card key={p.key} onClick={() => navigate(`/mirror/muster/${p.key}`)}>
                <p className="text-[15px] font-medium text-ink mb-1">{p.label}</p>
                <p className="text-[13px] text-ink-2 leading-relaxed">{p.desc}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <FileEntrySheet
        entry={sheetEntry}
        voiceName={sheetEntry ? voiceNameById[sheetEntry.voice_id] : null}
        onClose={() => setSheetEntry(null)}
      />
    </div>
  )
}
