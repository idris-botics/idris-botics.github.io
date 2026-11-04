import { useEffect, useRef, useState } from 'react'
import { Lightbulb, X } from 'lucide-react'
import data from '../content/jokes/hintbot.json'
import hints from '../content/jokes/hints.json'
import { markHelped } from './hintsStore'

type L = { en: string; ja: string }
type Opt = { label: L; reply: L; next?: string; effect?: 'skip' | 'more' | 'refuse' | 'reveal' }
type Node = { q: L; a: Opt; b: Opt }
type Taunt = { n: string; en: string; ja: string }
const ui = data.ui as unknown as Record<string, L>
const NODES = data.nodes as unknown as Record<string, Node>
const STARTS = data.starts as unknown as string[]
const TAUNTS = data.taunts as unknown as Taunt[]
const HINTS = data.secrets as unknown as Record<string, L[]>
const SECRETS = hints.secrets as unknown as Record<string, { ach: string }>
const IDS = Object.keys(HINTS)
const WAIT = [0, 40, 60] // seconds before the second and third hint of one secret unlock
const MAX_QUESTIONS = 5

// shuffle bag: nothing repeats until the pool is used up
const bags = new Map<string, number[]>()
function draw(key: string, n: number): number {
  let bag = bags.get(key)
  if (!bag?.length) { bag = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5); bags.set(key, bag) }
  return bag.pop()!
}

// hints already given this visit, and when the last one for each secret was shown (kept outside React so closing the panel does not reset them)
const given: Record<string, number> = {}
const givenAt: Record<string, number> = {}
let asked = 0
let refusedUntil = 0 // a refused request: no hint until then

type Step =
  | { k: 'q'; id: string; order: ('a' | 'b')[]; left: number }
  | { k: 'reply'; text: string; then: () => void }
  | { k: 'hint'; text: string; id?: string }
  | { k: 'msg'; text: string }

type Props = { lang: 'en' | 'ja'; found: string[]; say: (text: string, ms?: number) => boolean; fire: (id: string) => void }

/**
 * The hint button, top right. Pressing it starts a few questionable questions and a taunt or two. Only then does it give a hint:
 * first what to do, then a clearer nudge, then the answer. Each next hint unlocks on a timer, so pressing early shows the last hint again.
 */
