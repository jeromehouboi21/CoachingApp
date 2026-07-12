import { Heart } from 'lucide-react'

// Erkennt Telefonnummern und die TelefonSeelsorge-URL im Pflichttext und macht
// sie zu echten Tap-to-call/Tap-to-open-Links. Der Fließtext kommt vom Modell
// (angewiesen, den Pflichttext unverändert wiederzugeben) — deshalb hier
// robustes Nacherkennen statt starrem Parsen einer exakten Struktur.
function linkify(content) {
  const pattern = /(0800\s?111\s?0\s?111|0800\s?111\s?0\s?222|\b116\s?123\b|\b112\b|\b110\b|telefonseelsorge\.de)/g
  const parts = []
  let lastIndex = 0
  let match
  let key = 0

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.includes('telefonseelsorge.de')) {
      parts.push(
        <a
          key={key++}
          href="https://www.telefonseelsorge.de"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          {token}
        </a>
      )
    } else {
      const digits = token.replace(/\s/g, '')
      parts.push(
        <a key={key++} href={`tel:${digits}`} className="underline font-medium">
          {token}
        </a>
      )
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex))
  return parts
}

export function CrisisResponseCard({ content }) {
  return (
    <div className="w-full rounded-2xl bg-accent-light border border-[var(--color-accent)]/25 px-5 py-5 flex flex-col gap-3 animate-[fadeIn_0.2s_ease]">
      <Heart size={18} className="text-accent flex-none" fill="currentColor" />
      <p className="text-[15px] leading-[1.7] text-ink whitespace-pre-line">
        {content ? linkify(content) : <span className="opacity-50">...</span>}
      </p>
    </div>
  )
}
