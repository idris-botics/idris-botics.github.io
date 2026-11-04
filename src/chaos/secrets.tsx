import { useCallback, useEffect, useRef, useState } from 'react'
import hints from '../content/jokes/hints.json'

type L = { en: string; ja: string }
type Secret = { ach: string }
const SECRETS = hints.secrets as unknown as Record<string, Secret>
const ui = hints.ui as unknown as Record<string, L>
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const MORSE: Record<string, string> = { '.': '·', '-': '–' }

/** A Morse light: it blinks the code once, and again when tapped. Reduced motion shows a static dot-dash row. */
export function Morse({ code, lang }: { code: string; lang: 'en' | 'ja' }) {
  const [on, setOn] = useState(false)
  const run = useRef(0)
  const play = useCallback(() => {
    const id = ++run.current
    const seq: [boolean, number][] = []
    for (const ch of code) { if (ch === ' ') seq.push([false, 500]); else { seq.push([true, ch === '.' ? 220 : 650]); seq.push([false, 220]) } }
    let t = 0
    for (const [v, ms] of seq) { window.setTimeout(() => { if (run.current === id) setOn(v) }, t); t += ms }
    window.setTimeout(() => { if (run.current === id) setOn(false) }, t)
  }, [code])
  useEffect(() => { const r = run; if (!reduced()) play(); return () => { r.current++ } }, [play])
  if (reduced()) return <p className="mc-morse-static" aria-label={code}>{[...code].map((c) => MORSE[c] ?? ' ').join(' ')}</p>
  return <button className="mc-led" onClick={play} aria-label={ui.tapReplay[lang]} title={ui.tapReplay[lang]}><i className={on ? 'on' : ''} /><span>{ui.tapReplay[lang]}</span></button>
}

/** Achievement ids of the four secrets, in order. */
export const SECRET_ACH = Object.keys(SECRETS).map((id) => SECRETS[id].ach)
