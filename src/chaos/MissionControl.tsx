import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import hints from '../content/jokes/hints.json'
import { markHelped, isHelped } from './hintsStore'

type L = { en: string; ja: string }
type Clue = { kind: string; value?: string; text?: L }
type Bts = { slug: string; title: L; text: L }
type Secret = { name: L; ach: string; word: string; t1: Clue[]; t2: L; t3: L; bts: Bts }
const SECRETS = hints.secrets as unknown as Record<string, Secret>
const IDS = Object.keys(SECRETS)
const ui = hints.ui as unknown as Record<string, L>
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export const COLOURS = ['#111', '#6b3b1b', '#d33', '#f80', '#fd0', '#2a2', '#36d', '#85c', '#999', '#fff']
const MORSE: Record<string, string> = { '.': '·', '-': '–' }

function edit(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

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

function ClueView({ c, lang }: { c: Clue; lang: 'en' | 'ja' }) {
  return (
    <div className="mc-clue">
      {c.kind === 'hex' && <p className="mc-mono">{c.value}</p>}
      {c.kind === 'katakana' && <p className="mc-big">{c.value}</p>}
      {c.kind === 'morse' && <Morse code={c.value!} lang={lang} />}
      {c.kind === 'binary' && <p className="mc-bits" aria-label={c.value}>{c.value!.split(' ').map((byte, i) => <span key={i}>{[...byte].map((b, j) => <i key={j} className={b === '1' ? 'on' : ''} />)}</span>)}</p>}
      {c.kind === 'resistor' && (
        <div className="mc-res">
          {c.value!.split(' ').map((n, i) => <span key={i} className="mc-res-pair">{[...n].map((d, j) => <i key={j} style={{ background: COLOURS[+d] }} title={d} />)}</span>)}
          <details><summary>?</summary><p>{ui.legend[lang]}</p></details>
        </div>
      )}
      {c.text && <p>{c.text[lang]}</p>}
    </div>
  )
}

type Props = {
  lang: 'en' | 'ja'
  found: string[] // achievement ids already earned
  say: (text: string, ms?: number) => boolean
  fire: (word: string) => void
}

/**
 * Mission Control: a draggable cartoon window listing every secret as a locked slot. Hints are puzzles, earned not given.
 * Tier 1 (free, cryptic) after 45 s in Chaos; tier 2 (a clearer riddle) after tier 1 has been open 60 s and costs a the word "please";
 * tier 3 (the answer) 3 minutes after that, and it stamps the achievement SOLVED WITH HELP. Easy mode shortens every wait to 10 s and drops the cost.
 */
export default function MissionControl({ lang, found, say, fire }: Props) {
  const [open, setOpen] = useState(false)
  const [easy, setEasy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const start = useRef(Date.now())
  const [tier1At, setTier1At] = useState<Record<string, number>>({})
  const [tier2At, setTier2At] = useState<Record<string, number>>({})
  const [t2open, setT2] = useState<Record<string, boolean>>({})
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [msg, setMsg] = useState('')
  const [word, setWord] = useState('')
  const [judging, setJudging] = useState('')
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const trail = useRef<{ x: number; y: number; t: number }[]>([])
  const fling = useRef(0)
  const [wobble, setWobble] = useState(false)
  const xBtn = useRef<HTMLButtonElement>(null)
  const [away, setAway] = useState(false)
  const clue = useMemo(() => Object.fromEntries(IDS.map((id) => [id, Math.floor(Math.random() * SECRETS[id].t1.length)])), [])

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const wait1 = easy ? 10 : 45, wait2 = easy ? 10 : 60, wait3 = easy ? 10 : 180
  const elapsed = (now - start.current) / 1000
  const secs = (n: number) => { const m = Math.max(0, Math.ceil(n)); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` }

  // ambient teaser toasts: first about 20 s in, then every 40 to 70 s, at most 3, never over a project window, and they stop once everything is found
  const toasts = useRef(0)
  useEffect(() => {
    let t = 0
    const next = (ms: number) => {
      t = window.setTimeout(() => {
        const all = IDS.every((id) => found.includes(SECRETS[id].ach))
        if (all || toasts.current >= 3) return
        if (!document.querySelector('.page, .rick, .cena, .omae')) {
          const list = hints.ambient as unknown as L[]
          const msg = list[toasts.current % list.length][lang]
          if (say(msg, 7000)) toasts.current++
        }
        next(40000 + Math.random() * 30000)
      }, ms)
    }
    next(20000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t1Ready = elapsed >= wait1
  // a secret's first transmission opens once the wait is over
  useEffect(() => {
    if (!t1Ready) return
    setTier1At((m) => {
      const add = IDS.filter((id) => !m[id] && !found.includes(SECRETS[id].ach))
      return add.length ? { ...m, ...Object.fromEntries(add.map((id) => [id, Date.now()])) } : m
    })
  }, [t1Ready, found, now])

  const decode = (id: string, free = false) => {
    setJudging(id)
    window.setTimeout(() => { setJudging(''); setTier2At((m) => ({ ...m, [id]: Date.now() })); setT2((m) => ({ ...m, [id]: true })) }, free || easy ? 200 : 1600)
  }

  const run = () => {
    const w = word.trim().toLowerCase()
    setWord('')
    if (!w) return
    if (w === 'please') {
      const id = IDS.find((i) => !found.includes(SECRETS[i].ach) && tier1At[i] && !t2open[i])
      if (id) { setMsg(ui.please[lang]); decode(id, true) } else setMsg(ui.nothing[lang])
      return
    }
    const hit = IDS.find((i) => SECRETS[i].word === w)
    if (hit) { setMsg(''); fire(hit); return }
    const near = IDS.some((i) => edit(SECRETS[i].word, w) <= 1)
    const pool = (hints.wrong as unknown as Record<string, L[]>)[near ? 'warm' : 'cold']
    setMsg(pool[Math.floor(Math.random() * pool.length)][lang].replace('{w}', w))
  }

  // the window can be dragged and flung: it keeps its speed, slides to a stop against the edges, and wobbles when it lands.
  // It never goes up into the header, so Restore order is always reachable.
  const clampPos = (x: number, y: number) => ({ x: Math.max(0, Math.min(innerWidth - 140, x)), y: Math.max(64, Math.min(innerHeight - 60, y)) })
  const down = (e: React.PointerEvent) => {
    cancelAnimationFrame(fling.current)
    const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    trail.current = []
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = clampPos(e.clientX - d.dx, e.clientY - d.dy)
    setPos(p)
    trail.current = [...trail.current.slice(-5), { x: p.x, y: p.y, t: performance.now() }]
  }
  const up = () => {
    if (!drag.current) return
    drag.current = null
    const tr = trail.current
    if (tr.length < 2 || reduced()) { setWobble(true); window.setTimeout(() => setWobble(false), 420); return }
    const a = tr[0], b = tr[tr.length - 1], dt = Math.max(16, b.t - a.t)
    let vx = ((b.x - a.x) / dt) * 16, vy = ((b.y - a.y) / dt) * 16
    let x = b.x, y = b.y
    const step = () => {
      vx *= 0.93; vy *= 0.93
      x += vx; y += vy
      const c = clampPos(x, y)
      if (c.x !== x) vx *= -0.5
      if (c.y !== y) vy *= -0.5
      x = c.x; y = c.y
      setPos({ x, y })
      if (Math.hypot(vx, vy) > 0.4) fling.current = requestAnimationFrame(step)
      else { setWobble(true); window.setTimeout(() => setWobble(false), 420) }
    }
    fling.current = requestAnimationFrame(step)
  }
  useEffect(() => () => cancelAnimationFrame(fling.current), [])
  // once per visit the close button runs away from the pointer for about a second, then gives up
  const ran = useRef(false)
  const near = (e: React.PointerEvent) => {
    if (ran.current || reduced() || !xBtn.current) return
    const r = xBtn.current.getBoundingClientRect()
    if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > 70) return
    ran.current = true
    setAway(true)
    window.setTimeout(() => setAway(false), 1000)
  }

  return (
    <>
      <button className="btn mc-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={ui.open[lang]} title={ui.open[lang]}><span aria-hidden="true">📡</span></button>
      {open && (
        <div className={`mc${wobble ? ' wobble' : ''}`} onPointerMove={near} role="dialog" aria-label={ui.title[lang]} style={pos ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' } : undefined}>
          <div className="mc-bar" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <strong>{ui.title[lang]}</strong>
            <span className="mc-cells" />
            <button ref={xBtn} className="mc-x" style={away ? { transform: 'translate(-70px, 52px) rotate(40deg)', transition: 'transform 180ms cubic-bezier(0.34,1.6,0.64,1)' } : { transition: 'transform 220ms cubic-bezier(0.23,1,0.32,1)' }} onPointerDown={(e) => e.stopPropagation()} onClick={() => setOpen(false)} aria-label={ui.close[lang]}>×</button>
          </div>
          <ul className="mc-list">
            {IDS.map((id) => {
              const s = SECRETS[id], done = found.includes(s.ach)
              const t1 = done ? 0 : tier1At[id]
              const t2 = t2open[id], t2t = tier2At[id]
              const decodeLeft = t1 ? wait2 - (now - t1) / 1000 : 0
              const spoilLeft = t2t ? wait3 - (now - t2t) / 1000 : 0
              return (
                <li key={id} className={done ? 'done' : ''}>
                  <strong>{done ? s.name[lang] : '???'}</strong>
                  {done && <span className="mc-tag">{isHelped(s.ach) ? ui.helped[lang] : ui.found[lang]}</span>}
                  {done && (
                    <div className="mc-bts">
                      <b>{s.bts.title[lang]}</b>
                      <p>{s.bts.text[lang]}</p>
                      <a href={`#work/${s.bts.slug}`} onClick={(e) => { e.preventDefault(); dispatchEvent(new CustomEvent('portfolio:open-project', { detail: s.bts.slug })) }}>{ui.openProject[lang]}</a>
                    </div>
                  )}
                  {!done && (
                    <>
                      {!t1 && <p className="mc-wait">{ui.waiting[lang]} {secs(wait1 - elapsed)}</p>}
                      {t1 && <ClueView c={s.t1[clue[id]]} lang={lang} />}
                      {t1 && !t2 && (judging === id ? <p className="mc-wait">{ui.decoding[lang]}</p>
                        : decodeLeft > 0 ? <p className="mc-wait">{ui.decodeIn[lang]} {secs(decodeLeft)}</p>
                        : <button className="btn mc-go" onClick={() => decode(id)}>{ui.decode[lang]}</button>)}
                      {t2 && <p className="mc-t2">{s.t2[lang]}</p>}
                      {t2 && (spoilLeft > 0 ? <p className="mc-wait">{ui.spoilerIn[lang]} {secs(spoilLeft)}</p>
                        : <button className="btn mc-go" onClick={() => { markHelped(s.ach); fire(id) }}>{ui.spoiler[lang]}: <b>{s.word}</b></button>)}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
          <form className="mc-cmd" onSubmit={(e) => { e.preventDefault(); run() }}>
            <input value={word} onChange={(e) => setWord(e.target.value)} placeholder={ui.placeholder[lang]} aria-label={ui.command[lang]} name="secret-word" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            <button className="btn" type="submit">{ui.run[lang]}</button>
          </form>
          {msg && <p className="mc-msg" role="status">{msg}</p>}
          <details className="mc-set">
            <summary>{ui.settings[lang]}</summary>
            <label><input type="checkbox" checked={easy} onChange={(e) => setEasy(e.target.checked)} /> {easy ? ui.easy[lang] : ui.hard[lang]}</label>
          </details>
        </div>
      )}
    </>
  )
}

/** Achievement ids of the four secrets, in order. */
export const SECRET_ACH = IDS.map((id) => SECRETS[id].ach)
