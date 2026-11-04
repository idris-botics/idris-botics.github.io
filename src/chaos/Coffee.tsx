import { useCallback, useEffect, useRef, useState } from 'react'
import { caption } from './captions'
import { sfx } from './sfx'
import { hitStop } from './juice'

type Props = {
  lang: 'en' | 'ja'
  /** Show a caption in the shared toast (false when comments are paused). */
  say: (text: string, ms?: number) => boolean
  award: (id: string) => void
  /** Ask the scheduler for the set-piece slot; `end` gives it back. */
  start: () => boolean
  end: () => void
}

type Phase = 'idle' | 'brew' | 'rise' | 'hold' | 'drain'
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// ring positions as a share of the viewport; they sit behind the text (z-index -1), never on top of it
const RINGS = [
  { x: 6, y: 22, s: 84, r: -12 }, { x: 88, y: 48, s: 64, r: 20 }, { x: 14, y: 72, s: 72, r: 8 }, { x: 80, y: 84, s: 92, r: -24 },
]

/**
 * The "coffee" secret. Typing it (anywhere outside a text box, or from the command box) runs a fake brewing bar, a coffee flood that
 * rises and drains, coffee-ring stains and steam that stay until Restore order, and a vending-machine can.
 * Later times it is typed: a quip, an error code, a shaking mug on the cursor, a caffeine limit.
 * Only transform and opacity animate, so it stays smooth on a phone. Click or tap the flood to drain it at once.
 */
export default function Coffee({ lang, say, award, start, end, fire }: Props & { fire: { n: number } }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [pct, setPct] = useState(0)
  const [label, setLabel] = useState('')
  const [rings, setRings] = useState(0)
  const [can, setCan] = useState(false)
  const [mug, setMug] = useState(false)
  const times = useRef(0)
  const timers = useRef<number[]>([])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }
  const cap = useCallback((id: string, ms = 4500) => { const t = caption(id, lang); if (t) say(t, ms) }, [lang, say])
  const langRef = useRef(lang)
  useEffect(() => { langRef.current = lang }, [lang])

  const finish = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; setPhase('idle'); setPct(0); end() }, [end])

  const brew = useCallback(() => {
    setPhase('brew'); setPct(0); setLabel(caption('coffee-b1', langRef.current) ?? '')
    const steps: [number, number, string][] = [[0, 12, 'coffee-b1'], [500, 47, 'coffee-b2'], [1100, 99, 'coffee-b3']]
    for (const [ms, p, id] of steps) later(() => { setPct(p); setLabel(caption(id, langRef.current) ?? '') }, ms)
    later(() => { setPct(100); setPhase('rise'); sfx('pour'); hitStop(50) }, 1900)
    later(() => setPhase('hold'), 2900)
    later(() => { setPhase('drain'); sfx('slurp'); setRings(3 + (times.current % 2)); document.documentElement.classList.add('coffee-steam') }, 3700)
    later(() => { setCan(true); sfx('gachon') }, 4300)
    later(() => { setPhase('idle'); end() }, 4800)
    later(() => setCan(false), 7000)
    later(() => document.documentElement.classList.remove('coffee-steam'), 14000)
  }, [end])

  // each time "coffee" is typed or run from the command box, `fire.n` goes up
  useEffect(() => {
    if (!fire.n) return
    const n = ++times.current
    if (n === 1) award('coffee')
    dispatchEvent(new Event('portfolio:coffee')) // the workbench arm drops a cup
    if (reduced()) { setRings((r) => Math.max(r, 1)); cap('coffee-r', 5000); return }
    if (n === 1) { if (start()) brew(); else times.current-- ; return }
    if (n === 2) { sfx('boing'); cap('coffee-c2') }
    else if (n === 3) { sfx('error'); cap('coffee-c3') }
    else if (n === 4) { setMug(true); sfx('boing'); cap('coffee-c4'); later(() => setMug(false), 4200) }
    else {
      sfx('shake'); cap('coffee-c5', 5000)
      document.documentElement.classList.add('vibrate')
      later(() => document.documentElement.classList.remove('vibrate'), 2200)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire.n])

  // the mug follows the pointer and shakes
  const mugEl = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!mug) return
    const move = (e: PointerEvent) => { const m = mugEl.current; if (m) m.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 10}px)` }
    addEventListener('pointermove', move)
    return () => removeEventListener('pointermove', move)
  }, [mug])

  useEffect(() => () => { timers.current.forEach(clearTimeout); document.documentElement.classList.remove('coffee-steam', 'vibrate') }, [])

  const bubbles = useRef(Array.from({ length: 16 }, (_, i) => ({ x: (i * 37) % 100, d: 0.9 + ((i * 13) % 10) / 10, s: 6 + ((i * 7) % 12), l: (i % 5) * 0.12 }))).current

  return (
    <>
      {rings > 0 && (
        <div className="coffee-stains" aria-hidden="true">
          {RINGS.slice(0, rings).map((r, i) => (
            <span key={i} className="coffee-ring" style={{ left: `${r.x}%`, top: `${r.y}%`, width: r.s, height: r.s, transform: `rotate(${r.r}deg)`, animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
      )}
      {phase === 'brew' && (
        <div className="coffee-brew" role="status" aria-live="polite">
          <span>{label} {pct}%</span>
          <span className="coffee-bar"><i style={{ transform: `scaleX(${pct / 100})` }} /></span>
        </div>
      )}
      {(phase === 'rise' || phase === 'hold' || phase === 'drain') && (
        <div className="coffee-flood" aria-hidden="true" onClick={() => { setPhase('drain'); later(finish, 800) }}>
          <div className={`coffee-liquid ${phase}`}>
            <svg className="coffee-wave" viewBox="0 0 800 40" preserveAspectRatio="none"><path d="M0 20 Q50 0 100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 V40 H0Z" /></svg>
            {bubbles.map((b, i) => <i key={i} className="coffee-bubble" style={{ left: `${b.x}%`, width: b.s, height: b.s, animationDuration: `${b.d}s`, animationDelay: `${b.l}s` }} />)}
          </div>
        </div>
      )}
      {can && (
        <div className="coffee-can" aria-hidden="true">
          <span className="coffee-can-body"><b>☕</b></span>
          <span className="coffee-can-word">{caption('coffee-vend', lang)}</span>
        </div>
      )}
      {mug && <div className="coffee-mug" ref={mugEl} aria-hidden="true"><span>🦾</span><span className="coffee-mug-cup">☕</span></div>}
    </>
  )
}
