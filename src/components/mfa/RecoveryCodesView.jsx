// Einmalige Anzeige der 10 Wiederherstellungscodes (S-06b, Text Lösungsdesign 5.5).
// Die Codes leben nur im Speicher dieser Ansicht; nie loggen, nie speichern.
import { useState } from 'react'
import { Button } from '../ui/Button'

export function RecoveryCodesView({ codes, onDone }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-[22px] text-ink">Deine Wiederherstellungscodes</h3>
      <p className="text-[14px] text-ink-2 leading-relaxed">
        Falls du einmal keinen Zugriff auf deine Authenticator-App hast, kommst du mit einem dieser Codes wieder in dein Konto. Jeder Code funktioniert einmal.
      </p>
      <p className="text-[14px] text-ink-2 leading-relaxed">
        Bewahre sie an einem sicheren Ort auf, zum Beispiel in einem Passwortmanager oder ausgedruckt. Hier siehst du sie nur dieses eine Mal.
      </p>
      <ul className="grid grid-cols-2 gap-2 bg-surface-2 rounded-xl p-4 font-mono text-[15px] text-ink select-all">
        {codes.map((c) => <li key={c} className="text-center">{c}</li>)}
      </ul>
      <Button variant="secondary" className="w-full py-3" onClick={copy}>
        {copied ? 'Kopiert' : 'Codes kopieren'}
      </Button>
      <Button variant="primary" className="w-full py-3" onClick={onDone}>
        Ich habe sie gesichert
      </Button>
    </div>
  )
}
