import { useEffect, useRef, useState } from 'react'
import { Mail, FileText, ExternalLink } from 'lucide-react'
import hints from '../content/jokes/hints.json'
import { SECRET_ACH } from './MissionControl'
import { links } from '../content'
import { personal } from '../personal'

type L = { en: string; ja: string }
const ui = hints.ui as unknown as Record<string, L>

/**
 * The real finish line. When all four secrets are found: a short celebration, then a contact card (email, CV, LinkedIn).
 * Escape or the button closes the card; it never blocks Restore order.
 */
export default function Ending({ lang, found, award }: { lang: 'en' | 'ja'; found: string[]; award: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [party, setParty] = useState(false)
  const shown = useRef(false)
  const all = SECRET_ACH.every((a) => found.includes(a))
  const base = import.meta.env.BASE_URL

  useEffect(() => {
    if (!all || shown.current) return
    shown.current = true
    award('everything')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    setParty(!reduce)
    const a = window.setTimeout(() => { setParty(false); setOpen(true) }, reduce ? 300 : 1600)
    return () => clearTimeout(a)
  }, [all, award])

  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [open])

  if (!open && !party) return null
  return (
    <>
      {party && <div className="end-party" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 4.3) % 100}%`, animationDelay: `${(i % 6) * 80}ms`, background: ['#ff7a45', '#ffd45e', '#5a2bd6', '#2aa86b'][i % 4] }} />)}</div>}
      {open && (
        <div className="end-card" role="dialog" aria-label={ui.endTitle[lang]}>
          <h2>{ui.endTitle[lang]}</h2>
          <p>{ui.endBody[lang]}</p>
          <div className="end-links">
            <a className="btn" href={`mailto:${links.email}`}><Mail size={14} aria-hidden="true" /> {links.email}</a>
            {personal.cv.en && <a className="btn" href={base + personal.cv.en} download><FileText size={14} aria-hidden="true" /> {ui.cv[lang]}</a>}
            <a className="btn" href={links.linkedin} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> LinkedIn</a>
          </div>
          <button className="btn" onClick={() => setOpen(false)}>{ui.endClose[lang]}</button>
        </div>
      )}
    </>
  )
}