export default function HintBot({ lang, found, fire }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step | null>(null)
  const [bubble, setBubble] = useState('')
  const live = useRef({ found })
  useEffect(() => { live.current = { found } })

  // now and then the bot pipes up by itself with a taunt, never over a project window or a set piece
  useEffect(() => {
    let t = 0, hide = 0
    const next = (ms: number) => {
      t = window.setTimeout(() => {
        const busy = document.hidden || document.querySelector('.page, .rick, .cena, .omae, .coffee-flood, .coffee-brew')
        if (!busy) {
          const tn = TAUNTS[draw('ambient', TAUNTS.length)]
          setBubble(tn[lang])
          hide = window.setTimeout(() => setBubble(''), 6500)
        }
        next(55000 + Math.random() * 40000)
      }, ms)
    }
    next(30000)
    return () => { clearTimeout(t); clearTimeout(hide) }
  }, [lang])

  const unfound = () => IDS.filter((id) => !live.current.found.includes(SECRETS[id].ach))

  const shown = useRef(0)

  // the next hint for the first secret that has not been found; `force` ignores the timers (the "just tell me" answer)
  const reveal = (force = false) => {
    const ids = unfound()
    if (!ids.length) { setStep({ k: 'msg', text: ui.none[lang] }); return }
    const id = ids[0]
    const tier = given[id] ?? 0
    const tiers = HINTS[id]
    if (!force && tier > 0 && (Date.now() - (givenAt[id] ?? 0)) / 1000 < WAIT[tier]) {
      setStep({ k: 'hint', text: `${ui.soon[lang]} ${tiers[tier - 1][lang]}` })
      return
    }
    const use = force ? Math.min(tier, tiers.length - 1) : tier
    given[id] = Math.min(use + 1, tiers.length)
    givenAt[id] = Date.now()
    if (use === tiers.length - 1) markHelped(SECRETS[id].ach)
    setStep({ k: 'hint', text: tiers[use][lang], id: use === tiers.length - 1 && id !== 'moon' ? id : undefined })
  }

  const refuse = () => { refusedUntil = Date.now() + 30000; setStep({ k: 'msg', text: ui.refused[lang] }) }

  const openNode = (id: string, left: number) => {
    if (shown.current >= MAX_QUESTIONS) { reveal(); return }
    shown.current++
    setStep({ k: 'q', id, order: Math.random() < 0.5 ? ['a', 'b'] : ['b', 'a'], left })
  }
  const startNode = (left: number) => openNode(STARTS[draw('start', STARTS.length)], left)

  const toggle = () => {
    if (open) { setOpen(false); setStep(null); return }
    setBubble('')
    setOpen(true)
    if (Date.now() < refusedUntil) { setStep({ k: 'msg', text: ui.refused[lang] }); return }
    asked++
    shown.current = 0
    // the first request gets a few questions, later ones fewer; the answers decide what comes next
    startNode(asked === 1 ? 2 : 1)
  }

  // what an answer does: a reply (sometimes with a taunt), then a follow-up question, more questions, a refusal, or the hint itself
  const answer = (id: string, which: 'a' | 'b', left: number) => {
    const o = NODES[id][which]
    const taunt = Math.random() < 0.4 ? ` ${TAUNTS[draw('between', TAUNTS.length)][lang]}` : ''
    let then: () => void
    if (o.effect === 'refuse') then = refuse
    else if (o.effect === 'reveal') then = () => reveal(true)
    else if (o.effect === 'skip') then = () => reveal()
    else if (o.effect === 'more') then = () => startNode(left + 2)
    else if (o.next) then = () => openNode(o.next!, left)
    else then = () => (left > 0 ? startNode(left - 1) : reveal())
    setStep({ k: 'reply', text: o.reply[lang] + taunt, then })
  }

  return (
    <div className="hb">
      <button className="btn hb-btn" aria-expanded={open} aria-label={ui.button[lang]} title={ui.button[lang]} onClick={toggle}>
        <Lightbulb size={18} aria-hidden="true" /><span className="hb-word">{ui.button[lang]}</span>
      </button>
      {!open && bubble && <p className="hb-bubble" role="status" onClick={() => setBubble('')}>{bubble}</p>}
      {open && step && (
        <div className="hb-panel" role="dialog" aria-label={ui.title[lang]}>
          <div className="hb-head">
            <strong>{ui.title[lang]}</strong>
            <button className="hb-x" onClick={() => { setOpen(false); setStep(null) }} aria-label={ui.close[lang]}><X size={18} aria-hidden="true" /></button>
          </div>
          {step.k === 'q' && (
            <div className="hb-body">
              <p>{NODES[step.id].q[lang]}</p>
              <div className="hb-opts">
                {step.order.map((w) => <button key={w} className="btn" onClick={() => answer(step.id, w, step.left)}>{NODES[step.id][w].label[lang]}</button>)}
              </div>
            </div>
          )}
          {step.k === 'reply' && (
            <div className="hb-body">
              <p>{step.text}</p>
              <div className="hb-opts"><button className="btn" autoFocus onClick={step.then}>{ui.cont[lang]}</button></div>
            </div>
          )}
          {step.k === 'hint' && (
            <div className="hb-body">
              <p className="hb-hint">{step.text}</p>
              {step.id && <div className="hb-opts"><button className="btn" onClick={() => { const id = step.id!; setOpen(false); setStep(null); fire(id) }}>{ui.fire[lang]}</button></div>}
            </div>
          )}
          {step.k === 'msg' && <div className="hb-body"><p>{step.text}</p></div>}
        </div>
      )}
    </div>
  )
}
